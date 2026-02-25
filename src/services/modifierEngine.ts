// Modifier Validation Engine — central validation and modifier scrub for all charges
// Evaluates modifier rules in pipeline order, produces suggestions and warnings

import { cciPairs } from '../data/cciEdits';
import { modifierDefinitions } from '../data/modifierDefinitions';
import {
  isEMCode,
  isProcedureCode,
  getCodeDomain,
  isDiagnosticCathCode,
  isPCICode,
  isEchoCode,
  isInterpretationCode,
  isDischargeCode,
  isCriticalCareCode,
  isPericardiocentesisCode,
  isSedationCode,
  isAddOnCode as isAddOnCodeFn,
  profTechCodes,
  bilateralCodes,
  lateralityCodes,
  addOnCodePrimaries,
  echoMutualExclusionPairs,
  criticalCareBundledProcedures,
  sedationInherentProcedures,
  catheterHierarchy,
  siCodePairings,
  peripheralTerritories,
  globalPeriodDays,
  isCategoryIIICode,
  getCategoryIIIWarning,
  isConsultCode,
  isInitialHospitalCode,
  emTimeThresholds,
  indicationDomainCompatibility,
  CHARGE_LAG_WARNING_DAYS,
  CHARGE_LAG_ERROR_DAYS,
  pciCodesRequiringVessel,
  emLevelFamilies,
  priorAuthProcedures,
  modifierDocRequirements,
  ageRestrictedProcedures,
  ncdRules,
  retiredCodes,
  isSubsequentHospitalCode,
  diagnosticCathHierarchy,
  coronaryAngioCodes,
  ablationBundlesEPStudy,
  isAblationCode,
  isEPStudyCode,
  generatorChangeCodes,
  deNovoImplantCodes,
  structuralTEECode,
  genericTEEBaseCodes,
  structuralProceduresExpectingTEE,
  coronaryTerritories,
  isIntravascularImagingCode,
  isCardioversionCode,
  basePCICodes,
  CodeDomain
} from '../data/codeDomains';
import { validateDiagnosisCpt } from '../data/diagnosisCptRules';
import { StoredCharge, CaseSnapshot } from './chargesService';

// ==================== Types ====================

export interface ModifierSuggestion {
  code: string;
  modifier: string;
  reason: string;
  confidence: 'required' | 'recommended' | 'optional';
  autoApplied: boolean;
  ruleId: string;
}

export interface ValidationResult {
  suggestions: ModifierSuggestion[];
  warnings: string[];
  errors: string[];
  scrubbed: boolean;
}

/** Patient context for context-aware validation (discharge date, admit date, DOB) */
export interface PatientContext {
  dischargeDate?: string;  // YYYY-MM-DD
  admitDate?: string;      // YYYY-MM-DD
  dob?: string;            // YYYY-MM-DD — for age-based validation
}

// ==================== Context-Aware Validation ====================

/**
 * Validate a charge with full context: ICD-10 diagnosis, time documentation, discharge date.
 * Complements validateChargeCodes() which only checks CPT code relationships.
 */
export function validateChargeContext(
  charge: StoredCharge,
  patientContext?: PatientContext
): ValidationResult {
  const suggestions: ModifierSuggestion[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const code = stripModifier(charge.cptCode);

  // 1. Missing diagnosis check
  if (!charge.diagnoses || charge.diagnoses.length === 0) {
    if (isProcedureCode(code) || isEMCode(code)) {
      warnings.push(
        `No ICD-10 diagnosis codes attached to this charge. All claims require at least one diagnosis code to establish medical necessity.`
      );
    }
  } else {
    // 2. ICD-10 ↔ CPT medical necessity cross-reference
    const dxResult = validateDiagnosisCpt(code, charge.diagnoses);
    if (dxResult) {
      if (dxResult.severity === 'error') {
        errors.push(dxResult.message);
      } else {
        warnings.push(dxResult.message);
      }
    }
  }

  // 3. Time documentation validation
  checkTimeDocumentation(code, charge.timeMinutes, warnings);

  // 4. Discharge date validation
  if (patientContext?.dischargeDate) {
    checkDischargeDate(code, charge.chargeDate, patientContext.dischargeDate, warnings, errors);
  }

  // 5. Indication ↔ CPT category mismatch
  if (charge.caseSnapshot?.indicationCategory) {
    checkIndicationMismatch(code, charge.caseSnapshot.indicationCategory, warnings);
  }

  // 6. Bidirectional sedation check — inherent procedure but sedation not indicated
  if (charge.caseSnapshot) {
    checkSedationExpected(code, charge.caseSnapshot, warnings);
  }

  // 7. Charge lag detection — late charge entry
  checkChargeLag(charge.chargeDate, charge.createdAt, warnings, errors);

  // 8. Time sanity checks — extreme outliers
  checkTimeSanity(code, charge.timeMinutes, warnings);

  // 9. PCI vessel documentation — PCI codes need vessel data
  if (charge.caseSnapshot) {
    checkVesselDocumentation(code, charge.caseSnapshot, warnings);
  }

  // 10. Prior authorization flag — high-cost procedures
  checkPriorAuthorization(code, warnings);

  // 11. Age-based code validation
  if (patientContext?.dob) {
    checkAgeBasedValidation(code, charge.chargeDate, patientContext.dob, warnings);
  }

  // 12. NCD/LCD compliance — Medicare coverage criteria
  checkNCDCompliance(code, charge.diagnoses, warnings);

  // 13. Code year validity — retired/replaced codes
  checkCodeYearValidity(code, errors);

  // 14. E/M level optimization — suggest upgrade when time supports it
  checkEMLevelOptimization(code, charge.timeMinutes, suggestions);

  // 15. Professional component auto-detection — hospital-based imaging
  checkProfessionalComponent(code, charge.caseSnapshot, suggestions);

  // 16. Sedation unit validation — compare units to expected case duration
  if (charge.caseSnapshot?.sedation) {
    checkSedationUnitValidation(code, charge.caseSnapshot.sedation, warnings);
  }

  // 17. IVUS/FFR without intervention — documentation reminder
  checkImagingWithoutIntervention(code, charge.cptCode, warnings);

  return { suggestions, warnings, errors, scrubbed: true };
}

// ==================== Rule Pipeline ====================

/**
 * Validate a single charge's codes (within-charge rules).
 * Codes are the CPT code strings from the charge.
 */
export function validateChargeCodes(codes: string[]): ValidationResult {
  const suggestions: ModifierSuggestion[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (codes.length === 0) {
    return { suggestions, warnings, errors, scrubbed: true };
  }

  // Strip existing modifiers for evaluation
  const cleanCodes = codes.map(c => stripModifier(c));

  // 1. Duplicate detection → -76 or error
  checkDuplicates(cleanCodes, suggestions, errors);

  // 2. NCCI edit pairs → -59
  checkNCCIEdits(cleanCodes, suggestions, warnings);

  // 3. E/M + procedure same day → -25
  checkEMPlusProcedure(cleanCodes, suggestions);

  // 4. Professional/Technical split → -26 / -TC suggestion
  checkProfTechSplit(cleanCodes, suggestions);

  // 5. Laterality → -LT/-RT or -50
  checkLaterality(cleanCodes, suggestions);

  // 6. Diagnostic cath + PCI → -59 on cath
  checkDiagCathPCI(cleanCodes, suggestions, warnings);

  // 7. Add-on code orphan detection
  checkAddOnOrphans(cleanCodes, errors);

  // 8. Echo mutual exclusion
  checkEchoMutualExclusion(cleanCodes, errors);

  // 9. Critical care bundled procedures
  checkCriticalCareBundling(cleanCodes, warnings);

  // 10. Sedation code bundling
  checkSedationBundling(cleanCodes, errors);

  // 11. Catheter hierarchy
  checkCatheterHierarchy(cleanCodes, warnings);

  // 12. S&I code pairing
  checkSIPairing(cleanCodes, warnings);

  // 13. Peripheral territory duplicate primaries
  checkPeripheralTerritory(cleanCodes, errors, warnings);

  // 14. Multiple procedures → -51
  checkMultipleProcedures(cleanCodes, suggestions);

  // 15. Discharge + procedure → -25 on discharge
  checkDischargePlusProcedure(cleanCodes, suggestions);

  // 16. Pericardiocentesis during cath → -59
  checkPericardiocentesisDuringCath(cleanCodes, suggestions, warnings);

  // 17. Category III (T-code) reimbursement warning
  checkCategoryIIICodes(cleanCodes, warnings);

  // 18. Diagnostic cath hierarchy — flag overlapping cath codes
  checkDiagCathCodeHierarchy(cleanCodes, errors);

  // 19. EP study + ablation bundling — EP study not separately billable with ablation
  checkEPStudyAblationWithinCharge(cleanCodes, errors, warnings);

  // 20. Device implant code consistency — generator change vs de novo
  checkDeviceImplantConsistency(cleanCodes, errors);

  // 21. Cardioversion bundling during cath lab case
  checkCardioversionBundling(cleanCodes, warnings);

  // 22. Structural TEE code selection
  checkStructuralTEECode(cleanCodes, warnings);

  return { suggestions, warnings, errors, scrubbed: true };
}

/**
 * Cross-charge validation — checks ALL charges for a patient on a given date.
 * Detects modifier needs across separate charges (e.g., E/M on one charge, echo on another).
 */
export function validateCrossChargeModifiers(
  currentCodes: string[],
  otherCharges: StoredCharge[],
  currentChargeId?: string
): ValidationResult {
  const suggestions: ModifierSuggestion[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const cleanCurrentCodes = currentCodes.map(c => stripModifier(c));

  // Collect codes from other charges for the same patient/date
  const otherCodes: string[] = [];
  for (const charge of otherCharges) {
    if (currentChargeId && charge.id === currentChargeId) continue;
    otherCodes.push(stripModifier(charge.cptCode));
  }

  if (otherCodes.length === 0) {
    return { suggestions, warnings, errors, scrubbed: true };
  }

  // Cross-charge Rule 1: E/M on current + procedure on other charge (or vice versa) → -25 on E/M
  const currentEMCodes = cleanCurrentCodes.filter(isEMCode);
  const currentProcCodes = cleanCurrentCodes.filter(isProcedureCode);
  const otherEMCodes = otherCodes.filter(isEMCode);
  const otherProcCodes = otherCodes.filter(isProcedureCode);

  // Current charge has E/M, other charges have procedures
  if (currentEMCodes.length > 0 && otherProcCodes.length > 0) {
    for (const emCode of currentEMCodes) {
      if (isDischargeCode(emCode)) {
        suggestions.push({
          code: emCode,
          modifier: '-25',
          reason: `Discharge code ${emCode} billed same day as procedure(s) on separate charge(s). Modifier -25 needed on discharge E/M.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: 'cross-charge-discharge-procedure-25'
        });
      } else {
        suggestions.push({
          code: emCode,
          modifier: '-25',
          reason: `E/M code ${emCode} billed same day as procedure(s) on separate charge(s). Modifier -25 needed to indicate separately identifiable service.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: 'cross-charge-em-procedure-25'
        });
      }
    }
  }

  // Other charges have E/M, current charge has procedures → warn about E/M charge
  if (otherEMCodes.length > 0 && currentProcCodes.length > 0) {
    for (const emCode of otherEMCodes) {
      warnings.push(
        `E/M code ${emCode} on a separate charge may need modifier -25 due to procedures (${currentProcCodes.join(', ')}) on this charge.`
      );
    }
  }

  // Cross-charge Rule 2: Duplicate echo codes across charges → -76
  const currentEchoCodes = cleanCurrentCodes.filter(isEchoCode);
  const otherEchoCodes = otherCodes.filter(isEchoCode);
  for (const echoCode of currentEchoCodes) {
    if (otherEchoCodes.includes(echoCode)) {
      suggestions.push({
        code: echoCode,
        modifier: '-76',
        reason: `Echo code ${echoCode} also appears on another charge for this patient today. Modifier -76 indicates a repeat procedure by the same physician.`,
        confidence: 'recommended',
        autoApplied: false,
        ruleId: 'cross-charge-repeat-echo-76'
      });
    }
  }

  // Cross-charge Rule 3: NCCI edits across charges
  for (const currentCode of cleanCurrentCodes) {
    for (const otherCode of otherCodes) {
      const pair = cciPairs.find(
        p => (p.column1 === currentCode && p.column2 === otherCode) ||
             (p.column1 === otherCode && p.column2 === currentCode)
      );
      if (pair && pair.modifierException) {
        const componentCode = pair.column2 === currentCode ? currentCode :
                              pair.column2 === otherCode ? otherCode : pair.column2;
        if (cleanCurrentCodes.includes(componentCode)) {
          warnings.push(
            `CCI edit: ${pair.description}. Code ${componentCode} on this charge may need modifier -59 relative to ${pair.column1 === componentCode ? pair.column2 : pair.column1} on another charge.`
          );
        }
      }
    }
  }

  // Cross-charge Rule 4: Echo mutual exclusion across charges
  for (const currentCode of currentEchoCodes) {
    for (const otherCode of otherEchoCodes) {
      if (currentCode === otherCode) continue;
      const exclusion = echoMutualExclusionPairs.find(
        ([a, b]) => (a === currentCode && b === otherCode) || (a === otherCode && b === currentCode)
      );
      if (exclusion) {
        errors.push(
          `${exclusion[2]} (across separate charges — review and consolidate).`
        );
      }
    }
  }

  // Cross-charge Rule 5: Discharge on current + procedure on other → -25 on discharge
  const currentDischargeCodes = cleanCurrentCodes.filter(isDischargeCode);
  if (currentDischargeCodes.length > 0 && otherProcCodes.length > 0) {
    for (const dc of currentDischargeCodes) {
      const alreadySuggested = suggestions.some(s => s.code === dc && s.modifier === '-25');
      if (!alreadySuggested) {
        suggestions.push({
          code: dc,
          modifier: '-25',
          reason: `Discharge code ${dc} billed same day as procedure(s) on separate charge(s). Modifier -25 needed on discharge E/M.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: 'cross-charge-discharge-procedure-25'
        });
      }
    }
  }

  // Cross-charge Rule 6: Pericardiocentesis + cath across charges → -59
  const currentPericCodes = cleanCurrentCodes.filter(isPericardiocentesisCode);
  const otherCathCodes = otherCodes.filter(isDiagnosticCathCode);
  if (currentPericCodes.length > 0 && otherCathCodes.length > 0) {
    for (const pc of currentPericCodes) {
      suggestions.push({
        code: pc,
        modifier: '-59',
        reason: `Pericardiocentesis (${pc}) billed same day as cardiac cath on separate charge. Modifier -59 needed if separate indication from cath.`,
        confidence: 'recommended',
        autoApplied: false,
        ruleId: 'cross-charge-pericardiocentesis-cath-59'
      });
    }
  }

  return { suggestions, warnings, errors, scrubbed: true };
}

/**
 * Pre-billing scrub — runs full validation on all charges grouped by patient+date.
 * Also checks cross-date global period rules.
 * Returns a map of chargeId → ValidationResult.
 */
export function preBillingScrub(
  charges: StoredCharge[],
  patientContextMap?: Map<string, PatientContext>
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  // Group charges by patient + date
  const groups = new Map<string, StoredCharge[]>();
  for (const charge of charges) {
    const key = `${charge.inpatientId}|${charge.chargeDate}`;
    const group = groups.get(key) || [];
    group.push(charge);
    groups.set(key, group);
  }

  // Group charges by patient (for cross-date global period checks)
  const patientCharges = new Map<string, StoredCharge[]>();
  for (const charge of charges) {
    const pCharges = patientCharges.get(charge.inpatientId) || [];
    pCharges.push(charge);
    patientCharges.set(charge.inpatientId, pCharges);
  }

  // Validate each charge (within-charge + same-date cross-charge)
  for (const charge of charges) {
    const key = `${charge.inpatientId}|${charge.chargeDate}`;
    const group = groups.get(key) || [];

    // Within-charge validation
    const withinResult = validateChargeCodes([charge.cptCode]);

    // Cross-charge validation
    const crossResult = validateCrossChargeModifiers(
      [charge.cptCode],
      group,
      charge.id
    );

    // Merge results
    results.set(charge.id, {
      suggestions: [...withinResult.suggestions, ...crossResult.suggestions],
      warnings: [...withinResult.warnings, ...crossResult.warnings],
      errors: [...withinResult.errors, ...crossResult.errors],
      scrubbed: true
    });
  }

  // Cross-date: Global period awareness
  for (const [, pCharges] of patientCharges) {
    // Find procedure charges with non-zero global periods
    const procedureChargesWithGlobal: { charge: StoredCharge; globalDays: number }[] = [];
    for (const charge of pCharges) {
      const code = stripModifier(charge.cptCode);
      const gp = globalPeriodDays[code];
      if (gp !== undefined && gp > 0 && isProcedureCode(code)) {
        procedureChargesWithGlobal.push({ charge, globalDays: gp });
      }
    }

    if (procedureChargesWithGlobal.length === 0) continue;

    // Check each charge against global period windows
    for (const charge of pCharges) {
      const chargeCode = stripModifier(charge.cptCode);
      const chargeDate = new Date(charge.chargeDate + 'T00:00:00');

      for (const { charge: procCharge, globalDays } of procedureChargesWithGlobal) {
        if (procCharge.id === charge.id) continue;
        const procDate = new Date(procCharge.chargeDate + 'T00:00:00');
        const daysDiff = Math.floor((chargeDate.getTime() - procDate.getTime()) / 86400000);

        // Only check charges AFTER the procedure, within the global period
        if (daysDiff <= 0 || daysDiff > globalDays) continue;

        const existing = results.get(charge.id);
        if (!existing) continue;

        const procCode = stripModifier(procCharge.cptCode);

        if (isEMCode(chargeCode)) {
          // E/M during global period → suggest -24
          existing.suggestions.push({
            code: chargeCode,
            modifier: '-24',
            reason: `E/M code ${chargeCode} is within the ${globalDays}-day global period of ${procCode} (performed ${procCharge.chargeDate}). Modifier -24 needed if this E/M is for an unrelated condition.`,
            confidence: 'recommended',
            autoApplied: false,
            ruleId: 'global-period-em-24'
          });
          existing.warnings.push(
            `E/M ${chargeCode} falls within ${globalDays}-day global period of ${procCode} (${procCharge.chargeDate}). Add -24 if unrelated, or -57 if this led to a new surgery decision.`
          );
        } else if (isProcedureCode(chargeCode)) {
          // Procedure during global period → suggest -78 or -79
          existing.suggestions.push({
            code: chargeCode,
            modifier: '-79',
            reason: `Procedure ${chargeCode} is within the ${globalDays}-day global period of ${procCode} (performed ${procCharge.chargeDate}). Modifier -79 if unrelated, -78 if related but unplanned return.`,
            confidence: 'recommended',
            autoApplied: false,
            ruleId: 'global-period-procedure-79'
          });
          existing.warnings.push(
            `Procedure ${chargeCode} falls within ${globalDays}-day global period of ${procCode} (${procCharge.chargeDate}). Use -78 (related, unplanned return) or -79 (unrelated procedure).`
          );
        }
      }
    }
  }

  // Cross-charge: Duplicate charge detection (same CPT, same patient, same date, separate records)
  for (const [, group] of groups) {
    if (group.length < 2) continue;

    const codeMap = new Map<string, StoredCharge[]>();
    for (const charge of group) {
      const code = stripModifier(charge.cptCode);
      const existing = codeMap.get(code) || [];
      existing.push(charge);
      codeMap.set(code, existing);
    }

    for (const [code, dupes] of codeMap) {
      if (dupes.length < 2) continue;
      // Skip E/M codes (handled by consult sequencing) and add-on codes
      if (isEMCode(code) || isAddOnCodeFn(code)) continue;

      for (const charge of dupes) {
        const existing = results.get(charge.id);
        if (existing) {
          existing.warnings.push(
            `CPT code ${code} appears on ${dupes.length} separate charge records for this patient on the same date. Verify these are not duplicate submissions. If intentional, ensure modifier -76 (same physician) or -77 (different physician) is applied.`
          );
        }
      }
    }
  }

  // Charge frequency alert: >4 charges same patient same date
  for (const [, group] of groups) {
    if (group.length > 4) {
      for (const charge of group) {
        const existing = results.get(charge.id);
        if (existing) {
          existing.warnings.push(
            `${group.length} charges for this patient on ${charge.chargeDate}. High charge volume — review for completeness and accuracy.`
          );
        }
      }
    }
  }

  // Context-aware validation (ICD-10, time, discharge date) for each charge
  for (const charge of charges) {
    const existing = results.get(charge.id);
    if (!existing) continue;

    const context = patientContextMap?.get(charge.inpatientId);
    const contextResult = validateChargeContext(charge, context);

    existing.suggestions.push(...contextResult.suggestions);
    existing.warnings.push(...contextResult.warnings);
    existing.errors.push(...contextResult.errors);
  }

  // Cross-date: Consult-to-subsequent and initial encounter sequencing
  for (const [, pCharges] of patientCharges) {
    checkConsultSequencing(pCharges, results);
  }

  // Cross-date: Same-day admit/discharge detection
  for (const [patientId, pCharges] of patientCharges) {
    const context = patientContextMap?.get(patientId);
    if (context?.admitDate && context?.dischargeDate && context.admitDate === context.dischargeDate) {
      checkSameDayAdmitDischarge(pCharges, context.admitDate, results);
    }
  }

  // E/M billing pattern detection — flag suspicious uniformity
  for (const [, pCharges] of patientCharges) {
    checkEMPatternCompliance(pCharges, results);
  }

  // Modifier documentation reminders — attach doc requirements to all suggestions
  for (const [, result] of results) {
    attachModifierDocumentation(result);
  }

  // Charge capture completeness — verify cath cases have all expected components
  for (const [, group] of groups) {
    checkChargeCaptureCompleteness(group, results);
  }

  // Cross-charge: EP study + ablation across separate charges
  for (const [, group] of groups) {
    checkCrossChargeEPAblation(group, results);
  }

  // Cross-charge: Coronary vessel territory duplication across charges
  for (const [, group] of groups) {
    checkCoronaryTerritoryDuplication(group, results);
  }

  // Cross-charge: Post-PCI diagnostic angio on same date
  for (const [, group] of groups) {
    checkPostPCIDiagnosticAngio(group, results);
  }

  // Cross-date: Staged PCI documentation
  for (const [, pCharges] of patientCharges) {
    checkStagedPCIDocumentation(pCharges, results);
  }

  return results;
}

// ==================== Individual Rule Checks ====================

function checkDuplicates(
  codes: string[],
  suggestions: ModifierSuggestion[],
  errors: string[]
): void {
  const seen = new Map<string, number>();
  for (const code of codes) {
    seen.set(code, (seen.get(code) || 0) + 1);
  }

  for (const [code, count] of seen) {
    if (count > 1) {
      suggestions.push({
        code,
        modifier: '-76',
        reason: `Code ${code} appears ${count} times. Modifier -76 indicates a repeat procedure by the same physician. Use -77 if performed by a different physician.`,
        confidence: 'required',
        autoApplied: false,
        ruleId: 'duplicate-code-76'
      });
    }
  }
}

function checkNCCIEdits(
  codes: string[],
  suggestions: ModifierSuggestion[],
  warnings: string[]
): void {
  const codeSet = new Set(codes);

  for (const pair of cciPairs) {
    if (codeSet.has(pair.column1) && codeSet.has(pair.column2)) {
      if (pair.modifierException) {
        // Auto-apply -59 for known modifier-exception pairs
        suggestions.push({
          code: pair.column2,
          modifier: '-59',
          reason: `CCI edit: ${pair.description}. Modifier -59 allows separate reporting when services are distinct.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: `ncci-${pair.column1}-${pair.column2}-59`
        });
      } else {
        // No modifier exception — warn but don't suggest
        warnings.push(
          `CCI edit: ${pair.description}. These codes are bundled and cannot be billed separately (no modifier exception).`
        );
      }
    }
  }
}

function checkEMPlusProcedure(
  codes: string[],
  suggestions: ModifierSuggestion[]
): void {
  const emCodes = codes.filter(isEMCode);
  const procCodes = codes.filter(isProcedureCode);

  if (emCodes.length > 0 && procCodes.length > 0) {
    for (const emCode of emCodes) {
      // Don't double-suggest if already handled by NCCI
      const alreadySuggested = suggestions.some(s => s.code === emCode && s.modifier === '-25');
      if (!alreadySuggested) {
        suggestions.push({
          code: emCode,
          modifier: '-25',
          reason: `E/M code ${emCode} billed with procedure code(s) ${procCodes.join(', ')} on the same charge. Modifier -25 indicates a separately identifiable E/M service.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: 'em-plus-procedure-25'
        });
      }
    }
  }
}

function checkProfTechSplit(
  codes: string[],
  suggestions: ModifierSuggestion[]
): void {
  for (const code of codes) {
    if (profTechCodes.has(code)) {
      suggestions.push({
        code,
        modifier: '-26',
        reason: `Code ${code} has professional/technical components. If billing professional component only (interpretation), add -26. If technical only, add -TC.`,
        confidence: 'optional',
        autoApplied: false,
        ruleId: 'prof-tech-split-26'
      });
    }
  }
}

function checkLaterality(
  codes: string[],
  suggestions: ModifierSuggestion[]
): void {
  for (const code of codes) {
    if (bilateralCodes.has(code)) {
      suggestions.push({
        code,
        modifier: '-50',
        reason: `Code ${code} is eligible for bilateral modifier -50 if performed on both sides.`,
        confidence: 'optional',
        autoApplied: false,
        ruleId: 'bilateral-50'
      });
    }
    if (lateralityCodes.has(code)) {
      suggestions.push({
        code,
        modifier: '-LT',
        reason: `Code ${code} may need laterality modifier (-LT left, -RT right) if site-specific.`,
        confidence: 'optional',
        autoApplied: false,
        ruleId: 'laterality-lt-rt'
      });
    }
  }
}

function checkDiagCathPCI(
  codes: string[],
  suggestions: ModifierSuggestion[],
  warnings: string[]
): void {
  const diagCathCodes = codes.filter(isDiagnosticCathCode);
  const pciCodesFound = codes.filter(isPCICode);

  if (diagCathCodes.length > 0 && pciCodesFound.length > 0) {
    for (const cathCode of diagCathCodes) {
      // Don't double-suggest if already handled by NCCI
      const alreadySuggested = suggestions.some(s => s.code === cathCode && s.modifier === '-59');
      if (!alreadySuggested) {
        suggestions.push({
          code: cathCode,
          modifier: '-59',
          reason: `Diagnostic cath ${cathCode} performed with PCI (${pciCodesFound.join(', ')}) same session. Modifier -59 needed if diagnostic cath was a separate decision from the intervention.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: 'diag-cath-pci-59'
        });
        warnings.push(
          `Diagnostic cath + PCI: Ensure documentation supports separate billing — no prior cath in 30 days, diagnostic findings led to PCI decision.`
        );
      }
    }
  }
}

// ==================== New Rule Checks ====================

/** 7. Add-on code orphan detection — flag add-on codes without valid primary */
function checkAddOnOrphans(codes: string[], errors: string[]): void {
  const codeSet = new Set(codes);

  for (const code of codes) {
    const requiredPrimaries = addOnCodePrimaries[code];
    if (!requiredPrimaries) continue;

    const hasPrimary = requiredPrimaries.some(primary => codeSet.has(primary));
    if (!hasPrimary) {
      errors.push(
        `Add-on code ${code} requires a primary code (${requiredPrimaries.slice(0, 3).join(', ')}${requiredPrimaries.length > 3 ? '...' : ''}). Cannot be billed standalone.`
      );
    }
  }
}

/** 8. Echo mutual exclusion — flag mutually exclusive echo code pairs */
function checkEchoMutualExclusion(codes: string[], errors: string[]): void {
  const codeSet = new Set(codes);

  for (const [code1, code2, reason] of echoMutualExclusionPairs) {
    if (codeSet.has(code1) && codeSet.has(code2)) {
      errors.push(reason);
    }
  }
}

/** 9. Critical care bundled procedures — 99291/99292 bundles certain procedures */
function checkCriticalCareBundling(codes: string[], warnings: string[]): void {
  const hasCriticalCare = codes.some(isCriticalCareCode);
  if (!hasCriticalCare) return;

  for (const code of codes) {
    if (criticalCareBundledProcedures.has(code)) {
      warnings.push(
        `${code} is bundled into critical care time (99291/99292) and should not be billed separately when provided during the critical care period.`
      );
    }
  }
}

/** 10. Sedation code bundling — flag sedation codes with procedures that include sedation */
function checkSedationBundling(codes: string[], errors: string[]): void {
  const sedationCodesFound = codes.filter(isSedationCode);
  if (sedationCodesFound.length === 0) return;

  const inherentProcs = codes.filter(c => sedationInherentProcedures.has(c));
  if (inherentProcs.length > 0) {
    for (const sc of sedationCodesFound) {
      errors.push(
        `Sedation code ${sc} cannot be billed separately — moderate sedation is inherent in ${inherentProcs.join(', ')}.`
      );
    }
  }
}

/** 11. Catheter hierarchy — higher-order selective caths include lower-order */
function checkCatheterHierarchy(codes: string[], warnings: string[]): void {
  const codeSet = new Set(codes);

  for (const { higher, includes, description } of catheterHierarchy) {
    if (codeSet.has(higher)) {
      for (const lower of includes) {
        if (codeSet.has(lower)) {
          warnings.push(
            `${description}. Do not bill ${lower} separately when ${higher} is reported in the same vascular family.`
          );
        }
      }
    }
  }
}

/** 12. S&I code pairing — imaging supervision codes must pair with catheter placement */
function checkSIPairing(codes: string[], warnings: string[]): void {
  const codeSet = new Set(codes);

  for (const code of codes) {
    const pairing = siCodePairings[code];
    if (!pairing) continue;

    const hasCath = pairing.requiredCaths.some(c => codeSet.has(c));
    if (!hasCath) {
      warnings.push(
        `S&I code ${code} (${pairing.territory}) typically requires a catheter placement code (${pairing.requiredCaths.slice(0, 3).join(', ')}...). Ensure catheter placement is reported.`
      );
    }
  }
}

/** 13. Peripheral territory — only one primary intervention code per territory */
function checkPeripheralTerritory(codes: string[], errors: string[], warnings: string[]): void {
  const codeSet = new Set(codes);

  for (const [, territory] of Object.entries(peripheralTerritories)) {
    const primaryCodes = territory.primary.filter(c => codeSet.has(c));
    const addOnCodes = territory.addOn.filter(c => codeSet.has(c));

    if (primaryCodes.length > 1) {
      errors.push(
        `Multiple primary ${territory.territory} intervention codes (${primaryCodes.join(', ')}) — only one primary code per territory is allowed. Use add-on codes for additional vessels.`
      );
    }

    if (addOnCodes.length > 0 && primaryCodes.length === 0) {
      errors.push(
        `${territory.territory} add-on code(s) (${addOnCodes.join(', ')}) require a primary intervention code. Add the appropriate primary code for this territory.`
      );
    }
  }
}

/** 14. Multiple procedures → -51 detection */
function checkMultipleProcedures(
  codes: string[],
  suggestions: ModifierSuggestion[]
): void {
  // Get non-E/M, non-add-on procedure codes across different domains
  const procedureCodes = codes.filter(c =>
    isProcedureCode(c) && !isAddOnCodeFn(c) && !isEMCode(c)
  );

  if (procedureCodes.length < 2) return;

  // Group by domain
  const domains = new Map<CodeDomain, string[]>();
  for (const code of procedureCodes) {
    const domain = getCodeDomain(code);
    const domainCodes = domains.get(domain) || [];
    domainCodes.push(code);
    domains.set(domain, domainCodes);
  }

  // If procedures span multiple domains, -51 may apply to secondary procedures
  if (domains.size >= 2) {
    const allDomainCodes = [...domains.values()].flat();
    // Skip the first code (primary), suggest -51 on subsequent
    for (let i = 1; i < allDomainCodes.length; i++) {
      const code = allDomainCodes[i];
      const alreadySuggested = suggestions.some(s => s.code === code && (s.modifier === '-59' || s.modifier === '-51'));
      if (!alreadySuggested) {
        suggestions.push({
          code,
          modifier: '-51',
          reason: `Multiple procedures from different domains on same charge. Modifier -51 on secondary procedure ${code} indicates multiple procedure payment reduction may apply.`,
          confidence: 'optional',
          autoApplied: false,
          ruleId: 'multiple-procedure-51'
        });
      }
    }
  }
}

/** 15. Discharge + procedure → -25 on discharge code */
function checkDischargePlusProcedure(
  codes: string[],
  suggestions: ModifierSuggestion[]
): void {
  const dischargeCodesFound = codes.filter(isDischargeCode);
  const procCodes = codes.filter(isProcedureCode);

  if (dischargeCodesFound.length > 0 && procCodes.length > 0) {
    for (const dc of dischargeCodesFound) {
      const alreadySuggested = suggestions.some(s => s.code === dc && s.modifier === '-25');
      if (!alreadySuggested) {
        suggestions.push({
          code: dc,
          modifier: '-25',
          reason: `Discharge code ${dc} billed with procedure(s) ${procCodes.join(', ')} on same day. Modifier -25 needed on discharge E/M to indicate separately identifiable service.`,
          confidence: 'required',
          autoApplied: true,
          ruleId: 'discharge-plus-procedure-25'
        });
      }
    }
  }
}

/** 16. Pericardiocentesis during cardiac cath → -59 */
function checkPericardiocentesisDuringCath(
  codes: string[],
  suggestions: ModifierSuggestion[],
  warnings: string[]
): void {
  const pericCodes = codes.filter(isPericardiocentesisCode);
  const cathCodes = codes.filter(isDiagnosticCathCode);

  if (pericCodes.length > 0 && cathCodes.length > 0) {
    for (const pc of pericCodes) {
      suggestions.push({
        code: pc,
        modifier: '-59',
        reason: `Pericardiocentesis (${pc}) during cardiac cath session. Modifier -59 indicates distinct procedural service with separate indication.`,
        confidence: 'recommended',
        autoApplied: false,
        ruleId: 'pericardiocentesis-cath-59'
      });
      warnings.push(
        `Pericardiocentesis + cardiac cath: Ensure documentation supports separate clinical indication (not just a complication of the cath procedure).`
      );
    }
  }
}

// ==================== Context-Aware Checks ====================

/** Time documentation validation — critical care requires time, E/M time must match level */
function checkTimeDocumentation(
  code: string,
  timeMinutes: number | undefined,
  warnings: string[]
): void {
  const threshold = emTimeThresholds[code];
  if (!threshold) return;

  // Critical care REQUIRES time documentation
  if (isCriticalCareCode(code)) {
    if (timeMinutes === undefined || timeMinutes === 0) {
      warnings.push(
        `Critical care code ${code} requires time documentation. Record the total critical care time (non-continuous, excluding separately billable procedures).`
      );
      return;
    }
  }

  // If time IS documented, validate it matches the code level
  if (timeMinutes !== undefined && timeMinutes > 0) {
    if (timeMinutes < threshold.minMinutes) {
      warnings.push(
        `${code} (${threshold.label}) requires at least ${threshold.minMinutes} minutes. Documented time is ${timeMinutes} minutes — consider a lower-level code.`
      );
    }
    if (threshold.maxMinutes && timeMinutes > threshold.maxMinutes) {
      if (code === '99238') {
        warnings.push(
          `Discharge time ${timeMinutes} minutes exceeds 30 minutes — use 99239 instead of 99238.`
        );
      } else if (code === '99291') {
        warnings.push(
          `Critical care time ${timeMinutes} minutes exceeds 74 minutes — also bill 99292 for additional 30-minute increments.`
        );
      }
    }
  }
}

/** Discharge date validation — prevent post-discharge charges and verify discharge code timing */
function checkDischargeDate(
  code: string,
  chargeDate: string,
  dischargeDate: string,
  warnings: string[],
  errors: string[]
): void {
  // Discharge code should be on the discharge date
  if (isDischargeCode(code)) {
    if (chargeDate !== dischargeDate) {
      errors.push(
        `Discharge code ${code} billed on ${chargeDate}, but patient discharge date is ${dischargeDate}. Discharge codes must be billed on the actual discharge date.`
      );
    }
  }

  // No inpatient E/M after discharge
  if (chargeDate > dischargeDate) {
    if (isEMCode(code) && !isDischargeCode(code)) {
      errors.push(
        `E/M code ${code} billed on ${chargeDate}, which is after patient discharge (${dischargeDate}). Cannot bill inpatient E/M after discharge.`
      );
    }
  }
}

/** Consult-to-subsequent sequencing — prevent duplicate consults, initial after first encounter */
function checkConsultSequencing(
  patientCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  const sorted = [...patientCharges].sort((a, b) => a.chargeDate.localeCompare(b.chargeDate));

  let firstConsultDate: string | null = null;
  let firstChargeDate: string | null = null;

  for (const charge of sorted) {
    const code = stripModifier(charge.cptCode);
    if (code === '00000') continue; // Skip no-charge entries

    if (!firstChargeDate) firstChargeDate = charge.chargeDate;

    // Check for duplicate consults on different dates
    if (isConsultCode(code)) {
      if (firstConsultDate && charge.chargeDate !== firstConsultDate) {
        const existing = results.get(charge.id);
        if (existing) {
          existing.errors.push(
            `Consult code ${code} billed on ${charge.chargeDate}, but a consult was already billed on ${firstConsultDate} for this admission. Subsequent visits should use 99231-99233.`
          );
        }
      }
      if (!firstConsultDate) {
        firstConsultDate = charge.chargeDate;
      }
    }

    // Check for initial hospital care on a date after the first encounter
    if (isInitialHospitalCode(code) && firstChargeDate && charge.chargeDate !== firstChargeDate) {
      const existing = results.get(charge.id);
      if (existing) {
        existing.errors.push(
          `Initial hospital care ${code} billed on ${charge.chargeDate}, but first encounter was ${firstChargeDate}. Use 99231-99233 for subsequent visits.`
        );
      }
    }
  }
}

/** Same-day admit/discharge — warn about observation code consideration */
function checkSameDayAdmitDischarge(
  patientCharges: StoredCharge[],
  admitDate: string,
  results: Map<string, ValidationResult>
): void {
  for (const charge of patientCharges) {
    if (charge.chargeDate !== admitDate) continue;
    const code = stripModifier(charge.cptCode);

    if (isInitialHospitalCode(code)) {
      const existing = results.get(charge.id);
      if (existing) {
        existing.warnings.push(
          `Initial hospital care ${code} billed on a same-day admit/discharge. Consider whether observation codes (99234-99236) are more appropriate if the patient did not cross two midnights.`
        );
      }
    }
  }
}

/** 17. Category III (T-code) reimbursement warning */
// ==================== Context-Aware Checks (continued) ====================

/** Indication ↔ CPT domain mismatch — flag when procedure domain doesn't match case indication */
function checkIndicationMismatch(
  code: string,
  indicationCategory: string,
  warnings: string[]
): void {
  const domain = getCodeDomain(code);
  // E/M and misc are always compatible with any indication
  if (domain === 'em' || domain === 'misc') return;

  const compatible = indicationDomainCompatibility[indicationCategory];
  if (compatible && !compatible.includes(domain)) {
    warnings.push(
      `CPT code ${code} (${domain.replace('_', ' ')}) does not match the documented indication category "${indicationCategory}". Verify the indication supports this procedure — payer may deny for medical necessity.`
    );
  }
}

/** Bidirectional sedation check — warn if inherent procedure but sedation not indicated */
function checkSedationExpected(
  code: string,
  snapshot: CaseSnapshot,
  warnings: string[]
): void {
  if (!sedationInherentProcedures.has(code)) return;
  if (snapshot.sedation?.included) return;

  warnings.push(
    `Procedure ${code} typically includes moderate sedation, but sedation was not indicated on this case. If conscious sedation was administered, ensure it is documented for compliance.`
  );
}

/** Charge lag detection — flag charges entered significantly after service date */
function checkChargeLag(
  chargeDate: string,
  createdAt: string,
  warnings: string[],
  errors: string[]
): void {
  const chargeDt = new Date(chargeDate + 'T00:00:00');
  const createdDt = new Date(createdAt);
  const lagDays = Math.floor((createdDt.getTime() - chargeDt.getTime()) / 86400000);

  // Only flag positive lag (entered after service date)
  if (lagDays < CHARGE_LAG_WARNING_DAYS) return;

  if (lagDays >= CHARGE_LAG_ERROR_DAYS) {
    errors.push(
      `Charge entered ${lagDays} days after service date (${chargeDate}). This exceeds timely filing thresholds — most payers require claims within 90-365 days. Expedite submission.`
    );
  } else {
    warnings.push(
      `Charge entered ${lagDays} days after service date (${chargeDate}). Prompt charge entry reduces denial risk and improves revenue cycle.`
    );
  }
}

/** Time sanity checks — flag extreme time outliers that suggest data entry errors */
function checkTimeSanity(
  code: string,
  timeMinutes: number | undefined,
  warnings: string[]
): void {
  if (timeMinutes === undefined || timeMinutes === 0) return;

  // Critical care < 15 min is suspicious (requires 30 min minimum per 99291)
  if (isCriticalCareCode(code) && timeMinutes < 15) {
    warnings.push(
      `Critical care time of ${timeMinutes} minutes is unusually low. Code 99291 requires at least 30 minutes of direct bedside critical care. Verify this value.`
    );
  }

  // Any E/M > 480 min (8 hours) is likely a data entry error
  if (isEMCode(code) && timeMinutes > 480) {
    warnings.push(
      `Documented time of ${timeMinutes} minutes (${(timeMinutes / 60).toFixed(1)} hours) for ${code} is unusually high — possible data entry error. Verify and correct if needed.`
    );
  }

  // Discharge > 120 min is suspicious
  if (isDischargeCode(code) && timeMinutes > 120) {
    warnings.push(
      `Discharge management time of ${timeMinutes} minutes is unusually high. Typical discharge is 30-60 minutes. Verify this is correct.`
    );
  }
}

/** PCI vessel documentation — PCI codes require vessel identification for proper billing */
function checkVesselDocumentation(
  code: string,
  snapshot: CaseSnapshot,
  warnings: string[]
): void {
  if (!pciCodesRequiringVessel.has(code)) return;

  // Check if any vessel data exists in the snapshot
  const v1Keys = snapshot.vessels?.v1 ? Object.keys(snapshot.vessels.v1).length : 0;
  const v2Keys = snapshot.vessels?.v2 ? Object.keys(snapshot.vessels.v2).length : 0;
  const v3Keys = snapshot.vessels?.v3 ? Object.keys(snapshot.vessels.v3).length : 0;

  if (v1Keys === 0 && v2Keys === 0 && v3Keys === 0) {
    warnings.push(
      `PCI code ${code} requires vessel documentation (which coronary artery was treated). Missing vessel data may result in claim denial or audit flag.`
    );
  }
}

function checkCategoryIIICodes(codes: string[], warnings: string[]): void {
  for (const code of codes) {
    if (isCategoryIIICode(code)) {
      const specific = getCategoryIIIWarning(code);
      if (specific) {
        warnings.push(
          `Category III code ${code}: ${specific}. These codes may have no established Medicare reimbursement — verify payer coverage before billing.`
        );
      } else {
        warnings.push(
          `Category III code ${code} is a temporary tracking code with limited or no Medicare reimbursement. Verify payer coverage and obtain prior authorization if required.`
        );
      }
    }
  }
}

// ==================== New Context-Aware Checks (Items 10-15) ====================

/** 10. Prior authorization flag — warn about high-cost procedures needing pre-auth */
function checkPriorAuthorization(code: string, warnings: string[]): void {
  const authNote = priorAuthProcedures[code];
  if (authNote) {
    warnings.push(
      `Prior authorization alert: ${authNote}. Verify authorization was obtained before billing to prevent denial.`
    );
  }
}

/** 11. Age-based code validation — check age eligibility for specific procedures */
function checkAgeBasedValidation(
  code: string,
  chargeDate: string,
  dob: string,
  warnings: string[]
): void {
  // Calculate age at time of service
  const birthDate = new Date(dob + 'T00:00:00');
  const serviceDate = new Date(chargeDate + 'T00:00:00');
  let age = serviceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = serviceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && serviceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  for (const rule of ageRestrictedProcedures) {
    if (!rule.codes.includes(code)) continue;

    if (rule.minAge !== undefined && age < rule.minAge) {
      warnings.push(
        `Patient age ${age} is below minimum age ${rule.minAge} for ${code}. ${rule.note}`
      );
    }
    if (rule.maxAge !== undefined && age > rule.maxAge) {
      warnings.push(
        `Patient age ${age} exceeds maximum age ${rule.maxAge} for ${code}. ${rule.note}`
      );
    }
  }
}

/** 12. NCD/LCD compliance — check Medicare coverage criteria for major procedures */
function checkNCDCompliance(
  code: string,
  diagnoses: string[],
  warnings: string[]
): void {
  for (const rule of ncdRules) {
    if (!rule.procedures.includes(code)) continue;

    // Check if any diagnosis supports the NCD requirement
    const hasSupportingDx = diagnoses && diagnoses.length > 0 && diagnoses.some(dx =>
      rule.requiredDiagnosisPrefixes.some(prefix => dx.startsWith(prefix))
    );

    if (!hasSupportingDx) {
      warnings.push(
        `${rule.name}: ${code} may not meet Medicare coverage criteria. ${rule.clinicalCriteria} Documentation checklist: ${rule.documentationChecklist}`
      );
    } else {
      // Diagnosis supports it, but still remind about clinical criteria documentation
      warnings.push(
        `${rule.name} documentation reminder for ${code}: Verify ${rule.documentationChecklist}`
      );
    }
  }
}

/** 13. Code year validity — flag retired or replaced codes */
function checkCodeYearValidity(code: string, errors: string[]): void {
  const retiredNote = retiredCodes[code];
  if (retiredNote) {
    errors.push(
      `Code ${code} has been retired/replaced: ${retiredNote}. Update to the current valid code to prevent claim rejection.`
    );
  }
}

/** 14. E/M level optimization — suggest upgrade when documented time supports a higher level */
function checkEMLevelOptimization(
  code: string,
  timeMinutes: number | undefined,
  suggestions: ModifierSuggestion[]
): void {
  if (timeMinutes === undefined || timeMinutes === 0) return;
  if (!isEMCode(code)) return;

  // Find the family this code belongs to
  const family = emLevelFamilies.find(f => f.codes.includes(code));
  if (!family) return;

  // Find the optimal code for the documented time
  let optimalCode: string | null = null;
  let optimalLabel = '';

  for (const familyCode of family.codes) {
    const threshold = emTimeThresholds[familyCode];
    if (!threshold) continue;

    if (timeMinutes >= threshold.minMinutes) {
      // Check maxMinutes if applicable (e.g., discharge 99238 is ≤30 min)
      if (threshold.maxMinutes && timeMinutes > threshold.maxMinutes) continue;
      optimalCode = familyCode;
      optimalLabel = threshold.label;
    }
  }

  if (optimalCode && optimalCode !== code) {
    // Check if optimal code is higher level (later in the family array)
    const currentIdx = family.codes.indexOf(code);
    const optimalIdx = family.codes.indexOf(optimalCode);

    if (optimalIdx > currentIdx) {
      suggestions.push({
        code,
        modifier: '',
        reason: `Documented time of ${timeMinutes} minutes supports upgrading from ${code} to ${optimalCode} (${optimalLabel}). Consider selecting the higher-level code to accurately reflect the service provided.`,
        confidence: 'recommended',
        autoApplied: false,
        ruleId: 'em-level-upgrade'
      });
    } else if (optimalIdx < currentIdx) {
      suggestions.push({
        code,
        modifier: '',
        reason: `Documented time of ${timeMinutes} minutes supports ${optimalCode} (${optimalLabel}), which is a lower level than the selected ${code}. Verify that medical decision-making complexity justifies the higher code, or adjust the code to match documented time.`,
        confidence: 'recommended',
        autoApplied: false,
        ruleId: 'em-level-downgrade-risk'
      });
    }
  }
}

/** 15. Professional component auto-detection — hospital-based imaging should bill -26 */
function checkProfessionalComponent(
  code: string,
  snapshot: CaseSnapshot | undefined,
  suggestions: ModifierSuggestion[]
): void {
  // Only applies to professional/technical split codes (echo, imaging)
  if (!profTechCodes.has(code)) return;

  // If this is a hospital-based charge (has a caseSnapshot = cath lab, or is inpatient round)
  // Most cardiologists reading echos in hospital should bill -26
  // Only suggest if not already modified
  if (isInterpretationCode(code)) {
    suggestions.push({
      code,
      modifier: '-26',
      reason: `${code} is an interpretation code. Hospital-based physicians should bill -26 (professional component only). The facility bills -TC for the technical component. If billing globally (own office/equipment), no modifier needed.`,
      confidence: 'optional',
      autoApplied: false,
      ruleId: 'prof-component-26-reminder'
    });
  }
}

// ==================== Cross-Patient Pattern Checks ====================

/** E/M billing pattern detection — flag suspicious uniformity across a patient's stay */
function checkEMPatternCompliance(
  patientCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  // Get all subsequent hospital care charges (99231-99233)
  const subsequentCharges = patientCharges.filter(c => {
    const code = stripModifier(c.cptCode);
    return isSubsequentHospitalCode(code);
  });

  if (subsequentCharges.length < 3) return; // Need at least 3 days to detect a pattern

  // Check if all are the highest level (99233)
  const allHighest = subsequentCharges.every(c => stripModifier(c.cptCode) === '99233');
  if (allHighest) {
    for (const charge of subsequentCharges) {
      const existing = results.get(charge.id);
      if (existing) {
        existing.warnings.push(
          `All ${subsequentCharges.length} subsequent hospital visits for this patient are billed at the highest level (99233). Consistent highest-level billing is a common audit trigger. Ensure documentation supports high-complexity MDM for each visit.`
        );
      }
    }
    return;
  }

  // Check for cloned charges — identical code on every day
  const codeCount = new Map<string, number>();
  for (const charge of subsequentCharges) {
    const code = stripModifier(charge.cptCode);
    codeCount.set(code, (codeCount.get(code) || 0) + 1);
  }
  const [mostCommonCode, mostCommonCount] = [...codeCount.entries()].reduce((a, b) => b[1] > a[1] ? b : a);
  if (mostCommonCount === subsequentCharges.length && subsequentCharges.length >= 4) {
    for (const charge of subsequentCharges) {
      const existing = results.get(charge.id);
      if (existing) {
        existing.warnings.push(
          `All ${subsequentCharges.length} subsequent visits use ${mostCommonCode} — identical code each day may indicate documentation is not reflecting daily changes in patient complexity. Ensure each day's note supports the selected level.`
        );
      }
    }
  }
}

/** Modifier documentation reminders — attach doc requirements to every suggestion */
function attachModifierDocumentation(result: ValidationResult): void {
  for (const suggestion of result.suggestions) {
    if (!suggestion.modifier) continue;
    const docReq = modifierDocRequirements[suggestion.modifier];
    if (docReq) {
      // Append documentation requirement to the reason if not already present
      if (!suggestion.reason.includes('Documentation')) {
        suggestion.reason += ` | Documentation: ${docReq}`;
      }
    }
  }
}

/** Charge capture completeness — verify cath cases have all expected billable components */
function checkChargeCaptureCompleteness(
  sameDayCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  // Find charges with caseSnapshots (cath lab cases)
  const cathCharges = sameDayCharges.filter(c => c.caseSnapshot);
  if (cathCharges.length === 0) return;

  // Collect all CPT codes billed for this patient on this date
  const allBilledCodes = new Set<string>();
  for (const charge of sameDayCharges) {
    // Handle combined code strings like "93454 + 92928-LAD"
    const parts = charge.cptCode.split(' + ');
    for (const part of parts) {
      allBilledCodes.add(stripModifier(part.replace(/-[A-Z]+$/, '').trim()));
    }
  }

  for (const charge of cathCharges) {
    const snapshot = charge.caseSnapshot!;
    const existing = results.get(charge.id);
    if (!existing) continue;

    // Check: PCI codes present but no diagnostic cath component
    const hasPCI = [...allBilledCodes].some(c => isPCICode(c));
    const hasDiagCath = [...allBilledCodes].some(c => isDiagnosticCathCode(c));
    if (hasPCI && !hasDiagCath) {
      existing.warnings.push(
        `PCI codes are billed but no diagnostic catheterization code found for this date. If a diagnostic cath was performed leading to PCI, ensure the cath code is captured (with -59 modifier).`
      );
    }

    // Check: Codes in vessel2/vessel3 of snapshot but only primary vessel codes billed
    const snapshotV2Codes = snapshot.codes?.vessel2?.map(c => c.code) || [];
    const snapshotV3Codes = snapshot.codes?.vessel3?.map(c => c.code) || [];
    const missingV2 = snapshotV2Codes.filter(c => !allBilledCodes.has(stripModifier(c)));
    const missingV3 = snapshotV3Codes.filter(c => !allBilledCodes.has(stripModifier(c)));

    if (missingV2.length > 0) {
      existing.warnings.push(
        `Vessel 2 codes from the case (${missingV2.join(', ')}) are not reflected in any billed charge for this date. Verify all performed procedures are captured.`
      );
    }
    if (missingV3.length > 0) {
      existing.warnings.push(
        `Vessel 3 codes from the case (${missingV3.join(', ')}) are not reflected in any billed charge for this date. Verify all performed procedures are captured.`
      );
    }
  }
}

// ==================== Cardiology-Specific Within-Charge Checks (18-22) ====================

/** 18. Diagnostic cath hierarchy — flag overlapping/redundant cath codes */
function checkDiagCathCodeHierarchy(codes: string[], errors: string[]): void {
  const codeSet = new Set(codes);

  // Check if a higher-level cath code includes a lower-level one
  for (const [higher, { includes, description }] of Object.entries(diagnosticCathHierarchy)) {
    if (!codeSet.has(higher)) continue;
    for (const lower of includes) {
      if (codeSet.has(lower)) {
        errors.push(
          `${description}. Do not bill ${lower} separately when ${higher} is reported — the higher code includes the lower component.`
        );
      }
    }
  }

  // Coronary angio codes are mutually exclusive
  const angioCodesPresent = codes.filter(c => coronaryAngioCodes.has(c));
  if (angioCodesPresent.length > 1) {
    errors.push(
      `Coronary angiography codes ${angioCodesPresent.join(', ')} are mutually exclusive — only one can be billed per session. Select the code that best represents all components performed.`
    );
  }
}

/** 19. EP study + ablation within same charge — EP study bundled into ablation */
function checkEPStudyAblationWithinCharge(codes: string[], errors: string[], warnings: string[]): void {
  const codeSet = new Set(codes);

  for (const [ablationCode, { bundled, description }] of Object.entries(ablationBundlesEPStudy)) {
    if (!codeSet.has(ablationCode)) continue;

    for (const epCode of bundled) {
      if (codeSet.has(epCode)) {
        errors.push(
          `EP study code ${epCode} is bundled into ablation code ${ablationCode} and cannot be billed separately. ${description}. The EP study is only separately billable if it leads to a decision NOT to ablate.`
        );
      }
    }
  }
}

/** 20. Device implant consistency — generator change vs de novo, lead count */
function checkDeviceImplantConsistency(codes: string[], errors: string[]): void {
  const codeSet = new Set(codes);

  // Generator change + de novo implant on same charge is an error
  const hasGenChange = codes.some(c => generatorChangeCodes.has(c));
  const hasDeNovo = codes.some(c => deNovoImplantCodes.has(c));

  if (hasGenChange && hasDeNovo) {
    const genCodes = codes.filter(c => generatorChangeCodes.has(c));
    const novoCodes = codes.filter(c => deNovoImplantCodes.has(c));
    errors.push(
      `Generator change code(s) ${genCodes.join(', ')} and de novo implant code(s) ${novoCodes.join(', ')} cannot be billed together. Use generator change codes for replacement/revision or de novo codes for new implants — not both.`
    );
  }
}

/** 21. Cardioversion bundling during cath lab — warn about separate session documentation */
function checkCardioversionBundling(codes: string[], warnings: string[]): void {
  const cvCodes = codes.filter(isCardioversionCode);
  if (cvCodes.length === 0) return;

  const hasCathCodes = codes.some(isDiagnosticCathCode);
  const hasPCI = codes.some(isPCICode);

  if (hasCathCodes || hasPCI) {
    for (const cv of cvCodes) {
      const type = cv === '92960' ? 'External' : 'Internal';
      warnings.push(
        `${type} cardioversion (${cv}) billed with catheterization/PCI codes on same charge. If performed during the cath lab case, ensure documentation supports a separately identifiable cardioversion service with its own medical necessity.`
      );
    }
  }
}

/** 22. Structural TEE code selection — verify correct TEE code for structural guidance */
function checkStructuralTEECode(codes: string[], warnings: string[]): void {
  const codeSet = new Set(codes);

  const hasStructural = codes.some(c => structuralProceduresExpectingTEE.has(c));
  if (!hasStructural) return;

  const hasStructuralTEE = codeSet.has(structuralTEECode); // 93355
  const hasGenericTEE = codes.some(c => genericTEEBaseCodes.has(c)); // 93312/93314/93315

  if (hasGenericTEE && !hasStructuralTEE) {
    warnings.push(
      `Structural procedure billed with generic TEE code instead of 93355 (3D TEE for structural intervention). For intraprocedural structural guidance, 93355 is the appropriate code and provides higher reimbursement.`
    );
  }

  if (!hasStructuralTEE && !hasGenericTEE) {
    warnings.push(
      `Structural procedure billed without TEE guidance code. If intraprocedural TEE was performed for guidance, ensure 93355 (3D TEE structural) is captured — this is a commonly missed billable component.`
    );
  }
}

// ==================== Cardiology-Specific Context Checks (16-17) ====================

/** 16. Sedation unit validation — compare units against expected case duration */
function checkSedationUnitValidation(
  code: string,
  sedation: { included: boolean; units: number },
  warnings: string[]
): void {
  if (!sedation.included) return;

  // 99152 = initial 15 min, 99153 = each additional 15 min
  // Total sedation time = 15 + (units * 15) minutes
  const totalSedationMin = 15 + (sedation.units * 15);

  // For short procedures (<30 min typical), >4 units (75 min) is suspicious
  if (sedation.units > 6) {
    warnings.push(
      `${sedation.units} sedation units (99153) represent ${totalSedationMin} minutes of moderate sedation. This is unusually high — verify sedation time matches the actual case duration.`
    );
  }

  // If no additional units (just 99152), verify the case wasn't longer than 15 min
  if (sedation.units === 0 && (isPCICode(code) || isDiagnosticCathCode(code))) {
    warnings.push(
      `Only initial sedation (99152, 15 min) billed for ${code}. Most catheterization/PCI cases exceed 15 minutes — ensure additional sedation units (99153) are captured if applicable.`
    );
  }
}

/** 17. IVUS/FFR without intervention — needs medical necessity documentation for deferral */
function checkImagingWithoutIntervention(
  code: string,
  fullCptString: string,
  warnings: string[]
): void {
  if (!isIntravascularImagingCode(code)) return;

  // Check if there's a PCI code in the combined code string
  const parts = fullCptString.split(' + ').map(p => stripModifier(p.replace(/-[A-Z]+$/, '').trim()));
  const hasPCI = parts.some(p => isPCICode(p) && !isIntravascularImagingCode(p));

  if (!hasPCI) {
    const imagingType = code === '92978' || code === '92979' ? 'IVUS' :
                         code === '93571' || code === '93572' ? 'FFR/CFR' : 'OCT';
    warnings.push(
      `${imagingType} (${code}) billed without a PCI code on this charge. If intervention was deferred based on imaging results, document the specific findings (e.g., FFR >0.80) and clinical rationale for deferral to support medical necessity.`
    );
  }
}

// ==================== Cardiology-Specific Cross-Charge Checks ====================

/** Cross-charge EP study + ablation — EP study on separate charge from ablation */
function checkCrossChargeEPAblation(
  sameDayCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  if (sameDayCharges.length < 2) return;

  // Find EP study charges and ablation charges
  const epCharges: StoredCharge[] = [];
  const ablationCharges: StoredCharge[] = [];

  for (const charge of sameDayCharges) {
    const code = stripModifier(charge.cptCode);
    if (isEPStudyCode(code)) epCharges.push(charge);
    if (isAblationCode(code)) ablationCharges.push(charge);
  }

  if (epCharges.length > 0 && ablationCharges.length > 0) {
    for (const epCharge of epCharges) {
      const epCode = stripModifier(epCharge.cptCode);
      const existing = results.get(epCharge.id);
      if (existing) {
        existing.errors.push(
          `EP study ${epCode} is on a separate charge from ablation procedure(s) on the same date. The comprehensive EP study is bundled into the ablation code and cannot be billed separately. Remove the EP study charge or consolidate into the ablation charge.`
        );
      }
    }
  }
}

/** Cross-charge coronary territory duplication — same vessel PCI across separate charges */
function checkCoronaryTerritoryDuplication(
  sameDayCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  if (sameDayCharges.length < 2) return;

  // Extract vessel modifiers from PCI charges
  const vesselCharges: { charge: StoredCharge; territory: string; modifier: string }[] = [];

  for (const charge of sameDayCharges) {
    // Parse vessel modifier from combined code string (e.g., "92928-LD" or "92928-LAD")
    const parts = charge.cptCode.split(' + ');
    for (const part of parts) {
      const code = stripModifier(part.replace(/-[A-Z]+$/, '').trim());
      if (!basePCICodes.has(code)) continue;

      // Extract vessel modifier
      const modMatch = part.match(/-([A-Z]{2})$/);
      if (modMatch) {
        const modifier = modMatch[1];
        const territory = coronaryTerritories[modifier] || modifier;
        vesselCharges.push({ charge, territory, modifier });
      }
    }
  }

  // Check for same territory across different charges
  const territoryMap = new Map<string, { charge: StoredCharge; modifier: string }[]>();
  for (const vc of vesselCharges) {
    const existing = territoryMap.get(vc.territory) || [];
    existing.push({ charge: vc.charge, modifier: vc.modifier });
    territoryMap.set(vc.territory, existing);
  }

  for (const [territory, entries] of territoryMap) {
    // Check if entries come from different charge records
    const uniqueChargeIds = new Set(entries.map(e => e.charge.id));
    if (uniqueChargeIds.size > 1) {
      for (const entry of entries) {
        const existing = results.get(entry.charge.id);
        if (existing) {
          existing.warnings.push(
            `PCI on ${territory} territory appears on multiple separate charges for this patient today. If both are the same coronary territory (e.g., proximal and mid LAD), they should be billed as a single PCI code — not two separate codes. Different lesions in the same territory are one code.`
          );
        }
      }
    }
  }
}

/** Cross-charge post-PCI diagnostic angiography — cath code after PCI may be bundled */
function checkPostPCIDiagnosticAngio(
  sameDayCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  if (sameDayCharges.length < 2) return;

  const hasPCI = sameDayCharges.some(c => {
    const code = stripModifier(c.cptCode);
    return isPCICode(code) || c.cptCode.split(' + ').some(p => isPCICode(stripModifier(p.trim())));
  });
  if (!hasPCI) return;

  // Check for standalone diagnostic cath codes on separate charges
  for (const charge of sameDayCharges) {
    const code = stripModifier(charge.cptCode);
    if (!isDiagnosticCathCode(code)) continue;

    // If this charge ONLY has a diagnostic cath (no PCI on this charge), it might be post-PCI
    const chargeParts = charge.cptCode.split(' + ').map(p => stripModifier(p.trim()));
    const hasPCIOnThisCharge = chargeParts.some(p => isPCICode(p));

    if (!hasPCIOnThisCharge) {
      const existing = results.get(charge.id);
      if (existing) {
        existing.warnings.push(
          `Diagnostic cath ${code} on a separate charge from PCI on the same date. Final angiography post-PCI is included in the PCI code. Only bill a separate diagnostic cath if it was a distinct diagnostic study (prior to PCI decision) — document with modifier -59 and ensure medical necessity for separate billing.`
        );
      }
    }
  }
}

/** Cross-date staged PCI documentation — PCI on same patient different dates */
function checkStagedPCIDocumentation(
  patientCharges: StoredCharge[],
  results: Map<string, ValidationResult>
): void {
  // Find all PCI charges across different dates
  const pciChargesByDate = new Map<string, StoredCharge[]>();

  for (const charge of patientCharges) {
    const parts = charge.cptCode.split(' + ').map(p => stripModifier(p.replace(/-[A-Z]+$/, '').trim()));
    const hasPCI = parts.some(p => basePCICodes.has(p));
    if (!hasPCI) continue;

    const existing = pciChargesByDate.get(charge.chargeDate) || [];
    existing.push(charge);
    pciChargesByDate.set(charge.chargeDate, existing);
  }

  // If PCI on 2+ different dates, flag for staged procedure documentation
  const pciDates = [...pciChargesByDate.keys()].sort();
  if (pciDates.length < 2) return;

  for (let i = 1; i < pciDates.length; i++) {
    const prevDate = pciDates[i - 1];
    const currDate = pciDates[i];
    const daysBetween = Math.floor(
      (new Date(currDate + 'T00:00:00').getTime() - new Date(prevDate + 'T00:00:00').getTime()) / 86400000
    );

    // Only flag if within 30 days (typical staged PCI window)
    if (daysBetween > 30) continue;

    const charges = pciChargesByDate.get(currDate) || [];
    for (const charge of charges) {
      const existing = results.get(charge.id);
      if (existing) {
        existing.warnings.push(
          `Staged PCI: This PCI (${currDate}) is ${daysBetween} day${daysBetween !== 1 ? 's' : ''} after a prior PCI (${prevDate}) for this patient. Staged multi-vessel PCI requires documentation stating the procedure was intentionally planned as staged. Include: clinical rationale for staging (contrast limits, patient stability), which vessels were treated at each session, and that multi-vessel CAD was identified at the index procedure.`
        );
      }
    }
  }
}

// ==================== Utility ====================

/** Strip modifier suffix from a CPT code (e.g., "99232-25" → "99232") */
export function stripModifier(code: string): string {
  // Handle codes like "99232-25", "93306-26", "93458-59"
  const dashIdx = code.indexOf('-');
  if (dashIdx > 0) {
    const base = code.substring(0, dashIdx);
    // Only strip if what follows looks like a modifier (1-2 chars or known codes)
    const suffix = code.substring(dashIdx);
    if (modifierDefinitions[suffix]) {
      return base;
    }
  }
  return code;
}

/** Apply a modifier to a CPT code */
export function applyModifier(code: string, modifier: string): string {
  const base = stripModifier(code);
  const mod = modifier.startsWith('-') ? modifier : `-${modifier}`;
  return `${base}${mod}`;
}

/** Get validation status summary for display */
export function getValidationStatus(result: ValidationResult): 'clean' | 'warnings' | 'errors' {
  if (result.errors.length > 0) return 'errors';
  if (result.warnings.length > 0 || result.suggestions.some(s => s.confidence === 'required' && !s.autoApplied)) return 'warnings';
  return 'clean';
}

/** Filter suggestions to only required/recommended (skip optional) */
export function getActionableSuggestions(result: ValidationResult): ModifierSuggestion[] {
  return result.suggestions.filter(s => s.confidence !== 'optional');
}
