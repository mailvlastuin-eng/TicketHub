/**
 * Password hashing utilities using the Web Crypto API (PBKDF2).
 *
 * Compatible with Cloudflare Workers, Vercel Edge Runtime, and Node.js ≥ 20.
 * No npm dependencies required.
 *
 * Hash format: `pbkdf2:<saltHex>:<hashHex>`
 *
 * Lazy-migration strategy:
 *   - If the stored value does NOT start with `pbkdf2:` it is a legacy
 *     plaintext password. `verifyPassword` still accepts it so existing
 *     users are never locked out.
 *   - After a successful plaintext match the caller (loginUserFn) immediately
 *     re-saves the hashed version, silently upgrading the account on first login.
 */

const ITERATIONS = 100_000;
const HASH_ALGO = 'SHA-256';
const KEY_LEN_BITS = 256;
const PREFIX = 'pbkdf2';

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(bytes.map((b) => parseInt(b, 16)));
}

/**
 * Hash a plaintext password. Returns a self-describing string that embeds
 * the salt, so it can be stored as-is in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial,
    KEY_LEN_BITS,
  );

  return `${PREFIX}:${toHex(salt.buffer)}:${toHex(bits)}`;
}

/**
 * Verify a plaintext password against a stored value.
 *
 * Returns `{ match: boolean, isLegacy: boolean }`.
 * `isLegacy` is `true` when the stored value was plaintext — callers should
 * immediately rehash and persist the new hash.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ match: boolean; isLegacy: boolean }> {
  // Legacy plaintext path — handles all existing accounts
  if (!stored.startsWith(`${PREFIX}:`)) {
    return { match: password === stored, isLegacy: true };
  }

  const parts = stored.split(':');
  if (parts.length !== 3) return { match: false, isLegacy: false };

  const [, saltHex, hashHex] = parts;
  const salt = fromHex(saltHex);
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial,
    KEY_LEN_BITS,
  );

  return { match: toHex(bits) === hashHex, isLegacy: false };
}
