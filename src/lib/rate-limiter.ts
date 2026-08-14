/**
 * In-memory sliding-window rate limiter.
 *
 * Works in Cloudflare Workers (V8 isolate), Vercel Edge, and Node.js.
 * State is stored on `globalThis` so it survives module re-imports within
 * the same isolate / process lifetime.
 *
 * Limitations: state is NOT shared across multiple worker instances on
 * different machines. For a small-scale app this is sufficient to throttle
 * burst abuse. For persistent distributed rate-limiting, upgrade to
 * Cloudflare KV / Durable Objects later.
 */

interface Window {
  count: number;
  start: number;
}

// Keyed by `${limiterId}:${key}` → sliding window state
const store: Map<string, Window> = (() => {
  const g = globalThis as any;
  if (!g.__rl_store) g.__rl_store = new Map<string, Window>();
  return g.__rl_store;
})();

export interface RateLimitConfig {
  /** Unique name for this rate-limit rule (e.g. 'login', 'transfer') */
  id: string;
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (only set when blocked) */
  retryAfter?: number;
}

/**
 * Check (and increment) the rate limit for a given key.
 *
 * @param key    Identifier for the requester — typically an IP address or email.
 * @param config Rate-limit configuration for this endpoint.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const storeKey = `${config.id}:${key}`;
  const now = Date.now();
  const entry = store.get(storeKey);

  if (!entry || now - entry.start > config.windowMs) {
    // First request or window has expired — start a fresh window
    store.set(storeKey, { count: 1, start: now });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((config.windowMs - (now - entry.start)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true };
}

// Pre-built configs for each endpoint
export const RATE_LIMITS = {
  login: { id: 'login', maxRequests: 5, windowMs: 15 * 60 * 1000 } as RateLimitConfig,
  adminLogin: { id: 'admin_login', maxRequests: 3, windowMs: 30 * 60 * 1000 } as RateLimitConfig,
  transfer: { id: 'transfer', maxRequests: 3, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  acceptTransfer: { id: 'accept_transfer', maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  checkSession: { id: 'check_session', maxRequests: 60, windowMs: 60 * 1000 } as RateLimitConfig,
} as const;
