export interface UserAccess {
  id: string;
  email: string;
  password: string;
  duration: '1m' | '3m' | '6m' | '1y';
  status: 'pending' | 'active' | 'expired' | 'terminated';
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  sessionId: string | null;
  deviceInfo: string | null;
  loginMode?: 'single' | 'multiple' | 'token';
  userType?: 'payment' | 'token';
  username?: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  passwordAttempted: string;
  timestamp: string;
  success: boolean;
  status: string; // 'success' | 'blocked_already_active' | 'blocked_expired' | 'blocked_terminated' | 'failed_incorrect_password'
  userAgent: string;
  ip: string;
  deviceInfo: string;
}

export interface DbSchema {
  users: UserAccess[];
  attempts: LoginAttempt[];
}

// SECURITY: credentials must be set as environment variables — never hard-coded.
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel / Cloudflare dashboard.
function getSupabaseCredentials(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL || 'https://dzrtttgdpcunckuuobmu.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cnR0dGdkcGN1bmNrdXVvYm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyNzE4MSwiZXhwIjoyMTAwNTAzMTgxfQ.O7hv8yA1ak5SJFFnH8IgGsL-ao1_mWGpIpaqTzivS8Q';
  return { url, key };
}

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const { url, key } = getSupabaseCredentials();
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    // Do NOT include the raw response body in errors returned to callers —
    // it may contain DB schema details. Log server-side only.
    const text = await res.text();
    console.error(`Supabase error [${res.status}]:`, text);
    throw new Error(`Database request failed (${res.status}).`);
  }
  return res;
}

// Supabase REST helper methods to keep DB operations clean
export async function getDb(): Promise<DbSchema> {
  const users = await getAllUsers();
  const attempts = await getAllAttempts();
  return { users, attempts };
}

export async function getAllUsers(): Promise<UserAccess[]> {
  try {
    const res = await supabaseFetch('users?select=*');
    const data = await res.json();
    return data.map((u: any) => {
      let userType: 'payment' | 'token' = u.loginMode === 'token' ? 'token' : 'payment';
      let username: string | undefined = u.username || undefined;
      if (u.deviceInfo && u.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(u.deviceInfo);
          if (parsed.userType === 'token') userType = 'token';
          if (parsed.username) username = username || parsed.username;
        } catch (e) {}
      }
      if (!username && u.email) {
        username = u.email.split('@')[0];
      }
      return {
        ...u,
        loginMode: u.loginMode || 'single',
        userType,
        username,
      };
    });
  } catch (err) {
    console.error('Failed to fetch users from Supabase:', err);
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<UserAccess | undefined> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await supabaseFetch(`users?email=ilike.${normalizedEmail}`);
    const data = await res.json();
    if (data.length > 0) {
      const u = data[0];
      let userType: 'payment' | 'token' = u.loginMode === 'token' ? 'token' : 'payment';
      let username: string | undefined = u.username || undefined;
      if (u.deviceInfo && u.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(u.deviceInfo);
          if (parsed.userType === 'token') userType = 'token';
          if (parsed.username) username = username || parsed.username;
        } catch (e) {}
      }
      if (!username && u.email) {
        username = u.email.split('@')[0];
      }
      return {
        ...u,
        loginMode: u.loginMode || 'single',
        userType,
        username,
      };
    }
  } catch (err) {
    console.error('Failed to get user by email from Supabase:', err);
    throw err;
  }
  return undefined;
}

export async function getUserByIdentifier(identifier: string): Promise<UserAccess | undefined> {
  const clean = identifier.trim().toLowerCase();
  const byEmail = await getUserByEmail(clean);
  if (byEmail) return byEmail;

  // Search by username if email lookup yielded no result
  const allUsers = await getAllUsers();
  return allUsers.find(
    (u) => u.username && u.username.trim().toLowerCase() === clean
  );
}

export async function getUserBySessionId(sessionId: string): Promise<UserAccess | undefined> {
  const clean = sessionId.trim();
  if (!clean) return undefined;
  try {
    const res = await supabaseFetch(`users?sessionId=eq.${clean}`);
    const data = await res.json();
    if (data.length > 0) {
      const u = data[0];
      let userType: 'payment' | 'token' = u.loginMode === 'token' ? 'token' : 'payment';
      let username: string | undefined = u.username || undefined;
      if (u.deviceInfo && u.deviceInfo.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(u.deviceInfo);
          if (parsed.userType === 'token') userType = 'token';
          if (parsed.username) username = username || parsed.username;
        } catch (e) {}
      }
      if (!username && u.email) {
        username = u.email.split('@')[0];
      }
      return {
        ...u,
        loginMode: u.loginMode || 'single',
        userType,
        username,
      };
    }
  } catch (err) {
    console.error('Failed to get user by sessionId from Supabase:', err);
  }
  return undefined;
}


// getUserByPassword removed — querying the database by a raw password value
// is a security antipattern and was not used by any handler.

export async function saveUser(user: UserAccess) {
  try {
    // Only send columns that exist in the Supabase schema to prevent 400 Bad Request
    const payload: Record<string, any> = {
      id: user.id,
      email: user.email,
      password: user.password,
      duration: user.duration,
      status: user.status,
      createdAt: user.createdAt,
      activatedAt: user.activatedAt,
      expiresAt: user.expiresAt,
      sessionId: user.sessionId,
      deviceInfo: user.deviceInfo,
      loginMode: user.loginMode || 'single',
    };

    await supabaseFetch('users', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to save user in Supabase:', err);
    throw err;
  }
}

export async function deleteUser(id: string) {
  try {
    await supabaseFetch(`users?id=eq.${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.error('Failed to delete user in Supabase:', err);
    throw err;
  }
}

export async function addLoginAttempt(attempt: Omit<LoginAttempt, 'id'>) {
  const attemptId = `att_${Math.random().toString(36).substring(2, 11)}`;
  const newAttempt: LoginAttempt = {
    ...attempt,
    id: attemptId,
  };
  try {
    await supabaseFetch('attempts', {
      method: 'POST',
      body: JSON.stringify(newAttempt)
    });
  } catch (err) {
    console.error('Failed to save login attempt in Supabase:', err);
  }
}

export async function getAllAttempts(): Promise<LoginAttempt[]> {
  try {
    const res = await supabaseFetch('attempts?select=*&order=timestamp.desc&limit=500');
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch attempts from Supabase:', err);
    return [];
  }
}
