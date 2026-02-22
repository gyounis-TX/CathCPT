import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../../test/setup';

// ── Mocks ────────────────────────────────────────────────────────

// Track snapshot listeners so tests can fire callbacks manually
let snapshotCallbacks: {
  next: (snap: any) => void;
  error: (err: any) => void;
} | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: any, path: string) => ({ path })),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn((ref: any, onNext: any, onError: any) => {
    snapshotCallbacks = { next: onNext, error: onError };
    return mockUnsubscribe;
  })
}));

vi.mock('../../services/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  isFirebaseConfigured: vi.fn(() => true)
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

// ── Import after mocks ──────────────────────────────────────────
import { onChargesSnapshot } from '../firestoreChargesService';
import { isFirebaseConfigured } from '../firebaseConfig';
import { logger } from '../logger';
import { StoredCharge } from '../chargesService';

// Helper: minimal StoredCharge
function makeCharge(overrides: Partial<StoredCharge> = {}): StoredCharge {
  return {
    id: 'charge-1',
    inpatientId: 'patient-1',
    chargeDate: '2026-02-22',
    cptCode: '93458',
    cptDescription: 'Left heart cath',
    diagnoses: ['I25.10'],
    createdAt: '2026-02-22T10:00:00.000Z',
    status: 'pending',
    ...overrides
  };
}

// Helper: simulate a Firestore snapshot with docs
function makeSnapshot(charges: StoredCharge[]) {
  return {
    docs: charges.map(c => ({
      id: c.id,
      data: () => ({ ...c })
    }))
  };
}

describe('firestoreChargesService — onChargesSnapshot', () => {
  beforeEach(() => {
    resetMockStorage();
    snapshotCallbacks = null;
    mockUnsubscribe.mockClear();
    vi.mocked(isFirebaseConfigured).mockReturnValue(true);
  });

  // ── Basic listener setup ─────────────────────────────────────
  it('returns an unsubscribe function and sets up a listener', () => {
    const callback = vi.fn();
    const unsub = onChargesSnapshot('org-1', callback);

    expect(typeof unsub).toBe('function');
    expect(snapshotCallbacks).not.toBeNull();
  });

  it('calls callback with mapped charges when snapshot fires', () => {
    const callback = vi.fn();
    onChargesSnapshot('org-1', callback);

    const charges = [makeCharge({ id: 'c1' }), makeCharge({ id: 'c2', cptCode: '93459' })];
    snapshotCallbacks!.next(makeSnapshot(charges));

    expect(callback).toHaveBeenCalledTimes(1);
    const result = callback.mock.calls[0][0];
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
    expect(result[1].cptCode).toBe('93459');
  });

  it('maps doc id onto each charge object', () => {
    const callback = vi.fn();
    onChargesSnapshot('org-1', callback);

    // Simulate a doc whose data doesn't include `id` (Firestore behavior)
    snapshotCallbacks!.next({
      docs: [{
        id: 'firestore-doc-id',
        data: () => ({ inpatientId: 'p1', chargeDate: '2026-02-22', cptCode: '99213', diagnoses: [], createdAt: '', status: 'pending' })
      }]
    });

    const result = callback.mock.calls[0][0];
    expect(result[0].id).toBe('firestore-doc-id');
  });

  // ── Empty snapshot ───────────────────────────────────────────
  it('calls callback with empty array when snapshot has no docs', () => {
    const callback = vi.fn();
    onChargesSnapshot('org-1', callback);

    snapshotCallbacks!.next({ docs: [] });

    expect(callback).toHaveBeenCalledWith([]);
  });

  // ── Multiple snapshot emissions ──────────────────────────────
  it('calls callback each time the snapshot fires', () => {
    const callback = vi.fn();
    onChargesSnapshot('org-1', callback);

    snapshotCallbacks!.next(makeSnapshot([makeCharge({ id: 'c1' })]));
    snapshotCallbacks!.next(makeSnapshot([makeCharge({ id: 'c1' }), makeCharge({ id: 'c2' })]));

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[0][0]).toHaveLength(1);
    expect(callback.mock.calls[1][0]).toHaveLength(2);
  });

  // ── Unsubscribe ──────────────────────────────────────────────
  it('returned function calls Firestore unsubscribe', () => {
    const unsub = onChargesSnapshot('org-1', vi.fn());
    unsub();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  // ── Firebase not configured ──────────────────────────────────
  it('returns a no-op when Firebase is not configured', () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(false);

    const callback = vi.fn();
    const unsub = onChargesSnapshot('org-1', callback);

    expect(typeof unsub).toBe('function');
    // Listener was never set up
    expect(snapshotCallbacks).toBeNull();
    // Calling unsub is safe (no-op)
    unsub();
  });

  // ── Error handling ───────────────────────────────────────────
  it('logs an error when the snapshot listener emits an error', () => {
    onChargesSnapshot('org-1', vi.fn());

    const testError = new Error('permission-denied');
    snapshotCallbacks!.error(testError);

    expect(logger.error).toHaveBeenCalledWith('Charges snapshot error', testError);
  });
});
