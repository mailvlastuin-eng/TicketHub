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
  blockUntil?: number;
}

// Keyed by `${limiterId}:${key}` → sliding window state
const store: Map<string, Window> = (() => {
  const g = globalThis as any;
  if (!g.__rl_store) g.__rl_store = new Map<string, Window>();
  return g.__rl_store;
})();

export interface RateLimitTier {
  attempts: number;
  lockoutMs: number;
}

export interface RateLimitConfig {
  /** Unique name for this rate-limit rule (e.g. 'login', 'transfer') */
  id: string;
  /** Maximum number of requests allowed within the window (for simple limits) */
  maxRequests?: number;
  /** Window duration in milliseconds (acts as idle timeout for tiered limits) */
  windowMs: number;
  /** Optional tiered limits. Triggers lockouts at specific attempt counts. */
  tiers?: RateLimitTier[];
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

  // If no entry, or the idle window has expired, reset the window
  if (!entry || now - entry.start > config.windowMs) {
    store.set(storeKey, { count: 1, start: now });
    return { allowed: true };
  }

  // Check if currently hard-blocked by a tier lockout
  if (entry.blockUntil && now < entry.blockUntil) {
    const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // If simple rate limit (no tiers)
  if (!config.tiers && config.maxRequests) {
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((config.windowMs - (now - entry.start)) / 1000);
      return { allowed: false, retryAfter };
    }
  }

  // Increment count
  entry.count += 1;

  // Process tiered rate limits
  if (config.tiers) {
    // For tiered limits, windowMs acts as an inactivity timeout.
    // We update the start time so the session stays alive as long as they keep trying.
    entry.start = now;

    // Check if the new attempt count exactly hits any tier threshold
    for (const tier of config.tiers) {
      if (entry.count === tier.attempts) {
        entry.blockUntil = now + tier.lockoutMs;
        const retryAfter = Math.ceil(tier.lockoutMs / 1000);
        return { allowed: false, retryAfter };
      }
    }
    
    // If they exceed the highest tier, keep locking them with the highest tier's lockout
    const highestTier = [...config.tiers].sort((a, b) => b.attempts - a.attempts)[0];
    if (highestTier && entry.count > highestTier.attempts) {
        entry.blockUntil = now + highestTier.lockoutMs;
        const retryAfter = Math.ceil(highestTier.lockoutMs / 1000);
        return { allowed: false, retryAfter };
    }
  }

  return { allowed: true };
}

// Pre-built configs for each endpoint
export const RATE_LIMITS = {
  login: { 
    id: 'login', 
    windowMs: 30 * 60 * 1000, // 30 mins inactivity resets the attempts
    tiers: [
      { attempts: 6, lockoutMs: 2 * 60 * 1000 }, // 6 attempts = 2 min lock
      { attempts: 9, lockoutMs: 6 * 60 * 1000 }  // 9 attempts (another 3) = 6 min lock
    ]
  } as RateLimitConfig,
  adminLogin: { id: 'admin_login', maxRequests: 10, windowMs: 30 * 60 * 1000 } as RateLimitConfig,
  transfer: { id: 'transfer', maxRequests: 3, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  acceptTransfer: { id: 'accept_transfer', maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  checkSession: { id: 'check_session', maxRequests: 60, windowMs: 60 * 1000 } as RateLimitConfig,
  changePassword: {
    id: 'change_password',
    windowMs: 30 * 60 * 1000,
    tiers: [
      { attempts: 5, lockoutMs: 5 * 60 * 1000 },
      { attempts: 8, lockoutMs: 15 * 60 * 1000 },
    ],
  } as RateLimitConfig,
} as const;
