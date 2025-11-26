import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis' },
        { status: 400 }
      );
    }

    const { user, session, error } = await signIn(email, password);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    // Créer le cookie de session
    const cookie = serialize('auth_token', session!.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session!.expires_in,
      path: '/',
    });

    const response = NextResponse.json({ user, session }, { status: 200 });
    response.headers.set('Set-Cookie', cookie);

    return response;
  } catch (error: any) {
    console.error('SignIn API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}

