import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders, getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server';
import {
  getUserByEmail,
  getUserByIdentifier,
  getUserBySessionId,
  saveUser,
  addLoginAttempt,
  getAllUsers,
  getAllAttempts,
  deleteUser,
  type UserAccess,
} from './db';
import { getDeviceString } from './utils';
import { compileTransferEmailHtml, sendEmail, type SendTransferEmailOptions } from './email';
import { checkRateLimit, RATE_LIMITS } from '../lib/rate-limiter';
import { hashPassword, verifyPassword } from '../lib/crypto';

// ---------------------------------------------------------------------------
// Startup assertions — fail loud if required secrets are not set.
// These run at handler invocation time so they produce actionable errors
// rather than silent fallbacks.
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(
      `[CRITICAL] Server misconfiguration: ${name} environment variable must be set. ` +
      `Add it to your Vercel / Cloudflare dashboard and redeploy.`
    );
    throw new Error('Internal Server Error');
  }
  return val;
}

function getAdminPassword(): string {
  return requireEnv('ADMIN_PASSWORD');
}

// Helper to extract caller IP from request headers
function getCallerIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] ?? '127.0.0.1';
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return (headers['x-real-ip'] as string) ?? '127.0.0.1';
}

function getClientIp(): string {
  const headers = getRequestHeaders();
  return getCallerIp(headers as unknown as Record<string, string | string[] | undefined>);
}



// Helper to generate a random 8-character password
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

/**
 * Resolves and verifies the authenticated user from the HttpOnly session cookie
 * (with fallback to client-supplied sessionId/email for backwards compatibility).
 *
 * Throws an actionable error if the user is unauthenticated, inactive, or attempting
 * cross-account tampering.
 */
async function requireAuthenticatedUser(data?: { email?: string; sessionId?: string }): Promise<UserAccess> {
  let cookieSession: string | undefined;
  try {
    cookieSession = getCookie('tm_session');
  } catch (e) {}

  const effectiveSessionId = cookieSession || (data?.sessionId ? String(data.sessionId).trim() : undefined);
  let user: UserAccess | undefined;

  // 1. Look up by verified session token
  if (effectiveSessionId) {
    user = await getUserBySessionId(effectiveSessionId);
  }

  // 2. Fallback lookup by email for legacy sessions
  if (!user && data?.email) {
    const candidate = await getUserByEmail(data.email);
    if (candidate) {
      if (!effectiveSessionId || candidate.sessionId === effectiveSessionId || candidate.loginMode === 'multiple') {
        user = candidate;
      }
    }
  }

  // 3. Reject if unauthenticated or inactive
  if (!user || user.status !== 'active') {
    throw new Error('Unauthorized. Active user session required.');
  }

  // 4. Strict cross-account protection: if caller supplied an email, it MUST match the authenticated user
  if (data?.email) {
    const cleanSupplied = data.email.trim().toLowerCase();
    const cleanUserEmail = user.email.trim().toLowerCase();
    if (cleanSupplied && cleanUserEmail !== cleanSupplied) {
      throw new Error('Forbidden. You cannot perform operations on another user account.');
    }
  }

  return user;
}

// ---------------------------------------------------------------------------
// 1. User Login
// ---------------------------------------------------------------------------
export const loginUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => ({
    email: String(d?.email ?? '').trim(),
    password: String(d?.password ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const { email, password } = data;
    const headers = getRequestHeaders();
    const userAgent = (headers['user-agent'] as string) || 'Unknown';
    const ip = getCallerIp(headers as Record<string, string | string[] | undefined>);
    const deviceInfo = getDeviceString(userAgent);

    // --- Rate limit: 6 attempts per 2 min, then 9 attempts per 6 min ---
    const rl = checkRateLimit(ip, RATE_LIMITS.login);
    if (!rl.allowed) {
      throw new Error(
        `Too many login attempts. Please wait ${Math.ceil(rl.retryAfter! / 60)} minutes before trying again.`,
      );
    }

    const user = await getUserByIdentifier(email);

    // Verify password (handles both legacy plaintext and PBKDF2 hashed)
    const passwordMatch = user
      ? await verifyPassword(password, user.password)
      : { match: false, isLegacy: false };

    if (!user || !passwordMatch.match) {
      // SECURITY: passwords are NEVER logged — store only a redacted placeholder
      await addLoginAttempt({
        email,
        passwordAttempted: '[REDACTED]',
        timestamp: new Date().toISOString(),
        success: false,
        status: 'failed_incorrect_password',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('Invalid email or password');
    }

    // Lazy migration: if the stored password was plaintext, rehash it now
    if (passwordMatch.isLegacy) {
      user.password = await hashPassword(password);
      // saveUser is called below after status / session updates — no extra round-trip needed
    }

    // Check if access has expired (if activated already)
    if (user.status === 'active' && user.expiresAt) {
      const isExpired = new Date() > new Date(user.expiresAt);
      if (isExpired) {
        user.status = 'expired';
        await saveUser(user);
      }
    }

    if (user.status === 'expired') {
      await addLoginAttempt({
        email,
        passwordAttempted: '[REDACTED]',
        timestamp: new Date().toISOString(),
        success: false,
        status: 'blocked_expired',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('Your user access has expired.');
    }

    if (user.status === 'terminated') {
      await addLoginAttempt({
        email,
        passwordAttempted: '[REDACTED]',
        timestamp: new Date().toISOString(),
        success: false,
        status: 'blocked_terminated',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('Your user access has been terminated.');
    }

    // Block re-use of the same passcode for single-mode users only.
    // Multiple-mode users may sign in any number of times across devices.
    // Token-mode users: always allowed to re-login, but we enforce single active session below.
    if (user.activatedAt && user.loginMode !== 'multiple' && user.loginMode !== 'token') {
      await addLoginAttempt({
        email,
        passwordAttempted: '[REDACTED]',
        timestamp: new Date().toISOString(),
        success: false,
        status: 'blocked_already_used',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('This passcode has already been used. Each passcode can only be used once.');
    }

    // Activate access
    const activatedAt = user.activatedAt ? new Date(user.activatedAt) : new Date();
    let durationDays = 30;
    if (user.duration === '3m') durationDays = 90;
    if (user.duration === '6m') durationDays = 180;
    if (user.duration === '1y') durationDays = 360;

    const expiresAt = user.expiresAt
      ? new Date(user.expiresAt)
      : new Date(activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const isTokenUser = user.userType === 'token' || user.loginMode === 'token';

    // For token users and multiple-mode users, reuse existing sessionId if present so multiple devices stay signed in.
    const sessionId = (isTokenUser || user.loginMode === 'multiple') && user.sessionId
      ? user.sessionId
      : `sess_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    let transfersCount = 4;
    let acceptedTransfers: any[] = [];
    let ticketSlots = 20;
    let ticketsCreatedCount = 0;
    let ticketsCount = 0;
    let tokensCount = 0;
    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 4;
        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
        ticketSlots = typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 20;
        ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
        ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
        tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
      } catch (e) {}
    }

    user.status = 'active';
    if (!user.activatedAt) user.activatedAt = activatedAt.toISOString();
    if (!user.expiresAt) user.expiresAt = expiresAt.toISOString();
    user.sessionId = sessionId;
    user.deviceInfo = JSON.stringify({
      device: deviceInfo,
      transfersCount,
      acceptedTransfers,
      ticketSlots,
      ticketsCreatedCount,
      ticketsCount,
      tokensCount,
      userType: user.userType || 'payment',
    });

    await saveUser(user);

    await addLoginAttempt({
      email,
      passwordAttempted: '[REDACTED]',
      timestamp: new Date().toISOString(),
      success: true,
      status: 'success',
      userAgent,
      ip,
      deviceInfo,
    });

    const name = email.split('@')[0] || 'User';

    // Set secure HttpOnly session cookie
    try {
      setCookie('tm_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } catch (cookieErr) {
      console.warn('Unable to set session cookie:', cookieErr);
    }

    return {
      email: user.email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      sessionId,
      expiresAt: expiresAt.toISOString(),
      loginMode: user.loginMode || 'single',
      userType: user.userType || 'payment',
      transfersCount,
      acceptedTransfers,
      ticketSlots,
      ticketsCreatedCount,
      tokensCount,
    };
  });

// ---------------------------------------------------------------------------
// 2. Validate session on client page loads
// ---------------------------------------------------------------------------
export const checkSessionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email?: string; sessionId?: string; ticketsCount?: number }) => ({
    email: String(d?.email ?? '').trim(),
    sessionId: String(d?.sessionId ?? '').trim(),
    ticketsCount: typeof d?.ticketsCount === 'number' ? d.ticketsCount : undefined,
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const ip = getCallerIp(headers as Record<string, string | string[] | undefined>);

    // Rate limit: 60 session checks per minute per IP
    const rl = checkRateLimit(ip, RATE_LIMITS.checkSession);
    if (!rl.allowed) {
      return { valid: false };
    }

    let cookieSession: string | undefined;
    try {
      cookieSession = getCookie('tm_session');
    } catch (e) {}

    const effectiveSessionId = cookieSession || data.sessionId;

    let user: UserAccess | undefined;
    if (data.email) {
      user = await getUserByEmail(data.email);
    } else if (effectiveSessionId) {
      user = await getUserBySessionId(effectiveSessionId);
    }

    if (!user || user.status !== 'active') {
      return { valid: false };
    }

    const isTokenUser = user.userType === 'token' || user.loginMode === 'token';
    // For token users and multiple-mode payment users, skip strict single-device sessionId rejection.
    if (!isTokenUser && user.loginMode !== 'multiple' && effectiveSessionId && user.sessionId && user.sessionId !== effectiveSessionId) {
      return { valid: false };
    }

    // Refresh or upgrade to HttpOnly cookie on valid active session
    const sessionTokenToSet = effectiveSessionId || user.sessionId;
    if (sessionTokenToSet) {
      try {
        setCookie('tm_session', sessionTokenToSet, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      } catch (cookieErr) {
        // Non-blocking in environments where headers are already sealed
      }
    }

    if (user.status === 'active' && user.activatedAt) {
      let durationDays = 30;
      if (user.duration === '3m') durationDays = 90;
      if (user.duration === '6m') durationDays = 180;
      if (user.duration === '1y') durationDays = 360;

      const expectedExpiry = new Date(
        new Date(user.activatedAt).getTime() + durationDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      let needsSave = false;
      if (user.expiresAt !== expectedExpiry) {
        user.expiresAt = expectedExpiry;
        needsSave = true;
      }

      const isExpired = new Date() > new Date(expectedExpiry);
      if (isExpired) {
        user.status = 'expired';
        user.sessionId = null;
        needsSave = true;
      }

      if (needsSave) {
        await saveUser(user);
      }

      if (isExpired) {
        return { valid: false };
      }
    } else if (user.expiresAt) {
      const isExpired = new Date() > new Date(user.expiresAt);
      if (isExpired) {
        user.status = 'expired';
        user.sessionId = null;
        await saveUser(user);
        return { valid: false };
      }
    }

    let transfersCount = 4;
    let acceptedTransfers: any[] = [];
    let currentDevice = '';
    let ticketSlots = 20;
    let ticketsCreatedCount = 0;
    let tokensCount = 0;
    let storedUserType: 'payment' | 'token' = 'payment';
    let ticketsCount = data.ticketsCount;

    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 4;
        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
        currentDevice = parsed.device || '';
        ticketSlots = typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 20;
        ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
        tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
        storedUserType = parsed.userType === 'token' ? 'token' : 'payment';
        if (ticketsCount === undefined && typeof parsed.ticketsCount === 'number') {
          ticketsCount = parsed.ticketsCount;
        }
      } catch (e) {}
    } else if (user.deviceInfo) {
      currentDevice = user.deviceInfo;
    }

    if (data.ticketsCount !== undefined) {
      const updatedCreatedCount = Math.max(ticketsCreatedCount, data.ticketsCount);
      user.deviceInfo = JSON.stringify({
        device: currentDevice,
        transfersCount,
        acceptedTransfers,
        ticketsCount: data.ticketsCount,
        ticketSlots,
        ticketsCreatedCount: updatedCreatedCount,
        tokensCount,
        userType: storedUserType,
      });
      await saveUser(user);
      ticketsCreatedCount = updatedCreatedCount;
    }

    const name = user.username || user.email.split('@')[0] || 'User';

    return {
      valid: true,
      email: user.email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      username: user.username,
      sessionId: effectiveSessionId || user.sessionId || undefined,
      loginMode: user.loginMode || 'single',
      transfersCount,
      acceptedTransfers,
      ticketSlots,
      ticketsCreatedCount,
      tokensCount,
      userType: user.userType || storedUserType,
    };
  });

// ---------------------------------------------------------------------------
// 2b. Logout User (Clears HttpOnly Cookie)
// ---------------------------------------------------------------------------
export const logoutUserFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    try {
      deleteCookie('tm_session', { path: '/' });
    } catch (e) {
      // Ignore if headers already sent
    }
    return { success: true };
  });

// ---------------------------------------------------------------------------
// 3. Admin Authentication
// ---------------------------------------------------------------------------
export const adminLoginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const ip = getCallerIp(headers as Record<string, string | string[] | undefined>);

    // Rate limit: 3 attempts per 30 min per IP
    const rl = checkRateLimit(ip, RATE_LIMITS.adminLogin);
    if (!rl.allowed) {
      throw new Error(`Too many admin login attempts. Try again in ${Math.ceil(rl.retryAfter! / 60)} minutes.`);
    }

    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Invalid administrator password');
    }
    return { authenticated: true };
  });

// ---------------------------------------------------------------------------
// 4. Get Admin Dashboard Data
// ---------------------------------------------------------------------------
export const getAdminDashboardDataFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const attempts = await getAllAttempts();

    for (const u of users) {
      if (u.deviceInfo && u.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(u.deviceInfo);
          const tCreated = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
          const tActive = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
          const acceptedList = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
          const minCreated = Math.max(tCreated, tActive, acceptedList.length);
          if (minCreated > tCreated) {
            parsed.ticketsCreatedCount = minCreated;
            u.deviceInfo = JSON.stringify(parsed);
            await saveUser(u);
          }
        } catch (e) {}
      }

      if (u.status === 'active' && u.activatedAt) {
        let durationDays = 30;
        if (u.duration === '3m') durationDays = 90;
        if (u.duration === '6m') durationDays = 180;
        if (u.duration === '1y') durationDays = 360;

        const expectedExpiry = new Date(
          new Date(u.activatedAt).getTime() + durationDays * 24 * 60 * 60 * 1000,
        ).toISOString();

        let needsSave = false;
        if (u.expiresAt !== expectedExpiry) {
          u.expiresAt = expectedExpiry;
          needsSave = true;
        }

        const isExpired = new Date() > new Date(expectedExpiry);
        if (isExpired) {
          u.status = 'expired';
          u.sessionId = null;
          needsSave = true;
        }

        if (needsSave) {
          await saveUser(u);
        }
      } else if (u.status === 'active' && u.expiresAt) {
        const isExpired = new Date() > new Date(u.expiresAt);
        if (isExpired) {
          u.status = 'expired';
          u.sessionId = null;
          await saveUser(u);
        }
      }
    }

    const activeCount = users.filter((u) => u.status === 'active').length;
    const pendingCount = users.filter((u) => u.status === 'pending').length;
    const terminatedCount = users.filter((u) => u.status === 'terminated').length;
    const expiredCount = users.filter((u) => u.status === 'expired').length;

    // SECURITY: strip password hashes before sending to client
    const safeUsers = users.map(({ password: _pw, sessionId: _sid, ...rest }) => rest);

    return {
      users: safeUsers,
      attempts,
      stats: {
        total: users.length,
        active: activeCount,
        pending: pendingCount,
        terminated: terminatedCount,
        expired: expiredCount,
        totalAttempts: attempts.length,
      },
    };
  });

// ---------------------------------------------------------------------------
// 5. Create new User Access (by Admin)
// ---------------------------------------------------------------------------
export const createUserAccessFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      adminPass: string;
      email: string;
      duration: '1m' | '3m' | '6m' | '1y';
      password?: string;
      loginMode?: 'single' | 'multiple' | 'token';
      userType?: 'payment' | 'token';
      initialTokens?: number;
    }) => ({
      adminPass: String(d?.adminPass ?? '').trim(),
      email: String(d?.email ?? '').trim(),
      duration: d?.duration || '1m',
      password: d?.password ? String(d.password).trim() : undefined,
      loginMode: (d?.userType === 'token' ? 'token' : d?.loginMode === 'multiple' ? 'multiple' : 'single') as 'single' | 'multiple' | 'token',
      userType: (d?.userType === 'token' ? 'token' : 'payment') as 'payment' | 'token',
      initialTokens: typeof d?.initialTokens === 'number' ? Math.max(0, d.initialTokens) : 0,
    }),
  )
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('A user with this email already exists.');
    }

    const plainPassword = data.password || generatePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const isTokenUser = data.userType === 'token';
    const deviceInfo = isTokenUser
      ? JSON.stringify({ transfersCount: 0, acceptedTransfers: [], ticketSlots: 0, ticketsCreatedCount: 0, tokensCount: data.initialTokens, userType: 'token' })
      : JSON.stringify({ transfersCount: 4, acceptedTransfers: [], ticketSlots: 20, ticketsCreatedCount: 0, tokensCount: 0, userType: 'payment' });

    const newUser: UserAccess = {
      id: `usr_${Math.random().toString(36).substring(2, 11)}`,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      duration: data.duration,
      status: 'pending',
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      sessionId: null,
      deviceInfo,
      loginMode: data.loginMode,
      userType: data.userType,
    };

    await saveUser(newUser);
    return { success: true, generatedPassword: plainPassword, userType: data.userType };
  });

// ---------------------------------------------------------------------------
// 6. Terminate Access (by Admin)
// ---------------------------------------------------------------------------
export const terminateUserAccessFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string; userId: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
    userId: String(d?.userId ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const user = users.find((u) => u.id === data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.status = 'terminated';
    user.sessionId = null;
    await saveUser(user);

    return { success: true };
  });

// ---------------------------------------------------------------------------
// 7. Delete User Access History (by Admin)
// ---------------------------------------------------------------------------
export const deleteUserAccessFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string; userId: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
    userId: String(d?.userId ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    await deleteUser(data.userId);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// 8. Get App Build Version/Timestamp
// ---------------------------------------------------------------------------
export const getAppVersionFn = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || '1.0.0-dev',
  };
});

// ---------------------------------------------------------------------------
// 9. Get Database Diagnostics (admin-gated)
// ---------------------------------------------------------------------------
export const getDiagnosticsFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    let dbStatus = 'Disconnected';
    let dbError = null;

    try {
      await getAllUsers();
      dbStatus = 'Connected to database';
    } catch (err: any) {
      dbStatus = 'Error connecting to database';
      dbError = err.message || String(err);
    }

    return {
      dbStatus,
      dbError,
      // SECURITY: project ID / internal identifiers are not returned
    };
  });

// ---------------------------------------------------------------------------
// 10. Send Ticket Transfer Email
// ---------------------------------------------------------------------------
export const sendTransferEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((d: SendTransferEmailOptions & { senderEmail?: string; sessionId?: string }) => d)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const ip = getCallerIp(headers as Record<string, string | string[] | undefined>);

    // Rate limit: 3 transfers per hour per IP
    const rl = checkRateLimit(ip, RATE_LIMITS.transfer);
    if (!rl.allowed) {
      throw new Error(`Transfer limit reached. Please wait ${Math.ceil(rl.retryAfter! / 60)} minutes.`);
    }

    // SECURITY: Authenticate and verify sender ownership
    const user = await requireAuthenticatedUser({
      email: data.senderEmail,
      sessionId: data.sessionId,
    });

    let transfersCount = 4;
    let tokensCount = 0;
    let deviceName = 'Unknown Device';
    let acceptedTransfers: any[] = [];
    let ticketSlots = 20;
    let ticketsCreatedCount = 0;
    let ticketsCount = 0;
    let storedUserType: 'payment' | 'token' = 'payment';

    if (user.deviceInfo) {
      if (user.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(user.deviceInfo);
          deviceName = parsed.device || 'Unknown Device';
          transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 4;
          tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
          acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
          ticketSlots = typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 20;
          ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
          ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
          storedUserType = parsed.userType === 'token' ? 'token' : 'payment';
        } catch (e) {}
      } else {
        deviceName = user.deviceInfo;
      }
    }

    const isTokenUser = user.userType === 'token' || storedUserType === 'token';

    if (isTokenUser) {
      // Token users: deduct 2 tokens per transfer
      if (tokensCount < 2) {
        throw new Error('Insufficient tokens. You need at least 2 tokens to transfer tickets.');
      }
      tokensCount = Math.max(0, tokensCount - 2);
    } else {
      // Payment users: deduct 1 transfer credit
      if (transfersCount <= 0) {
        throw new Error('You have no ticket transfers left on your account.');
      }
      transfersCount = Math.max(0, transfersCount - 1);
    }

    user.deviceInfo = JSON.stringify({
      device: deviceName,
      transfersCount,
      tokensCount,
      acceptedTransfers,
      ticketSlots,
      ticketsCreatedCount: Math.max(ticketsCreatedCount, 1),
      ticketsCount,
      userType: isTokenUser ? 'token' : 'payment',
    });

    await saveUser(user);

    const html = compileTransferEmailHtml(data);
    const result = await sendEmail({
      to: data.buyerEmail,
      subject: `Your ticket transfer from ${data.senderName} for ${data.ticketTitle} is on the way.`,
      html,
    });
    return result;
  });

// ---------------------------------------------------------------------------
// 11. Update User Profile (session-gated & ownership-verified)
// ---------------------------------------------------------------------------
export const updateUserProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email?: string; name: string; sessionId?: string }) => ({
    email: String(d?.email ?? '').trim(),
    name: String(d?.name ?? '').trim(),
    sessionId: String(d?.sessionId ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    // SECURITY: Authenticate caller and verify account ownership
    const user = await requireAuthenticatedUser({
      email: data.email,
      sessionId: data.sessionId,
    });

    user.name = data.name;
    await saveUser(user);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// 12. Update User Transfers Count (admin-gated)
// ---------------------------------------------------------------------------
export const updateUserTransfersFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { adminPass: string; userId: string; transfersCount: number }) => ({
      adminPass: String(d?.adminPass ?? '').trim(),
      userId: String(d?.userId ?? '').trim(),
      transfersCount: Number(d?.transfersCount ?? 0),
    }),
  )
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const user = users.find((u) => u.id === data.userId);
    if (!user) throw new Error('User not found');

    let deviceName = 'Unknown Device';
    let acceptedTransfers: any[] = [];
    let ticketsCount = 0;
    let ticketSlots = 20;
    let ticketsCreatedCount = 0;
    let tokensCount = 0;
    let storedUserType: 'payment' | 'token' = 'payment';

    if (user.deviceInfo) {
      if (user.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(user.deviceInfo);
          deviceName = parsed.device || 'Unknown Device';
          acceptedTransfers = Array.isArray(parsed.acceptedTransfers)
            ? parsed.acceptedTransfers
            : [];
          ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
          ticketSlots = typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 20;
          ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
          tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
          storedUserType = parsed.userType === 'token' ? 'token' : 'payment';
        } catch (e) {}
      } else {
        deviceName = user.deviceInfo;
      }
    }

    user.deviceInfo = JSON.stringify({
      device: deviceName,
      transfersCount: data.transfersCount,
      acceptedTransfers,
      ticketsCount,
      ticketSlots,
      ticketsCreatedCount,
      tokensCount,
      userType: user.userType || storedUserType,
    });

    await saveUser(user);
    return { success: true, transfersCount: data.transfersCount };
  });

// ---------------------------------------------------------------------------
// 13. Renew User Duration (admin-gated)
// Extends the user's access by resetting expiresAt from now.
// Works for active, expired, and terminated users.
// ---------------------------------------------------------------------------
export const renewUserDurationFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { adminPass: string; userId: string; duration: '1m' | '3m' | '6m' | '1y' }) => ({
      adminPass: String(d?.adminPass ?? '').trim(),
      userId: String(d?.userId ?? '').trim(),
      duration: d?.duration || '1m',
    }),
  )
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const user = users.find((u) => u.id === data.userId);
    if (!user) throw new Error('User not found');

    let durationDays = 30;
    if (data.duration === '3m') durationDays = 90;
    if (data.duration === '6m') durationDays = 180;
    if (data.duration === '1y') durationDays = 360;

    const now = new Date();
    let baseTime = now.getTime();
    if (user.expiresAt && user.status === 'active') {
      const currentExpiry = new Date(user.expiresAt);
      if (currentExpiry > now) {
        baseTime = currentExpiry.getTime();
      }
    }
    const newExpiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();

    user.duration = data.duration;
    user.expiresAt = newExpiresAt;
    // If user was expired or terminated, reactivate them
    if (user.status === 'expired' || user.status === 'terminated') {
      user.status = user.activatedAt ? 'active' : 'pending';
    }

    await saveUser(user);
    return { success: true, expiresAt: newExpiresAt };
  });

// ---------------------------------------------------------------------------
// 14. Update User Ticket Slots (admin-gated)
// ---------------------------------------------------------------------------
export const updateUserSlotsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { adminPass: string; userId: string; ticketSlots: number }) => ({
      adminPass: String(d?.adminPass ?? '').trim(),
      userId: String(d?.userId ?? '').trim(),
      ticketSlots: Number(d?.ticketSlots ?? 20),
    }),
  )
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const user = users.find((u) => u.id === data.userId);
    if (!user) throw new Error('User not found');

    let deviceStr = 'Unknown Device';
    let acceptedTransfers: any[] = [];
    let ticketsCount = 0;
    let transfersCount = 0;
    let ticketsCreatedCount = 0;
    let tokensCount = 0;
    let storedUserType: 'payment' | 'token' = 'payment';

    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
        deviceStr = parsed.device || '';
        ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 4;
        ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
        tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
        storedUserType = parsed.userType === 'token' ? 'token' : 'payment';
      } catch (e) {}
    } else if (user.deviceInfo) {
      deviceStr = user.deviceInfo;
    }

    user.deviceInfo = JSON.stringify({
      device: deviceStr,
      transfersCount,
      acceptedTransfers,
      ticketsCount,
      ticketSlots: data.ticketSlots,
      ticketsCreatedCount,
      tokensCount,
      userType: user.userType || storedUserType,
    });

    await saveUser(user);
    return { success: true, ticketSlots: data.ticketSlots };
  });

// ---------------------------------------------------------------------------
// 15. Increment Tickets Created Count (session-gated & ownership-verified)
// ---------------------------------------------------------------------------
export const incrementTicketsCreatedFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email?: string; sessionId?: string }) => ({
      email: String(d?.email ?? '').trim(),
      sessionId: String(d?.sessionId ?? '').trim(),
    }),
  )
  .handler(async ({ data }) => {
    // SECURITY: Authenticate caller and verify account ownership
    const user = await requireAuthenticatedUser({
      email: data.email,
      sessionId: data.sessionId,
    });

    let deviceStr = 'Unknown Device';
    let acceptedTransfers: any[] = [];
    let ticketsCount = 0;
    let transfersCount = 4;
    let ticketSlots = 20;
    let ticketsCreatedCount = 0;
    let tokensCount = 0;
    let storedUserType: 'payment' | 'token' = 'payment';

    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
        deviceStr = parsed.device || '';
        ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 4;
        ticketSlots = typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 20;
        ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
        tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
        storedUserType = parsed.userType === 'token' ? 'token' : 'payment';
      } catch (e) {}
    } else if (user.deviceInfo) {
      deviceStr = user.deviceInfo;
    }

    if (ticketsCreatedCount >= ticketSlots) {
      throw new Error('You have run out of ticket slots. Please contact the administrator.');
    }

    const newCreatedCount = ticketsCreatedCount + 1;

    user.deviceInfo = JSON.stringify({
      device: deviceStr,
      transfersCount,
      acceptedTransfers,
      ticketsCount,
      ticketSlots,
      ticketsCreatedCount: newCreatedCount,
      tokensCount,
      userType: user.userType || storedUserType,
    });

    await saveUser(user);
    return { success: true, ticketsCreatedCount: newCreatedCount, ticketSlots };
  });

// ---------------------------------------------------------------------------
// 16. Consume Tokens for Ticket Creation / Editing (Token Users only, session-gated & ownership-verified)
// ---------------------------------------------------------------------------
export const consumeTokenFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email?: string; sessionId?: string; amount?: number; action?: string }) => ({
      email: String(d?.email ?? '').trim(),
      sessionId: String(d?.sessionId ?? '').trim(),
      amount: Math.max(1, Number(d?.amount ?? 2)),
      action: String(d?.action ?? 'perform this action').trim(),
    }),
  )
  .handler(async ({ data }) => {
    // SECURITY: Authenticate caller and verify account ownership
    const user = await requireAuthenticatedUser({
      email: data.email,
      sessionId: data.sessionId,
    });

    const isTokenUser = user.userType === 'token' || user.loginMode === 'token';
    if (!isTokenUser) {
      throw new Error('This action is only available for Token Users.');
    }

    let deviceStr = '';
    let acceptedTransfers: any[] = [];
    let ticketsCount = 0;
    let transfersCount = 0;
    let ticketsCreatedCount = 0;
    let tokensCount = 0;

    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        deviceStr = parsed.device || '';
        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
        ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 4;
        ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
        tokensCount = typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0;
      } catch (e) {}
    }

    const amountNeeded = data.amount;
    if (tokensCount < amountNeeded) {
      throw new Error(`Insufficient tokens. You need at least ${amountNeeded} ${amountNeeded === 1 ? 'token' : 'tokens'} to ${data.action}.`);
    }

    const newTokensCount = tokensCount - amountNeeded;
    const isCreation = data.action.toLowerCase().includes('create');
    const newCreatedCount = isCreation ? ticketsCreatedCount + 1 : ticketsCreatedCount;

    user.deviceInfo = JSON.stringify({
      device: deviceStr,
      transfersCount,
      acceptedTransfers,
      ticketsCount: isCreation ? ticketsCount + 1 : ticketsCount,
      ticketSlots: 0,
      ticketsCreatedCount: newCreatedCount,
      tokensCount: newTokensCount,
      userType: 'token',
    });

    await saveUser(user);
    return { success: true, tokensCount: newTokensCount, ticketsCreatedCount: newCreatedCount };
  });

// ---------------------------------------------------------------------------
// 17. Update User Token Balance (admin-gated)
// ---------------------------------------------------------------------------
export const updateUserTokensFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { adminPass: string; userId: string; tokensCount: number }) => ({
      adminPass: String(d?.adminPass ?? '').trim(),
      userId: String(d?.userId ?? '').trim(),
      tokensCount: Math.max(0, Number(d?.tokensCount ?? 0)),
    }),
  )
  .handler(async ({ data }) => {
    const correctPassword = getAdminPassword();
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const user = users.find((u) => u.id === data.userId);
    if (!user) throw new Error('User not found');

    const isTokenUser = user.userType === 'token' || user.loginMode === 'token';
    if (!isTokenUser) {
      throw new Error('Token balance can only be set for Token Users.');
    }

    let deviceStr = '';
    let acceptedTransfers: any[] = [];
    let ticketsCount = 0;
    let transfersCount = 0;
    let ticketSlots = 0;
    let ticketsCreatedCount = 0;

    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        deviceStr = parsed.device || '';
        acceptedTransfers = Array.isArray(parsed.acceptedTransfers) ? parsed.acceptedTransfers : [];
        ticketsCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0;
        ticketSlots = typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 0;
        ticketsCreatedCount = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
      } catch (e) {}
    }

    user.deviceInfo = JSON.stringify({
      device: deviceStr,
      transfersCount,
      acceptedTransfers,
      ticketsCount,
      ticketSlots,
      ticketsCreatedCount,
      tokensCount: data.tokensCount,
      userType: 'token',
    });

    await saveUser(user);
    return { success: true, tokensCount: data.tokensCount };
  });

// ---------------------------------------------------------------------------
// 18. Self-Service User Sign-Up (Self-Registered Token User)
// ---------------------------------------------------------------------------
export const registerUserFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { username: string; email: string; password: string }) => ({
      username: String(d?.username ?? '').trim(),
      email: String(d?.email ?? '').trim().toLowerCase(),
      password: String(d?.password ?? '').trim(),
    }),
  )
  .handler(async ({ data }) => {
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!data.username || data.username.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const existingByEmail = await getUserByEmail(data.email);
    if (existingByEmail) {
      throw new Error('An account with this email address already exists.');
    }

    const existingByIdentifier = await getUserByIdentifier(data.username);
    if (existingByIdentifier) {
      throw new Error('This username is already taken. Please choose another username.');
    }

    const hashedPassword = await hashPassword(data.password);
    const sessionId = `sess_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    const deviceInfo = JSON.stringify({
      device: 'Web Client',
      transfersCount: 0,
      acceptedTransfers: [],
      ticketsCount: 0,
      ticketSlots: 0,
      ticketsCreatedCount: 0,
      tokensCount: 0,
      userType: 'token',
      username: data.username,
    });

    const newUser: UserAccess = {
      id: `usr_${Math.random().toString(36).substring(2, 11)}`,
      email: data.email,
      password: hashedPassword,
      duration: '1y',
      status: 'active',
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      sessionId,
      deviceInfo,
      loginMode: 'token',
      userType: 'token',
      username: data.username,
    };

    await saveUser(newUser);

    const name = data.username || data.email.split('@')[0] || 'User';

    // Set secure HttpOnly session cookie for newly registered user
    try {
      setCookie('tm_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } catch (cookieErr) {
      console.warn('Unable to set session cookie:', cookieErr);
    }

    return {
      email: newUser.email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      username: data.username,
      sessionId,
      expiresAt: null,
      loginMode: 'token',
      userType: 'token',
      transfersCount: 0,
      acceptedTransfers: [],
      ticketSlots: 0,
      ticketsCreatedCount: 0,
      tokensCount: 0,
    };
  });

// ---------------------------------------------------------------------------
// 19. Change User Password (User Account Settings, session-gated & ownership-verified)
// ---------------------------------------------------------------------------
export const changePasswordUserFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email?: string; sessionId?: string; currentPassword: string; newPassword: string }) => ({
      email: String(d?.email ?? '').trim().toLowerCase(),
      sessionId: String(d?.sessionId ?? '').trim(),
      currentPassword: String(d?.currentPassword ?? '').trim(),
      newPassword: String(d?.newPassword ?? '').trim(),
    }),
  )
  .handler(async ({ data }) => {
    // 1. Rate Limiting to prevent brute-force attacks
    const ip = getClientIp();
    const rl = checkRateLimit(ip, RATE_LIMITS.changePassword);
    if (!rl.allowed) {
      throw new Error(`Too many password change attempts. Please try again in ${rl.retryAfter} seconds.`);
    }

    // 2. SECURITY: Authenticate caller and verify account ownership
    const user = await requireAuthenticatedUser({
      email: data.email,
      sessionId: data.sessionId,
    });

    // 3. Validate new password length and format
    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    if (data.newPassword === data.currentPassword) {
      throw new Error('New password cannot be the same as your current password.');
    }

    // 4. Verify current password
    const passwordMatch = await verifyPassword(data.currentPassword, user.password);
    if (!passwordMatch.match) {
      throw new Error('Current password is incorrect.');
    }

    // 5. Hash and persist new password in database
    user.password = await hashPassword(data.newPassword);
    await saveUser(user);

    return { success: true };
  });
