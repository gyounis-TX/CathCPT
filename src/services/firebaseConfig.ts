// Firebase Configuration for CathCPT
// Initializes Firebase App, Auth, and Firestore with offline persistence

import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth, connectAuthEmulator, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { logger } from './logger';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator
} from 'firebase/firestore';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export async function initializeFirebase(): Promise<{ app: FirebaseApp; auth: Auth; db: Firestore }> {
  if (app && auth && db) {
    return { app, auth, db };
  }

  app = initializeApp(firebaseConfig);
  // Use browserLocalPersistence instead of indexedDB to avoid WKWebView deadlock
  // Firebase Auth's default indexedDB persistence can hang in Capacitor's WKWebView
  auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, indexedDBLocalPersistence]
  });
  db = getFirestore(app);

  // Connect to emulators in dev
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
  }

  // Enable offline persistence for Firestore (with timeout to prevent hangs)
  try {
    await Promise.race([
      enableIndexedDbPersistence(db),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Persistence timeout')), 5000))
    ]);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'failed-precondition') {
      logger.warn('Firestore persistence failed: multiple tabs open');
    } else if (error.code === 'unimplemented') {
      logger.warn('Firestore persistence not available in this browser');
    } else {
      logger.warn('Firestore persistence setup skipped:', error.message || 'timeout');
    }
  }

  return { app, auth, db };
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return db;
}

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
}
