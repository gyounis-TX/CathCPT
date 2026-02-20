import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('../../services/devMode', () => ({
  getDevModeSettings: vi.fn(() => Promise.resolve({ enabled: true })),
  mockCharges: []
}));

vi.mock('../../services/chargesService', () => ({
  getStoredCharges: vi.fn(),
  markChargeEntered: vi.fn(),
  markChargeBilled: vi.fn()
}));

vi.mock('../../services/inpatientService', () => ({
  getAllOrgInpatients: vi.fn(() => Promise.resolve([]))
}));

vi.mock('../../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

vi.mock('../../data/inpatientCodes', () => ({
  calculateMedicarePayment: vi.fn((rvu: number) => rvu * 36)
}));

// ── Import after mocks ──────────────────────────────────────────
import { getChargeQueue, batchMarkChargesBilled, getChargeStats } from '../adminChargeService';
import { getStoredCharges, markChargeBilled } from '../../services/chargesService';
import { logAuditEvent } from '../../services/auditService';
import type { StoredCharge } from '../../services/chargesService';
import type { Inpatient, ChargeQueueFilters } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────

function makeCharge(overrides: Partial<StoredCharge> = {}): StoredCharge {
  return {
    id: 'c1',
    inpatientId: 'p1',
    chargeDate: '2026-02-19',
    cptCode: '99232',
    cptDescription: 'Subsequent hospital care',
    diagnoses: ['I25.10'],
    createdAt: '2026-02-19T08:00:00Z',
    status: 'pending',
    rvu: 1.39,
    ...overrides
  };
}

function makePatient(overrides: Partial<Inpatient> = {}): Inpatient {
  return {
    id: 'p1',
    organizationId: 'org1',
    primaryPhysicianId: 'dr1',
    primaryPhysicianName: 'Dr. Smith',
    hospitalId: 'hosp1',
    hospitalName: 'General Hospital',
    patientName: 'Jane Doe',
    dob: '1960-01-01',
    mrn: 'MRN001',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

const defaultFilters: ChargeQueueFilters = {
  status: 'all',
  physicianId: null,
  hospitalId: null,
  dateRange: null,
  searchQuery: ''
};

// ── Tests ────────────────────────────────────────────────────────

describe('adminChargeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getChargeQueue ─────────────────────────────────────────────

  describe('getChargeQueue', () => {
    it('returns only pending charges when status filter is "pending"', async () => {
      const charges: StoredCharge[] = [
        makeCharge({ id: 'c1', status: 'pending', inpatientId: 'p1' }),
        makeCharge({ id: 'c2', status: 'entered', inpatientId: 'p1' }),
        makeCharge({ id: 'c3', status: 'billed', inpatientId: 'p1', billedAt: '2026-02-19T10:00:00Z' })
      ];
      const patients: Inpatient[] = [makePatient({ id: 'p1' })];

      vi.mocked(getStoredCharges).mockResolvedValue(charges);

      const result = await getChargeQueue(
        'org1',
        { ...defaultFilters, status: 'pending' },
        patients
      );

      expect(result).toHaveLength(1);
      expect(result[0].charge.id).toBe('c1');
      expect(result[0].charge.status).toBe('pending');
    });

    it('hides billed charges by default when status is "all"', async () => {
      const charges: StoredCharge[] = [
        makeCharge({ id: 'c1', status: 'pending', inpatientId: 'p1' }),
        makeCharge({ id: 'c2', status: 'entered', inpatientId: 'p1' }),
        makeCharge({ id: 'c3', status: 'billed', inpatientId: 'p1', billedAt: '2026-02-19T10:00:00Z' })
      ];
      const patients: Inpatient[] = [makePatient({ id: 'p1' })];

      vi.mocked(getStoredCharges).mockResolvedValue(charges);

      const result = await getChargeQueue(
        'org1',
        { ...defaultFilters, status: 'all' },
        patients
      );

      expect(result).toHaveLength(2);
      const statuses = result.map(r => r.charge.status);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('entered');
      expect(statuses).not.toContain('billed');
    });

    it('filters charges by hospitalId', async () => {
      const charges: StoredCharge[] = [
        makeCharge({ id: 'c1', inpatientId: 'p1', status: 'pending' }),
        makeCharge({ id: 'c2', inpatientId: 'p2', status: 'pending' })
      ];
      const patients: Inpatient[] = [
        makePatient({ id: 'p1', hospitalId: 'hosp1', hospitalName: 'General Hospital' }),
        makePatient({ id: 'p2', hospitalId: 'hosp2', hospitalName: 'City Hospital' })
      ];

      vi.mocked(getStoredCharges).mockResolvedValue(charges);

      const result = await getChargeQueue(
        'org1',
        { ...defaultFilters, status: 'pending', hospitalId: 'hosp1' },
        patients
      );

      expect(result).toHaveLength(1);
      expect(result[0].charge.id).toBe('c1');
      expect(result[0].patient.hospitalId).toBe('hosp1');
    });
  });

  // ── batchMarkChargesBilled ─────────────────────────────────────

  describe('batchMarkChargesBilled', () => {
    it('marks all charges as billed and logs an audit event', async () => {
      vi.mocked(markChargeBilled).mockResolvedValue(undefined as any);
      vi.mocked(logAuditEvent).mockResolvedValue(undefined as any);

      const result = await batchMarkChargesBilled(
        ['c1', 'c2', 'c3'],
        'admin1',
        'Admin User',
        'org1'
      );

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(markChargeBilled).toHaveBeenCalledTimes(3);
      expect(markChargeBilled).toHaveBeenCalledWith('c1', 'Admin User');
      expect(markChargeBilled).toHaveBeenCalledWith('c2', 'Admin User');
      expect(markChargeBilled).toHaveBeenCalledWith('c3', 'Admin User');

      expect(logAuditEvent).toHaveBeenCalledTimes(1);
      expect(logAuditEvent).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'charge_batch_billed',
        userId: 'admin1',
        userName: 'Admin User',
        metadata: { batchSize: 3 }
      }));
    });

    it('reports partial failures when some charges fail to mark', async () => {
      vi.mocked(markChargeBilled)
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error('write error'))
        .mockResolvedValueOnce(undefined as any);
      vi.mocked(logAuditEvent).mockResolvedValue(undefined as any);

      const result = await batchMarkChargesBilled(
        ['c1', 'c2', 'c3'],
        'admin1',
        'Admin User',
        'org1'
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      // Audit event still fires because success > 0
      expect(logAuditEvent).toHaveBeenCalledTimes(1);
      expect(logAuditEvent).toHaveBeenCalledWith('org1', expect.objectContaining({
        metadata: { batchSize: 2 }
      }));
    });
  });

  // ── getChargeStats ─────────────────────────────────────────────

  describe('getChargeStats', () => {
    it('returns correct counts for pending, entered, and billed charges', async () => {
      const today = new Date().toISOString().split('T')[0];
      const charges: StoredCharge[] = [
        makeCharge({ id: 'c1', status: 'pending', rvu: 1.5 }),
        makeCharge({ id: 'c2', status: 'pending', rvu: 2.0 }),
        makeCharge({ id: 'c3', status: 'entered', rvu: 1.0 }),
        makeCharge({
          id: 'c4',
          status: 'billed',
          rvu: 3.0,
          billedAt: `${today}T12:00:00Z`
        }),
        makeCharge({
          id: 'c5',
          status: 'billed',
          rvu: 2.5,
          billedAt: '2025-01-01T12:00:00Z' // old — not today, not this week
        })
      ];

      vi.mocked(getStoredCharges).mockResolvedValue(charges);

      const stats = await getChargeStats('org1');

      expect(stats.totalPending).toBe(2);
      expect(stats.totalEntered).toBe(1);
      expect(stats.billedToday).toBe(1);
      // Only c4 is billed within last 7 days (c5 is from 2025)
      expect(stats.billedThisWeek).toBe(1);
      // Active (pending + entered) RVU: 1.5 + 2.0 + 1.0 = 4.5
      expect(stats.totalRVUPending).toBe(4.5);
      // Payment = rvu * 36 (mocked calculateMedicarePayment)
      expect(stats.totalPaymentPending).toBe(4.5 * 36);
    });
  });
});
