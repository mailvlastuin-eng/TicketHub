export interface SendTransferEmailOptions {
  buyerName: string;
  buyerEmail: string;
  note: string;
  ticketTitle: string;
  ticketDate: string;
  ticketVenue: string;
  ticketImage: string;
  seatDetails: string;
  quantity: number;
  eventDetailsUrl: string;
  senderName?: string;
  senderEmail?: string;
}

export function compileTransferEmailHtml(options: SendTransferEmailOptions): string {
  const {
    buyerName,
    buyerEmail,
    ticketTitle,
    ticketDate,
    ticketVenue,
    ticketImage,
    seatDetails,
    quantity,
    eventDetailsUrl,
    senderName = "JACQUELINE",
  } = options;

  // Render a 1-of-1 pixel perfect Ticketmaster Congratulations template matching the screenshot
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations! Your ticket(s) has been accepted</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F6F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F6F6F6; padding: 0; margin: 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Absolutely 0px border-radius) -->
        <table border="0" cellpadding="0" cellspacing="0" width="480" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 0px; overflow: hidden; border-collapse: collapse; margin: 0 auto;">
          
          <!-- Blue Ticketmaster Header Bar (Square corner) -->
          <tr>
            <td align="center" style="background-color: #0052cd; padding: 20px 0; border-radius: 0px; line-height: 1;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 26px; font-weight: bold; font-style: italic; color: #ffffff; letter-spacing: -1.2px; text-transform: lowercase; line-height: 1;">
                    ticketmaster<span style="font-size: 10px; vertical-align: super; font-style: normal; font-weight: normal; margin-left: 2px;">®</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Circle with checkmark -->
          <tr>
            <td align="center" style="padding: 40px 20px 0 20px;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" valign="middle" width="110" height="110" style="background-color: #0052cd; border-radius: 50%; width: 110px; height: 110px; text-align: center; line-height: 110px;">
                    <img src="https://img.icons8.com/ios-glyphs/90/ffffff/checkmark.png" width="56" height="56" style="display: inline-block; vertical-align: middle; margin-top: 4px;" alt="Success" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 30px 20px 0 20px;">
              <h2 style="margin: 0; font-family: Arial, sans-serif; font-size: 25px; font-weight: bold; color: #000000; text-align: center; line-height: 1.2;">
                Congratulations!
              </h2>
              <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 500; color: #374151; text-align: center; line-height: 1.2;">
                Your ticket(s) has been accepted
              </p>
            </td>
          </tr>

          <!-- Subtext instructions -->
          <tr>
            <td align="center" style="padding: 30px 24px 0 24px;">
              <h3 style="margin: 0; font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; color: #000000; text-align: center; line-height: 1.45; max-width: 340px;">
                To view the ticket(s), sign into your Ticketmaster account or create a new one.
              </h3>
            </td>
          </tr>

          <!-- Alert Box -->
          <tr>
            <td align="center" style="padding: 30px 24px 0 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ECF2FF; border-left: 6px solid #0052cd; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #1e293b; text-align: left; line-height: 1.5;">
                    Tickets may take up to 24 hours to appear in your account, but will be always available 24 hours before the event.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Action Button (Zero border-radius) -->
          <tr>
            <td align="center" style="padding: 40px 24px 48px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${eventDetailsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; background-color: #0052cd; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 0; text-align: center; border-radius: 0px; box-sizing: border-box; border: 0;">
                      Sign in / Create account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(options: { to: string; subject: string; html: string }) {
  const { to, subject, html } = options;

  // Retrieve API Keys
  const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY || process.env.VITE_SENDGRID_API_KEY;

  // 1. Resend Integration
  if (resendApiKey) {
    console.log('Sending email via Resend to:', to);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Ticketmaster Fan Support <noreply@resend.dev>', // Resend sandbox domain default sender
          to: [to],
          subject: subject,
          html: html,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend send failed: ${res.status} - ${err}`);
      }
      return { success: true, provider: 'resend' };
    } catch (err: any) {
      console.error('Resend error:', err);
      throw err;
    }
  }

  // 2. SendGrid Integration
  if (sendgridApiKey) {
    console.log('Sending email via SendGrid to:', to);
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'noreply@ticketmaster.com', name: 'Ticketmaster Support' },
          subject: subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid send failed: ${res.status} - ${err}`);
      }
      return { success: true, provider: 'sendgrid' };
    } catch (err: any) {
      console.error('SendGrid error:', err);
      throw err;
    }
  }
  // 3. Google Apps Script Web App Integration
  let googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL;
  if (googleScriptUrl) {
    googleScriptUrl = googleScriptUrl.trim();
    if (!googleScriptUrl.startsWith('http')) {
      // If user only pasted the deployment ID, auto-wrap it into the standard Google Web App URL
      googleScriptUrl = `https://script.google.com/macros/s/${googleScriptUrl}/exec`;
    }
    console.log('Sending email via Google Apps Script to:', to);
    try {
      const res = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google Apps Script failed: ${res.status} - ${err}`);
      }
      return { success: true, provider: 'google_script' };
    } catch (err: any) {
      console.error('Google Apps Script error:', err);
      throw err;
    }
  }

  // 4. Fallback/Console Log mode for local testing
  console.log('\n=======================================');
  console.log('📬  EMAIL SERVICE SIMULATION (LOCAL LOG)');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('HTML template successfully generated.');
  console.log('=======================================\n');
  
  return { success: true, provider: 'simulation' };
}
