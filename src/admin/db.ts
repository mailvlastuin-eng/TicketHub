import * as fs from 'fs';
import * as path from 'path';

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

// Check if running in Vercel or other lambda environment
const isVercel = process.env.VERCEL || process.env.NOW_BUILD || (typeof window === 'undefined' && !process.env.LOCAL_DEV && (process.env.LAMBDA_TASK_ROOT || process.env.HOME === '/var/task'));

// The bundle path where the original db.json is located
const BUNDLE_DB_PATH = path.join(process.cwd(), 'src/admin/data/db.json');

// Writable database path
const DB_PATH = isVercel ? '/tmp/db.json' : BUNDLE_DB_PATH;

// Initialize database file if it doesn't exist
function initDb() {
  if (isVercel) {
    if (!fs.existsSync(DB_PATH)) {
      try {
        if (fs.existsSync(BUNDLE_DB_PATH)) {
          fs.copyFileSync(BUNDLE_DB_PATH, DB_PATH);
        } else {
          const initialData: DbSchema = { users: [], attempts: [] };
          fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
        }
      } catch (err) {
        console.error('Failed to initialize db in /tmp:', err);
      }
    }
  } else {
    const DB_DIR = path.dirname(DB_PATH);
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initialData: DbSchema = { users: [], attempts: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }
}

// In-memory cache to speed up reads and manage concurrency
let cache: DbSchema | null = null;

export function getDb(): DbSchema {
  initDb();
  if (cache) {
    return cache;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    cache = JSON.parse(raw) as DbSchema;
    return cache;
  } catch (error) {
    console.error('Failed to read db.json, returning empty structure:', error);
    return { users: [], attempts: [] };
  }
}

export function saveDb(data: DbSchema) {
  initDb();
  cache = data;
  try {
    // Write atomically via a temp file to prevent corruption
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (error) {
    console.error('Failed to write db.json:', error);
  }
}

export function getAllUsers(): UserAccess[] {
  return getDb().users.map((u) => ({
    ...u,
    loginMode: u.loginMode || 'single',
  }));
}

export function getUserByEmail(email: string): UserAccess | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  const found = getDb().users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!found) return undefined;
  return {
    ...found,
    loginMode: found.loginMode || 'single',
  };
}

export function getUserByPassword(password: string): UserAccess | undefined {
  const found = getDb().users.find((u) => u.password === password);
  if (!found) return undefined;
  return {
    ...found,
    loginMode: found.loginMode || 'single',
  };
}

export function saveUser(user: UserAccess) {
  const db = getDb();
  const index = db.users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    db.users[index] = user;
  } else {
    db.users.push(user);
  }
  saveDb(db);
}

export function deleteUser(id: string) {
  const db = getDb();
  db.users = db.users.filter((u) => u.id !== id);
  saveDb(db);
}

export function addLoginAttempt(attempt: Omit<LoginAttempt, 'id'>) {
  const db = getDb();
  const newAttempt: LoginAttempt = {
    ...attempt,
    id: `att_${Math.random().toString(36).substring(2, 11)}`,
  };
  // Prepend to show newest first
  db.attempts.unshift(newAttempt);
  
  // Cap history size to prevent file size bloat (e.g. max 500 attempts)
  if (db.attempts.length > 500) {
    db.attempts = db.attempts.slice(0, 500);
  }
  saveDb(db);
}

export function getAllAttempts(): LoginAttempt[] {
  return getDb().attempts;
}
