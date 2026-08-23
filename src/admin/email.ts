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

  // Render a 1-of-1 pixel perfect Ticketmaster transfer template matching the screenshot
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket Transfer From ${senderName.toUpperCase()} is Ready To Be Accepted!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F6F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F6F6F6; padding: 0; margin: 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Absolutely 0px border-radius) -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 0px; overflow: hidden; border-collapse: collapse; margin: 0 auto;">
          
          <!-- Blue Ticketmaster Header Bar (Square corner) -->
          <tr>
            <td align="center" style="background-color: #0053CD; padding: 18px 0; border-radius: 0px; line-height: 1;">
              <!-- Stylized White Logo to render correctly across 100% of email clients without image blocking -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 26px; font-weight: bold; font-style: italic; color: #ffffff; letter-spacing: -1.2px; text-transform: lowercase; line-height: 1;">
                    ticketmaster<span style="font-size: 10px; vertical-align: super; font-style: normal; font-weight: normal; margin-left: 2px;">®</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title (Centred text matching screenshot font sizes) -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; color: #000000; line-height: 1.35; text-align: center; letter-spacing: -0.2px;">
                Your Ticket Transfer From ${senderName.toUpperCase()} is<br>Ready To Be Accepted!
              </h1>
            </td>
          </tr>

          <!-- Horizontal Progress Bar (Fixed Aspect Ratios, 1.2px outline dashed circles) -->
          <tr>
            <td align="center" style="padding: 10px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 320px; width: 100%;">
                <tr>
                  <!-- Step 1: Sent -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="background-color: #0053CD; border-radius: 50%; width: 36px; height: 36px; margin: 0 auto; text-align: center; line-height: 36px;">
                            <img src="https://img.icons8.com/ios-filled/32/ffffff/ticket.png" width="16" height="16" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Sent" />
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
                    <div style="border-top: 1px solid #CCCCCC; height: 1px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 2: Accepted -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="border: 1.2px dashed #9CA3AF; border-radius: 50%; width: 34px; height: 34px; background-color: #ffffff; margin: 0 auto; text-align: center; line-height: 34px;">
                            <img src="https://img.icons8.com/ios/32/9CA3AF/ok--v1.png" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Accepted" />
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
                    <div style="border-top: 1px solid #CCCCCC; height: 1px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 3: Complete -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="border: 1.2px dashed #9CA3AF; border-radius: 50%; width: 34px; height: 34px; background-color: #ffffff; margin: 0 auto; text-align: center; line-height: 34px;">
                            <img src="https://img.icons8.com/ios/32/9CA3AF/ticket.png" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Complete" />
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

          <!-- Event Detail Card (0px border-radius, event image at the bottom) -->
          <tr>
            <td align="center" style="padding: 0 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #CCCCCC; border-radius: 0px; overflow: hidden; background-color: #ffffff; border-collapse: collapse;">
                <!-- Event Header Info -->
                <tr>
                  <td style="padding: 20px 20px 16px 20px; text-align: left;">
                    <h2 style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 19px; font-weight: bold; color: #111827; line-height: 1.25;">
                      ${ticketTitle}
                    </h2>
                    <p style="margin: 0 0 6px 0; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; color: #0053CD; line-height: 1.25;">
                      ${ticketDate}
                    </p>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.25;">
                      ${ticketVenue}
                    </p>
                  </td>
                </tr>
                <!-- Thin Divider Line -->
                <tr>
                  <td style="border-top: 1px solid #E5E7EB; padding: 0;"></td>
                </tr>
                <!-- Section Row Seat (Bold font, no background color matching screenshot) -->
                <tr>
                  <td style="padding: 14px 20px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111827; text-align: left;">
                    ${seatDetails}
                  </td>
                </tr>
                <!-- Event Image at the bottom of the card -->
                <tr>
                  <td align="center" style="line-height: 0; padding: 0;">
                    <img src="${ticketImage}" width="100%" height="220" style="width: 100%; height: 220px; object-fit: cover; display: block; border-radius: 0px; border: 0;" alt="${ticketTitle}" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accept Button Container (Zero border-radius matching screenshot) -->
          <tr>
            <td align="center" style="padding: 16px 24px 24px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${eventDetailsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; background-color: #0053CD; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 0; text-align: center; border-radius: 0px; text-transform: uppercase; letter-spacing: 0.5px; border-collapse: collapse; box-sizing: border-box;">
                      ACCEPT TICKETS
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Legal / Instructions Disclaimers -->
          <tr>
            <td style="padding: 0 24px 24px 24px; font-family: Arial, sans-serif; text-align: left;">
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #333333; line-height: 1.45;">
                By Clicking “ACCEPT TICKETS”, you agree to our <a href="#" style="color: #0053CD; text-decoration: none;">Terms of Use</a> and any applicable ticket back terms.
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #333333; line-height: 1.45;">
                Please note that it can take anywhere from <strong>4</strong> to <strong>12</strong> hours for the tickets to officially process and appear inside your Ticketmaster account/app.
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #333333; line-height: 1.45;">
                If you don't see them immediately after accepting, don't worry! This delay is standard security and sync window between systems.
              </p>
              
              <p style="margin: 0; font-size: 13px; color: #333333; line-height: 1.45;">
                This email is <strong>NOT</strong> your ticket.
              </p>
            </td>
          </tr>

          <!-- Help/Support Section (Light grey background centered box) -->
          <tr>
            <td align="center" style="background-color: #F6F6F6; padding: 24px 20px; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB;">
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6; text-align: center;">
                We're here to help.<br>
                If you have any questions, please <a href="#" style="color: #0053CD; text-decoration: none; font-weight: bold;">contact</a><br>
                Ticketmaster Fan Support
              </p>
            </td>
          </tr>

          <!-- Solid Blue Footer (Zero border-radius) -->
          <tr>
            <td align="center" style="background-color: #0053CD; padding: 28px 20px; border-radius: 0px;">
              <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.5; text-align: center;">
                Ticketmaster, Attn: Fan Support<br>
                1000 corporate Landing, Charleston, WV 25311
              </p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #ffffff; text-align: center; opacity: 0.8;">
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

export function compileAcceptanceEmailHtml(options: SendTransferEmailOptions): string {
  const {
    buyerName,
    buyerEmail,
    ticketTitle,
    ticketDate,
    ticketVenue,
    ticketImage,
    seatDetails,
    senderName = "JACQUELINE",
  } = options;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket Transfer to ${buyerName.toUpperCase()} Was Accepted!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F6F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F6F6F6; padding: 0; margin: 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Absolutely 0px border-radius) -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 0px; overflow: hidden; border-collapse: collapse; margin: 0 auto;">
          
          <!-- Blue Ticketmaster Header Bar -->
          <tr>
            <td align="center" style="background-color: #0053CD; padding: 18px 0; border-radius: 0px; line-height: 1;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 26px; font-weight: bold; font-style: italic; color: #ffffff; letter-spacing: -1.2px; text-transform: lowercase; line-height: 1;">
                    ticketmaster<span style="font-size: 10px; vertical-align: super; font-style: normal; font-weight: normal; margin-left: 2px;">®</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; color: #000000; line-height: 1.35; text-align: center; letter-spacing: -0.2px;">
                Your Ticket Transfer to ${buyerName.toUpperCase()}<br>Has Been Accepted!
              </h1>
            </td>
          </tr>

          <!-- Progress Bar (With Accepted Active) -->
          <tr>
            <td align="center" style="padding: 10px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 320px; width: 100%;">
                <tr>
                  <!-- Step 1: Sent -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="background-color: #0053CD; border-radius: 50%; width: 36px; height: 36px; margin: 0 auto; text-align: center; line-height: 36px;">
                            <img src="https://img.icons8.com/ios-filled/32/ffffff/ticket.png" width="16" height="16" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Sent" />
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
                    <div style="border-top: 2px solid #0053CD; height: 2px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 2: Accepted -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="background-color: #0053CD; border-radius: 50%; width: 36px; height: 36px; margin: 0 auto; text-align: center; line-height: 36px;">
                            <img src="https://img.icons8.com/ios-filled/32/ffffff/ok--v1.png" width="16" height="16" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Accepted" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #0053CD; padding-top: 6px;">
                          Accepted
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Connection Line 2 -->
                  <td align="center" style="vertical-align: middle; padding-bottom: 16px;">
                    <div style="border-top: 1px solid #CCCCCC; height: 1px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 3: Complete -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="border: 1.2px dashed #9CA3AF; border-radius: 50%; width: 34px; height: 34px; background-color: #ffffff; margin: 0 auto; text-align: center; line-height: 34px;">
                            <img src="https://img.icons8.com/ios/32/9CA3AF/ticket.png" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Complete" />
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

          <!-- Message Body -->
          <tr>
            <td style="padding: 24px; font-family: Arial, sans-serif; text-align: left;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                Hello ${senderName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                Great news! <strong>${buyerName}</strong> (${buyerEmail}) has accepted the tickets you transferred for <strong>${ticketTitle}</strong>. 
                The transfer status has been updated to <strong>Accepted</strong>, and the tickets are now successfully in their account.
              </p>
            </td>
          </tr>

          <!-- Event Detail Card -->
          <tr>
            <td align="center" style="padding: 0 24px 24px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #CCCCCC; border-radius: 0px; overflow: hidden; background-color: #ffffff; border-collapse: collapse;">
                <tr>
                  <td style="padding: 20px 20px 16px 20px; text-align: left;">
                    <h2 style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 19px; font-weight: bold; color: #111827; line-height: 1.25;">
                      ${ticketTitle}
                    </h2>
                    <p style="margin: 0 0 6px 0; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; color: #0053CD; line-height: 1.25;">
                      ${ticketDate}
                    </p>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.25;">
                      ${ticketVenue}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #E5E7EB; padding: 0;"></td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111827; text-align: left;">
                    ${seatDetails}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="line-height: 0; padding: 0;">
                    <img src="${ticketImage}" width="100%" height="220" style="width: 100%; height: 220px; object-fit: cover; display: block; border-radius: 0px; border: 0;" alt="${ticketTitle}" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 24px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.5; text-align: center;">
                This email was sent to ${options.senderEmail || ''}. Please do not reply directly to this message.
              </p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #ffffff; text-align: center; opacity: 0.8;">
                © 2026 Ticketmaster. All rights reserved.
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

export function compileBuyerAcceptanceEmailHtml(options: SendTransferEmailOptions): string {
  const {
    buyerName,
    buyerEmail,
    ticketTitle,
    ticketDate,
    ticketVenue,
    ticketImage,
    seatDetails,
    senderName = "JACQUELINE",
  } = options;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success! You've Accepted The Ticket Transfer</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F6F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F6F6F6; padding: 0; margin: 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Absolutely 0px border-radius) -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 0px; overflow: hidden; border-collapse: collapse; margin: 0 auto;">
          
          <!-- Blue Ticketmaster Header Bar -->
          <tr>
            <td align="center" style="background-color: #0053CD; padding: 18px 0; border-radius: 0px; line-height: 1;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 26px; font-weight: bold; font-style: italic; color: #ffffff; letter-spacing: -1.2px; text-transform: lowercase; line-height: 1;">
                    ticketmaster<span style="font-size: 10px; vertical-align: super; font-style: normal; font-weight: normal; margin-left: 2px;">®</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; color: #000000; line-height: 1.35; text-align: center; letter-spacing: -0.2px;">
                Success! You've Accepted The Ticket Transfer
              </h1>
            </td>
          </tr>

          <!-- Progress Bar (With Accepted Active) -->
          <tr>
            <td align="center" style="padding: 10px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 320px; width: 100%;">
                <tr>
                  <!-- Step 1: Sent -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="background-color: #0053CD; border-radius: 50%; width: 36px; height: 36px; margin: 0 auto; text-align: center; line-height: 36px;">
                            <img src="https://img.icons8.com/ios-filled/32/ffffff/ticket.png" width="16" height="16" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Sent" />
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
                    <div style="border-top: 2px solid #0053CD; height: 2px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 2: Accepted -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="background-color: #0053CD; border-radius: 50%; width: 36px; height: 36px; margin: 0 auto; text-align: center; line-height: 36px;">
                            <img src="https://img.icons8.com/ios-filled/32/ffffff/ok--v1.png" width="16" height="16" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Accepted" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #0053CD; padding-top: 6px;">
                          Accepted
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Connection Line 2 -->
                  <td align="center" style="vertical-align: middle; padding-bottom: 16px;">
                    <div style="border-top: 1px solid #CCCCCC; height: 1px; width: 100%;"></div>
                  </td>
                  
                  <!-- Step 3: Complete -->
                  <td align="center" width="50" style="vertical-align: top;">
                    <table border="0" cellpadding="0" cellspacing="0" width="36" style="width: 36px; margin: auto;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <div style="border: 1.2px dashed #9CA3AF; border-radius: 50%; width: 34px; height: 34px; background-color: #ffffff; margin: 0 auto; text-align: center; line-height: 34px;">
                            <img src="https://img.icons8.com/ios/32/9CA3AF/ticket.png" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-top: -2px;" alt="Complete" />
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

          <!-- Message Body -->
          <tr>
            <td style="padding: 24px; font-family: Arial, sans-serif; text-align: left;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                Hello ${buyerName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                You've successfully accepted the tickets transferred from <strong>${senderName}</strong>. The transfer status has been updated to <strong>Accepted</strong>.
              </p>
            </td>
          </tr>

          <!-- Event Detail Card -->
          <tr>
            <td align="center" style="padding: 0 24px 24px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #CCCCCC; border-radius: 0px; overflow: hidden; background-color: #ffffff; border-collapse: collapse;">
                <tr>
                  <td style="padding: 20px 20px 16px 20px; text-align: left;">
                    <h2 style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 19px; font-weight: bold; color: #111827; line-height: 1.25;">
                      ${ticketTitle}
                    </h2>
                    <p style="margin: 0 0 6px 0; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; color: #0053CD; line-height: 1.25;">
                      ${ticketDate}
                    </p>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.25;">
                      ${ticketVenue}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #E5E7EB; padding: 0;"></td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111827; text-align: left;">
                    ${seatDetails}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="line-height: 0; padding: 0;">
                    <img src="${ticketImage}" width="100%" height="220" style="width: 100%; height: 220px; object-fit: cover; display: block; border-radius: 0px; border: 0;" alt="${ticketTitle}" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Explanatory note below event details -->
          <tr>
            <td style="padding: 0 24px 24px 24px; font-family: Arial, sans-serif; text-align: left;">
              <p style="margin: 0; font-size: 14px; color: #4B5563; line-height: 1.5;">
                Please note: it might take some time for the tickets to appear in your account. Don't worry, this is normal behavior as we update all tickets with local systems.
              </p>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 24px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.5; text-align: center;">
                This email was sent to ${buyerEmail}. Please do not reply directly to this message.
              </p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #ffffff; text-align: center; opacity: 0.8;">
                © 2026 Ticketmaster. All rights reserved.
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
