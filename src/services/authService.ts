// Authentication Service for CathCPT Pro
// Handles Firebase Auth with email/password, secure session management

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';

// Storage keys
const AUTH_USER_KEY = 'auth_user';

// User tier and role types
export type UserTier = 'individual' | 'pro';
export type UserRole = 'physician' | 'admin' | null;

export interface AuthUser {
  id: string;
  email: string;
  tier: UserTier;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  // Fetch user profile from Firestore
  const authUser = await fetchUserProfile(user.uid, user.email);

  // Store locally for offline access
  await storeUser(authUser);

  return authUser;
}

// Sign up new user
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // The Cloud Function onUserCreated will create the /users/{uid} doc,
  // but we also write it here for immediate availability
  const authUser: AuthUser = {
    id: user.uid,
    email: user.email || email,
    tier: 'individual',
    role: null,
    organizationId: null,
    organizationName: null,
    displayName: displayName || null,
    createdAt: new Date().toISOString()
  };

  const db = getFirebaseDb();
  await setDoc(doc(db, 'users', user.uid), {
    email: authUser.email,
    tier: authUser.tier,
    role: authUser.role,
    organizationId: authUser.organizationId,
    organizationName: authUser.organizationName,
    displayName: authUser.displayName,
    createdAt: authUser.createdAt
  });

  await storeUser(authUser);

  return authUser;
}

// Sign out — wipes all PHI from device
export async function signOut(): Promise<void> {
  if (isFirebaseConfigured()) {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }

  await window.storage.clearAll();
}

// Get current session (checks Firebase Auth state + local cache)
export async function getCurrentSession(): Promise<{ user: AuthUser | null }> {
  if (!isFirebaseConfigured()) {
    const storedUser = await getStoredUser();
    return { user: storedUser };
  }

  const auth = getFirebaseAuth();

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();

      if (firebaseUser) {
        try {
          const authUser = await fetchUserProfile(firebaseUser.uid, firebaseUser.email);
          await storeUser(authUser);
          resolve({ user: authUser });
        } catch {
          // Offline — fall back to stored user
          const storedUser = await getStoredUser();
          resolve({ user: storedUser });
        }
      } else {
        resolve({ user: null });
      }
    });
  });
}

// Fetch user profile from Firestore
async function fetchUserProfile(userId: string, email?: string | null): Promise<AuthUser> {
  const db = getFirebaseDb();
  const userDoc = await getDoc(doc(db, 'users', userId));

  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      id: userId,
      email: data.email || email || '',
      tier: data.tier || 'individual',
      role: data.role || null,
      organizationId: data.organizationId || null,
      organizationName: data.organizationName || null,
      displayName: data.displayName || null,
      createdAt: data.createdAt || new Date().toISOString()
    };
  }

  // Doc doesn't exist yet (race with Cloud Function)
  return {
    id: userId,
    email: email || '',
    tier: 'individual',
    role: null,
    organizationId: null,
    organizationName: null,
    displayName: null,
    createdAt: new Date().toISOString()
  };
}

// Store user locally for offline access
async function storeUser(user: AuthUser): Promise<void> {
  await window.storage.set(AUTH_USER_KEY, JSON.stringify(user));
}

// Get stored user from local storage
async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const result = await window.storage.get(AUTH_USER_KEY);
    if (result?.value) {
      return JSON.parse(result.value) as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getStoredUser();
  return user !== null;
}

// Check if user has Pro tier
export async function isProUser(): Promise<boolean> {
  const user = await getStoredUser();
  return user?.tier === 'pro';
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const user = await getStoredUser();
  return user?.tier === 'pro' && user?.role === 'admin';
}

// Check if user is physician
export async function isPhysician(): Promise<boolean> {
  const user = await getStoredUser();
  return user?.tier === 'pro' && user?.role === 'physician';
}

// Password reset
export async function resetPassword(email: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

// Update password
export async function updatePassword(newPassword: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await firebaseUpdatePassword(user, newPassword);
}

// Update user profile
export async function updateProfile(updates: {
  displayName?: string;
  email?: string;
}): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  // Update auth email if changed
  const storedUser = await getStoredUser();
  if (updates.email && updates.email !== storedUser?.email) {
    await updateEmail(firebaseUser, updates.email);
  }

  // Update Firestore profile
  const db = getFirebaseDb();
  const updateData: Record<string, string | undefined> = {};
  if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
  if (updates.email !== undefined) updateData.email = updates.email;

  await updateDoc(doc(db, 'users', firebaseUser.uid), updateData);

  // Return updated profile
  const authUser = await fetchUserProfile(firebaseUser.uid, updates.email || firebaseUser.email);
  await storeUser(authUser);
  return authUser;
}

// Listen for auth state changes
export function onAuthStateChange(
  callback: (event: string, user: User | null) => void
): { unsubscribe: () => void } {
  if (!isFirebaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const auth = getFirebaseAuth();
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user);
  });

  return { unsubscribe };
}
