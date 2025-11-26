import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { parse } from 'cookie';

const SUPPORT_EMAIL = 'support@hallia.ai';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification (optionnel pour le support)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    let userId: string | null = null;
    
    if (token) {
      const result = await getUserFromToken(token);
      userId = result.user?.id || null;
    }

    // Récupérer les données du ticket
    const body = await request.json();
    const { ticketId, name, email, category, subject, message, screenshots } = body;

    if (!email || !name || !message) {
      return NextResponse.json(
        { error: 'Données du ticket incomplètes' },
        { status: 400 }
      );
    }

    console.log('[Send Ticket] 📧 Envoi du ticket au support:', ticketId);

    // Sauvegarder le ticket dans la base de données
    console.log('[Send Ticket] 💾 Sauvegarde dans la base de données...');
    
    // Sauvegarder les données complètes (avec base64) dans la BDD
    const screenshotsArray = Array.isArray(screenshots) ? screenshots : [];
    
    try {
      await query(
        `INSERT INTO support_tickets 
         (user_id, name, email, category, subject, message, screenshots, status, admin_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW(), NOW())`,
        [
          userId,
          name,
          email,
          category,
          subject,
          message,
          JSON.stringify(screenshotsArray), // Sauvegarder les objets complets avec base64
          'new',
          ticketId ? `Ticket ID: ${ticketId}` : null
        ]
      );
      console.log('[Send Ticket] ✅ Ticket sauvegardé dans la base de données (avec captures d\'écran base64)');
    } catch (dbError) {
      console.error('[Send Ticket] ⚠️ Erreur sauvegarde BDD (non bloquant):', dbError);
      // Ne pas bloquer l'envoi de l'email si l'insertion en BDD échoue
    }

    // Récupérer l'API key Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('[Send Ticket] ⚠️ RESEND_API_KEY non configuré');
      return NextResponse.json(
        { error: 'Service d\'email non configuré' },
        { status: 500 }
      );
    }

    const categoryLabels: Record<string, string> = {
      question: 'Question',
      bug: 'Bug / Problème technique',
      feature: 'Demande de fonctionnalité',
      other: 'Autre'
    };

    const categoryLabel = categoryLabels[category] || category;

    // Construire l'email pour le support
    const emailSubject = ticketId 
      ? `[Ticket #${ticketId}] ${categoryLabel} - ${subject}` 
      : `[Support] ${categoryLabel} - ${subject}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau ticket de support</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); padding: 50px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">Hall Mail</h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 0; font-size: 15px;">Système de Support</p>
              ${ticketId ? `
              <div style="margin-top: 20px; display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 20px; border-radius: 20px;">
                <p style="color: #ffffff; margin: 0; font-size: 13px;">Ticket #${ticketId}</p>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Badge nouveau ticket -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <div style="display: inline-block; background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 20px; border-radius: 6px;">
                <p style="color: #92400E; margin: 0; font-size: 14px; font-weight: 600;">🎫 Nouveau Ticket de Support</p>
              </div>
            </td>
          </tr>

          <!-- Informations client -->
          <tr>
            <td style="padding: 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Informations du client</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px; width: 140px;">Nom</td>
                        <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 500;">${name}</td>
                      </tr>
                      <tr style="border-top: 1px solid #E5E7EB;">
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Email</td>
                        <td style="padding: 10px 0;">
                          <a href="mailto:${email}" style="color: #F97316; text-decoration: none; font-size: 14px; font-weight: 500;">${email}</a>
                        </td>
                      </tr>
                      <tr style="border-top: 1px solid #E5E7EB;">
                        <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Catégorie</td>
                        <td style="padding: 10px 0;">
                          <span style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); color: white; padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 6px;">
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
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Sujet</h3>
              <div style="background-color: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 8px; padding: 16px;">
                <p style="color: #374151; font-size: 15px; margin: 0; font-weight: 500; line-height: 1.6;">${subject}</p>
              </div>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Message</h3>
              <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px;">
                <p style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
            </td>
          </tr>

          ${screenshots && screenshots.length > 0 ? `
          <!-- Captures d'écran -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Captures d'écran (${screenshots.length})</h3>
              <div style="background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 8px; padding: 20px;">
                ${screenshots.map((screenshot: any, index: number) => {
                  // Support ancien format (URLs) et nouveau format (objets base64)
                  if (typeof screenshot === 'string') {
                    // Ancien format : URL
                    return `
                      <div style="margin-bottom: ${index < screenshots.length - 1 ? '20px' : '0'};">
                        <p style="color: #1F2937; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
                          <span style="background-color: #2563EB; color: white; padding: 4px 10px; font-size: 12px; border-radius: 4px; margin-right: 8px;">${index + 1}</span>
                          Capture ${index + 1}
                        </p>
                        <a href="${screenshot}" target="_blank" style="color: #2563EB; text-decoration: underline; font-size: 13px;">Voir l'image</a>
                      </div>
                    `;
                  } else {
                    // Nouveau format : objet avec base64
                    return `
                      <div style="margin-bottom: ${index < screenshots.length - 1 ? '20px' : '0'};">
                        <p style="color: #1F2937; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
                          <span style="background-color: #2563EB; color: white; padding: 4px 10px; font-size: 12px; border-radius: 4px; margin-right: 8px;">${index + 1}</span>
                          ${screenshot.name || `Capture ${index + 1}`}
                        </p>
                        <img src="${screenshot.data}" alt="${screenshot.name || 'Screenshot'}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                      </div>
                    `;
                  }
                }).join('')}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Bouton d'action -->
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}"
                 style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); color: white; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                Répondre au client
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px 0;">
                Ticket reçu le ${new Date().toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
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

    console.log('[Send Ticket] 📧 Envoi via Resend au support:', SUPPORT_EMAIL);

    // Envoyer l'email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Hall Mail <support@help.hallia.ai>',
        to: [SUPPORT_EMAIL],
        reply_to: email,
        subject: emailSubject,
        html: htmlBody,
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('[Send Ticket] ❌ Erreur Resend:', errorData);
      return NextResponse.json(
        { error: `Erreur Resend: ${JSON.stringify(errorData)}` },
        { status: 500 }
      );
    }

    const resendData = await resendResponse.json();
    console.log('[Send Ticket] ✅ Email envoyé au support:', resendData);

    return NextResponse.json({
      success: true,
      message: 'Ticket envoyé au support',
      emailId: resendData.id,
      ticketId
    });

  } catch (error: any) {
    console.error('[Send Ticket] ❌ Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

