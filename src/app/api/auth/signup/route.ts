import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/auth';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom complet sont requis' },
        { status: 400 }
      );
    }

    const { user, error } = await signUp(email, password, fullName);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    console.error('SignUp API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'inscription' },
      { status: 500 }
    );
  }
}

