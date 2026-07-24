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
const CLOUD_DB_URL = 'https://jsonblob.com/api/jsonBlob/019f9640-4c3f-7901-ba90-e701ebfb29eb';

// Initialize database file if it doesn't exist
function initDb() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initialData: DbSchema = { users: [], attempts: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  } catch (err) {
    // Fail silently on read-only serverless filesystems
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

// Lazy initialization of Firebase
let dbInstance: any = null;
function getFirestoreDb() {
  if (!isFirebaseEnabled()) return null;
  if (dbInstance) return dbInstance;
  
  try {
    const config = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase app:', err);
    return null;
  }
}

export async function getDb(): Promise<DbSchema> {
  initDb();
  
  // Try fetching from persistent cloud JSON blob first
  try {
    const res = await fetch(CLOUD_DB_URL, { 
      headers: { 'Accept': 'application/json' },
      cache: 'no-store' 
    });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.users)) {
        cache = json as DbSchema;
        return cache;
      }
    }
  } catch (cloudErr) {
    console.warn('Cloud Blob fallback fetch error:', cloudErr);
  }

  if (cache) {
    return cache;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    cache = JSON.parse(raw) as DbSchema;
    return cache;
  } catch (error) {
    return { users: [], attempts: [] };
  }
}

export async function saveDb(data: DbSchema) {
  cache = data;
  initDb();
  
  // Sync asynchronously to persistent cloud blob storage
  try {
    await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (cloudErr) {
    console.error('Cloud Blob fallback save error:', cloudErr);
  }

  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (error) {
    // Fail silently on read-only serverless filesystems
  }
}

export async function getAllUsers(): Promise<UserAccess[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const users: UserAccess[] = [];
        snapshot.forEach((docSnap) => {
          users.push({ id: docSnap.id, ...docSnap.data() } as UserAccess);
        });
        return users;
      }
    } catch (err) {
      console.error('Failed to get users from Firestore:', err);
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
    } catch (err) {
      console.error('Failed to get user by email from Firestore:', err);
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
    } catch (err) {
      console.error('Failed to get user by password from Firestore:', err);
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
  const localDb = await getDb();
  const index = localDb.users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    localDb.users[index] = user;
  } else {
    localDb.users.push(user);
  }
  await saveDb(localDb);

  const db = getFirestoreDb();
  if (db) {
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });
    } catch (err) {
      console.error('Failed to save user in Firestore:', err);
    }
  }
}

export async function deleteUser(id: string) {
  const localDb = await getDb();
  localDb.users = localDb.users.filter((u) => u.id !== id);
  await saveDb(localDb);

  const db = getFirestoreDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error('Failed to delete user from Firestore:', err);
    }
  }
}

export async function addLoginAttempt(attempt: Omit<LoginAttempt, 'id'>) {
  const attemptId = `att_${Math.random().toString(36).substring(2, 11)}`;
  const newAttempt: LoginAttempt = {
    ...attempt,
    id: attemptId,
  };

  const localDb = await getDb();
  localDb.attempts.unshift(newAttempt);
  if (localDb.attempts.length > 500) {
    localDb.attempts = localDb.attempts.slice(0, 500);
  }
  await saveDb(localDb);

  const db = getFirestoreDb();
  if (db) {
    try {
      await setDoc(doc(db, 'attempts', attemptId), newAttempt);
    } catch (err) {
      console.error('Failed to add login attempt to Firestore:', err);
    }
  }
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
