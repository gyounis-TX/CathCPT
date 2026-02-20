import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../../test/setup';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  updateEmail: vi.fn(),
  onAuthStateChanged: vi.fn()
}));

vi.mock('../../services/firebaseConfig', () => ({
  getFirebaseAuth: vi.fn(),
  getFirebaseDb: vi.fn(),
  isFirebaseConfigured: vi.fn(() => false)
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn()
}));

vi.mock('../../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

// ── Import after mocks ──────────────────────────────────────────
import { signOut, isAuthenticated, isProUser, isAdmin } from '../authService';

// Shared test user object
const testUser = {
  id: 'u1',
  email: 'a@b.com',
  tier: 'pro',
  role: 'admin',
  organizationId: 'org1',
  organizationName: 'Test',
  displayName: 'Dr Test',
  createdAt: '2024-01-01'
};

describe('authService', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  // ── signOut ────────────────────────────────────────────────────
  describe('signOut', () => {
    it('clears all storage', async () => {
      // Pre-populate storage so there is something to clear
      await window.storage.set('auth_user', JSON.stringify(testUser));
      await window.storage.set('some_other_key', 'value');

      await signOut();

      // clearAll should have been called
      expect(window.storage.clearAll).toHaveBeenCalled();

      // Storage should be empty after clearAll
      const result = await window.storage.get('auth_user');
      expect(result.value).toBeNull();
    });
  });

  // ── isAuthenticated ────────────────────────────────────────────
  describe('isAuthenticated', () => {
    it('returns true when a user is stored', async () => {
      await window.storage.set('auth_user', JSON.stringify(testUser));

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no user is stored', async () => {
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  // ── isProUser ──────────────────────────────────────────────────
  describe('isProUser', () => {
    it('returns true for a user with tier "pro"', async () => {
      await window.storage.set('auth_user', JSON.stringify(testUser));

      const result = await isProUser();
      expect(result).toBe(true);
    });

    it('returns false for a user with tier "individual"', async () => {
      const individualUser = { ...testUser, tier: 'individual' };
      await window.storage.set('auth_user', JSON.stringify(individualUser));

      const result = await isProUser();
      expect(result).toBe(false);
    });

    it('returns false when no user is stored', async () => {
      const result = await isProUser();
      expect(result).toBe(false);
    });
  });

  // ── isAdmin ────────────────────────────────────────────────────
  describe('isAdmin', () => {
    it('returns true for a pro user with role "admin"', async () => {
      await window.storage.set('auth_user', JSON.stringify(testUser));

      const result = await isAdmin();
      expect(result).toBe(true);
    });

    it('returns false for a pro user with role "physician"', async () => {
      const physicianUser = { ...testUser, role: 'physician' };
      await window.storage.set('auth_user', JSON.stringify(physicianUser));

      const result = await isAdmin();
      expect(result).toBe(false);
    });

    it('returns false for an individual tier user even with admin role', async () => {
      const individualAdmin = { ...testUser, tier: 'individual', role: 'admin' };
      await window.storage.set('auth_user', JSON.stringify(individualAdmin));

      const result = await isAdmin();
      expect(result).toBe(false);
    });

    it('returns false when no user is stored', async () => {
      const result = await isAdmin();
      expect(result).toBe(false);
    });
  });
});
