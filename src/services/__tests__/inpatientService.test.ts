import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../../test/setup';

// ── Mocks ────────────────────────────────────────────────────────

let snapshotCallbacks: {
  next: (snap: any) => void;
  error: (err: any) => void;
} | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: any, path: string) => ({ path })),
  query: vi.fn((...args: any[]) => ({ _query: true, args })),
  where: vi.fn((...args: any[]) => ({ _where: true, args })),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn((_query: any, onNext: any, onError: any) => {
    snapshotCallbacks = { next: onNext, error: onError };
    return mockUnsubscribe;
  })
}));

vi.mock('../../services/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  isFirebaseConfigured: vi.fn(() => true)
}));

vi.mock('../../services/devMode', () => ({
  getDevModeSettings: vi.fn(async () => null)
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

// ── Import after mocks ──────────────────────────────────────────
import { onOrgInpatientsSnapshot } from '../inpatientService';
import { isFirebaseConfigured } from '../firebaseConfig';
import { logger } from '../logger';
import { Inpatient } from '../../types';
import { where } from 'firebase/firestore';

// Helper: minimal valid Inpatient
function makePatient(overrides: Partial<Inpatient> = {}): Inpatient {
  return {
    id: 'patient-1',
    organizationId: 'org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Test',
    hospitalId: 'hosp-1',
    hospitalName: 'Test Hospital',
    patientName: 'Doe, John',
    dob: '1970-01-01',
    isActive: true,
    createdAt: '2026-02-22T08:00:00Z',
    ...overrides
  };
}

// Helper: simulate a Firestore query snapshot
function makeSnapshot(patients: Inpatient[]) {
  return {
    docs: patients.map(p => ({
      id: p.id,
      data: () => {
        const { id, ...rest } = p;
        return rest;
      }
    }))
  };
}

describe('inpatientService — onOrgInpatientsSnapshot', () => {
  beforeEach(() => {
    resetMockStorage();
    snapshotCallbacks = null;
    mockUnsubscribe.mockClear();
    vi.mocked(isFirebaseConfigured).mockReturnValue(true);
  });

  // ── Basic listener setup ─────────────────────────────────────
  it('returns an unsubscribe function and sets up a listener', () => {
    const callback = vi.fn();
    const unsub = onOrgInpatientsSnapshot('org-1', callback);

    expect(typeof unsub).toBe('function');
    expect(snapshotCallbacks).not.toBeNull();
  });

  it('queries with isActive == true filter', () => {
    onOrgInpatientsSnapshot('org-1', vi.fn());
    expect(where).toHaveBeenCalledWith('isActive', '==', true);
  });

  it('calls callback with mapped patients when snapshot fires', () => {
    const callback = vi.fn();
    onOrgInpatientsSnapshot('org-1', callback);

    const patients = [
      makePatient({ id: 'p1', patientName: 'Simpson, Homer' }),
      makePatient({ id: 'p2', patientName: 'Simpson, Marge' })
    ];
    snapshotCallbacks!.next(makeSnapshot(patients));

    expect(callback).toHaveBeenCalledTimes(1);
    const result = callback.mock.calls[0][0];
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('p1');
    expect(result[0].patientName).toBe('Simpson, Homer');
    expect(result[1].id).toBe('p2');
  });

  it('maps doc id onto each patient object', () => {
    const callback = vi.fn();
    onOrgInpatientsSnapshot('org-1', callback);

    snapshotCallbacks!.next({
      docs: [{
        id: 'firestore-id-abc',
        data: () => ({
          organizationId: 'org-1',
          primaryPhysicianId: 'u1',
          hospitalId: 'h1',
          patientName: 'Test, Patient',
          dob: '1990-01-01',
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z'
        })
      }]
    });

    expect(callback.mock.calls[0][0][0].id).toBe('firestore-id-abc');
  });

  // ── Empty snapshot ───────────────────────────────────────────
  it('calls callback with empty array when no active patients', () => {
    const callback = vi.fn();
    onOrgInpatientsSnapshot('org-1', callback);

    snapshotCallbacks!.next({ docs: [] });

    expect(callback).toHaveBeenCalledWith([]);
  });

  // ── Multiple emissions ───────────────────────────────────────
  it('calls callback for each snapshot update', () => {
    const callback = vi.fn();
    onOrgInpatientsSnapshot('org-1', callback);

    // First snapshot: 1 patient
    snapshotCallbacks!.next(makeSnapshot([makePatient({ id: 'p1' })]));
    // Second snapshot: patient discharged, new one added
    snapshotCallbacks!.next(makeSnapshot([makePatient({ id: 'p3' })]));

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[0][0]).toHaveLength(1);
    expect(callback.mock.calls[0][0][0].id).toBe('p1');
    expect(callback.mock.calls[1][0]).toHaveLength(1);
    expect(callback.mock.calls[1][0][0].id).toBe('p3');
  });

  // ── Unsubscribe ──────────────────────────────────────────────
  it('returned function calls Firestore unsubscribe', () => {
    const unsub = onOrgInpatientsSnapshot('org-1', vi.fn());
    unsub();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  // ── Firebase not configured ──────────────────────────────────
  it('returns a no-op when Firebase is not configured', () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(false);

    const callback = vi.fn();
    const unsub = onOrgInpatientsSnapshot('org-1', callback);

    expect(typeof unsub).toBe('function');
    expect(snapshotCallbacks).toBeNull();
    unsub(); // safe no-op
  });

  // ── Error handling ───────────────────────────────────────────
  it('logs an error when the snapshot listener emits an error', () => {
    onOrgInpatientsSnapshot('org-1', vi.fn());

    const testError = new Error('permission-denied');
    snapshotCallbacks!.error(testError);

    expect(logger.error).toHaveBeenCalledWith('Inpatients snapshot error', testError);
  });
});
