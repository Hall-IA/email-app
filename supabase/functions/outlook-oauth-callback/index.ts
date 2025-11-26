import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const oauthErrorDescription = url.searchParams.get('error_description');

    if (oauthError) {
      return new Response(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#fff7f7; margin:0; display:flex; align-items:center; justify-content:center; height:100vh; }
              .card { background:#ffffff; border:1px solid #fecaca; border-radius:12px; padding:28px 32px; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.06); }
              .icon { width:56px; height:56px; border-radius:9999px; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:30px; }
              .title { font-weight:700; color:#991b1b; margin-bottom:4px; }
              .subtitle { color:#475569; font-size:14px; }
              .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px; color:#334155; word-break: break-all;}
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">!</div>
              <div class="title">Erreur OAuth Outlook</div>
              <div class="subtitle mono">${oauthError}: ${oauthErrorDescription ?? ''}</div>
            </div>
            <script>
              window.opener && window.opener.postMessage({ type: 'outlook-error', error: '${oauthError}', description: '${oauthErrorDescription ?? ''}' }, '*');
              setTimeout(() => window.close(), 1200);
            </script>
          </body>
        </html>`, {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: 'Missing code or state parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { userId } = JSON.parse(atob(state));
    const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const redirectUri = `${supabaseUrl}/functions/v1/outlook-oauth-callback?apikey=${anon}`;

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: microsoftClientId,
        client_secret: microsoftClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
    }

    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoResponse.json();

    const supabase = createClient(supabaseUrl, serviceKey);
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + (tokens.expires_in || 3600));

    const userEmail = userInfo.mail || userInfo.userPrincipalName;

    const { data: existingConfig } = await supabase
      .from('email_configurations')
      .select('id')
      .eq('user_id', userId)
      .eq('email', userEmail)
      .maybeSingle();

    if (existingConfig) {
      return new Response(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#fff7f7; margin:0; display:flex; align-items:center; justify-content:center; height:100vh; }
              .card { background:#ffffff; border:1px solid #fecaca; border-radius:12px; padding:28px 32px; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.06); }
              .icon { width:56px; height:56px; border-radius:9999px; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:30px; }
              .title { font-weight:700; color:#991b1b; margin-bottom:4px; }
              .subtitle { color:#475569; font-size:14px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">!</div>
              <div class="title">Compte déjà existant</div>
              <div class="subtitle">Ce compte email est déjà configuré.</div>
            </div>
            <script>
              window.opener && window.opener.postMessage({ type: 'outlook-duplicate', email: '${userEmail}' }, '*');
              setTimeout(() => window.close(), 1500);
            </script>
          </body>
        </html>`, {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Vérifier si c'est le PREMIER email de l'utilisateur
    const { data: allEmails } = await supabase
      .from('email_configurations')
      .select('id')
      .eq('user_id', userId);

    const isFirstEmail = !allEmails || allEmails.length === 0;
    
    console.log('[Outlook OAuth Callback] Nombre d\'emails existants:', allEmails?.length || 0);
    console.log('[Outlook OAuth Callback] Est-ce le premier email ?', isFirstEmail);

    const { data: tokenData, error: dbError } = await supabase
      .from('outlook_tokens')
      .insert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryDate.toISOString(),
        email: userEmail,
        is_classement: false, // Tri automatique désactivé par défaut - sera activé après configuration de l'entreprise
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) throw new Error(`Database error: ${dbError.message}`);

    const { error: configError } = await supabase
      .from('email_configurations')
      .insert({
        user_id: userId,
        name: `Outlook - ${userEmail}`,
        email: userEmail,
        provider: 'outlook',
        is_connected: true,
        is_primary: isFirstEmail, // ✅ CORRECTION : Marquer comme principal si c'est le premier email
        is_classement: false, // Tri automatique désactivé par défaut - sera activé après configuration de l'entreprise
        outlook_token_id: tokenData.id,
        last_sync_at: new Date().toISOString()
      });

    if (configError) throw new Error(`Config error: ${configError.message}`);

    return new Response(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#f6fff8; margin:0; display:flex; align-items:center; justify-content:center; height:100vh; }
            .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:28px 32px; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.06); }
            .icon { width:56px; height:56px; border-radius:9999px; background:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:30px; }
            .title { font-weight:700; color:#065f46; margin-bottom:4px; }
            .subtitle { color:#475569; font-size:14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <div class="title">Connexion Outlook réussie</div>
            <div class="subtitle">Vous pouvez fermer cette fenêtre.</div>
          </div>
          <script>
            window.opener && window.opener.postMessage({ type: 'outlook-connected', email: '${userEmail}' }, '*');
            setTimeout(() => window.close(), 800);
          </script>
        </body>
      </html>`, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error);
    return new Response(JSON.stringify({ error: error?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});