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
import { compileTransferEmailHtml, sendEmail, type SendTransferEmailOptions } from './email';

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
    let durationDays = 30;
    if (user.duration === '3m') durationDays = 90;
    if (user.duration === '6m') durationDays = 180;
    if (user.duration === '1y') durationDays = 360;

    const expiresAt = user.expiresAt ? new Date(user.expiresAt) : new Date(activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
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
    let transfersCount = 0;
    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0;
      } catch (e) {}
    }

    return {
      email: user.email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      sessionId,
      expiresAt: expiresAt.toISOString(),
      loginMode: user.loginMode || 'single',
      transfersCount,
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

    if (!user || user.status !== 'active') {
      return { valid: false };
    }

    // Only enforce exact sessionId match for single-session users
    if (user.loginMode !== 'multiple' && user.sessionId !== sessionId) {
      return { valid: false };
    }

    // Double check and recalculate expiry
    if (user.status === 'active' && user.activatedAt) {
      let durationDays = 30;
      if (user.duration === '3m') durationDays = 90;
      if (user.duration === '6m') durationDays = 180;
      if (user.duration === '1y') durationDays = 360;

      const expectedExpiry = new Date(new Date(user.activatedAt).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      
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

    let transfersCount = 0;
    if (user.deviceInfo && user.deviceInfo.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.deviceInfo);
        transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0;
      } catch (e) {}
    }

    return { valid: true, transfersCount };
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

    // Check, recalculate, and update expired users (each month = 30 days)
    for (const u of users) {
      if (u.status === 'active' && u.activatedAt) {
        let durationDays = 30;
        if (u.duration === '3m') durationDays = 90;
        if (u.duration === '6m') durationDays = 180;
        if (u.duration === '1y') durationDays = 360;

        const expectedExpiry = new Date(new Date(u.activatedAt).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        
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

// 9. Get Database Diagnostics
export const getDiagnosticsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
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
      hasProjectId: true,
      projectId: 'Supabase (dzrtttgdpcunckuuobmu)',
      hasApiKey: true,
      dbStatus,
      dbError,
      envKeys: []
    };
  });

// 10. Send Ticket Transfer Email
export const sendTransferEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((d: SendTransferEmailOptions & { senderEmail?: string }) => d)
  .handler(async ({ data }) => {
    if (data.senderEmail) {
      const user = await getUserByEmail(data.senderEmail);
      if (user) {
        let transfersCount = 0;
        let deviceName = 'Unknown Device';
        if (user.deviceInfo) {
          if (user.deviceInfo.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(user.deviceInfo);
              deviceName = parsed.device || 'Unknown Device';
              transfersCount = typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0;
            } catch (e) {}
          } else {
            deviceName = user.deviceInfo;
          }
        }

        if (transfersCount <= 0) {
          throw new Error('You have no ticket transfers left on your account.');
        }

        user.deviceInfo = JSON.stringify({
          device: deviceName,
          transfersCount: transfersCount - 1
        });
        await saveUser(user);
      }
    }

    const html = compileTransferEmailHtml(data);
    const result = await sendEmail({
      to: data.buyerEmail,
      subject: `Your ticket transfer to ${data.buyerName} for ${data.ticketTitle} is on the way.`,
      html,
    });
    return result;
  });

export const updateUserProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; name: string }) => ({
    email: String(d?.email ?? '').trim(),
    name: String(d?.name ?? '').trim(),
  }))
  .handler(async ({ data }) => {
    const user = await getUserByEmail(data.email);
    if (!user) throw new Error('User not found');
    user.name = data.name;
    await saveUser(user);
    return { success: true };
  });

export const updateUserTransfersFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { adminPass: string; userId: string; transfersCount: number }) => ({
    adminPass: String(d?.adminPass ?? '').trim(),
    userId: String(d?.userId ?? '').trim(),
    transfersCount: Number(d?.transfersCount ?? 0)
  }))
  .handler(async ({ data }) => {
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (data.adminPass !== correctPassword) {
      throw new Error('Unauthorized access');
    }

    const users = await getAllUsers();
    const user = users.find((u) => u.id === data.userId);
    if (!user) throw new Error('User not found');

    // Parse the current deviceInfo to preserve device name
    let deviceName = 'Unknown Device';
    if (user.deviceInfo) {
      if (user.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(user.deviceInfo);
          deviceName = parsed.device || 'Unknown Device';
        } catch (e) {}
      } else {
        deviceName = user.deviceInfo;
      }
    }

    // Set JSON back to deviceInfo
    user.deviceInfo = JSON.stringify({
      device: deviceName,
      transfersCount: data.transfersCount
    });

    await saveUser(user);
    return { success: true, transfersCount: data.transfersCount };
  });

