// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, otp_code, new_password } = await req.json();

    // Validation des entrées
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!otp_code || typeof otp_code !== 'string' || otp_code.length !== 6 || !/^\d{6}$/.test(otp_code)) {
      return new Response(
        JSON.stringify({ error: 'Code OTP invalide. Le code doit contenir 6 chiffres.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normaliser l'email
    const normalizedEmail = email.toLowerCase().trim();

    // Connexion à Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Vérifier le code OTP
    const { data: otpData, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('otp_code', otp_code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return new Response(
        JSON.stringify({ 
          error: 'Code OTP invalide ou expiré. Veuillez demander un nouveau code.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Vérifier que l'utilisateur existe
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error('Erreur lors de la vérification de l\'utilisateur');
    }

    const user = users.users.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mettre à jour le mot de passe de l'utilisateur
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Erreur lors de la mise à jour du mot de passe:', updateError);
      throw new Error('Erreur lors de la mise à jour du mot de passe');
    }

    // Marquer le code OTP comme utilisé
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpData.id);

    // Marquer tous les autres codes OTP pour cet email comme utilisés (sécurité)
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('used', false);

    console.log('✅ Mot de passe réinitialisé pour:', normalizedEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erreur dans verify-password-reset-otp:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur inconnue',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/* To deploy this function:
 *
 * supabase functions deploy verify-password-reset-otp
 *
 * Configuration requise:
 * - RESEND_API_KEY (déjà configuré pour send-password-reset-otp)
 */

