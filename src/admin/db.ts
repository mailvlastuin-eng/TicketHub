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
  loginMode?: 'single' | 'multiple';
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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error(
      '[CRITICAL] Server misconfiguration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars must be set.'
    );
    throw new Error('Internal Server Error');
  }
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
    return data.map((u: any) => ({
      ...u,
      loginMode: u.loginMode || 'single'
    }));
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
      return {
        ...data[0],
        loginMode: data[0].loginMode || 'single'
      };
    }
  } catch (err) {
    console.error('Failed to get user by email from Supabase:', err);
    throw err;
  }
  return undefined;
}

// getUserByPassword removed — querying the database by a raw password value
// is a security antipattern and was not used by any handler.

export async function saveUser(user: UserAccess) {
  try {
    await supabaseFetch('users', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(user)
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
