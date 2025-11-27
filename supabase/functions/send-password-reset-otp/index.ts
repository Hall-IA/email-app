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
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normaliser l'email (minuscules)
    const normalizedEmail = email.toLowerCase().trim();

    // Vérifier que l'utilisateur existe
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

    // Vérifier si l'utilisateur existe
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error('Erreur lors de la vérification de l\'utilisateur');
    }

    const userExists = users.users.some(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (!userExists) {
      // Ne pas révéler que l'utilisateur n'existe pas (sécurité)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Si cet email existe, un code de vérification a été envoyé.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Générer un code OTP de 6 chiffres
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Expiration dans 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Marquer les anciens OTPs comme utilisés
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('used', false);

    // Sauvegarder le nouveau code OTP
    const { error: otpError } = await supabase
      .from('password_reset_otps')
      .insert({
        email: normalizedEmail,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (otpError) {
      console.error('Erreur lors de la sauvegarde de l\'OTP:', otpError);
      throw new Error('Erreur lors de la génération du code');
    }

    // Récupérer l'API key Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('Service d\'email non configuré');
    }

    // Template HTML de l'email
    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de vérification - Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #F97316; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif;">Hall Mail</h1>
              <p style="color: #ffffff; margin: 0; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; font-weight: 500;">
                Réinitialisation de mot de passe
              </p>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: 'Roboto', Arial, sans-serif;">
                Bonjour,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; font-family: 'Roboto', Arial, sans-serif;">
                Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code de vérification ci-dessous :
              </p>

              <!-- Code OTP -->
              <div style="background-color: #F97316; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; border: 3px solid #DC2626;">
                <p style="color: #ffffff; font-size: 14px; margin: 0 0 15px 0; font-family: 'Roboto', Arial, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Code de vérification
                </p>
                <p style="color: #ffffff; font-size: 48px; font-weight: 700; margin: 0; font-family: 'Roboto', Arial, sans-serif; letter-spacing: 8px;">
                  ${otpCode}
                </p>
              </div>

              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; font-family: 'Roboto', Arial, sans-serif;">
                Ce code est valide pendant <strong>10 minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px 0; font-family: 'Roboto', Arial, sans-serif;">
                © ${new Date().getFullYear()} Hall Mail - Tous droits réservés
              </p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; font-family: 'Roboto', Arial, sans-serif;">
                Cet email a été envoyé depuis support@help.hallia.ai
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textBody = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         HALL MAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÉINITIALISATION DE MOT DE PASSE

Bonjour,

Vous avez demandé à réinitialiser votre mot de passe. 
Utilisez le code de vérification ci-dessous :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

         CODE DE VÉRIFICATION
              ${otpCode}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ce code est valide pendant 10 minutes.

Si vous n'avez pas demandé cette réinitialisation, 
vous pouvez ignorer cet email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

© ${new Date().getFullYear()} Hall Mail - Tous droits réservés
Cet email a été envoyé depuis support@help.hallia.ai
    `.trim();

    // Envoyer l'email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Hall Mail <support@help.hallia.ai>',
        to: [normalizedEmail],
        subject: 'Code de vérification - Réinitialisation de mot de passe',
        html: htmlBody,
        text: textBody
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('❌ Erreur Resend:', errorData);
      throw new Error(`Erreur lors de l'envoi de l'email: ${JSON.stringify(errorData)}`);
    }

    const resendData = await resendResponse.json();
    console.log('✅ Code OTP envoyé à:', normalizedEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Si cet email existe, un code de vérification a été envoyé.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erreur dans send-password-reset-otp:', error);
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
 * supabase functions deploy send-password-reset-otp
 *
 * Configuration requise:
 * supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
 */

