import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { addMonths } from 'date-fns';
import {
  getUserByEmail,
  saveUser,
  addLoginAttempt,
  getAllUsers,
  getAllAttempts,
  deleteUser,
  type UserAccess,
} from './db';
import { getDeviceString } from './utils';

// Helper to generate a random 8-character password
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// 1. User Login
export const loginUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => ({
    email: String(d?.email ?? '').trim(),
    password: String(d?.password ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const { email, password } = data;
    const headers = getRequestHeaders();
    const userAgent = (headers['user-agent'] as string) || 'Unknown';
    const ip = (headers['x-forwarded-for'] as string) || (headers['x-real-ip'] as string) || '127.0.0.1';
    const deviceInfo = getDeviceString(userAgent);

    const user = await getUserByEmail(email);

    // 1. Check if user exists
    if (!user || user.password !== password) {
      await addLoginAttempt({
        email,
        passwordAttempted: password,
        timestamp: new Date().toISOString(),
        success: false,
        status: 'failed_incorrect_password',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('Invalid email or password');
    }

    // 2. Check if access has expired (if activated already)
    if (user.status === 'active' && user.expiresAt) {
      const isExpired = new Date() > new Date(user.expiresAt);
      if (isExpired) {
        user.status = 'expired';
        await saveUser(user);
      }
    }

    // 3. Handle different access states
    if (user.status === 'expired') {
      await addLoginAttempt({
        email,
        passwordAttempted: password,
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
        passwordAttempted: password,
        timestamp: new Date().toISOString(),
        success: false,
        status: 'blocked_terminated',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('Your user access has been terminated.');
    }

    if (user.status === 'active' && user.loginMode !== 'multiple') {
      await addLoginAttempt({
        email,
        passwordAttempted: password,
        timestamp: new Date().toISOString(),
        success: false,
        status: 'blocked_already_active',
        userAgent,
        ip,
        deviceInfo,
      });
      throw new Error('You can only sign in once. This session is already active.');
    }

    // 4. Activate access (status is pending or already active for multiple sign-ins)
    const activatedAt = user.activatedAt ? new Date(user.activatedAt) : new Date();
    let durationMonths = 1;
    if (user.duration === '3m') durationMonths = 3;
    if (user.duration === '6m') durationMonths = 6;
    if (user.duration === '1y') durationMonths = 12;

    const expiresAt = user.expiresAt ? new Date(user.expiresAt) : addMonths(activatedAt, durationMonths);
    const sessionId = `sess_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    user.status = 'active';
    if (!user.activatedAt) user.activatedAt = activatedAt.toISOString();
    if (!user.expiresAt) user.expiresAt = expiresAt.toISOString();
    user.sessionId = sessionId;
    user.deviceInfo = deviceInfo;

    await saveUser(user);

    await addLoginAttempt({
      email,
      passwordAttempted: password,
      timestamp: new Date().toISOString(),
      success: true,
      status: 'success',
      userAgent,
      ip,
      deviceInfo,
    });

    const name = email.split('@')[0] || 'User';
    return {
      email: user.email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      sessionId,
      expiresAt: expiresAt.toISOString(),
      loginMode: user.loginMode || 'single',
    };
  });

// 2. Validate session on client page loads
export const checkSessionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; sessionId: string }) => ({
    email: String(d?.email ?? '').trim(),
    sessionId: String(d?.sessionId ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const { email, sessionId } = data;
    const user = await getUserByEmail(email);

    if (!user || user.sessionId !== sessionId || user.status !== 'active') {
      return { valid: false };
    }

    // Double check expiry
    if (user.expiresAt) {
      const isExpired = new Date() > new Date(user.expiresAt);
      if (isExpired) {
        user.status = 'expired';
        user.sessionId = null;
        await saveUser(user);
        return { valid: false };
      }
    }

    return { valid: true };
  });

// 3. Admin Authentication
export const adminLoginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (data.adminPass !== correctPassword) {
      throw new Error('Invalid administrator password');
    }
    return { authenticated: true };
  });

// 4. Get Admin Dashboard Data
export const getAdminDashboardDataFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const attempts = await getAllAttempts();

    // Check and update expired users
    for (const u of users) {
      if (u.status === 'active' && u.expiresAt) {
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

    return {
      users,
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

// 5. Create new User Access (by Admin)
export const createUserAccessFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string; email: string; duration: '1m' | '3m' | '6m' | '1y'; password?: string; loginMode?: 'single' | 'multiple' }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
    email: String(d?.email ?? '').trim(),
    duration: d?.duration || '1m',
    password: d?.password ? String(d.password).trim() : undefined,
    loginMode: (d?.loginMode === 'multiple' ? 'multiple' : 'single') as 'single' | 'multiple',
  }))
  .handler(async ({ data }) => {
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('A user with this email already exists.');
    }

    const newUser: UserAccess = {
      id: `usr_${Math.random().toString(36).substring(2, 11)}`,
      email: data.email.toLowerCase(),
      password: data.password || generatePassword(),
      duration: data.duration,
      status: 'pending',
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      sessionId: null,
      deviceInfo: null,
      loginMode: data.loginMode,
    };

    await saveUser(newUser);
    return { success: true, user: newUser };
  });

// 6. Terminate Access (by Admin)
export const terminateUserAccessFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string; userId: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
    userId: String(d?.userId ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
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

// 7. Delete User Access History (by Admin)
export const deleteUserAccessFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string; userId: string }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
    userId: String(d?.userId ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    await deleteUser(data.userId);
    return { success: true };
  });

// 8. Get App Build Version/Timestamp
export const getAppVersionFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return {
      version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || '1.0.0-dev',
    };
  });
