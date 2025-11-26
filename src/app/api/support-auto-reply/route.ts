import { NextRequest, NextResponse } from 'next/server';

const SUPPORT_EMAIL = 'support@hallia.ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, name, ticketId } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Email destinataire manquant' },
        { status: 400 }
      );
    }

    console.log('[Auto Reply] 📧 Envoi de la réponse automatique à:', to);

    // Récupérer l'API key Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn('[Auto Reply] ⚠️ RESEND_API_KEY non configuré');
      return NextResponse.json(
        { error: 'Service d\'email non configuré' },
        { status: 500 }
      );
    }

    // Construire le message de réponse automatique
    const subject = ticketId 
      ? `Votre demande de support #${ticketId} a été reçue` 
      : 'Votre demande de support a été reçue';

    const greeting = name ? `Bonjour ${name},` : 'Bonjour,';

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Hall Mail</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); padding: 50px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">Hall Mail</h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 0; font-size: 15px;">Support Client</p>
            </td>
          </tr>

          <!-- Badge confirmation -->
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <div style="display: inline-block; background-color: #D1FAE5; border: 2px solid #10B981; padding: 16px 24px; border-radius: 8px;">
                <p style="color: #065F46; margin: 0; font-size: 18px; font-weight: 600;">
                  ✓ Demande reçue avec succès
                </p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                ${greeting}
              </p>

              <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                Nous avons bien reçu votre message de support et notre équipe l'examine actuellement. Nous vous répondrons dans les plus brefs délais, généralement sous <strong style="color: #F97316;">24 heures</strong>.
              </p>

              ${ticketId ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0 0 8px 0; color: #92400E; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Référence de votre ticket
                    </p>
                    <p style="margin: 0; color: #92400E; font-size: 24px; font-weight: 700; letter-spacing: 1px;">
                      #${ticketId}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="color: #111827; font-size: 17px; margin: 0 0 16px 0; font-weight: 600;">En attendant notre réponse</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #F97316; color: white; text-align: center; border-radius: 50%; font-weight: 600; line-height: 24px; font-size: 12px; margin-right: 8px;">1</span>
                          Vérifiez que vous avez bien reçu cet email de confirmation
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #F97316; color: white; text-align: center; border-radius: 50%; font-weight: 600; line-height: 24px; font-size: 12px; margin-right: 8px;">2</span>
                          Gardez votre référence de ticket pour tout suivi
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #F97316; color: white; text-align: center; border-radius: 50%; font-weight: 600; line-height: 24px; font-size: 12px; margin-right: 8px;">3</span>
                          Notre équipe reviendra vers vous très rapidement
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0;">
                  Merci de votre confiance,<br>
                  <strong style="color: #F97316; font-size: 16px;">L'équipe Hall Mail</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 12px 0;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 16px 0;">
                Pour toute question, contactez-nous à<br>
                <a href="mailto:${SUPPORT_EMAIL}" style="color: #F97316; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>
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

    console.log('[Auto Reply] 📧 Envoi via Resend à:', to);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Hall Mail <support@help.hallia.ai>',
        to: [to],
        subject: subject,
        html: htmlBody,
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('[Auto Reply] ❌ Erreur Resend:', errorData);
      return NextResponse.json(
        { error: `Erreur Resend: ${JSON.stringify(errorData)}` },
        { status: 500 }
      );
    }

    const resendData = await resendResponse.json();
    console.log('[Auto Reply] ✅ Email envoyé via Resend:', resendData);

    return NextResponse.json({
      success: true,
      message: 'Email de confirmation envoyé',
      to,
      subject,
      ticketId,
      emailId: resendData.id
    });

  } catch (error: any) {
    console.error('[Auto Reply] ❌ Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

