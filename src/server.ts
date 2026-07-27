import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

import { sendEmail, compileAcceptanceEmailHtml, compileBuyerAcceptanceEmailHtml } from "./admin/email";
import { getUserByEmail, saveUser } from "./admin/db";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/accept-transfer') {
        if (request.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          });
        }
        if (request.method === 'POST') {
          try {
            const data = await request.json();
            
            if (data.senderEmail && data.ticketId && data.seats && Array.isArray(data.seats)) {
              try {
                const user = await getUserByEmail(data.senderEmail);
                if (user) {
                  let transfersCount = 0;
                  let deviceName = 'Unknown Device';
                  let acceptedTransfers = [];
                  
                  if (user.deviceInfo) {
                    if (user.deviceInfo.trim().startsWith('{')) {
                      try {
                        const parsed = JSON.parse(user.deviceInfo);
                        deviceName = parsed.device || 'Unknown Device';
                        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0;
                        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
                      } catch (e) {}
                    } else {
                      deviceName = user.deviceInfo;
                    }
                  }
                  
                  data.seats.forEach((seatNum: any) => {
                    const seatStr = String(seatNum);
                    const existing = acceptedTransfers.find((t: any) => t.ticketId === data.ticketId);
                    if (existing) {
                      if (!existing.seats.includes(seatStr)) {
                        existing.seats.push(seatStr);
                      }
                    } else {
                      acceptedTransfers.push({
                        ticketId: data.ticketId,
                        seats: [seatStr],
                        buyerName: data.buyerName,
                        acceptedAt: new Date().toISOString()
                      });
                    }
                  });
                  
                  user.deviceInfo = JSON.stringify({
                    device: deviceName,
                    transfersCount,
                    acceptedTransfers
                  });
                  await saveUser(user);
                }
              } catch (dbErr) {
                console.error("Database update error during accept-transfer:", dbErr);
              }
            }

            if (data.senderEmail) {
              const html = compileAcceptanceEmailHtml(data);
              await sendEmail({
                to: data.senderEmail,
                subject: `Ticket Transfer Accepted: Your tickets were accepted by ${data.buyerName}`,
                html,
              });
            }
            if (data.buyerEmail) {
              const buyerHtml = compileBuyerAcceptanceEmailHtml(data);
              await sendEmail({
                to: data.buyerEmail,
                subject: `Success! You've accepted the ticket transfer.`,
                html: buyerHtml,
              });
            }
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              }
            });
          } catch (err: any) {
            console.error('Acceptance email error:', err);
            return new Response(JSON.stringify({ success: false, error: err.message }), {
              status: 500,
              headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              }
            });
          }
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
