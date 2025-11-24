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
  <title>Support Veille IA</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff;">
          <!-- Header -->
          <tr>
            <td style="background-color: #F97316; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; font-family: Arial, sans-serif;">Veille IA</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; font-family: Arial, sans-serif;">Support Client</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">Votre demande a été reçue ✓</h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                ${greeting}
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                Nous avons bien reçu votre message de support et notre équipe l'examine actuellement. Nous vous répondrons dans les plus brefs délais, généralement sous <strong>24 heures</strong>.
              </p>

              ${ticketId ? `
              <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-family: Arial, sans-serif;">
                      <strong>Référence de votre ticket :</strong><br>
                      <span style="font-size: 18px; font-weight: bold;">#${ticketId}</span>
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color: #f3f4f6; margin: 30px 0;">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">En attendant notre réponse :</h3>
                    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px; font-family: Arial, sans-serif;">
                      <li>Vérifiez que vous avez bien reçu cet email de confirmation</li>
                      <li>Consultez notre <a href="#" style="color: #F97316; text-decoration: none;">documentation</a> pour des solutions rapides</li>
                      <li>Gardez votre référence de ticket pour tout suivi</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; font-family: Arial, sans-serif;">
                Merci de votre confiance,<br>
                <strong style="color: #F97316;">L'équipe Veille IA</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 0; font-family: Arial, sans-serif;">
                Pour toute question, contactez-nous à <a href="mailto:${SUPPORT_EMAIL}" style="color: #F97316; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Veille IA - Tous droits réservés
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
${greeting}

Nous avons bien reçu votre message de support et notre équipe l'examine actuellement. Nous vous répondrons dans les plus brefs délais, généralement sous 24 heures.

${ticketId ? `Référence de votre ticket : #${ticketId}` : ''}

En attendant notre réponse :
- Vérifiez que vous avez bien reçu cet email de confirmation
- Consultez notre documentation pour des solutions rapides
- Gardez votre référence de ticket pour tout suivi

Merci de votre confiance,
L'équipe Veille IA

---
Cet email a été envoyé automatiquement, merci de ne pas y répondre.
Pour toute question, contactez-nous à ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} Veille IA - Tous droits réservés
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
        from: 'Veille IA <support@help.hallia.ai>',
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

