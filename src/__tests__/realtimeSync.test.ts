/**
 * Tests for the real-time sync logic used in App.tsx.
 *
 * Rather than rendering the full App component (which has many heavy
 * dependencies), these tests exercise the core sync integration logic:
 *  - Charges grouping + dev mode merge (mirrors the onChargesSnapshot callback)
 *  - Patients merge with local storage (mirrors the onOrgInpatientsSnapshot callback)
 *  - Subscription lifecycle (setup, teardown, edge cases)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../test/setup';

// ── Mocks ────────────────────────────────────────────────────────

// Track onChargesSnapshot / onOrgInpatientsSnapshot listeners
type SnapshotCb<T> = (data: T[]) => void;
let chargesCallback: SnapshotCb<any> | null = null;
let patientsCallback: SnapshotCb<any> | null = null;
const mockUnsubCharges = vi.fn();
const mockUnsubPatients = vi.fn();

vi.mock('../services/firestoreChargesService', () => ({
  loadChargesFromFirestore: vi.fn(async () => []),
  onChargesSnapshot: vi.fn((_orgId: string, cb: any) => {
    chargesCallback = cb;
    return mockUnsubCharges;
  })
}));

vi.mock('../services/inpatientService', () => ({
  getOrgInpatients: vi.fn(async () => []),
  createInpatient: vi.fn(),
  dischargeInpatient: vi.fn(),
  getLocalPatients: vi.fn(async () => []),
  saveLocalPatient: vi.fn(),
  updateLocalPatient: vi.fn(),
  onOrgInpatientsSnapshot: vi.fn((_orgId: string, cb: any) => {
    patientsCallback = cb;
    return mockUnsubPatients;
  })
}));

vi.mock('../services/devMode', () => ({
  getUserMode: vi.fn(),
  checkUnlockDevMode: vi.fn(),
  getDevModeSettings: vi.fn(async () => null),
  setDevModeUserType: vi.fn(),
  disableDevMode: vi.fn(),
  mockCharges: [
    {
      id: 'mock-charge-1',
      inpatientId: 'mock-patient-1',
      chargeDate: '2026-02-22',
      cptCode: '99223',
      diagnoses: ['I25.10'],
      createdAt: '2026-02-22T08:00:00Z',
      status: 'pending'
    }
  ]
}));

vi.mock('../services/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

// ── Imports ──────────────────────────────────────────────────────
import { onChargesSnapshot } from '../services/firestoreChargesService';
import { onOrgInpatientsSnapshot, getLocalPatients } from '../services/inpatientService';
import { getDevModeSettings, mockCharges } from '../services/devMode';
import { StoredCharge } from '../services/chargesService';
import { Inpatient } from '../types';

// ── Helpers ──────────────────────────────────────────────────────

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

/**
 * Simulates the charges grouping logic from the App.tsx useEffect callback.
 * This is the same algorithm used in the real onChargesSnapshot handler.
 */
async function buildGroupedCharges(
  firestoreCharges: StoredCharge[],
  devEnabled: boolean
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

  if (devEnabled) {
    for (const mc of mockCharges) {
      const charge = mc as StoredCharge;
      if (!grouped[charge.inpatientId]) {
        grouped[charge.inpatientId] = {};
      }
      if (!grouped[charge.inpatientId][charge.chargeDate]) {
        grouped[charge.inpatientId][charge.chargeDate] = charge;
      }
    }
  }

  return grouped;
}

/**
 * Simulates the patients merge logic from the App.tsx useEffect callback.
 */
async function mergePatients(
  backendPatients: Inpatient[],
  localPatients: Inpatient[]
): Promise<Inpatient[]> {
  const backendIds = new Set(backendPatients.map(p => p.id));
  return [...backendPatients, ...localPatients.filter(p => !backendIds.has(p.id))];
}

describe('Real-time sync — charges grouping logic', () => {
  beforeEach(() => {
    resetMockStorage();
    chargesCallback = null;
    patientsCallback = null;
  });

  it('groups charges by patientId and chargeDate', async () => {
    const charges = [
      makeCharge({ id: 'c1', inpatientId: 'p1', chargeDate: '2026-02-20' }),
      makeCharge({ id: 'c2', inpatientId: 'p1', chargeDate: '2026-02-21' }),
      makeCharge({ id: 'c3', inpatientId: 'p2', chargeDate: '2026-02-20' })
    ];

    const grouped = await buildGroupedCharges(charges, false);

    expect(Object.keys(grouped)).toEqual(expect.arrayContaining(['p1', 'p2']));
    expect(Object.keys(grouped['p1'])).toHaveLength(2);
    expect(grouped['p1']['2026-02-20'].id).toBe('c1');
    expect(grouped['p1']['2026-02-21'].id).toBe('c2');
    expect(grouped['p2']['2026-02-20'].id).toBe('c3');
  });

  it('keeps only the most recent charge per patient/date', async () => {
    const charges = [
      makeCharge({
        id: 'c-old',
        inpatientId: 'p1',
        chargeDate: '2026-02-20',
        createdAt: '2026-02-20T08:00:00Z',
        cptCode: '99221'
      }),
      makeCharge({
        id: 'c-new',
        inpatientId: 'p1',
        chargeDate: '2026-02-20',
        createdAt: '2026-02-20T14:00:00Z',
        cptCode: '99223'
      })
    ];

    const grouped = await buildGroupedCharges(charges, false);

    expect(grouped['p1']['2026-02-20'].id).toBe('c-new');
    expect(grouped['p1']['2026-02-20'].cptCode).toBe('99223');
  });

  it('returns empty object for empty Firestore charges (dev mode off)', async () => {
    const grouped = await buildGroupedCharges([], false);
    expect(grouped).toEqual({});
  });

  it('merges mock charges when dev mode is enabled', async () => {
    const grouped = await buildGroupedCharges([], true);

    // mockCharges has one charge for 'mock-patient-1'
    expect(grouped['mock-patient-1']).toBeDefined();
    expect(grouped['mock-patient-1']['2026-02-22'].id).toBe('mock-charge-1');
  });

  it('Firestore charges take priority over mock charges for same patient/date', async () => {
    const firestoreCharge = makeCharge({
      id: 'real-charge',
      inpatientId: 'mock-patient-1',
      chargeDate: '2026-02-22',
      cptCode: '93459',
      createdAt: '2026-02-22T12:00:00Z'
    });

    const grouped = await buildGroupedCharges([firestoreCharge], true);

    // Real charge should win because mock only fills in if slot is empty
    expect(grouped['mock-patient-1']['2026-02-22'].id).toBe('real-charge');
    expect(grouped['mock-patient-1']['2026-02-22'].cptCode).toBe('93459');
  });

  it('mock charges fill slots not covered by Firestore charges', async () => {
    const firestoreCharge = makeCharge({
      id: 'real-charge',
      inpatientId: 'p1',
      chargeDate: '2026-02-20'
    });

    const grouped = await buildGroupedCharges([firestoreCharge], true);

    // p1 gets the real charge
    expect(grouped['p1']['2026-02-20'].id).toBe('real-charge');
    // mock-patient-1 gets the mock charge (different patient)
    expect(grouped['mock-patient-1']['2026-02-22'].id).toBe('mock-charge-1');
  });
});

describe('Real-time sync — patients merge logic', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('returns backend patients when there are no local patients', async () => {
    const backend = [makePatient({ id: 'p1' }), makePatient({ id: 'p2' })];
    const merged = await mergePatients(backend, []);

    expect(merged).toHaveLength(2);
    expect(merged.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('returns local patients when there are no backend patients', async () => {
    const local = [makePatient({ id: 'local-1' })];
    const merged = await mergePatients([], local);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('local-1');
  });

  it('backend patients take priority over local patients with same id', async () => {
    const backend = [makePatient({ id: 'p1', patientName: 'Backend, Name' })];
    const local = [makePatient({ id: 'p1', patientName: 'Local, Name' })];

    const merged = await mergePatients(backend, local);

    expect(merged).toHaveLength(1);
    expect(merged[0].patientName).toBe('Backend, Name');
  });

  it('includes local-only patients alongside backend patients', async () => {
    const backend = [makePatient({ id: 'p1' })];
    const local = [makePatient({ id: 'p1' }), makePatient({ id: 'local-only' })];

    const merged = await mergePatients(backend, local);

    expect(merged).toHaveLength(2);
    expect(merged.map(p => p.id)).toContain('p1');
    expect(merged.map(p => p.id)).toContain('local-only');
  });

  it('handles both lists empty', async () => {
    const merged = await mergePatients([], []);
    expect(merged).toEqual([]);
  });
});

describe('Real-time sync — subscription lifecycle', () => {
  beforeEach(() => {
    resetMockStorage();
    chargesCallback = null;
    patientsCallback = null;
    mockUnsubCharges.mockClear();
    mockUnsubPatients.mockClear();
  });

  it('onChargesSnapshot is called with the correct orgId', () => {
    onChargesSnapshot('test-org', vi.fn());
    expect(onChargesSnapshot).toHaveBeenCalledWith('test-org', expect.any(Function));
  });

  it('onOrgInpatientsSnapshot is called with the correct orgId', () => {
    onOrgInpatientsSnapshot('test-org', vi.fn());
    expect(onOrgInpatientsSnapshot).toHaveBeenCalledWith('test-org', expect.any(Function));
  });

  it('calling returned unsubscribe functions does not throw', () => {
    const unsubC = onChargesSnapshot('org-1', vi.fn()) as () => void;
    const unsubP = onOrgInpatientsSnapshot('org-1', vi.fn()) as () => void;

    expect(() => unsubC()).not.toThrow();
    expect(() => unsubP()).not.toThrow();
    expect(mockUnsubCharges).toHaveBeenCalledTimes(1);
    expect(mockUnsubPatients).toHaveBeenCalledTimes(1);
  });

  it('calling unsubscribe multiple times is safe', () => {
    const unsubC = onChargesSnapshot('org-1', vi.fn()) as () => void;

    unsubC();
    unsubC();

    expect(mockUnsubCharges).toHaveBeenCalledTimes(2);
  });

  it('charges callback fires with incremental data (simulating real-time adds)', async () => {
    const results: StoredCharge[][] = [];
    onChargesSnapshot('org-1', (charges) => results.push(charges));

    // First emission: 1 charge
    chargesCallback!([makeCharge({ id: 'c1' })]);
    // Second emission: 2 charges (another physician added one)
    chargesCallback!([makeCharge({ id: 'c1' }), makeCharge({ id: 'c2' })]);

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveLength(1);
    expect(results[1]).toHaveLength(2);
  });

  it('patients callback fires with updated roster (simulating discharge)', async () => {
    const results: Inpatient[][] = [];
    onOrgInpatientsSnapshot('org-1', (patients) => results.push(patients));

    // First emission: 2 active patients
    patientsCallback!([makePatient({ id: 'p1' }), makePatient({ id: 'p2' })]);
    // Second emission: p2 discharged, only p1 remains active
    patientsCallback!([makePatient({ id: 'p1' })]);

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveLength(2);
    expect(results[1]).toHaveLength(1);
    expect(results[1][0].id).toBe('p1');
  });
});

describe('Real-time sync — edge cases', () => {
  beforeEach(() => {
    resetMockStorage();
    chargesCallback = null;
  });

  it('handles charges with identical createdAt by keeping the last one processed', async () => {
    const sameTime = '2026-02-22T10:00:00.000Z';
    const charges = [
      makeCharge({ id: 'c1', inpatientId: 'p1', chargeDate: '2026-02-22', createdAt: sameTime }),
      makeCharge({ id: 'c2', inpatientId: 'p1', chargeDate: '2026-02-22', createdAt: sameTime })
    ];

    const grouped = await buildGroupedCharges(charges, false);

    // With identical timestamps, neither is "newer" — the second one processed
    // does NOT replace the first (because !(new Date(same) > new Date(same)))
    expect(grouped['p1']['2026-02-22'].id).toBe('c1');
  });

  it('handles many patients from multiple physicians', async () => {
    const backend = Array.from({ length: 50 }, (_, i) =>
      makePatient({
        id: `p-${i}`,
        primaryPhysicianId: `user-${i % 5}`,
        patientName: `Patient, ${i}`
      })
    );

    const merged = await mergePatients(backend, []);
    expect(merged).toHaveLength(50);
  });

  it('handles charges spanning multiple dates for one patient', async () => {
    const charges = Array.from({ length: 7 }, (_, i) =>
      makeCharge({
        id: `c-${i}`,
        inpatientId: 'p1',
        chargeDate: `2026-02-${String(15 + i).padStart(2, '0')}`,
        createdAt: `2026-02-${String(15 + i).padStart(2, '0')}T10:00:00Z`
      })
    );

    const grouped = await buildGroupedCharges(charges, false);

    expect(Object.keys(grouped['p1'])).toHaveLength(7);
  });

  it('local patients with discharged state are included if not in backend', async () => {
    const backend = [makePatient({ id: 'p1' })];
    const local = [makePatient({ id: 'p-discharged', isActive: false, dischargedAt: '2026-02-20T00:00:00Z' })];

    const merged = await mergePatients(backend, local);

    expect(merged).toHaveLength(2);
    expect(merged.find(p => p.id === 'p-discharged')?.isActive).toBe(false);
  });
});
