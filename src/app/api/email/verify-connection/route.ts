import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { parse } from 'cookie';
import imaps from 'imap-simple';

interface VerifyEmailRequest {
  email: string;
  password: string;
  imap_host: string;
  imap_port: number;
}

async function verifyImapConnection(
  host: string,
  port: number,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[IMAP Test] Attempting connection to ${host}:${port} with user ${email}`);

  const config = {
    imap: {
      user: email,
      password: password,
      host: host,
      port: port,
      tls: port === 993 || port === 465,
      authTimeout: 10000,
      tlsOptions: {
        rejectUnauthorized: false // Pour accepter les certificats auto-signés
      }
    }
  };

  try {
    const connection = await imaps.connect(config);
    console.log('✅ Connexion IMAP réussie');
    
    // Fermer la connexion proprement
    connection.end();
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erreur IMAP:', error);

    let errorMessage = 'Connexion échouée';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Impossible de se connecter à ${host}:${port}. Vérifiez l'adresse et le port.`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Délai d\'attente dépassé lors de la connexion au serveur';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Serveur introuvable. Vérifiez l\'adresse du serveur IMAP.';
    } else if (error.message?.includes('AUTHENTICATIONFAILED') || error.message?.includes('Invalid credentials')) {
      errorMessage = 'Email ou mot de passe incorrect';
    } else if (error.source === 'authentication') {
      errorMessage = 'Échec de l\'authentification. Vérifiez vos identifiants.';
    } else {
      errorMessage = error.message || 'Erreur inconnue';
    }

    return { success: false, error: errorMessage };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { user, error: authError } = await getUserFromToken(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié. Veuillez vous reconnecter.' },
        { status: 401 }
      );
    }

    const body: VerifyEmailRequest = await request.json();
    console.log('📧 Received request:', { 
      email: body.email, 
      host: body.imap_host, 
      port: body.imap_port 
    });

    const { email, password, imap_host, imap_port } = body;

    if (!email || !password || !imap_host || !imap_port) {
      console.error('❌ Missing parameters:', {
        hasEmail: !!email,
        hasPassword: !!password,
        hasImapHost: !!imap_host,
        hasImapPort: !!imap_port,
      });
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants. Vérifiez tous les champs.' },
        { status: 400 }
      );
    }

    console.log(`🔌 Testing connection to ${imap_host}:${imap_port} for ${email}`);
    const result = await verifyImapConnection(imap_host, imap_port, email, password);
    console.log('✉️ Connection result:', result);

    if (result.success) {
      return NextResponse.json(
        { success: true, message: 'Connexion IMAP réussie' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

