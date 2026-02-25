// Modifier Definitions — metadata, rules, and compatibility for all CPT modifiers
// Used by the modifier validation engine (modifierEngine.ts)

export interface ModifierDefinition {
  code: string;           // '-25', '-59', etc.
  name: string;
  description: string;
  autoApply: boolean;     // true = engine applies automatically; false = suggestion only
  requiresReview: boolean;
  incompatibleWith: string[];  // e.g., -59 incompatible with -XS/-XE/-XU
}

export const modifierDefinitions: Record<string, ModifierDefinition> = {
  '-25': {
    code: '-25',
    name: 'Significant, Separately Identifiable E/M',
    description: 'E/M service performed on the same day as a procedure or other service, significant and separately identifiable',
    autoApply: true,
    requiresReview: false,
    incompatibleWith: []
  },
  '-26': {
    code: '-26',
    name: 'Professional Component',
    description: 'Professional component only (reading/interpretation) — physician billing for interpretation without technical component',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-TC']
  },
  '-TC': {
    code: '-TC',
    name: 'Technical Component',
    description: 'Technical component only — facility billing for equipment and technician, no professional interpretation',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-26']
  },
  '-59': {
    code: '-59',
    name: 'Distinct Procedural Service',
    description: 'Distinct procedural service performed on the same day — used for NCCI unbundling when procedures are truly separate',
    autoApply: true,
    requiresReview: false,
    incompatibleWith: ['-XS', '-XE', '-XU']
  },
  '-XS': {
    code: '-XS',
    name: 'Separate Structure',
    description: 'Separate structure — services performed on different anatomical structures (e.g., left vs right heart cath)',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-59', '-XE', '-XU']
  },
  '-XE': {
    code: '-XE',
    name: 'Separate Encounter',
    description: 'Separate encounter — services performed during different encounters on the same date (e.g., morning echo + afternoon stress echo)',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-59', '-XS', '-XU']
  },
  '-XU': {
    code: '-XU',
    name: 'Unusual Non-Overlapping Service',
    description: 'Unusual non-overlapping service — services that do not overlap but are not typically reported together',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-59', '-XS', '-XE']
  },
  '-76': {
    code: '-76',
    name: 'Repeat Procedure, Same Physician',
    description: 'Repeat procedure by the same physician on the same day — must document medical necessity for repeat',
    autoApply: true,
    requiresReview: true,
    incompatibleWith: ['-77']
  },
  '-77': {
    code: '-77',
    name: 'Repeat Procedure, Different Physician',
    description: 'Repeat procedure by a different physician on the same day',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-76']
  },
  '-50': {
    code: '-50',
    name: 'Bilateral Procedure',
    description: 'Bilateral procedure — same procedure performed on both sides (e.g., bilateral lower extremity angiography)',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-LT', '-RT']
  },
  '-LT': {
    code: '-LT',
    name: 'Left Side',
    description: 'Procedure performed on the left side',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-50', '-RT']
  },
  '-RT': {
    code: '-RT',
    name: 'Right Side',
    description: 'Procedure performed on the right side',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-50', '-LT']
  },
  '-22': {
    code: '-22',
    name: 'Increased Procedural Service',
    description: 'Increased procedural service — work required substantially exceeded usual. Requires operative report documentation.',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: []
  },
  '-51': {
    code: '-51',
    name: 'Multiple Procedures',
    description: 'Multiple procedures performed during same session — payment reduction applies to secondary/subsequent procedures',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: []
  },
  '-52': {
    code: '-52',
    name: 'Reduced Services',
    description: 'Procedure partially completed or reduced in scope — requires documentation of what was performed and why it was reduced',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-53']
  },
  '-53': {
    code: '-53',
    name: 'Discontinued Procedure',
    description: 'Procedure started but discontinued due to threat to patient wellbeing — requires documentation of reason for discontinuation',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-52']
  },
  '-57': {
    code: '-57',
    name: 'Decision for Surgery',
    description: 'E/M service that resulted in the initial decision to perform a major procedure (90-day global). Use instead of -25 when the E/M led to the surgical decision.',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-25']
  },
  '-24': {
    code: '-24',
    name: 'Unrelated E/M During Postop',
    description: 'E/M service performed during a postoperative global period for a reason unrelated to the original procedure',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: []
  },
  '-78': {
    code: '-78',
    name: 'Unplanned Return to OR/Cath Lab',
    description: 'Unplanned return to the operating room or cath lab during the postoperative period for a procedure related to the original',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-79']
  },
  '-79': {
    code: '-79',
    name: 'Unrelated Procedure During Postop',
    description: 'Procedure performed during the postoperative period that is unrelated to the original procedure',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-78']
  },
  '-62': {
    code: '-62',
    name: 'Two Surgeons',
    description: 'Two surgeons performing distinct parts of the same procedure — each surgeon bills with -62. Requires operative notes from both.',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-80']
  },
  '-80': {
    code: '-80',
    name: 'Assistant Surgeon',
    description: 'Surgical assistant — bills the same procedure code as the primary surgeon with -80. Reimbursed at 16% of full fee.',
    autoApply: false,
    requiresReview: true,
    incompatibleWith: ['-62']
  }
};

/** Get modifier definition by code (with or without leading dash) */
export function getModifierDefinition(code: string): ModifierDefinition | undefined {
  const normalized = code.startsWith('-') ? code : `-${code}`;
  return modifierDefinitions[normalized];
}

/** Check if two modifiers are compatible */
export function areModifiersCompatible(mod1: string, mod2: string): boolean {
  const def1 = getModifierDefinition(mod1);
  const def2 = getModifierDefinition(mod2);
  if (!def1 || !def2) return true;
  const norm1 = def1.code;
  const norm2 = def2.code;
  return !def1.incompatibleWith.includes(norm2) && !def2.incompatibleWith.includes(norm1);
}
