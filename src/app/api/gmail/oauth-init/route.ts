import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
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
    const { redirectUrl, subscriptionId } = body;

    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      return NextResponse.json(
        { error: 'Configuration Google OAuth manquante. Veuillez configurer GOOGLE_CLIENT_ID dans .env.local' },
        { status: 500 }
      );
    }

    // Créer le state avec les informations nécessaires
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        redirectUrl: redirectUrl || request.headers.get('origin'),
        subscriptionId,
        token,
      })
    ).toString('base64');

    // Scopes Gmail nécessaires
    const scopes = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    // Construire l'URL d'authentification Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set(
      'redirect_uri',
      `${redirectUrl || request.headers.get('origin')}/gmail-callback`
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return NextResponse.json({ authUrl: authUrl.toString() }, { status: 200 });
  } catch (error: any) {
    console.error('Error initiating Gmail OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'initialisation OAuth' },
      { status: 500 }
    );
  }
}

