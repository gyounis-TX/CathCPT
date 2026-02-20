import { describe, it, expect } from 'vitest';
import { validateCCIEdits } from '../cciEdits';

describe('validateCCIEdits', () => {
  // ── Known CCI pair violations ──────────────────────────────────
  it('returns violations when known CCI pairs are selected', () => {
    // 93458 (left heart cath w/ coronary angio) + 93454 (coronary angio supervision)
    // This is a known bundle: "Left heart cath bundles coronary angiography supervision"
    const violations = validateCCIEdits(['93458', '93454']);

    expect(violations).toHaveLength(1);
    expect(violations[0].column1Code).toBe('93458');
    expect(violations[0].column2Code).toBe('93454');
    expect(violations[0].severity).toBe('warning');
    expect(violations[0].modifierException).toBe(false);
    expect(violations[0].description).toContain('Left heart cath');
  });

  it('returns multiple violations when several conflicting codes are selected', () => {
    // 93459 bundles 93454, 93455, 93456, 93457, and 93458
    const violations = validateCCIEdits(['93459', '93454', '93458']);

    expect(violations.length).toBeGreaterThanOrEqual(2);

    const codes = violations.map(v => v.column2Code);
    expect(codes).toContain('93454');
    expect(codes).toContain('93458');
  });

  // ── Non-conflicting codes ──────────────────────────────────────
  it('returns empty array for non-conflicting codes', () => {
    // 93000 (ECG) and 99213 (office visit) are not a CCI pair
    const violations = validateCCIEdits(['93000', '99213']);
    expect(violations).toEqual([]);
  });

  it('returns empty array when no codes overlap with CCI pairs', () => {
    const violations = validateCCIEdits(['99201', '99202', '99203']);
    expect(violations).toEqual([]);
  });

  // ── Modifier exception ─────────────────────────────────────────
  it('returns violations with modifierException: true when applicable', () => {
    // 92928 (PCI with stent) + 92924 (PTCA with atherectomy) — modifier exception allowed
    const violations = validateCCIEdits(['92928', '92924']);

    expect(violations).toHaveLength(1);
    expect(violations[0].column1Code).toBe('92928');
    expect(violations[0].column2Code).toBe('92924');
    expect(violations[0].modifierException).toBe(true);
    expect(violations[0].severity).toBe('warning');
  });

  it('returns violations with modifierException: false when not applicable', () => {
    // 93458 + 93452: no modifier exception
    const violations = validateCCIEdits(['93458', '93452']);

    expect(violations).toHaveLength(1);
    expect(violations[0].modifierException).toBe(false);
  });

  // ── Single code ────────────────────────────────────────────────
  it('returns empty array for a single code', () => {
    const violations = validateCCIEdits(['93458']);
    expect(violations).toEqual([]);
  });

  it('returns empty array for an empty code list', () => {
    const violations = validateCCIEdits([]);
    expect(violations).toEqual([]);
  });

  // ── Duplicate codes ────────────────────────────────────────────
  it('handles duplicate codes without error', () => {
    // Duplicates of a single code should not produce violations
    const violations = validateCCIEdits(['93458', '93458']);
    // 93458 alone does not pair with itself in CCI data, so no violations
    expect(violations).toEqual([]);
  });

  it('handles duplicates of a conflicting pair without duplicating violations', () => {
    // The Set deduplication means duplicates should not cause double violations
    const violations = validateCCIEdits(['93458', '93454', '93458', '93454']);

    // Should still be exactly 1 violation (the pair is found once via Set)
    expect(violations).toHaveLength(1);
    expect(violations[0].column1Code).toBe('93458');
    expect(violations[0].column2Code).toBe('93454');
  });
});
