// Authentication Service for CathCPT
// Handles Firebase Auth with email/password, Apple Sign-In, Google Sign-In, and secure session management

import {
  signInWithEmailAndPassword,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateEmail,
  onAuthStateChanged,
  OAuthProvider,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { logAuditEvent } from './auditService';
import { getPlatformName } from './platformService';

// Storage keys
const AUTH_USER_KEY = 'auth_user';

// User tier and role types
export type UserTier = 'individual' | 'pro';
export type UserRole = 'physician' | 'admin' | null;

export type AuthProvider = 'password' | 'apple.com' | 'google.com';

export interface AuthUser {
  id: string;
  email: string;
  tier: UserTier;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  displayName: string | null;
  createdAt: string;
  authProvider?: AuthProvider;
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
  let authUser: AuthUser;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    // Fetch user profile from Firestore
    authUser = await fetchUserProfile(user.uid, user.email);
    authUser.authProvider = 'password';

    // Store locally for offline access
    await storeUser(authUser);

    // Log successful login
    const platform = getPlatformName();
    if (authUser.organizationId) {
      logAuditEvent(authUser.organizationId, {
        action: 'user_login',
        userId: authUser.id,
        userName: authUser.displayName || authUser.email,
        targetPatientId: null,
        targetPatientName: null,
        details: `User logged in (${platform})`,
        listContext: null,
        metadata: { platform }
      });
    }
  } catch (error) {
    // Log failed login attempt
    logAuditEvent('system', {
      action: 'user_login_failed',
      userId: email,
      userName: email,
      targetPatientId: null,
      targetPatientName: null,
      details: 'Login attempt failed',
      listContext: null,
      metadata: { platform: getPlatformName() }
    });
    throw error;
  }

  return authUser;
}

// Sign in with Apple (native Capacitor plugin → Firebase credential)
export async function signInWithApple(): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();

  // Native Apple Sign-In via Capacitor plugin
  const result = await FirebaseAuthentication.signInWithApple();

  // Create Firebase credential from the native result
  const credential = new OAuthProvider('apple.com').credential({
    idToken: result.credential?.idToken,
    rawNonce: result.credential?.nonce
  });

  // Sign in to Firebase JS Auth
  const { user } = await signInWithCredential(auth, credential);

  // Fetch or create Firestore profile
  let authUser = await fetchOrCreateSocialProfile(
    user.uid,
    user.email,
    result.user?.displayName || user.displayName
  );
  authUser.authProvider = 'apple.com';

  await storeUser(authUser);

  // Log successful login
  const platform = getPlatformName();
  if (authUser.organizationId) {
    logAuditEvent(authUser.organizationId, {
      action: 'user_login',
      userId: authUser.id,
      userName: authUser.displayName || authUser.email,
      targetPatientId: null,
      targetPatientName: null,
      details: `User logged in via Apple Sign-In (${platform})`,
      listContext: null,
      metadata: { platform, authProvider: 'apple.com' }
    });
  }

  return authUser;
}

// Sign in with Google (native Capacitor plugin → Firebase credential)
export async function signInWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();

  // Native Google Sign-In via Capacitor plugin
  const result = await FirebaseAuthentication.signInWithGoogle();

  // Create Firebase credential from the native result
  const credential = GoogleAuthProvider.credential(
    result.credential?.idToken
  );

  // Sign in to Firebase JS Auth
  const { user } = await signInWithCredential(auth, credential);

  // Fetch or create Firestore profile
  let authUser = await fetchOrCreateSocialProfile(
    user.uid,
    user.email,
    result.user?.displayName || user.displayName
  );
  authUser.authProvider = 'google.com';

  await storeUser(authUser);

  // Log successful login
  const platform = getPlatformName();
  if (authUser.organizationId) {
    logAuditEvent(authUser.organizationId, {
      action: 'user_login',
      userId: authUser.id,
      userName: authUser.displayName || authUser.email,
      targetPatientId: null,
      targetPatientName: null,
      details: `User logged in via Google Sign-In (${platform})`,
      listContext: null,
      metadata: { platform, authProvider: 'google.com' }
    });
  }

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
  // Read stored user BEFORE clearing to log the event
  const storedUser = await getStoredUser();

  if (storedUser?.organizationId) {
    logAuditEvent(storedUser.organizationId, {
      action: 'user_logout',
      userId: storedUser.id,
      userName: storedUser.displayName || storedUser.email,
      targetPatientId: null,
      targetPatientName: null,
      details: 'User logged out',
      listContext: null
    });
  }

  if (isFirebaseConfigured()) {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }

  // Clear native provider session (Apple/Google) — noop on web
  try {
    await FirebaseAuthentication.signOut();
  } catch {
    // Plugin not available on web — ignore
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

  const AUTH_TIMEOUT_MS = 10000;

  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      unsubscribe();
      logger.warn('Auth state check timed out, falling back to stored user');
      const storedUser = await getStoredUser();
      resolve({ user: storedUser });
    }, AUTH_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
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

// Fetch existing profile or create one for social sign-in users
async function fetchOrCreateSocialProfile(
  userId: string,
  email?: string | null,
  displayName?: string | null
): Promise<AuthUser> {
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
      displayName: data.displayName || displayName || null,
      createdAt: data.createdAt || new Date().toISOString()
    };
  }

  // First sign-in — create profile as individual user
  const newUser: AuthUser = {
    id: userId,
    email: email || '',
    tier: 'individual',
    role: null,
    organizationId: null,
    organizationName: null,
    displayName: displayName || null,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'users', userId), {
    email: newUser.email,
    tier: newUser.tier,
    role: newUser.role,
    organizationId: newUser.organizationId,
    organizationName: newUser.organizationName,
    displayName: newUser.displayName,
    createdAt: newUser.createdAt
  });

  return newUser;
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
