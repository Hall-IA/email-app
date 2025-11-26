import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { parse } from 'cookie';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token depuis le cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    const { user, error } = await getUserFromToken(token);

    if (error) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    const session = {
      access_token: token,
      refresh_token: token,
      user,
    };

    return NextResponse.json({ user, session }, { status: 200 });
  } catch (error: any) {
    console.error('Session API error:', error);
    return NextResponse.json({ user: null, session: null }, { status: 200 });
  }
}

