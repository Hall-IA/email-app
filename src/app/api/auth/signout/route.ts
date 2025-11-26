import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    // Supprimer le cookie de session
    const cookie = serialize('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.headers.set('Set-Cookie', cookie);

    return response;
  } catch (error: any) {
    console.error('SignOut API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}

