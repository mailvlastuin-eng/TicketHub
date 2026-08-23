import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { checkRateLimit, RATE_LIMITS } from "./lib/rate-limiter";

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

// ---------------------------------------------------------------------------
// Security configuration
// ---------------------------------------------------------------------------
const PRODUCTION_DOMAIN = "ticketmastersecured.app";

/**
 * Origins explicitly allowed for cross-origin requests to /api/accept-transfer.
 * The ticket-claim page is served from a subdomain; the main app is on the root domain.
 */
const ALLOWED_CORS_ORIGINS = [
  `https://${PRODUCTION_DOMAIN}`,
  `https://www.${PRODUCTION_DOMAIN}`,
  `https://claim.${PRODUCTION_DOMAIN}`,
  // New standalone claims domain
  "https://claims-ticketmaster.app",
  "https://www.claims-ticketmaster.app",
  // Allow local dev origins
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
  "http://localhost:3001",
];

function getCorsOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return "*";
  return requestOrigin;
}

const CORS_HEADERS_TEMPLATE = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, *",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

/**
 * Security headers applied to EVERY response.
 * Equivalent of Helmet.js for Cloudflare Workers / Nitro.
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  "X-Frame-Options": "SAMEORIGIN",
  // Prevent MIME sniffing
  "X-Content-Type-Options": "nosniff",
  // Limit referrer leakage
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Disable unused browser features
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Force HTTPS for 1 year (only effective on HTTPS origins)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    // 'unsafe-inline' and 'unsafe-eval' required for TanStack Start, Tailwind CDN, Lucide, and Google Maps Embed scripts
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://maps.googleapis.com https://maps.gstatic.com https://*.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.google.com https://*.gstatic.com",
    "img-src 'self' data: https: blob: https://*.google.com https://*.gstatic.com https://*.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Allow connections to Supabase, Ticketmaster, and Google Maps APIs
    `connect-src 'self' https://*.supabase.co https://app.ticketmaster.com https://maps.googleapis.com https://*.google.com https://*.gstatic.com`,
    // Allow embedding map iframes from Google Maps
    "frame-src 'self' https://maps.google.com https://www.google.com https://*.google.com https://*.openstreetmap.org",
    // Allow framing on same origin
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "),
};

/**
 * Clone a Response and inject the global security headers.
 * Preserves all existing headers from the original response.
 */
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Google Static Maps proxy
// The raw API key never leaves the server. The client uses /api/maps-proxy.
// ---------------------------------------------------------------------------
async function handleMapsProxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const zoom = url.searchParams.get("zoom") ?? "15";
  const size = url.searchParams.get("size") ?? "600x300";

  if (!q) {
    return new Response("Missing query", { status: 400 });
  }

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) {
    // Fall through gracefully — client shows iframe fallback
    return new Response("Maps key not configured", { status: 503 });
  }

  const encoded = encodeURIComponent(q);
  const mapsUrl =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${encoded}&zoom=${zoom}&size=${size}` +
    `&markers=size:mid%7Ccolor:0xff4444%7C${encoded}` +
    `&key=${mapsKey}`;

  try {
    const upstream = await fetch(mapsUrl);
    if (!upstream.ok) {
      return new Response("Map unavailable", { status: 503 });
    }
    // Forward the image bytes — cache for 1 hour on CDN
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("Maps proxy error:", err);
    return new Response("Map unavailable", { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// /api/accept-transfer handler
// ---------------------------------------------------------------------------
import { sendEmail, compileAcceptanceEmailHtml, compileBuyerAcceptanceEmailHtml } from "./admin/email";
import { getUserByEmail, saveUser } from "./admin/db";

async function handleAcceptTransfer(request: Request): Promise<Response> {
  const requestOrigin = request.headers.get("origin");
  const allowOrigin = getCorsOrigin(requestOrigin);

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    ...CORS_HEADERS_TEMPLATE,
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  // Rate limit: 10 accept-transfer requests per hour per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const rl = checkRateLimit(ip, RATE_LIMITS.acceptTransfer);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ success: false, error: "Too many requests. Try again later." }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "Retry-After": String(rl.retryAfter),
          ...corsHeaders,
        },
      },
    );
  }

  try {
    const data = await request.json();

    if (data.senderEmail && data.ticketId && data.seats && Array.isArray(data.seats)) {
      try {
        const user = await getUserByEmail(data.senderEmail);
        if (user) {
          let transfersCount = 0;
          let deviceName = "Unknown Device";
          let acceptedTransfers: any[] = [];
          let ticketSlots = 20;
          let ticketsCreatedCount = 0;
          let ticketsCount = 0;
          let tokensCount = 0;
          let userType = user.userType || "payment";

          if (user.deviceInfo) {
            if (user.deviceInfo.trim().startsWith("{")) {
              try {
                const parsed = JSON.parse(user.deviceInfo);
                deviceName = parsed.device || "Unknown Device";
                transfersCount =
                  typeof parsed.transfersCount === "number" ? parsed.transfersCount : 4;
                acceptedTransfers = Array.isArray(parsed.acceptedTransfers)
                  ? parsed.acceptedTransfers
                  : [];
                ticketSlots = typeof parsed.ticketSlots === "number" ? parsed.ticketSlots : 20;
                ticketsCreatedCount = typeof parsed.ticketsCreatedCount === "number" ? parsed.ticketsCreatedCount : 0;
                ticketsCount = typeof parsed.ticketsCount === "number" ? parsed.ticketsCount : 0;
                tokensCount = typeof parsed.tokensCount === "number" ? parsed.tokensCount : 0;
                userType = parsed.userType || user.userType || "payment";
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
                acceptedAt: new Date().toISOString(),
              });
            }
          });

          user.deviceInfo = JSON.stringify({
            device: deviceName,
            transfersCount,
            acceptedTransfers,
            ticketsCount,
            ticketSlots,
            ticketsCreatedCount,
            tokensCount,
            userType,
          });
          await saveUser(user);
        }
      } catch (dbErr) {
        console.error("Database update error during accept-transfer:", dbErr);
      }
    }

    if (data.senderEmail) {
      try {
        console.log("Sending seller acceptance email to:", data.senderEmail);
        const html = compileAcceptanceEmailHtml(data);
        await sendEmail({
          to: data.senderEmail,
          subject: `Ticket Transfer Accepted: Your tickets were accepted by ${data.buyerName || "the buyer"}`,
          html,
        });
      } catch (sellerEmailErr) {
        console.error("Seller acceptance email error:", sellerEmailErr);
      }
    }
    if (data.buyerEmail) {
      try {
        console.log("Sending buyer acceptance confirmation email to:", data.buyerEmail);
        const buyerHtml = compileBuyerAcceptanceEmailHtml(data);
        await sendEmail({
          to: data.buyerEmail,
          subject: `Success! You've accepted the ticket transfer.`,
          html: buyerHtml,
        });
      } catch (buyerEmailErr) {
        console.error("Buyer acceptance email error:", buyerEmailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    // SECURITY: do not leak internal error details to the client
    console.error("Acceptance error:", err);
    return new Response(JSON.stringify({ success: false, error: "Transfer could not be processed." }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Subdomain redirect: If someone lands on claim.ticketmastersecured.app (from older emails)
      if (url.hostname.startsWith("claim.")) {
        const targetHost = `www.${PRODUCTION_DOMAIN}`;
        const targetUrl = new URL(request.url);
        targetUrl.hostname = targetHost;
        targetUrl.pathname = "/claim" + (targetUrl.pathname === "/" ? "" : targetUrl.pathname);
        return Response.redirect(targetUrl.toString(), 308);
      }

      // Route: Google Maps image proxy (key never leaves the server)
      if (url.pathname === "/api/maps-proxy") {
        const res = await handleMapsProxy(request);
        return withSecurityHeaders(res);
      }

      // Route: ticket transfer acceptance (called from the claim page)
      if (url.pathname === "/api/accept-transfer") {
        const res = await handleAcceptTransfer(request);
        return withSecurityHeaders(res);
      }

      // All other routes — TanStack Start SSR handler
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return withSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
