import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

Deno.serve(async (req) => {
  console.log('[Gmail OAuth Callback] Requête reçue:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('[Gmail OAuth Callback] Réponse OPTIONS');
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('[Gmail OAuth Callback] Paramètres:', {
      hasCode: !!code,
      hasState: !!state,
      codeLength: code?.length,
      stateLength: state?.length
    });

    if (!code || !state) {
      console.error('[Gmail OAuth Callback] Paramètres manquants');
      return new Response(JSON.stringify({ error: 'Missing code or state parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const stateData = JSON.parse(atob(state));
    const { userId, redirectUrl } = stateData;
    
    console.log('[Gmail OAuth Callback] State décodé:', {
      hasUserId: !!userId,
      hasRedirectUrl: !!redirectUrl,
      userId,
      redirectUrl
    });

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[Gmail OAuth Callback] Échange du code contre un token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId!,
        client_secret: googleClientSecret!,
        redirect_uri: `${supabaseUrl}/functions/v1/gmail-oauth-callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    console.log('[Gmail OAuth Callback] Réponse token exchange:', {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token
    });

    if (!tokenResponse.ok) {
      console.error('[Gmail OAuth Callback] Échec de l\'échange de token:', tokens);
      throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
    }

    console.log('[Gmail OAuth Callback] Récupération des infos utilisateur...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoResponse.json();
    console.log('[Gmail OAuth Callback] Infos utilisateur:', {
      ok: userInfoResponse.ok,
      status: userInfoResponse.status,
      email: userInfo.email,
      hasEmail: !!userInfo.email
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

    const { data: existingConfig } = await supabase
      .from('email_configurations')
      .select('id')
      .eq('user_id', userId)
      .eq('email', userInfo.email)
      .maybeSingle();

    if (existingConfig) {
      const duplicateHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Account Already Exists</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#fff7f7; margin:0; display:flex; align-items:center; justify-content:center; height:100vh; }
    .card { background:#ffffff; border:1px solid #fecaca; border-radius:12px; padding:28px 32px; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.06); max-width:400px; }
    .icon { width:56px; height:56px; border-radius:9999px; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:30px; }
    .title { font-weight:700; color:#991b1b; margin-bottom:4px; font-size:18px; }
    .subtitle { color:#475569; font-size:14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">!</div>
    <div class="title">Compte déjà existant</div>
    <div class="subtitle">Ce compte Gmail est déjà configuré. Fermeture...</div>
  </div>
  <script>
    (function() {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'gmail-duplicate', email: '${userInfo.email}' }, '*');
      }
      setTimeout(function() {
        window.close();
      }, 2000);
    })();
  </script>
</body>
</html>`;

      return new Response(duplicateHtml, {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    console.log('[Gmail OAuth Callback] Insertion du token dans la base de données...');
    const { data: tokenData, error: dbError } = await supabase
      .from('gmail_tokens')
      .insert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryDate.toISOString(),
        email: userInfo.email,
        is_classement: false, // Tri automatique désactivé par défaut - sera activé après configuration de l'entreprise
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Gmail OAuth Callback] Erreur DB token:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
    console.log('[Gmail OAuth Callback] Token inséré avec succès:', tokenData?.id);

    console.log('[Gmail OAuth Callback] Insertion de la configuration email...');
    const { error: configError } = await supabase
      .from('email_configurations')
      .insert({
        user_id: userId,
        name: `Gmail - ${userInfo.email}`,
        email: userInfo.email,
        provider: 'gmail',
        is_connected: true,
        is_classement: false, 
        gmail_token_id: tokenData.id,
        last_sync_at: new Date().toISOString()
      });

    if (configError) {
      console.error('[Gmail OAuth Callback] Erreur DB config:', configError);
      throw new Error(`Config error: ${configError.message}`);
    }
    console.log('[Gmail OAuth Callback] Configuration insérée avec succès');

    const redirectToSuccess = `${redirectUrl}/gmail-success.html?email=${encodeURIComponent(userInfo.email)}`;
    console.log('[Gmail OAuth Callback] Redirection vers:', redirectToSuccess);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectToSuccess
      }
    });
  } catch (error) {
    console.error('[Gmail OAuth Callback] Erreur complète:', error);
    console.error('[Gmail OAuth Callback] Stack:', error instanceof Error ? error.stack : 'N/A');
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});