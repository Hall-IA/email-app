// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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
    const { ticketId, name, email, category, subject, message, screenshots } = await req.json();

    if (!email || !name || !message) {
      throw new Error('Données du ticket incomplètes');
    }

    console.log('📧 Envoi du ticket au support:', ticketId);

    // Récupérer l'utilisateur authentifié
    const authHeader = req.headers.get('Authorization');
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

    // Extraire le token JWT
    const token = authHeader?.replace('Bearer ', '');
    let userId = null;

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Sauvegarder le ticket dans la base de données
    console.log('💾 Sauvegarde du ticket dans la base de données...');
    
    // Les screenshots sont maintenant des URLs publiques du bucket Storage
    const screenshotsArray = Array.isArray(screenshots) ? screenshots : [];
    
    const { error: dbError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        name,
        email,
        category,
        subject,
        message,
        screenshots: screenshotsArray, // URLs publiques des images
        status: 'new',
        admin_notes: ticketId ? `Ticket ID: ${ticketId}` : null
      });

    if (dbError) {
      console.error('⚠️ Erreur lors de la sauvegarde du ticket (non bloquant):', dbError);
      // Ne pas bloquer l'envoi de l'email si l'insertion en BDD échoue
    } else {
      console.log('✅ Ticket sauvegardé dans la base de données');
    }

    // Récupérer l'API key Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('⚠️ RESEND_API_KEY non configuré');
      throw new Error('Service d\'email non configuré');
    }

    const categoryLabels = {
      question: 'Question',
      bug: 'Bug / Problème technique',
      feature: 'Demande de fonctionnalité',
      other: 'Autre'
    };

    const categoryLabel = categoryLabels[category] || category;

    // Construire l'email pour le support
    const emailSubject = ticketId ? `[Ticket #${ticketId}] ${categoryLabel} - ${subject}` : `[Support] ${categoryLabel} - ${subject}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau ticket de support</title>
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
        <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); padding: 50px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; letter-spacing: -0.5px;">Hall Mail</h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 0; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; font-weight: 300;">
                Système de Support
              </p>
              ${ticketId ? `
              <div style="margin-top: 20px; display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 20px; border-radius: 20px;">
                <p style="color: #ffffff; margin: 0; font-size: 13px; font-family: 'Roboto', Arial, sans-serif;">Ticket #${ticketId}</p>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Badge nouveau ticket -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <div style="display: inline-block; background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 20px; border-radius: 6px; margin-bottom: 20px;">
                <p style="color: #92400E; margin: 0; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">
                  🎫 Nouveau Ticket de Support
                </p>
              </div>
            </td>
          </tr>

          <!-- Informations client -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 18px; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">Informations du client</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; width: 140px; font-family: 'Roboto', Arial, sans-serif;">Nom</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; font-weight: 500;">${name}</td>
                      </tr>
                      <tr style="border-top: 1px solid #E5E7EB;">
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-family: 'Roboto', Arial, sans-serif;">Email</td>
                        <td style="padding: 10px 0;">
                          <a href="mailto:${email}" style="color: #F97316; text-decoration: none; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; font-weight: 500;">${email}</a>
                        </td>
                      </tr>
                      <tr style="border-top: 1px solid #E5E7EB;">
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; font-family: 'Roboto', Arial, sans-serif;">Catégorie</td>
                        <td style="padding: 10px 0;">
                          <span style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); color: white; padding: 6px 14px; font-size: 12px; font-weight: 600; font-family: 'Roboto', Arial, sans-serif; border-radius: 6px;">
                            ${categoryLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sujet -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">Sujet</h3>
              <div style="background-color: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 8px; padding: 16px;">
                <p style="color: #374151; font-size: 15px; margin: 0; font-weight: 500; font-family: 'Roboto', Arial, sans-serif; line-height: 1.6;">
                  ${subject}
                </p>
              </div>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">Message</h3>
              <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px;">
                <p style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap; font-family: 'Roboto', Arial, sans-serif;">${message}</p>
              </div>
            </td>
          </tr>

          ${screenshots && screenshots.length > 0 ? `
          <!-- Captures d'écran -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; font-family: 'Roboto', Arial, sans-serif; font-weight: 600;">Captures d'écran (${screenshots.length})</h3>
              <div style="background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 8px; padding: 20px;">
                ${screenshots.map((url: string, index: number) => `
                  <div style="margin-bottom: ${index < screenshots.length - 1 ? '12px' : '0'};">
                    <a href="${url}" target="_blank" style="color: #2563EB; text-decoration: none; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; font-weight: 500; display: inline-flex; align-items: center;">
                      <span style="background-color: #2563EB; color: white; padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; margin-right: 10px;">
                        ${index + 1}
                      </span>
                      Voir la capture ${index + 1}
                    </a>
                  </div>
                `).join('')}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Bouton d'action -->
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}"
                 style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); color: white; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; border-radius: 8px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                Répondre au client
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px 0; font-family: 'Roboto', Arial, sans-serif;">
                Ticket reçu le ${new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}
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

🎫 NOUVEAU TICKET DE SUPPORT
${ticketId ? `Ticket #${ticketId}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 INFORMATIONS CLIENT

Nom          : ${name}
Email        : ${email}
Catégorie    : ${categoryLabel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 SUJET

${subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 MESSAGE

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${screenshots && screenshots.length > 0 ? `
📸 CAPTURES D'ÉCRAN (${screenshots.length})

${screenshots.map((url: string, index: number) => `${index + 1}. ${url}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

↩️  Pour répondre au client : ${email}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ticket reçu le ${new Date().toLocaleString('fr-FR')}

© ${new Date().getFullYear()} Hall Mail - Tous droits réservés
    `.trim();

    console.log('📧 Envoi via Resend au support:', SUPPORT_EMAIL);

    // Envoyer l'email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Hall Mail <support@help.hallia.ai>',
        to: [
          SUPPORT_EMAIL
        ],
        reply_to: email,
        subject: emailSubject,
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
    console.log('✅ Email envoyé au support:', resendData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Ticket envoyé au support',
      emailId: resendData.id,
      ticketId
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans send-ticket-to-support:', error);
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
 * supabase functions deploy send-ticket-to-support
 *
 * Configuration requise:
 * supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
 */

