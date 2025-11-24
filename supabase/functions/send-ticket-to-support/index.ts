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
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; background-color: #ffffff;">
          <!-- Header -->
          <tr>
            <td style="background-color: #F97316; padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">🎫 Nouveau Ticket de Support</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; font-family: Arial, sans-serif;">
                ${ticketId ? `Ticket #${ticketId}` : 'Support Veille IA'}
              </p>
            </td>
          </tr>

          <!-- Ticket Info -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-family: Arial, sans-serif;">Informations du client</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #78716c; font-size: 14px; width: 120px; font-family: Arial, sans-serif;"><strong>Nom :</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #78716c; font-size: 14px; font-family: Arial, sans-serif;"><strong>Email :</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">
                          <a href="mailto:${email}" style="color: #F97316; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #78716c; font-size: 14px; font-family: Arial, sans-serif;"><strong>Catégorie :</strong></td>
                        <td style="padding: 8px 0;">
                          <span style="background-color: #f97316; color: white; padding: 4px 12px; font-size: 12px; font-weight: bold; font-family: Arial, sans-serif;">
                            ${categoryLabel}
                          </span>
                        </td>
                      </tr>
                      ${ticketId ? `
                      <tr>
                        <td style="padding: 8px 0; color: #78716c; font-size: 14px; font-family: Arial, sans-serif;"><strong>Ticket ID :</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: monospace;">#${ticketId}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Sujet -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="border-bottom: 2px solid #f97316; padding-bottom: 5px;">
                    <h3 style="color: #1f2937; font-size: 16px; margin: 0; font-family: Arial, sans-serif;">
                      📌 Sujet
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 10px;">
                    <p style="color: #374151; font-size: 15px; margin: 0; font-weight: 600; font-family: Arial, sans-serif;">
                      ${subject}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="border-bottom: 2px solid #f97316; padding-bottom: 5px;">
                    <h3 style="color: #1f2937; font-size: 16px; margin: 0; font-family: Arial, sans-serif;">
                      💬 Message
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 10px;">
                    <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb;">
                      <tr>
                        <td>
                          <p style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap; font-family: Arial, sans-serif;">${message}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${screenshots && screenshots.length > 0 ? `
              <!-- Captures d'écran -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="border-bottom: 2px solid #f97316; padding-bottom: 5px;">
                    <h3 style="color: #1f2937; font-size: 16px; margin: 0; font-family: Arial, sans-serif;">
                      📸 Captures d'écran (${screenshots.length})
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 10px;">
                    <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background-color: #eff6ff; border: 1px solid #dbeafe;">
                      <tr>
                        <td>
                          ${screenshots.map((url: string, index: number) => `
                            <p style="margin: 0 0 10px 0;">
                              <a href="${url}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 14px; font-family: Arial, sans-serif;">
                                <span style="background-color: #2563eb; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold;">
                                  ${index + 1}
                                </span>
                                Capture ${index + 1} - Voir l'image
                              </a>
                            </p>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Action button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td align="center">
                    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}"
                       style="display: inline-block; background-color: #F97316; color: white; padding: 14px 30px; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;">
                      ↩️ Répondre au client
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
                Ticket reçu le ${new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Veille IA - Système de support
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
🎫 NOUVEAU TICKET DE SUPPORT

${ticketId ? `Ticket #${ticketId}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 INFORMATIONS CLIENT

Nom : ${name}
Email : ${email}
Catégorie : ${categoryLabel}
${ticketId ? `Ticket ID : #${ticketId}` : ''}

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

Pour répondre au client : ${email}

---

Ticket reçu le ${new Date().toLocaleString('fr-FR')}
© ${new Date().getFullYear()} Veille IA
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
        from: 'Veille IA <support@help.hallia.ai>',
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

