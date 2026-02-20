import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMockStorage } from '../../test/setup';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

// ── Import after mocks ──────────────────────────────────────────
import {
  saveCharge,
  getStoredCharges,
  getChargesForDate,
  updateCharge,
  getChargesByPatientAndDate,
  StoredCharge
} from '../chargesService';

// Helper: minimal valid charge input (omits id, createdAt, status which are generated)
function makeChargeInput(overrides: Partial<Omit<StoredCharge, 'id' | 'createdAt' | 'status'>> = {}) {
  return {
    inpatientId: 'patient-1',
    chargeDate: '2026-02-19',
    cptCode: '93458',
    cptDescription: 'Left heart cath',
    diagnoses: ['I25.10'],
    ...overrides
  };
}

describe('chargesService', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  // ── saveCharge ──────────────────────────────────────────────────
  describe('saveCharge', () => {
    it('creates a charge with a generated id and status "pending"', async () => {
      const result = await saveCharge(makeChargeInput());

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^charge-/);
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
      expect(result.cptCode).toBe('93458');
      expect(result.inpatientId).toBe('patient-1');
    });

    it('persists the charge to storage so it can be retrieved via getStoredCharges', async () => {
      const saved = await saveCharge(makeChargeInput());

      const allCharges = await getStoredCharges();
      expect(allCharges).toHaveLength(1);
      expect(allCharges[0].id).toBe(saved.id);
      expect(allCharges[0].status).toBe('pending');
      expect(allCharges[0].cptCode).toBe('93458');
    });
  });

  // ── getChargesForDate ──────────────────────────────────────────
  describe('getChargesForDate', () => {
    it('returns only charges matching the given date', async () => {
      await saveCharge(makeChargeInput({ inpatientId: 'p1', chargeDate: '2026-02-19' }));
      await saveCharge(makeChargeInput({ inpatientId: 'p2', chargeDate: '2026-02-19' }));
      await saveCharge(makeChargeInput({ inpatientId: 'p3', chargeDate: '2026-02-20' }));

      const charges = await getChargesForDate('2026-02-19');

      expect(charges).toHaveLength(2);
      expect(charges.every(c => c.chargeDate === '2026-02-19')).toBe(true);
      expect(charges.map(c => c.inpatientId)).toContain('p1');
      expect(charges.map(c => c.inpatientId)).toContain('p2');
    });

    it('returns an empty array when no charges match the date', async () => {
      await saveCharge(makeChargeInput({ chargeDate: '2026-02-19' }));

      const charges = await getChargesForDate('2025-01-01');
      expect(charges).toHaveLength(0);
    });
  });

  // ── updateCharge ───────────────────────────────────────────────
  describe('updateCharge', () => {
    it('updates fields on a pending charge', async () => {
      const saved = await saveCharge(makeChargeInput());

      const updated = await updateCharge(saved.id, {
        cptCode: '93459',
        cptDescription: 'Right and left heart cath',
        diagnoses: ['I25.10', 'I50.9']
      });

      expect(updated).not.toBeNull();
      expect(updated!.cptCode).toBe('93459');
      expect(updated!.cptDescription).toBe('Right and left heart cath');
      expect(updated!.diagnoses).toEqual(['I25.10', 'I50.9']);
      expect(updated!.updatedAt).toBeDefined();

      // Verify the update was persisted
      const allCharges = await getStoredCharges();
      expect(allCharges[0].cptCode).toBe('93459');
    });

    it('throws when attempting to update a billed charge', async () => {
      const saved = await saveCharge(makeChargeInput());

      // Manually mark the charge as billed in storage
      const charges = await getStoredCharges();
      charges[0].status = 'billed';
      await window.storage.set('inpatient_charges', JSON.stringify(charges));

      await expect(updateCharge(saved.id, { cptCode: '99999' })).rejects.toThrow(
        'Cannot edit a billed charge'
      );

      // Verify the charge was NOT modified
      const afterAttempt = await getStoredCharges();
      expect(afterAttempt[0].cptCode).toBe('93458');
    });

    it('throws when the charge id does not exist', async () => {
      await expect(updateCharge('nonexistent-id', { cptCode: '99999' })).rejects.toThrow(
        'Charge not found'
      );
    });
  });

  // ── getChargesByPatientAndDate ─────────────────────────────────
  describe('getChargesByPatientAndDate', () => {
    it('returns charges grouped by patient id and date', async () => {
      await saveCharge(makeChargeInput({ inpatientId: 'p1', chargeDate: '2026-02-19' }));
      await saveCharge(makeChargeInput({ inpatientId: 'p1', chargeDate: '2026-02-20' }));
      await saveCharge(makeChargeInput({ inpatientId: 'p2', chargeDate: '2026-02-19' }));

      const result = await getChargesByPatientAndDate();

      // Top-level keys are patient ids
      expect(Object.keys(result)).toContain('p1');
      expect(Object.keys(result)).toContain('p2');

      // p1 has charges on two dates
      expect(Object.keys(result['p1'])).toHaveLength(2);
      expect(result['p1']['2026-02-19']).toBeDefined();
      expect(result['p1']['2026-02-20']).toBeDefined();
      expect(result['p1']['2026-02-19'].inpatientId).toBe('p1');

      // p2 has a charge on one date
      expect(Object.keys(result['p2'])).toHaveLength(1);
      expect(result['p2']['2026-02-19']).toBeDefined();
      expect(result['p2']['2026-02-19'].inpatientId).toBe('p2');
    });

    it('keeps the most recent charge when a patient has multiple charges on the same date', async () => {
      // Save two charges for same patient/date with distinct createdAt values.
      // We manually insert into storage to guarantee different timestamps.
      const charges: StoredCharge[] = [
        {
          id: 'charge-older',
          inpatientId: 'p1',
          chargeDate: '2026-02-19',
          cptCode: '93458',
          cptDescription: 'Left heart cath',
          diagnoses: ['I25.10'],
          createdAt: '2026-02-19T10:00:00.000Z',
          status: 'pending'
        },
        {
          id: 'charge-newer',
          inpatientId: 'p1',
          chargeDate: '2026-02-19',
          cptCode: '93459',
          cptDescription: 'Right and left heart cath',
          diagnoses: ['I25.10'],
          createdAt: '2026-02-19T11:00:00.000Z',
          status: 'pending'
        }
      ];
      await window.storage.set('inpatient_charges', JSON.stringify(charges));

      const result = await getChargesByPatientAndDate();

      // Should keep the most recently created charge (the newer one)
      expect(result['p1']['2026-02-19'].id).toBe('charge-newer');
      expect(result['p1']['2026-02-19'].cptCode).toBe('93459');
    });

    it('returns an empty object when there are no charges', async () => {
      const result = await getChargesByPatientAndDate();
      expect(result).toEqual({});
    });
  });
});
