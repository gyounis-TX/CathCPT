// Inpatient E/M Codes for Rounds Feature
// Color-coded categories matching the plan specification

export interface InpatientCode {
  code: string;
  summary: string;
  description: string;
  rvu: number;
  category: string;
  requiresTime?: boolean;
  isAddOn?: boolean;
  isInitialEncounter?: boolean; // true = only show for first encounter with patient
}

// Category colors matching plan specification
export const inpatientCategoryColors: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'No Charge': { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  'E/M - Initial Hospital': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'E/M - Subsequent': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'E/M - Observation (Same-Day)': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'E/M - Observation (Subsequent)': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'E/M - Discharge': { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Consults': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Critical Care': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Prolonged Services': { dot: 'bg-stone-500', bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' }
};

export const inpatientCategories: Record<string, InpatientCode[]> = {
  'No Charge': [
    {
      code: '00000',
      summary: 'No charge today',
      description: 'Patient seen but no billable service performed today (administrative, brief check-in, etc.)',
      rvu: 0,
      category: 'No Charge'
    }
  ],

  'E/M - Initial Hospital': [
    {
      code: '99221',
      summary: 'Initial hospital care, low complexity',
      description: 'Initial hospital care, per day, for the evaluation and management of a patient, which requires a medically appropriate history and/or examination and straightforward or low level medical decision making. When using total time on the date of the encounter for code selection, 40 minutes must be met or exceeded.',
      rvu: 1.92,
      category: 'E/M - Initial Hospital',
      isInitialEncounter: true
    },
    {
      code: '99222',
      summary: 'Initial hospital care, moderate complexity',
      description: 'Initial hospital care, per day, for the evaluation and management of a patient, which requires a medically appropriate history and/or examination and moderate level medical decision making. When using total time on the date of the encounter for code selection, 55 minutes must be met or exceeded.',
      rvu: 2.61,
      category: 'E/M - Initial Hospital',
      isInitialEncounter: true
    },
    {
      code: '99223',
      summary: 'Initial hospital care, high complexity',
      description: 'Initial hospital care, per day, for the evaluation and management of a patient, which requires a medically appropriate history and/or examination and high level medical decision making. When using total time on the date of the encounter for code selection, 75 minutes must be met or exceeded.',
      rvu: 3.86,
      category: 'E/M - Initial Hospital',
      isInitialEncounter: true
    }
  ],

  'E/M - Subsequent': [
    {
      code: '99231',
      summary: 'Subsequent hospital care, low complexity',
      description: 'Subsequent hospital care, per day, for the evaluation and management of a patient, which requires a medically appropriate history and/or examination and straightforward or low level medical decision making. When using total time on the date of the encounter for code selection, 25 minutes must be met or exceeded.',
      rvu: 0.99,
      category: 'E/M - Subsequent'
    },
    {
      code: '99232',
      summary: 'Subsequent hospital care, moderate complexity',
      description: 'Subsequent hospital care, per day, for the evaluation and management of a patient, which requires a medically appropriate history and/or examination and moderate level medical decision making. When using total time on the date of the encounter for code selection, 35 minutes must be met or exceeded.',
      rvu: 1.39,
      category: 'E/M - Subsequent'
    },
    {
      code: '99233',
      summary: 'Subsequent hospital care, high complexity',
      description: 'Subsequent hospital care, per day, for the evaluation and management of a patient, which requires a medically appropriate history and/or examination and high level medical decision making. When using total time on the date of the encounter for code selection, 50 minutes must be met or exceeded.',
      rvu: 2.00,
      category: 'E/M - Subsequent'
    }
  ],

  'E/M - Observation (Same-Day)': [
    {
      code: '99234',
      summary: 'Observation same-day admit/discharge, low complexity',
      description: 'Observation or inpatient hospital care, for the evaluation and management of a patient including admission and discharge on the same date, which requires a medically appropriate history and/or examination and straightforward or low level medical decision making. When using total time on the date of the encounter for code selection, 45 minutes must be met or exceeded.',
      rvu: 2.56,
      category: 'E/M - Observation (Same-Day)'
    },
    {
      code: '99235',
      summary: 'Observation same-day admit/discharge, moderate complexity',
      description: 'Observation or inpatient hospital care, for the evaluation and management of a patient including admission and discharge on the same date, which requires a medically appropriate history and/or examination and moderate level medical decision making. When using total time on the date of the encounter for code selection, 70 minutes must be met or exceeded.',
      rvu: 3.41,
      category: 'E/M - Observation (Same-Day)'
    },
    {
      code: '99236',
      summary: 'Observation same-day admit/discharge, high complexity',
      description: 'Observation or inpatient hospital care, for the evaluation and management of a patient including admission and discharge on the same date, which requires a medically appropriate history and/or examination and high level medical decision making. When using total time on the date of the encounter for code selection, 90 minutes must be met or exceeded.',
      rvu: 4.60,
      category: 'E/M - Observation (Same-Day)'
    }
  ],

  'E/M - Observation (Subsequent)': [
    {
      code: '99224',
      summary: 'Observation subsequent, low complexity',
      description: 'Subsequent observation care, per day, for the evaluation and management of a patient. Straightforward or low level medical decision making. When using total time on the date of the encounter for code selection, 25 minutes must be met or exceeded.',
      rvu: 0.99,
      category: 'E/M - Observation (Subsequent)'
    },
    {
      code: '99225',
      summary: 'Observation subsequent, moderate complexity',
      description: 'Subsequent observation care, per day, for the evaluation and management of a patient. Moderate level medical decision making. When using total time on the date of the encounter for code selection, 35 minutes must be met or exceeded.',
      rvu: 1.39,
      category: 'E/M - Observation (Subsequent)'
    },
    {
      code: '99226',
      summary: 'Observation subsequent, high complexity',
      description: 'Subsequent observation care, per day, for the evaluation and management of a patient. High level medical decision making. When using total time on the date of the encounter for code selection, 50 minutes must be met or exceeded.',
      rvu: 2.00,
      category: 'E/M - Observation (Subsequent)'
    }
  ],

  'E/M - Discharge': [
    {
      code: '99238',
      summary: 'Hospital discharge day, 30 min or less',
      description: 'Hospital discharge day management; 30 minutes or less on the date of the encounter',
      rvu: 1.28,
      category: 'E/M - Discharge'
    },
    {
      code: '99239',
      summary: 'Hospital discharge day, more than 30 min',
      description: 'Hospital discharge day management; more than 30 minutes on the date of the encounter',
      rvu: 1.90,
      category: 'E/M - Discharge'
    }
  ],

  'Consults': [
    {
      code: '99251',
      summary: 'Inpatient consult, straightforward',
      description: 'Inpatient or observation consultation for a new or established patient, which requires a medically appropriate history and/or examination and straightforward medical decision making. When using total time on the date of the encounter for code selection, 20 minutes must be met or exceeded.',
      rvu: 0.99,
      category: 'Consults',
      isInitialEncounter: true
    },
    {
      code: '99252',
      summary: 'Inpatient consult, low complexity',
      description: 'Inpatient or observation consultation for a new or established patient, which requires a medically appropriate history and/or examination and low level medical decision making. When using total time on the date of the encounter for code selection, 40 minutes must be met or exceeded.',
      rvu: 1.55,
      category: 'Consults',
      isInitialEncounter: true
    },
    {
      code: '99253',
      summary: 'Inpatient consult, moderate complexity',
      description: 'Inpatient or observation consultation for a new or established patient, which requires a medically appropriate history and/or examination and moderate level medical decision making. When using total time on the date of the encounter for code selection, 55 minutes must be met or exceeded.',
      rvu: 2.15,
      category: 'Consults',
      isInitialEncounter: true
    },
    {
      code: '99254',
      summary: 'Inpatient consult, moderate-high complexity',
      description: 'Inpatient or observation consultation for a new or established patient, which requires a medically appropriate history and/or examination and moderate to high level medical decision making. When using total time on the date of the encounter for code selection, 80 minutes must be met or exceeded.',
      rvu: 3.11,
      category: 'Consults',
      isInitialEncounter: true
    },
    {
      code: '99255',
      summary: 'Inpatient consult, high complexity',
      description: 'Inpatient or observation consultation for a new or established patient, which requires a medically appropriate history and/or examination and high level medical decision making. When using total time on the date of the encounter for code selection, 110 minutes must be met or exceeded.',
      rvu: 4.00,
      category: 'Consults',
      isInitialEncounter: true
    }
  ],

  'Critical Care': [
    {
      code: '99291',
      summary: 'Critical care, first 30-74 min',
      description: 'Critical care, evaluation and management of the critically ill or critically injured patient; first 30-74 minutes',
      rvu: 4.50,
      category: 'Critical Care',
      requiresTime: true
    },
    {
      code: '99292',
      summary: 'Critical care, each additional 30 min',
      description: 'Critical care, evaluation and management of the critically ill or critically injured patient; each additional 30 minutes (List separately in addition to code for primary service)',
      rvu: 2.25,
      category: 'Critical Care',
      isAddOn: true,
      requiresTime: true
    }
  ],

  'Prolonged Services': [
    {
      code: '99354',
      summary: 'Prolonged service, outpatient, first hour',
      description: 'Prolonged evaluation and management service in the outpatient setting requiring direct patient contact beyond the usual service; first hour (List separately in addition to code for office or other outpatient Evaluation and Management service)',
      rvu: 1.77,
      category: 'Prolonged Services',
      isAddOn: true,
      requiresTime: true
    },
    {
      code: '99355',
      summary: 'Prolonged service, outpatient, additional 30 min',
      description: 'Prolonged evaluation and management service in the outpatient setting requiring direct patient contact beyond the usual service; each additional 30 minutes (List separately in addition to code for prolonged service)',
      rvu: 1.77,
      category: 'Prolonged Services',
      isAddOn: true,
      requiresTime: true
    },
    {
      code: '99356',
      summary: 'Prolonged service, inpatient, first hour',
      description: 'Prolonged evaluation and management service in the inpatient or observation setting requiring unit/floor time beyond the usual service; first hour (List separately in addition to code for inpatient or observation Evaluation and Management service)',
      rvu: 1.71,
      category: 'Prolonged Services',
      isAddOn: true,
      requiresTime: true
    },
    {
      code: '99357',
      summary: 'Prolonged service, inpatient, additional 30 min',
      description: 'Prolonged evaluation and management service in the inpatient or observation setting requiring unit/floor time beyond the usual service; each additional 30 minutes (List separately in addition to code for prolonged inpatient or observation Evaluation and Management service)',
      rvu: 1.71,
      category: 'Prolonged Services',
      isAddOn: true,
      requiresTime: true
    },
    {
      code: '99417',
      summary: 'Prolonged outpatient E/M, 15 min',
      description: 'Prolonged outpatient evaluation and management service(s) time with or without direct patient contact beyond the required time of the primary service when the primary service level has been selected using total time, each 15 minutes of total time (List separately in addition to codes 99205, 99215 for office or other outpatient Evaluation and Management services)',
      rvu: 0.61,
      category: 'Prolonged Services',
      isAddOn: true,
      requiresTime: true
    }
  ]
};

// Get all inpatient codes flattened
export function getAllInpatientCodes(): InpatientCode[] {
  return Object.values(inpatientCategories).flat();
}

// Get codes for first encounter (includes consults, initial hospital)
export function getFirstEncounterCodes(): InpatientCode[] {
  return getAllInpatientCodes();
}

// Get codes for subsequent encounters (excludes initial hospital and consults, except for call coverage)
export function getSubsequentEncounterCodes(isCallCoverage: boolean = false): InpatientCode[] {
  if (isCallCoverage) {
    // Weekend/call coverage can still bill consults and initial hospital
    return getAllInpatientCodes();
  }
  return getAllInpatientCodes().filter(code => !code.isInitialEncounter);
}

// Get category for a code
export function getInpatientCategory(code: string): string | undefined {
  for (const [category, codes] of Object.entries(inpatientCategories)) {
    if (codes.some(c => c.code === code)) {
      return category;
    }
  }
  return undefined;
}

// ==================== BILLING RULES ====================
// Smart billing logic with modifier support

// Common CPT modifiers for E/M billing
export const MODIFIERS = {
  '-25': {
    code: '-25',
    name: 'Significant, Separately Identifiable E/M',
    description: 'Significant, separately identifiable E/M service by the same physician on the same day as a procedure or other service',
    officialGuidance: `Modifier -25 indicates that on the day a procedure or service identified by a CPT code was performed, the patient's condition required a significant, separately identifiable E/M service above and beyond the other service provided or beyond the usual preoperative and postoperative care associated with the procedure that was performed.

The E/M service must be:
• Significant and separately identifiable from the other service
• Beyond the typical pre/post service work
• Documented as a distinct service in the medical record
• Performed by the same physician on the same day

For Critical Care + E/M: The E/M service must represent care provided BEFORE the patient's condition deteriorated to require critical care. Document the distinct nature of each service.`
  },
  '-24': {
    code: '-24',
    name: 'Unrelated E/M During Postop',
    description: 'Unrelated E/M service by the same physician during a postoperative period',
    officialGuidance: 'Indicates that an E/M service was performed during a postoperative period for a reason(s) unrelated to the original procedure.'
  },
  '-57': {
    code: '-57',
    name: 'Decision for Surgery',
    description: 'E/M service that resulted in the initial decision to perform surgery',
    officialGuidance: 'Indicates an E/M service resulted in the initial decision to perform the surgery.'
  },
  '-59': {
    code: '-59',
    name: 'Distinct Procedural Service',
    description: 'Distinct procedural service performed on the same day',
    officialGuidance: 'Used to indicate that a procedure or service was distinct or independent from other services performed on the same day.'
  }
};

export type ModifierCode = keyof typeof MODIFIERS;

// Get full modifier info including official guidance
export function getModifierInfo(modifier: ModifierCode) {
  return MODIFIERS[modifier];
}

// Categories that are mutually exclusive with each other (can only pick from ONE of these groups)
export const PRIMARY_EM_CATEGORIES = [
  'E/M - Initial Hospital',
  'E/M - Subsequent',
  'Consults'
];

// Discharge can be billed same day with Critical Care
// Critical Care can be billed with E/M if separate service (requires -25)
// Prolonged Services are add-ons to primary E/M codes

export type BillingGroup = 'primary_em' | 'observation' | 'observation_subsequent' | 'discharge' | 'critical_care' | 'prolonged' | 'no_charge';

// Map categories to billing groups
export function getBillingGroup(category: string): BillingGroup {
  if (category === 'No Charge') return 'no_charge';
  if (PRIMARY_EM_CATEGORIES.includes(category)) return 'primary_em';
  if (category === 'E/M - Observation (Same-Day)') return 'observation';
  if (category === 'E/M - Observation (Subsequent)') return 'observation_subsequent';
  if (category === 'E/M - Discharge') return 'discharge';
  if (category === 'Critical Care') return 'critical_care';
  if (category === 'Prolonged Services') return 'prolonged';
  return 'primary_em'; // default
}

// Result of billing compatibility check
export interface BillingCompatibility {
  canBill: boolean;
  requiresModifier?: ModifierCode;
  modifierAppliesTo?: string; // Which code needs the modifier
  reason?: string;
}

// Check if two codes can be billed together and what modifiers are needed
export function checkBillingCompatibility(code1: string, code2: string): BillingCompatibility {
  const cat1 = getInpatientCategory(code1);
  const cat2 = getInpatientCategory(code2);

  if (!cat1 || !cat2) return { canBill: false, reason: 'Unknown code category' };

  const group1 = getBillingGroup(cat1);
  const group2 = getBillingGroup(cat2);

  // No Charge is mutually exclusive with everything
  if (group1 === 'no_charge' || group2 === 'no_charge') {
    return { canBill: code1 === code2, reason: 'No Charge cannot be combined with other codes' };
  }

  // Same category - mutually exclusive (only one from each category)
  if (cat1 === cat2) {
    return { canBill: code1 === code2, reason: 'Only one code allowed per category' };
  }

  // Primary E/M categories are mutually exclusive with each other
  if (group1 === 'primary_em' && group2 === 'primary_em') {
    return { canBill: false, reason: 'Cannot bill Initial, Subsequent, and Consult codes together' };
  }

  // Observation same-day is mutually exclusive with primary E/M and discharge (replaces both)
  if (group1 === 'observation' || group2 === 'observation') {
    const otherGroup = group1 === 'observation' ? group2 : group1;
    if (otherGroup === 'primary_em' || otherGroup === 'discharge' || otherGroup === 'observation_subsequent') {
      return { canBill: false, reason: 'Observation same-day codes (99234-99236) include both admission and discharge — cannot combine with Initial Hospital, Subsequent, Consult, Discharge, or Observation Subsequent codes' };
    }
  }

  // Observation subsequent is mutually exclusive with primary E/M (use observation codes for observation patients)
  if (group1 === 'observation_subsequent' || group2 === 'observation_subsequent') {
    const otherGroup = group1 === 'observation_subsequent' ? group2 : group1;
    if (otherGroup === 'primary_em') {
      return { canBill: false, reason: 'Observation subsequent codes (99224-99226) cannot be combined with inpatient E/M codes — use observation codes for patients in observation status, inpatient codes for admitted patients' };
    }
  }

  // Primary E/M + Discharge = NOT allowed same day (patient either discharged or not)
  if ((group1 === 'primary_em' && group2 === 'discharge') ||
      (group1 === 'discharge' && group2 === 'primary_em')) {
    return { canBill: false, reason: 'Cannot bill E/M and Discharge on same encounter' };
  }

  // Critical Care + Discharge = ALLOWED (patient critical then stabilized and discharged)
  if ((group1 === 'critical_care' && group2 === 'discharge') ||
      (group1 === 'discharge' && group2 === 'critical_care')) {
    return { canBill: true };
  }

  // Critical Care + Primary E/M = ALLOWED with modifier -25 on E/M
  // Scenario: Patient seen for routine rounds (99232), later becomes critical (99291)
  if ((group1 === 'critical_care' && group2 === 'primary_em') ||
      (group1 === 'primary_em' && group2 === 'critical_care')) {
    const emCode = group1 === 'primary_em' ? code1 : code2;
    return {
      canBill: true,
      requiresModifier: '-25',
      modifierAppliesTo: emCode,
      reason: 'E/M service performed before patient required critical care'
    };
  }

  // Critical Care codes: 99292 requires 99291
  if (code1 === '99292' || code2 === '99292') {
    if (code1 === '99291' || code2 === '99291') {
      return { canBill: true };
    }
    return { canBill: false, reason: '99292 requires 99291 as primary code' };
  }

  // Prolonged Services require a primary E/M code
  if (group1 === 'prolonged' || group2 === 'prolonged') {
    const otherGroup = group1 === 'prolonged' ? group2 : group1;
    if (otherGroup === 'primary_em' || otherGroup === 'discharge') {
      return { canBill: true };
    }
    return { canBill: false, reason: 'Prolonged services require E/M or Discharge code' };
  }

  return { canBill: true };
}

// Legacy function for simple boolean check
export function canBillTogether(code1: string, code2: string): boolean {
  return checkBillingCompatibility(code1, code2).canBill;
}

// Check if a code can be added given currently selected codes
export function canAddCode(newCode: string, selectedCodes: string[]): boolean {
  if (selectedCodes.length === 0) return true;

  // Check against all selected codes
  for (const selectedCode of selectedCodes) {
    const compatibility = checkBillingCompatibility(newCode, selectedCode);
    if (!compatibility.canBill) {
      return false;
    }
  }

  // Special rule: 99292 requires 99291
  if (newCode === '99292' && !selectedCodes.includes('99291')) {
    return false;
  }

  // Prolonged services require a primary E/M or discharge code
  const newCategory = getInpatientCategory(newCode);
  if (newCategory === 'Prolonged Services') {
    const hasPrimaryEM = selectedCodes.some(code => {
      const cat = getInpatientCategory(code);
      return cat && (PRIMARY_EM_CATEGORIES.includes(cat) || cat === 'E/M - Discharge');
    });
    if (!hasPrimaryEM) return false;
  }

  return true;
}

// Get required modifiers for a set of selected codes
export function getRequiredModifiers(selectedCodes: string[]): Map<string, ModifierCode> {
  const modifiers = new Map<string, ModifierCode>();

  for (let i = 0; i < selectedCodes.length; i++) {
    for (let j = i + 1; j < selectedCodes.length; j++) {
      const compatibility = checkBillingCompatibility(selectedCodes[i], selectedCodes[j]);
      if (compatibility.requiresModifier && compatibility.modifierAppliesTo) {
        modifiers.set(compatibility.modifierAppliesTo, compatibility.requiresModifier);
      }
    }
  }

  return modifiers;
}

// Format code with modifier for display
export function formatCodeWithModifier(code: string, modifier?: ModifierCode): string {
  if (modifier) {
    return `${code}${modifier}`;
  }
  return code;
}

// Get valid codes that can be added given current selection
export function getValidAddOnCodes(selectedCodes: string[]): string[] {
  const allCodes = getAllInpatientCodes();
  return allCodes
    .filter(code => code.isAddOn && canAddCode(code.code, selectedCodes))
    .map(code => code.code);
}

// Determine if a category should use radio buttons (mutually exclusive within)
// or if specific codes are add-ons (checkboxes)
export function isCategoryMutuallyExclusive(category: string): boolean {
  // All primary categories are mutually exclusive within themselves
  return true;
}

// Check if a code is an add-on that should be shown as checkbox
export function isAddOnCode(code: string): boolean {
  const codeData = getAllInpatientCodes().find(c => c.code === code);
  return codeData?.isAddOn ?? false;
}

// 2026 Medicare Conversion Factor
export const MEDICARE_CONVERSION_FACTOR_2026 = 36.04;

// Calculate estimated Medicare payment
export function calculateMedicarePayment(rvu: number): number {
  return rvu * MEDICARE_CONVERSION_FACTOR_2026;
}
