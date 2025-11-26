import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Route pour permettre aux utilisateurs migrés de définir un nouveau mot de passe
 * Sans authentification (pour les utilisateurs qui n'ont pas encore de password_hash)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email et nouveau mot de passe sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const result = await query(
      'SELECT id, email, password_hash FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucun compte trouvé avec cet email' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // Vérifier que l'utilisateur n'a pas déjà un mot de passe
    if (user.password_hash) {
      return NextResponse.json(
        { error: 'Ce compte a déjà un mot de passe. Utilisez la connexion normale.' },
        { status: 400 }
      );
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await query(
      'UPDATE profiles SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [passwordHash, new Date().toISOString(), user.id]
    );

    return NextResponse.json(
      { 
        message: 'Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.',
        success: true 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la définition du mot de passe' },
      { status: 500 }
    );
  }
}

