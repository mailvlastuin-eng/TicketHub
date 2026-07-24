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

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tickethub';
  return {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let dbInstance: any = null;
function getFirestoreDb() {
  try {
    const config = getFirebaseConfig();
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase Firestore app:', err);
    return null;
  }
}

// Explicit Firebase Firestore CRUD Operations
export async function getAllUsers(): Promise<UserAccess[]> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }
  
  const q = query(collection(db, 'users'));
  const snapshot = await getDocs(q);
  const users: UserAccess[] = [];
  snapshot.forEach((docSnap) => {
    users.push({ id: docSnap.id, ...docSnap.data() } as UserAccess);
  });
  return users;
}

export async function getUserByEmail(email: string): Promise<UserAccess | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }

  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as UserAccess;
  }
  return undefined;
}

export async function getUserByPassword(password: string): Promise<UserAccess | undefined> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }

  const q = query(collection(db, 'users'), where('password', '==', password));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as UserAccess;
  }
  return undefined;
}

export async function saveUser(user: UserAccess) {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }
  
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, user, { merge: true });
}

export async function deleteUser(id: string) {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }
  
  await deleteDoc(doc(db, 'users', id));
}

export async function addLoginAttempt(attempt: Omit<LoginAttempt, 'id'>) {
  const attemptId = `att_${Math.random().toString(36).substring(2, 11)}`;
  const newAttempt: LoginAttempt = {
    ...attempt,
    id: attemptId,
  };

  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }
  
  await setDoc(doc(db, 'attempts', attemptId), newAttempt);
}

export async function getAllAttempts(): Promise<LoginAttempt[]> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore is not initialized');
  }
  
  const q = query(collection(db, 'attempts'), orderBy('timestamp', 'desc'), limit(500));
  const snapshot = await getDocs(q);
  const attempts: LoginAttempt[] = [];
  snapshot.forEach((docSnap) => {
    attempts.push(docSnap.data() as LoginAttempt);
  });
  return attempts;
}
