import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer l'utilisateur authentifié
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Récupérer le code d'autorisation et le redirect_uri
    const { code, redirect_uri } = await req.json();

    if (!code) {
      throw new Error('Missing authorization code');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    // Utiliser le redirect_uri du body, sinon fallback sur env
    const redirectUri = redirect_uri || Deno.env.get('GMAIL_REDIRECT_URI');

    console.log('OAuth Config:', {
      clientId: clientId ? 'Set' : 'Missing',
      clientSecret: clientSecret ? 'Set' : 'Missing',
      redirectUri: redirectUri || 'Missing',
      redirectUriSource: redirect_uri ? 'Body' : 'Env',
      userId: user.id
    });

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Gmail OAuth credentials not configured. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET environment variables.');
    }

    // Échanger le code contre des tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Récupérer les informations de l'utilisateur Gmail
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Gmail');
    }

    const userInfo = await userInfoResponse.json();

    // Calculer la date d'expiration
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Vérifier si l'email existe déjà pour cet utilisateur
    const { data: existingConfig } = await supabase
      .from('email_configurations')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', userInfo.email)
      .maybeSingle();

    if (existingConfig) {
      throw new Error('Ce compte Gmail est déjà configuré');
    }

    // Enregistrer les tokens Gmail
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .insert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryDate.toISOString(),
        email: userInfo.email,
        is_classement: false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tokenError) {
      throw new Error(`Failed to save Gmail tokens: ${tokenError.message}`);
    }
    console.log('[Gmail OAuth Callback] Token inséré avec succès:', tokenData?.id);

    // Créer la configuration email
    const { error: configError } = await supabase
      .from('email_configurations')
      .insert({
        user_id: user.id,
        name: `Gmail - ${userInfo.email}`,
        email: userInfo.email,
        provider: 'gmail',
        is_connected: true,
        is_classement: false,
        gmail_token_id: tokenData.id,
        last_sync_at: new Date().toISOString()
      });

    if (configError) {
      throw new Error(`Failed to create email configuration: ${configError.message}`);
    }
    console.log('[Gmail OAuth Callback] Configuration insérée avec succès');

    console.log('✅ Gmail connected successfully for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      email: userInfo.email,
      message: 'Gmail connected successfully'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error in Gmail OAuth callback:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to connect Gmail'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
