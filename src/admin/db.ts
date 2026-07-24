import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

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

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const isFirebaseEnabled = () => !!process.env.FIREBASE_PROJECT_ID;

if (typeof window === 'undefined' && !isFirebaseEnabled() && (process.env.VERCEL || process.env.LAMBDA_TASK_ROOT)) {
  console.warn('⚠️ WARNING: Firebase is not configured on this deployment. User accounts created or modified in this session will NOT persist after container recycles. To fix this, set up a Firebase project and add the project environment variables.');
}

// Lazy initialization of Firebase
let dbInstance: any = null;
function getFirestoreDb() {
  if (!isFirebaseEnabled()) return null;
  if (dbInstance) return dbInstance;
  
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase app:', err);
    return null;
  }
}

export async function getDb(): Promise<DbSchema> {
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

export async function saveDb(data: DbSchema) {
  cache = data;
  initDb();
  try {
    // Write atomically via a temp file to prevent corruption
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (error) {
    console.error('Failed to write db.json:', error);
  }
}

export async function getAllUsers(): Promise<UserAccess[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const users: UserAccess[] = [];
      snapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() } as UserAccess);
      });
      return users;
    } catch (err) {
      console.error('Failed to get users from Firestore:', err);
      return [];
    }
  }

  const localDb = await getDb();
  return localDb.users.map((u) => ({
    ...u,
    loginMode: u.loginMode || 'single',
  }));
}

export async function getUserByEmail(email: string): Promise<UserAccess | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  
  const db = getFirestoreDb();
  if (db) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as UserAccess;
      }
      return undefined;
    } catch (err) {
      console.error('Failed to get user by email from Firestore:', err);
      return undefined;
    }
  }

  const localDb = await getDb();
  const found = localDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!found) return undefined;
  return {
    ...found,
    loginMode: found.loginMode || 'single',
  };
}

export async function getUserByPassword(password: string): Promise<UserAccess | undefined> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const q = query(collection(db, 'users'), where('password', '==', password));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as UserAccess;
      }
      return undefined;
    } catch (err) {
      console.error('Failed to get user by password from Firestore:', err);
      return undefined;
    }
  }

  const localDb = await getDb();
  const found = localDb.users.find((u) => u.password === password);
  if (!found) return undefined;
  return {
    ...found,
    loginMode: found.loginMode || 'single',
  };
}

export async function saveUser(user: UserAccess) {
  const db = getFirestoreDb();
  if (db) {
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });
      return;
    } catch (err) {
      console.error('Failed to save user in Firestore:', err);
    }
  }

  const localDb = await getDb();
  const index = localDb.users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    localDb.users[index] = user;
  } else {
    localDb.users.push(user);
  }
  await saveDb(localDb);
}

export async function deleteUser(id: string) {
  const db = getFirestoreDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'users', id));
      return;
    } catch (err) {
      console.error('Failed to delete user from Firestore:', err);
    }
  }

  const localDb = await getDb();
  localDb.users = localDb.users.filter((u) => u.id !== id);
  await saveDb(localDb);
}

export async function addLoginAttempt(attempt: Omit<LoginAttempt, 'id'>) {
  const attemptId = `att_${Math.random().toString(36).substring(2, 11)}`;
  const newAttempt: LoginAttempt = {
    ...attempt,
    id: attemptId,
  };

  const db = getFirestoreDb();
  if (db) {
    try {
      await setDoc(doc(db, 'attempts', attemptId), newAttempt);
      return;
    } catch (err) {
      console.error('Failed to add login attempt to Firestore:', err);
    }
  }

  const localDb = await getDb();
  localDb.attempts.unshift(newAttempt);
  if (localDb.attempts.length > 500) {
    localDb.attempts = localDb.attempts.slice(0, 500);
  }
  await saveDb(localDb);
}

export async function getAllAttempts(): Promise<LoginAttempt[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const q = query(collection(db, 'attempts'), orderBy('timestamp', 'desc'), limit(500));
      const snapshot = await getDocs(q);
      const attempts: LoginAttempt[] = [];
      snapshot.forEach((docSnap) => {
        attempts.push(docSnap.data() as LoginAttempt);
      });
      return attempts;
    } catch (err) {
      console.error('Failed to get attempts from Firestore:', err);
      return [];
    }
  }

  const localDb = await getDb();
  return localDb.attempts;
}
