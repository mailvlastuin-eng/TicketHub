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
  } = options;

  // Render a 1-of-1 pixel perfect Ticketmaster transfer template matching Figma
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket Transfer Is On The Way</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F3F4F6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 0px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <!-- Blue Ticketmaster Header (height increased by 30%) -->
          <tr>
            <td align="center" style="background-color: #0053CD; padding: 24px 0;">
              <!-- Stylized White Logo to render correctly across 100% of email clients without image blocking -->
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; font-style: italic; color: #ffffff; letter-spacing: -1.2px; text-transform: lowercase; line-height: 1;">
                    ticketmaster<span style="font-size: 10px; vertical-align: super; font-style: normal; font-weight: normal; margin-left: 2px;">®</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding: 24px 20px 10px 20px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; color: #111827; line-height: 1.3; text-align: center;">
                Your Ticket Transfer Is On The Way To<br>${buyerName}!
              </h1>
            </td>
          </tr>

          <!-- Horizontal Progress Bar (Fixed Aspect Ratios to enforce circles instead of ovals) -->
          <tr>
            <td align="center" style="padding: 10px 40px 24px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 320px;">
                <tr>
                  <!-- Step 1: Sent -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="background-color: #0053CD; border-radius: 50%; width: 36px; height: 36px; margin: 0 auto; text-align: center;">
                            <img src="https://img.icons8.com/ios-filled/32/ffffff/ticket.png" width="16" height="16" style="display: inline-block; vertical-align: middle; margin-top: 10px;" alt="Sent" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #0053CD; padding-top: 6px;">
                          Sent
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Connection Line 1 -->
                  <td align="center" style="vertical-align: middle; padding-bottom: 16px;">
                    <div style="border-top: 1px solid #D1D5DB; height: 1px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 2: Accepted -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="border: 1.5px dashed #9CA3AF; border-radius: 50%; width: 33px; height: 33px; background-color: #ffffff; margin: 0 auto; text-align: center;">
                            <img src="https://img.icons8.com/ios/32/9CA3AF/ok--v1.png" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-top: 9px;" alt="Accepted" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #9CA3AF; padding-top: 6px;">
                          Accepted
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Connection Line 2 -->
                  <td align="center" style="vertical-align: middle; padding-bottom: 16px;">
                    <div style="border-top: 1px solid #D1D5DB; height: 1px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 3: Complete -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="border: 1.5px dashed #9CA3AF; border-radius: 50%; width: 33px; height: 33px; background-color: #ffffff; margin: 0 auto; text-align: center;">
                            <img src="https://img.icons8.com/ios/32/9CA3AF/ticket.png" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-top: 9px;" alt="Complete" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #9CA3AF; padding-top: 6px;">
                          Complete
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Event Detail Card (Rounded edges removed) -->
          <tr>
            <td align="center" style="padding: 0 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E5E7EB; border-radius: 0px; overflow: hidden; background-color: #ffffff;">
                <!-- Event Image -->
                <tr>
                  <td align="center" style="line-height: 0;">
                    <img src="${ticketImage}" width="100%" height="220" style="width: 100%; height: 220px; object-fit: cover; display: block;" alt="${ticketTitle}" />
                  </td>
                </tr>
                <!-- Text Details -->
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #111827; line-height: 1.3;">
                      ${ticketTitle}
                    </h2>
                    <p style="margin: 0 0 6px 0; font-family: Arial, sans-serif; font-size: 14px; color: #4B5563;">
                      ${ticketDate}
                    </p>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #4B5563;">
                      ${ticketVenue}
                    </p>
                  </td>
                </tr>
                <!-- Section Seat Designation Header Block -->
                <tr>
                  <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 12px 20px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111827;">
                    ${seatDetails}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Descriptions -->
          <tr>
            <td style="padding: 24px; font-family: Arial, sans-serif;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #111827;">
                Transfer Status: Sent
              </p>
              <p style="margin: 0 20px 20px 0; font-size: 14px; color: #4B5563; line-height: 1.5;">
                Your ticket transfer is in the world. There are now ${quantity} ticket(s) heading to ${buyerName} at <a href="mailto:${buyerEmail}" style="color: #0053CD; text-decoration: none;">${buyerEmail}</a>
              </p>

              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #111827;">
                What's next?
              </p>
              <p style="margin: 0 20px 20px 0; font-size: 14px; color: #4B5563; line-height: 1.5;">
                Once ${buyerName} accepts your ticket transfer - everything is all set. Just in case something changes, you can cancel your ticket transfer request - as long as the tickets have not been accepted.
              </p>

              <p style="margin: 0; font-size: 14px; color: #4B5563;">
                To view and manage your ticket transfer, please visit <a href="${eventDetailsUrl}" style="color: #0053CD; font-weight: bold; text-decoration: none;">Event Details</a>
              </p>
            </td>
          </tr>

          <!-- Help/Support section -->
          <tr>
            <td align="center" style="padding: 10px 24px 30px 24px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #6B7280; line-height: 1.5; text-align: center;">
                We're here to help.<br>
                If you have any questions, please <a href="#" style="color: #0053CD; text-decoration: none; font-weight: bold;">contact</a> Ticketmaster Fan Support
              </p>
            </td>
          </tr>

          <!-- Blue Footer -->
          <tr>
            <td align="center" style="background-color: #0053CD; padding: 24px 20px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.4; text-align: center;">
                Ticketmaster, Attn: Fan Support<br>
                1000 corporate Landing, Charleston, WV 25311
              </p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #93C5FD; text-align: center;">
                ©2026 Ticketmaster. All rights reserved.
              </p>
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
