import { describe, it, expect } from 'vitest';
import {
  getAllInpatientCodes,
  calculateMedicarePayment,
  checkBillingCompatibility,
  canAddCode,
  MEDICARE_CONVERSION_FACTOR_2026
} from '../inpatientCodes';

describe('getAllInpatientCodes', () => {
  it('returns a non-empty array of codes with required fields', () => {
    const codes = getAllInpatientCodes();

    expect(codes.length).toBeGreaterThan(0);

    for (const entry of codes) {
      expect(entry).toHaveProperty('code');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('rvu');
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(typeof entry.rvu).toBe('number');
    }
  });
});

describe('calculateMedicarePayment', () => {
  it('returns correct payment (RVU * conversion factor)', () => {
    const rvu = 2.61;
    const expected = rvu * MEDICARE_CONVERSION_FACTOR_2026;
    const result = calculateMedicarePayment(rvu);

    expect(result).toBeCloseTo(expected, 2);
  });

  it('returns 0 for zero RVU', () => {
    expect(calculateMedicarePayment(0)).toBe(0);
  });
});

describe('checkBillingCompatibility', () => {
  it('returns compatible for valid combinations', () => {
    // Critical Care + Discharge is a valid combination
    const result = checkBillingCompatibility('99291', '99238');
    expect(result.canBill).toBe(true);
  });

  it('returns incompatible for mutually exclusive primary E/M codes', () => {
    // Initial Hospital + Subsequent are both primary E/M and cannot be billed together
    const result = checkBillingCompatibility('99221', '99231');
    expect(result.canBill).toBe(false);
  });

  it('returns compatible with modifier for Critical Care + Primary E/M', () => {
    const result = checkBillingCompatibility('99291', '99232');
    expect(result.canBill).toBe(true);
    expect(result.requiresModifier).toBe('-25');
    expect(result.modifierAppliesTo).toBe('99232');
  });
});

describe('canAddCode', () => {
  it('returns true for compatible codes', () => {
    // Adding a discharge code when critical care is already selected
    const result = canAddCode('99238', ['99291']);
    expect(result).toBe(true);
  });

  it('returns true when no codes are selected', () => {
    expect(canAddCode('99232', [])).toBe(true);
  });

  it('returns false for incompatible codes', () => {
    // Cannot add a subsequent E/M code when an initial hospital code is already selected
    const result = canAddCode('99231', ['99221']);
    expect(result).toBe(false);
  });

  it('returns false when 99292 is added without 99291', () => {
    // 99292 (additional critical care) requires 99291 (first critical care)
    const result = canAddCode('99292', ['99232']);
    expect(result).toBe(false);
  });
});
