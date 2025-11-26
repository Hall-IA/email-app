import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { parse } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { user, error: authError } = await getUserFromToken(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { password, email, data: userData } = body;

    // Mise à jour du mot de passe
    if (password) {
      const passwordHash = await hashPassword(password);
      await query(
        'UPDATE profiles SET password_hash = $1, updated_at = $2 WHERE id = $3',
        [passwordHash, new Date().toISOString(), user.id]
      );
    }

    // Mise à jour de l'email
    if (email && email !== user.email) {
      // Vérifier que l'email n'est pas déjà utilisé
      const existingUser = await query('SELECT id FROM profiles WHERE email = $1 AND id != $2', [
        email,
        user.id,
      ]);

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }

      await query(
        'UPDATE profiles SET email = $1, updated_at = $2 WHERE id = $3',
        [email, new Date().toISOString(), user.id]
      );
    }

    // Mise à jour des métadonnées utilisateur
    if (userData) {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (userData.full_name !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(userData.full_name);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        values.push(user.id);

        await query(
          `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }
    }

    // Récupérer l'utilisateur mis à jour
    const result = await query(
      'SELECT id, email, full_name, email_confirmed_at FROM profiles WHERE id = $1',
      [user.id]
    );

    const updatedUser = result.rows[0];

    return NextResponse.json(
      {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          email_confirmed_at: updatedUser.email_confirmed_at,
          user_metadata: { full_name: updatedUser.full_name },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('UpdateUser API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

