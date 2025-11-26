import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { parse } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification via le token dans le body (car c'est une popup)
    const body = await request.json();
    const { code, redirect_uri, token } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code d\'autorisation manquant' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur depuis le token
    let user;
    if (token) {
      const result = await getUserFromToken(token);
      if (result.error || !result.user) {
        return NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        );
      }
      user = result.user;
    } else {
      // Fallback: essayer depuis les cookies
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = parse(cookieHeader);
      const cookieToken = cookies.auth_token;

      if (!cookieToken) {
        return NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        );
      }

      const result = await getUserFromToken(cookieToken);
      if (result.error || !result.user) {
        return NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        );
      }
      user = result.user;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Configuration Google OAuth manquante' },
        { status: 500 }
      );
    }

    console.log('[Gmail Callback] Échange du code contre des tokens...');
    console.log('[Gmail Callback] redirect_uri:', redirect_uri);

    // Échanger le code contre des tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Gmail Callback] Erreur échange token:', error);
      return NextResponse.json(
        { success: false, error: 'Échec de l\'échange du code d\'autorisation' },
        { status: 500 }
      );
    }

    const tokens = await tokenResponse.json();
    console.log('[Gmail Callback] Tokens reçus:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    });

    // Récupérer les informations de l'utilisateur Gmail
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Impossible de récupérer les informations Gmail' },
        { status: 500 }
      );
    }

    const userInfo = await userInfoResponse.json();
    const gmailEmail = userInfo.email;

    console.log('[Gmail Callback] Email Gmail:', gmailEmail);

    // Calculer la date d'expiration
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Vérifier si la configuration email existe déjà
    const existingConfig = await query(
      'SELECT id FROM email_configurations WHERE user_id = $1 AND email = $2',
      [user.id, gmailEmail]
    );

    const configAlreadyExists = existingConfig.rows.length > 0;

    if (configAlreadyExists) {
      console.log('[Gmail Callback] Configuration déjà existante, mise à jour des tokens uniquement');
    }

    // Enregistrer ou mettre à jour les tokens Gmail (UPSERT)
    // Note: Google ne renvoie pas toujours un nouveau refresh_token
    const tokenResult = await query(
      `INSERT INTO gmail_tokens (user_id, access_token, refresh_token, token_expiry, email, is_classement, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, email) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, gmail_tokens.refresh_token),
         token_expiry = EXCLUDED.token_expiry,
         updated_at = EXCLUDED.updated_at
       RETURNING id`,
      [
        user.id,
        tokens.access_token,
        tokens.refresh_token || null,
        expiryDate.toISOString(),
        gmailEmail,
        false,
        new Date().toISOString(),
      ]
    );

    const tokenId = tokenResult.rows[0].id;
    console.log('[Gmail Callback] Token ID:', tokenId);

    // Créer ou mettre à jour la configuration email
    if (configAlreadyExists) {
      await query(
        `UPDATE email_configurations 
         SET is_connected = $1, 
             gmail_token_id = $2, 
             last_sync_at = $3, 
             updated_at = $4
         WHERE user_id = $5 AND email = $6`,
        [
          true,
          tokenId,
          new Date().toISOString(),
          new Date().toISOString(),
          user.id,
          gmailEmail
        ]
      );
      console.log('[Gmail Callback] ✅ Configuration mise à jour avec succès');
    } else {
      await query(
        `INSERT INTO email_configurations (user_id, name, email, provider, is_connected, is_classement, gmail_token_id, last_sync_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          user.id,
          `Gmail - ${gmailEmail}`,
          gmailEmail,
          'gmail',
          true,
          false,
          tokenId,
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
      console.log('[Gmail Callback] ✅ Configuration créée avec succès');
    }

    return NextResponse.json(
      {
        success: true,
        email: gmailEmail,
        message: 'Gmail connecté avec succès',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Erreur Gmail callback:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error type:', typeof error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la connexion Gmail',
      },
      { status: 500 }
    );
  }
}

