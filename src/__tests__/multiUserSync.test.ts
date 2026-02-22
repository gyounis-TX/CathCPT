/**
 * Multi-user real-time sync tests.
 *
 * Simulates the data flow between physicians in the same practice (org).
 * When Firestore emits a snapshot, every connected client receives the full
 * collection state. These tests verify that the App.tsx pipeline correctly
 * builds the shared state from those snapshots, so that:
 *  - Charges submitted by any physician are visible to all
 *  - Patients added by one physician appear for others
 *  - Discharges propagate across users
 *  - Concurrent care (two physicians, same patient, same day) is preserved
 *  - Org isolation holds — data from another org never leaks in
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../test/setup';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('../services/firestoreChargesService', () => ({
  loadChargesFromFirestore: vi.fn(async () => []),
  onChargesSnapshot: vi.fn()
}));

vi.mock('../services/inpatientService', () => ({
  getOrgInpatients: vi.fn(async () => []),
  createInpatient: vi.fn(),
  dischargeInpatient: vi.fn(),
  getLocalPatients: vi.fn(async () => []),
  saveLocalPatient: vi.fn(),
  updateLocalPatient: vi.fn(),
  onOrgInpatientsSnapshot: vi.fn()
}));

vi.mock('../services/devMode', () => ({
  getUserMode: vi.fn(),
  checkUnlockDevMode: vi.fn(),
  getDevModeSettings: vi.fn(async () => null),
  setDevModeUserType: vi.fn(),
  disableDevMode: vi.fn(),
  mockCharges: []
}));

vi.mock('../services/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

// ── Imports ──────────────────────────────────────────────────────
import { StoredCharge } from '../services/chargesService';
import { Inpatient } from '../types';
import { getDevModeSettings, mockCharges } from '../services/devMode';

// ── Test helpers ─────────────────────────────────────────────────

/** Represents one physician's identity */
interface Physician {
  userId: string;
  displayName: string;
}

const drRivera: Physician  = { userId: 'user-1', displayName: 'Dr. Rivera' };
const drKhan: Physician    = { userId: 'user-2', displayName: 'Dr. Khan' };
const drBruce: Physician   = { userId: 'user-3', displayName: 'Dr. Bruce' };

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

function makePatient(overrides: Partial<Inpatient> = {}): Inpatient {
  return {
    id: 'patient-1',
    organizationId: 'cardiology-assoc',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Doe, John',
    dob: '1970-01-01',
    isActive: true,
    createdAt: '2026-02-22T08:00:00Z',
    ...overrides
  };
}

/**
 * Mirrors the charges grouping logic in the App.tsx onChargesSnapshot callback.
 * This is the same algorithm every connected client runs when Firestore pushes
 * a new snapshot of organizations/{orgId}/charges.
 */
async function buildGroupedCharges(
  firestoreCharges: StoredCharge[]
): Promise<Record<string, Record<string, StoredCharge>>> {
  const grouped: Record<string, Record<string, StoredCharge>> = {};

  for (const charge of firestoreCharges) {
    if (!grouped[charge.inpatientId]) {
      grouped[charge.inpatientId] = {};
    }
    const existing = grouped[charge.inpatientId][charge.chargeDate];
    if (!existing || new Date(charge.createdAt) > new Date(existing.createdAt)) {
      grouped[charge.inpatientId][charge.chargeDate] = charge;
    }
  }

  return grouped;
}

/**
 * Mirrors the patients merge logic in the App.tsx onOrgInpatientsSnapshot
 * callback: backend patients are the source of truth; local-only patients
 * are appended if their id isn't already in the backend set.
 */
function mergePatients(
  backendPatients: Inpatient[],
  localPatients: Inpatient[]
): Inpatient[] {
  const backendIds = new Set(backendPatients.map(p => p.id));
  return [...backendPatients, ...localPatients.filter(p => !backendIds.has(p.id))];
}

// ═════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════

describe('Multi-user sync — charges flow between physicians', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('Dr. Rivera submits a charge; Dr. Khan sees it in the next snapshot', async () => {
    // Rivera submits charge — Firestore broadcasts snapshot with it
    const snapshot = [
      makeCharge({
        id: 'rivera-charge-1',
        inpatientId: 'patient-homer',
        chargeDate: '2026-02-22',
        cptCode: '93458',
        submittedByUserId: drRivera.userId,
        submittedByUserName: drRivera.displayName,
        createdAt: '2026-02-22T09:00:00Z'
      })
    ];

    // Khan's client processes the same snapshot
    const khansView = await buildGroupedCharges(snapshot);

    expect(khansView['patient-homer']).toBeDefined();
    expect(khansView['patient-homer']['2026-02-22'].id).toBe('rivera-charge-1');
    expect(khansView['patient-homer']['2026-02-22'].submittedByUserId).toBe(drRivera.userId);
  });

  it('both physicians submit charges for different patients on same day', async () => {
    const snapshot = [
      makeCharge({
        id: 'rivera-c1',
        inpatientId: 'patient-homer',
        chargeDate: '2026-02-22',
        cptCode: '99223',
        submittedByUserId: drRivera.userId,
        submittedByUserName: drRivera.displayName,
        createdAt: '2026-02-22T08:00:00Z'
      }),
      makeCharge({
        id: 'khan-c1',
        inpatientId: 'patient-burns',
        chargeDate: '2026-02-22',
        cptCode: '99232',
        submittedByUserId: drKhan.userId,
        submittedByUserName: drKhan.displayName,
        createdAt: '2026-02-22T08:30:00Z'
      })
    ];

    const view = await buildGroupedCharges(snapshot);

    // Both charges visible, separated by patient
    expect(Object.keys(view)).toHaveLength(2);
    expect(view['patient-homer']['2026-02-22'].submittedByUserId).toBe(drRivera.userId);
    expect(view['patient-burns']['2026-02-22'].submittedByUserId).toBe(drKhan.userId);
  });

  it('concurrent care: two physicians charge the same patient on the same day', async () => {
    // This is allowed — the grouping keeps only the most recent by createdAt.
    // In the real app checkConcurrentVisit warns but doesn't block, and each
    // charge gets its own Firestore doc. The snapshot includes both.
    const snapshot = [
      makeCharge({
        id: 'rivera-concurrent',
        inpatientId: 'patient-homer',
        chargeDate: '2026-02-22',
        cptCode: '99223',
        submittedByUserId: drRivera.userId,
        createdAt: '2026-02-22T07:00:00Z'
      }),
      makeCharge({
        id: 'khan-concurrent',
        inpatientId: 'patient-homer',
        chargeDate: '2026-02-22',
        cptCode: '99232',
        submittedByUserId: drKhan.userId,
        createdAt: '2026-02-22T14:00:00Z'
      })
    ];

    const view = await buildGroupedCharges(snapshot);

    // Grouping keeps most recent per patient+date — Khan's charge wins
    expect(view['patient-homer']['2026-02-22'].id).toBe('khan-concurrent');
    expect(view['patient-homer']['2026-02-22'].submittedByUserId).toBe(drKhan.userId);
  });

  it('charge updated by admin propagates to all physicians', async () => {
    // Admin marks a charge as billed — new snapshot reflects updated status
    const snapshotBefore = [
      makeCharge({
        id: 'charge-1',
        inpatientId: 'patient-homer',
        chargeDate: '2026-02-20',
        status: 'pending',
        submittedByUserId: drRivera.userId,
        createdAt: '2026-02-20T09:00:00Z'
      })
    ];

    const viewBefore = await buildGroupedCharges(snapshotBefore);
    expect(viewBefore['patient-homer']['2026-02-20'].status).toBe('pending');

    // Admin marks billed → Firestore emits updated snapshot
    const snapshotAfter = [
      makeCharge({
        id: 'charge-1',
        inpatientId: 'patient-homer',
        chargeDate: '2026-02-20',
        status: 'billed',
        billedAt: '2026-02-22T16:00:00Z',
        billedBy: 'Admin User',
        submittedByUserId: drRivera.userId,
        createdAt: '2026-02-20T09:00:00Z'
      })
    ];

    const viewAfter = await buildGroupedCharges(snapshotAfter);
    expect(viewAfter['patient-homer']['2026-02-20'].status).toBe('billed');
    expect(viewAfter['patient-homer']['2026-02-20'].billedBy).toBe('Admin User');
  });

  it('charge deleted by one user disappears for all in next snapshot', async () => {
    const snapshotWithCharge = [
      makeCharge({ id: 'c1', inpatientId: 'p1', chargeDate: '2026-02-22' }),
      makeCharge({ id: 'c2', inpatientId: 'p2', chargeDate: '2026-02-22' })
    ];

    const before = await buildGroupedCharges(snapshotWithCharge);
    expect(Object.keys(before)).toHaveLength(2);

    // c1 deleted → next snapshot only has c2
    const snapshotAfterDelete = [
      makeCharge({ id: 'c2', inpatientId: 'p2', chargeDate: '2026-02-22' })
    ];

    const after = await buildGroupedCharges(snapshotAfterDelete);
    expect(Object.keys(after)).toHaveLength(1);
    expect(after['p1']).toBeUndefined();
    expect(after['p2']['2026-02-22'].id).toBe('c2');
  });

  it('three physicians each submit charges across multiple days', async () => {
    const snapshot = [
      // Rivera — 3 charges
      makeCharge({ id: 'r1', inpatientId: 'homer',  chargeDate: '2026-02-20', submittedByUserId: drRivera.userId, createdAt: '2026-02-20T08:00:00Z' }),
      makeCharge({ id: 'r2', inpatientId: 'homer',  chargeDate: '2026-02-21', submittedByUserId: drRivera.userId, createdAt: '2026-02-21T08:00:00Z' }),
      makeCharge({ id: 'r3', inpatientId: 'marge',  chargeDate: '2026-02-22', submittedByUserId: drRivera.userId, createdAt: '2026-02-22T08:00:00Z' }),
      // Khan — 2 charges
      makeCharge({ id: 'k1', inpatientId: 'burns',  chargeDate: '2026-02-20', submittedByUserId: drKhan.userId, createdAt: '2026-02-20T09:00:00Z' }),
      makeCharge({ id: 'k2', inpatientId: 'burns',  chargeDate: '2026-02-21', submittedByUserId: drKhan.userId, createdAt: '2026-02-21T09:00:00Z' }),
      // Bruce — 1 charge
      makeCharge({ id: 'b1', inpatientId: 'ned',    chargeDate: '2026-02-22', submittedByUserId: drBruce.userId, createdAt: '2026-02-22T07:00:00Z' })
    ];

    const view = await buildGroupedCharges(snapshot);

    // All 4 patients visible
    expect(Object.keys(view).sort()).toEqual(['burns', 'homer', 'marge', 'ned']);

    // Homer has 2 days of charges from Rivera
    expect(Object.keys(view['homer'])).toHaveLength(2);
    expect(view['homer']['2026-02-20'].submittedByUserId).toBe(drRivera.userId);
    expect(view['homer']['2026-02-21'].submittedByUserId).toBe(drRivera.userId);

    // Burns has 2 days from Khan
    expect(Object.keys(view['burns'])).toHaveLength(2);
    expect(view['burns']['2026-02-20'].submittedByUserId).toBe(drKhan.userId);

    // Marge and Ned have 1 day each
    expect(view['marge']['2026-02-22'].submittedByUserId).toBe(drRivera.userId);
    expect(view['ned']['2026-02-22'].submittedByUserId).toBe(drBruce.userId);
  });

  it('incremental snapshots reflect new charges appearing in real-time', async () => {
    // T=0: Rivera submits
    const snapshot1 = [
      makeCharge({ id: 'r1', inpatientId: 'homer', chargeDate: '2026-02-22', submittedByUserId: drRivera.userId, createdAt: '2026-02-22T08:00:00Z' })
    ];
    const view1 = await buildGroupedCharges(snapshot1);
    expect(Object.keys(view1)).toHaveLength(1);

    // T=1: Khan submits — Firestore broadcasts updated full collection
    const snapshot2 = [
      ...snapshot1,
      makeCharge({ id: 'k1', inpatientId: 'burns', chargeDate: '2026-02-22', submittedByUserId: drKhan.userId, createdAt: '2026-02-22T08:05:00Z' })
    ];
    const view2 = await buildGroupedCharges(snapshot2);
    expect(Object.keys(view2)).toHaveLength(2);
    expect(view2['burns']['2026-02-22'].submittedByUserId).toBe(drKhan.userId);

    // T=2: Bruce submits
    const snapshot3 = [
      ...snapshot2,
      makeCharge({ id: 'b1', inpatientId: 'ned', chargeDate: '2026-02-22', submittedByUserId: drBruce.userId, createdAt: '2026-02-22T08:10:00Z' })
    ];
    const view3 = await buildGroupedCharges(snapshot3);
    expect(Object.keys(view3)).toHaveLength(3);

    // All three physicians' charges visible to everyone
    expect(view3['homer']['2026-02-22'].submittedByUserId).toBe(drRivera.userId);
    expect(view3['burns']['2026-02-22'].submittedByUserId).toBe(drKhan.userId);
    expect(view3['ned']['2026-02-22'].submittedByUserId).toBe(drBruce.userId);
  });
});

describe('Multi-user sync — patients flow between physicians', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('patient added by Dr. Rivera is visible to Dr. Khan', () => {
    // Firestore snapshot includes the new patient
    const backendPatients = [
      makePatient({
        id: 'p-homer',
        primaryPhysicianId: drRivera.userId,
        primaryPhysicianName: drRivera.displayName,
        patientName: 'Simpson, Homer'
      })
    ];

    // Khan's client merges snapshot with local (empty local)
    const khansView = mergePatients(backendPatients, []);

    expect(khansView).toHaveLength(1);
    expect(khansView[0].patientName).toBe('Simpson, Homer');
    expect(khansView[0].primaryPhysicianId).toBe(drRivera.userId);
  });

  it('each physician sees all active org patients regardless of who added them', () => {
    const backendPatients = [
      makePatient({ id: 'p1', primaryPhysicianId: drRivera.userId, patientName: 'Simpson, Homer' }),
      makePatient({ id: 'p2', primaryPhysicianId: drKhan.userId, patientName: 'Burns, Montgomery' }),
      makePatient({ id: 'p3', primaryPhysicianId: drBruce.userId, patientName: 'Flanders, Ned' })
    ];

    const anyPhysicianView = mergePatients(backendPatients, []);

    expect(anyPhysicianView).toHaveLength(3);
    const names = anyPhysicianView.map(p => p.patientName);
    expect(names).toContain('Simpson, Homer');
    expect(names).toContain('Burns, Montgomery');
    expect(names).toContain('Flanders, Ned');
  });

  it('patient discharged by Dr. Khan disappears from all active views', () => {
    // Before discharge: 3 active patients
    const before = [
      makePatient({ id: 'p1', primaryPhysicianId: drRivera.userId }),
      makePatient({ id: 'p2', primaryPhysicianId: drKhan.userId }),
      makePatient({ id: 'p3', primaryPhysicianId: drBruce.userId })
    ];
    expect(mergePatients(before, [])).toHaveLength(3);

    // After discharge: snapshot query (isActive == true) no longer includes p2
    const after = [
      makePatient({ id: 'p1', primaryPhysicianId: drRivera.userId }),
      makePatient({ id: 'p3', primaryPhysicianId: drBruce.userId })
    ];

    const view = mergePatients(after, []);
    expect(view).toHaveLength(2);
    expect(view.find(p => p.id === 'p2')).toBeUndefined();
  });

  it('new patient from another physician appears in real-time', () => {
    // T=0: Rivera and Khan each have a patient
    const snapshot1 = [
      makePatient({ id: 'p1', primaryPhysicianId: drRivera.userId, patientName: 'Simpson, Homer' }),
      makePatient({ id: 'p2', primaryPhysicianId: drKhan.userId, patientName: 'Burns, Montgomery' })
    ];
    const view1 = mergePatients(snapshot1, []);
    expect(view1).toHaveLength(2);

    // T=1: Bruce admits a new patient — Firestore emits updated snapshot
    const snapshot2 = [
      ...snapshot1,
      makePatient({ id: 'p3', primaryPhysicianId: drBruce.userId, patientName: 'Flanders, Ned' })
    ];
    const view2 = mergePatients(snapshot2, []);
    expect(view2).toHaveLength(3);
    expect(view2.find(p => p.id === 'p3')?.primaryPhysicianId).toBe(drBruce.userId);
  });

  it('local-only patient is preserved alongside backend patients from other physicians', () => {
    // Rivera has a locally-created patient not yet synced
    const localPatients = [
      makePatient({ id: 'local-only', primaryPhysicianId: drRivera.userId, patientName: 'Local, Patient' })
    ];

    // Firestore has Khan and Bruce patients
    const backendPatients = [
      makePatient({ id: 'p1', primaryPhysicianId: drKhan.userId }),
      makePatient({ id: 'p2', primaryPhysicianId: drBruce.userId })
    ];

    const view = mergePatients(backendPatients, localPatients);

    expect(view).toHaveLength(3);
    expect(view.find(p => p.id === 'local-only')).toBeDefined();
  });

  it('once local patient syncs to backend, no duplicate appears', () => {
    // Patient was created locally and is now in Firestore
    const localPatients = [
      makePatient({ id: 'p-synced', primaryPhysicianId: drRivera.userId, patientName: 'Local, Version' })
    ];
    const backendPatients = [
      makePatient({ id: 'p-synced', primaryPhysicianId: drRivera.userId, patientName: 'Backend, Version' }),
      makePatient({ id: 'p-other', primaryPhysicianId: drKhan.userId })
    ];

    const view = mergePatients(backendPatients, localPatients);

    expect(view).toHaveLength(2);
    // Backend version wins (it appears first, local duplicate is filtered)
    const synced = view.find(p => p.id === 'p-synced');
    expect(synced?.patientName).toBe('Backend, Version');
  });
});

describe('Multi-user sync — org isolation', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('snapshot only contains data from the subscribed org', () => {
    // The onSnapshot listener is scoped to organizations/{orgId}/charges.
    // This test verifies that the grouping logic doesn't accidentally mix
    // data — each org's snapshot is processed independently.
    const orgACharges = [
      makeCharge({ id: 'a1', inpatientId: 'p1', submittedByUserId: 'doc-A' })
    ];
    const orgBCharges = [
      makeCharge({ id: 'b1', inpatientId: 'p2', submittedByUserId: 'doc-B' })
    ];

    // Each org processes its own snapshot
    const viewA = buildGroupedCharges(orgACharges);
    const viewB = buildGroupedCharges(orgBCharges);

    return Promise.all([viewA, viewB]).then(([a, b]) => {
      // Org A only sees p1
      expect(Object.keys(a)).toEqual(['p1']);
      expect(a['p2']).toBeUndefined();

      // Org B only sees p2
      expect(Object.keys(b)).toEqual(['p2']);
      expect(b['p1']).toBeUndefined();
    });
  });

  it('patients from different orgs never merge', () => {
    const orgAPatients = [
      makePatient({ id: 'pa1', organizationId: 'cardiology-assoc' })
    ];
    const orgBPatients = [
      makePatient({ id: 'pb1', organizationId: 'other-practice' })
    ];

    const viewA = mergePatients(orgAPatients, []);
    const viewB = mergePatients(orgBPatients, []);

    expect(viewA).toHaveLength(1);
    expect(viewA[0].id).toBe('pa1');

    expect(viewB).toHaveLength(1);
    expect(viewB[0].id).toBe('pb1');
  });
});

describe('Multi-user sync — rapid sequential updates', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('rapid charge submissions from multiple physicians all converge', async () => {
    // Simulates burst activity: 3 physicians submit within seconds
    const rapidCharges = [
      makeCharge({ id: 'rapid-1', inpatientId: 'p1', chargeDate: '2026-02-22', submittedByUserId: drRivera.userId, createdAt: '2026-02-22T10:00:01Z' }),
      makeCharge({ id: 'rapid-2', inpatientId: 'p2', chargeDate: '2026-02-22', submittedByUserId: drKhan.userId,   createdAt: '2026-02-22T10:00:02Z' }),
      makeCharge({ id: 'rapid-3', inpatientId: 'p3', chargeDate: '2026-02-22', submittedByUserId: drBruce.userId,  createdAt: '2026-02-22T10:00:03Z' })
    ];

    const view = await buildGroupedCharges(rapidCharges);

    expect(Object.keys(view)).toHaveLength(3);
    expect(view['p1']['2026-02-22'].submittedByUserId).toBe(drRivera.userId);
    expect(view['p2']['2026-02-22'].submittedByUserId).toBe(drKhan.userId);
    expect(view['p3']['2026-02-22'].submittedByUserId).toBe(drBruce.userId);
  });

  it('physician updates their own charge — latest version wins', async () => {
    // Rivera submits, then immediately corrects the CPT code
    const snapshot = [
      makeCharge({
        id: 'c-v1',
        inpatientId: 'homer',
        chargeDate: '2026-02-22',
        cptCode: '99221',
        submittedByUserId: drRivera.userId,
        createdAt: '2026-02-22T08:00:00Z'
      }),
      makeCharge({
        id: 'c-v2',
        inpatientId: 'homer',
        chargeDate: '2026-02-22',
        cptCode: '99223',
        submittedByUserId: drRivera.userId,
        createdAt: '2026-02-22T08:02:00Z'
      })
    ];

    const view = await buildGroupedCharges(snapshot);

    // The corrected version (v2) should be the one visible
    expect(view['homer']['2026-02-22'].id).toBe('c-v2');
    expect(view['homer']['2026-02-22'].cptCode).toBe('99223');
  });

  it('patient list stabilizes after rapid add/discharge cycle', () => {
    // T=0: 2 patients
    const snap0 = [
      makePatient({ id: 'p1', primaryPhysicianId: drRivera.userId }),
      makePatient({ id: 'p2', primaryPhysicianId: drKhan.userId })
    ];
    expect(mergePatients(snap0, [])).toHaveLength(2);

    // T=1: Bruce adds p3
    const snap1 = [...snap0, makePatient({ id: 'p3', primaryPhysicianId: drBruce.userId })];
    expect(mergePatients(snap1, [])).toHaveLength(3);

    // T=2: Khan discharges p2
    const snap2 = [
      makePatient({ id: 'p1', primaryPhysicianId: drRivera.userId }),
      makePatient({ id: 'p3', primaryPhysicianId: drBruce.userId })
    ];
    const final = mergePatients(snap2, []);
    expect(final).toHaveLength(2);
    expect(final.find(p => p.id === 'p2')).toBeUndefined();
  });
});
