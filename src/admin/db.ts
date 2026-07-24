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

const SUPABASE_URL = 'https://dzrtttgdpcunckuuobmu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cnR0dGdkcGN1bmNrdXVvYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MjcxODEsImV4cCI6MjEwMDUwMzE4MX0.7Km-pRohbCcUB83PuTmCDsBRj4xAJmEnnbwpqaMD6V0';

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase request failed: ${res.status} ${res.statusText} - ${text}`);
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
  }
  return undefined;
}

export async function getUserByPassword(password: string): Promise<UserAccess | undefined> {
  try {
    const res = await supabaseFetch(`users?password=eq.${password}`);
    const data = await res.json();
    if (data.length > 0) {
      return {
        ...data[0],
        loginMode: data[0].loginMode || 'single'
      };
    }
  } catch (err) {
    console.error('Failed to get user by password from Supabase:', err);
  }
  return undefined;
}

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
