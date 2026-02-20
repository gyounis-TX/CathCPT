import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../../test/setup';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('../../services/devMode', () => ({
  getDevModeSettings: vi.fn(() => Promise.resolve({ enabled: true })),
  mockAuditEntries: []
}));

vi.mock('../../services/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(),
  isFirebaseConfigured: vi.fn(() => false)
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn()
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

// ── Import after mocks ──────────────────────────────────────────
import { logAuditEvent, getAuditLog, getFilteredAuditLog } from '../auditService';
import { mockAuditEntries } from '../../services/devMode';

describe('auditService', () => {
  beforeEach(() => {
    resetMockStorage();
    // Clear the in-memory audit log between tests by re-importing fresh state
    // We rely on logAuditEvent pushing to the module-level mockAuditLog array.
    // To keep tests isolated, we read back via getAuditLog to verify entries.
  });

  // ── toInitials (tested indirectly via logAuditEvent) ───────────
  describe('toInitials (via logAuditEvent)', () => {
    it('converts "John Smith" to "J.S." in the stored event', async () => {
      await logAuditEvent('org1', {
        action: 'patient_added',
        userId: 'u1',
        userName: 'Dr Test',
        targetPatientId: 'p1',
        targetPatientName: 'John Smith',
        details: 'Added patient John Smith',
        listContext: null
      });

      const log = await getAuditLog('org1', { limit: 1 });
      expect(log.length).toBeGreaterThanOrEqual(1);
      // The patient name should have been converted to initials
      const entry = log[0];
      expect(entry.targetPatientName).toBe('J.S.');
    });

    it('converts "Smith, John" to "S.J." in the stored event', async () => {
      await logAuditEvent('org1', {
        action: 'patient_added',
        userId: 'u1',
        userName: 'Dr Test',
        targetPatientId: 'p2',
        targetPatientName: 'Smith, John',
        details: 'Added patient Smith, John',
        listContext: null
      });

      const log = await getAuditLog('org1', { limit: 10 });
      const entry = log.find(e => e.targetPatientId === 'p2');
      expect(entry).toBeDefined();
      expect(entry!.targetPatientName).toBe('S.J.');
    });
  });

  // ── logAuditEvent in dev mode ──────────────────────────────────
  describe('logAuditEvent (dev mode)', () => {
    it('stores events in memory and they appear in getAuditLog', async () => {
      await logAuditEvent('org1', {
        action: 'patient_discharged',
        userId: 'u1',
        userName: 'Dr Test',
        targetPatientId: 'p3',
        targetPatientName: null,
        details: 'Discharged patient',
        listContext: null
      });

      const log = await getAuditLog('org1');
      const entry = log.find(e => e.targetPatientId === 'p3');
      expect(entry).toBeDefined();
      expect(entry!.action).toBe('patient_discharged');
      expect(entry!.id).toMatch(/^audit-/);
      expect(entry!.timestamp).toBeDefined();
    });
  });

  // ── PHI minimization ──────────────────────────────────────────
  describe('minimizePHI', () => {
    it('scrubs patient full name from details text', async () => {
      await logAuditEvent('org1', {
        action: 'patient_added',
        userId: 'u1',
        userName: 'Dr Test',
        targetPatientId: 'p4',
        targetPatientName: 'Jane Doe',
        details: 'Added patient Jane Doe',
        listContext: null
      });

      const log = await getAuditLog('org1', { limit: 50 });
      const entry = log.find(e => e.targetPatientId === 'p4');
      expect(entry).toBeDefined();
      // The original name "Jane Doe" should be replaced with initials
      expect(entry!.details).not.toContain('Jane Doe');
      expect(entry!.details).toContain('J.D.');
    });

    it('scrubs patient name from "Discharged patient ..." pattern', async () => {
      await logAuditEvent('org1', {
        action: 'patient_discharged',
        userId: 'u1',
        userName: 'Dr Test',
        targetPatientId: 'p5',
        targetPatientName: 'Robert Jones',
        details: 'Discharged patient Robert Jones',
        listContext: null
      });

      const log = await getAuditLog('org1', { limit: 50 });
      const entry = log.find(e => e.targetPatientId === 'p5');
      expect(entry).toBeDefined();
      expect(entry!.details).not.toContain('Robert Jones');
      expect(entry!.details).toContain('R.J.');
    });
  });

  // ── getFilteredAuditLog ───────────────────────────────────────
  describe('getFilteredAuditLog', () => {
    it('filters by action types correctly', async () => {
      // Seed a few events with different action types
      await logAuditEvent('org1', {
        action: 'patient_added',
        userId: 'u1',
        userName: 'Dr A',
        targetPatientId: 'pf1',
        targetPatientName: null,
        details: 'Added',
        listContext: null
      });

      await logAuditEvent('org1', {
        action: 'patient_discharged',
        userId: 'u1',
        userName: 'Dr A',
        targetPatientId: 'pf2',
        targetPatientName: null,
        details: 'Discharged',
        listContext: null
      });

      await logAuditEvent('org1', {
        action: 'user_login',
        userId: 'u1',
        userName: 'Dr A',
        targetPatientId: null,
        targetPatientName: null,
        details: 'Logged in',
        listContext: null
      });

      // Filter for only patient_added
      const filtered = await getFilteredAuditLog('org1', {
        actionTypes: ['patient_added']
      });

      expect(filtered.length).toBeGreaterThanOrEqual(1);
      for (const entry of filtered) {
        expect(entry.action).toBe('patient_added');
      }

      // Filter for patient_discharged + user_login
      const multi = await getFilteredAuditLog('org1', {
        actionTypes: ['patient_discharged', 'user_login']
      });

      expect(multi.length).toBeGreaterThanOrEqual(2);
      for (const entry of multi) {
        expect(['patient_discharged', 'user_login']).toContain(entry.action);
      }
    });
  });
});
