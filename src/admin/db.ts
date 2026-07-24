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

const DB_DIR = path.join(process.cwd(), 'src/admin/data');
const DB_PATH = path.join(DB_DIR, 'db.json');

// Initialize database file if it doesn't exist
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initialData: DbSchema = { users: [], attempts: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
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
