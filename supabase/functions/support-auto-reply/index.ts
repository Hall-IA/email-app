// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPPORT_EMAIL = 'support@hallia.ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { to, name, ticketId } = await req.json();

    if (!to) {
      throw new Error('Email destinataire manquant');
    }

    console.log('📧 Envoi de la réponse automatique à:', to);

    // Construire le message de réponse automatique
    const subject = ticketId ? `Votre demande de support #${ticketId} a été reçue` : 'Votre demande de support a été reçue';

    const greeting = name ? `Bonjour ${name},` : 'Bonjour,';

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Hall Mail</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: 'Roboto', Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); padding: 50px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; letter-spacing: -0.5px;">Hall Mail</h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 0; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; font-weight: 300;">
                Support Client
              </p>
            </td>
          </tr>

          <!-- Badge confirmation -->
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <div style="display: inline-block; background-color: #D1FAE5; border: 2px solid #10B981; padding: 16px 24px; border-radius: 8px;">
                <p style="color: #065F46; margin: 0; font-size: 18px; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">
                  ✓ Demande reçue avec succès
                </p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0; font-family: 'Roboto', Arial, sans-serif;">
                ${greeting}
              </p>

              <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0; font-family: 'Roboto', Arial, sans-serif;">
                Nous avons bien reçu votre message de support et notre équipe l'examine actuellement. Nous vous répondrons dans les plus brefs délais, généralement sous <strong style="color: #F97316;">24 heures</strong>.
              </p>

              ${ticketId ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0 0 8px 0; color: #92400E; font-size: 13px; font-family: 'Roboto', Arial, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Référence de votre ticket
                    </p>
                    <p style="margin: 0; color: #92400E; font-size: 24px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; letter-spacing: 1px;">
                      #${ticketId}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="color: #111827; font-size: 17px; margin: 0 0 16px 0; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">En attendant notre réponse</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #4B5563; font-size: 14px; line-height: 1.6; font-family: 'Roboto', Arial, sans-serif;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #F97316; color: white; text-align: center; border-radius: 50%; font-weight: 600; line-height: 24px; font-size: 12px; margin-right: 8px;">1</span>
                          Vérifiez que vous avez bien reçu cet email de confirmation
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4B5563; font-size: 14px; line-height: 1.6; font-family: 'Roboto', Arial, sans-serif;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #F97316; color: white; text-align: center; border-radius: 50%; font-weight: 600; line-height: 24px; font-size: 12px; margin-right: 8px;">2</span>
                          Gardez votre référence de ticket pour tout suivi
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4B5563; font-size: 14px; line-height: 1.6; font-family: 'Roboto', Arial, sans-serif;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #F97316; color: white; text-align: center; border-radius: 50%; font-weight: 600; line-height: 24px; font-size: 12px; margin-right: 8px;">3</span>
                          Notre équipe reviendra vers vous très rapidement
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0; font-family: 'Roboto', Arial, sans-serif;">
                  Merci de votre confiance,<br>
                  <strong style="background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 16px;">L'équipe Hall Mail</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 12px 0; font-family: 'Roboto', Arial, sans-serif;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 16px 0; font-family: 'Roboto', Arial, sans-serif;">
                Pour toute question, contactez-nous à<br>
                <a href="mailto:${SUPPORT_EMAIL}" style="color: #F97316; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; font-family: 'Roboto', Arial, sans-serif;">
                © ${new Date().getFullYear()} Hall Mail - Tous droits réservés
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
         HALL MAIL - SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ DEMANDE REÇUE AVEC SUCCÈS

${greeting}

Nous avons bien reçu votre message de support et notre équipe l'examine actuellement. 
Nous vous répondrons dans les plus brefs délais, généralement sous 24 heures.

${ticketId ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 RÉFÉRENCE DE VOTRE TICKET
#${ticketId}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EN ATTENDANT NOTRE RÉPONSE :

1. Vérifiez que vous avez bien reçu cet email de confirmation
2. Gardez votre référence de ticket pour tout suivi
3. Notre équipe reviendra vers vous très rapidement

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Merci de votre confiance,
L'équipe Hall Mail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cet email a été envoyé automatiquement, merci de ne pas y répondre.
Pour toute question, contactez-nous à ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} Hall Mail - Tous droits réservés
    `.trim();

    // Envoyer l'email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY non configuré - Email non envoyé');
      return new Response(JSON.stringify({
        success: false,
        error: 'Service d\'email non configuré'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('📧 Envoi via Resend à:', to);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Hall Mail <support@help.hallia.ai>',
        to: [
          to
        ],
        subject: subject,
        html: htmlBody,
        text: textBody
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('❌ Erreur Resend:', errorData);
      throw new Error(`Erreur Resend: ${JSON.stringify(errorData)}`);
    }

    const resendData = await resendResponse.json();
    console.log('✅ Email envoyé via Resend:', resendData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email de confirmation envoyé',
      to,
      subject,
      ticketId,
      emailId: resendData.id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans support-auto-reply:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Erreur inconnue',
      details: error.toString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

/* To deploy this function:
 *
 * 1. Install Supabase CLI: https://supabase.com/docs/guides/cli
 * 2. Login: supabase login
 * 3. Link your project: supabase link --project-ref your-project-ref
 * 4. Deploy: supabase functions deploy support-auto-reply
 *
 * To test locally:
 * supabase functions serve support-auto-reply --env-file .env.local
 *
 * To invoke:
 * curl -i --location --request POST 'http://localhost:54321/functions/v1/support-auto-reply' \
 *   --header 'Authorization: Bearer YOUR_ANON_KEY' \
 *   --header 'Content-Type: application/json' \
 *   --data '{"to":"user@example.com","name":"John","ticketId":"123"}'
 */

