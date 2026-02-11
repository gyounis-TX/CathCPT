import { BillingRule, BillingContext, RuleViolation } from '../types';

/**
 * Comprehensive billing rules engine based on Medicare NCCI edits and SCAI guidelines
 */
export const billingRules: BillingRule[] = [
  // Error-level rules (must fix before submitting)
  {
    id: 'ptca-stent-same-vessel',
    name: 'PTCA + Stent Same Vessel',
    description: 'Cannot bill PTCA (92920) and stent placement (92928) on the same vessel',
    severity: 'error',
    learnMoreContent: 'When a stent is placed, the angioplasty is bundled into the stent code. Report only 92928 for the vessel where a stent was deployed.',
    check: (context: BillingContext): RuleViolation | null => {
      const ptcaCode = context.allCodes.find(c => c.code === '92920');
      const stentCode = context.allCodes.find(c => c.code === '92928');

      if (ptcaCode && stentCode && ptcaCode.vessel && stentCode.vessel && ptcaCode.vessel === stentCode.vessel) {
        return {
          ruleId: 'ptca-stent-same-vessel',
          severity: 'error',
          message: `Cannot bill 92920 (PTCA) and 92928 (Stent) on same vessel (${ptcaCode.vessel}). Stent code includes angioplasty.`,
          affectedCodes: ['92920', '92928'],
          suggestion: 'Remove 92920 and keep only 92928 for this vessel.',
          canOverride: false,
          fixOptions: [
            { label: 'Keep 92928 (Stent)', codesToRemove: ['92920'] },
            { label: 'Keep 92920 (PTCA)', codesToRemove: ['92928'] }
          ]
        };
      }
      return null;
    }
  },
  {
    id: 'ptca-atherectomy-same-vessel',
    name: 'PTCA + Atherectomy Same Vessel',
    description: 'Cannot bill PTCA (92920) and atherectomy (92924) on the same vessel',
    severity: 'error',
    learnMoreContent: 'When atherectomy is performed, the angioplasty is bundled. Report only 92924 for the vessel where atherectomy was performed.',
    check: (context: BillingContext): RuleViolation | null => {
      const ptcaCode = context.allCodes.find(c => c.code === '92920');
      const atherectomyCode = context.allCodes.find(c => c.code === '92924');

      if (ptcaCode && atherectomyCode && ptcaCode.vessel && atherectomyCode.vessel && ptcaCode.vessel === atherectomyCode.vessel) {
        return {
          ruleId: 'ptca-atherectomy-same-vessel',
          severity: 'error',
          message: `Cannot bill 92920 (PTCA) and 92924 (Atherectomy) on same vessel (${ptcaCode.vessel}). Atherectomy code includes angioplasty.`,
          affectedCodes: ['92920', '92924'],
          suggestion: 'Remove 92920 and keep only 92924 for this vessel.',
          canOverride: false,
          fixOptions: [
            { label: 'Keep 92924 (Atherectomy)', codesToRemove: ['92920'] },
            { label: 'Keep 92920 (PTCA)', codesToRemove: ['92924'] }
          ]
        };
      }
      return null;
    }
  },
  {
    id: 'atherectomy-stent-same-vessel',
    name: 'Atherectomy + Stent Same Vessel',
    description: 'Use 92933 instead of 92924 + 92928 on the same vessel',
    severity: 'error',
    learnMoreContent: 'When both atherectomy and stent are performed on the same vessel, use the combined code 92933 (Atherectomy + Stent).',
    check: (context: BillingContext): RuleViolation | null => {
      const atherectomyCode = context.allCodes.find(c => c.code === '92924');
      const stentCode = context.allCodes.find(c => c.code === '92928');

      if (atherectomyCode && stentCode && atherectomyCode.vessel && stentCode.vessel && atherectomyCode.vessel === stentCode.vessel) {
        return {
          ruleId: 'atherectomy-stent-same-vessel',
          severity: 'error',
          message: `Use 92933 (Atherectomy + Stent) instead of 92924 + 92928 on same vessel (${atherectomyCode.vessel}).`,
          affectedCodes: ['92924', '92928'],
          suggestion: 'Replace 92924 and 92928 with 92933 for this vessel.',
          canOverride: false,
          fixOptions: [
            { label: 'Use 92933 (Combined)', codesToRemove: ['92924', '92928'], codeToAdd: '92933' },
            { label: 'Keep 92928 only', codesToRemove: ['92924'] },
            { label: 'Keep 92924 only', codesToRemove: ['92928'] }
          ]
        };
      }
      return null;
    }
  },
  {
    id: 'cto-codes-exclusive',
    name: 'CTO Codes Mutually Exclusive',
    description: '92943 (CTO antegrade) and 92945 (CTO combined) are mutually exclusive',
    severity: 'error',
    learnMoreContent: 'Only one CTO code can be billed per session. Use 92943 for antegrade-only approach, 92945 for combined antegrade/retrograde.',
    check: (context: BillingContext): RuleViolation | null => {
      if (context.hasCode('92943') && context.hasCode('92945')) {
        return {
          ruleId: 'cto-codes-exclusive',
          severity: 'error',
          message: '92943 (CTO antegrade) and 92945 (CTO combined) cannot be billed together. Choose the code that matches your approach.',
          affectedCodes: ['92943', '92945'],
          suggestion: 'Use 92943 for antegrade only, 92945 for combined antegrade/retrograde approach.',
          canOverride: false,
          fixOptions: [
            { label: 'Keep 92943 (Antegrade only)', codesToRemove: ['92945'] },
            { label: 'Keep 92945 (Combined approach)', codesToRemove: ['92943'] }
          ]
        };
      }
      return null;
    }
  },
  {
    id: 'ivl-requires-pci',
    name: 'IVL Requires Base PCI',
    description: '92972 (Coronary lithotripsy) requires a base PCI code',
    severity: 'error',
    learnMoreContent: '92972 is an add-on code that must be reported with a base PCI procedure code.',
    check: (context: BillingContext): RuleViolation | null => {
      const basePCICodes = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'];
      if (context.hasCode('92972') && !basePCICodes.some(code => context.hasCode(code))) {
        return {
          ruleId: 'ivl-requires-pci',
          severity: 'error',
          message: '92972 (Coronary IVL) is an add-on code requiring a base PCI procedure.',
          affectedCodes: ['92972'],
          suggestion: 'Add a base PCI code (92920, 92924, 92928, etc.) before billing 92972.',
          canOverride: false
        };
      }
      return null;
    }
  },
  {
    id: 'thrombectomy-requires-pci',
    name: 'Thrombectomy Requires Base PCI',
    description: '92973 (Mechanical thrombectomy) requires a base PCI code',
    severity: 'error',
    learnMoreContent: '92973 is an add-on code that must be reported with a base PCI procedure code.',
    check: (context: BillingContext): RuleViolation | null => {
      const basePCICodes = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'];
      if (context.hasCode('92973') && !basePCICodes.some(code => context.hasCode(code))) {
        return {
          ruleId: 'thrombectomy-requires-pci',
          severity: 'error',
          message: '92973 (Mechanical thrombectomy) is an add-on code requiring a base PCI procedure.',
          affectedCodes: ['92973'],
          suggestion: 'Add a base PCI code (92920, 92924, 92928, etc.) before billing 92973.',
          canOverride: false
        };
      }
      return null;
    }
  },
  {
    id: 'ivus-additional-requires-initial',
    name: 'Additional IVUS Requires Initial',
    description: '92979 (IVUS additional) requires 92978 (IVUS initial)',
    severity: 'error',
    learnMoreContent: 'The additional vessel IVUS code (92979) can only be billed when the initial vessel IVUS (92978) is also performed.',
    check: (context: BillingContext): RuleViolation | null => {
      if (context.hasCode('92979') && !context.hasCode('92978')) {
        return {
          ruleId: 'ivus-additional-requires-initial',
          severity: 'error',
          message: '92979 (IVUS additional vessel) requires 92978 (IVUS initial vessel).',
          affectedCodes: ['92979'],
          suggestion: 'Add 92978 (IVUS initial vessel) or change 92979 to 92978 if only one vessel was imaged.',
          canOverride: false
        };
      }
      return null;
    }
  },
  {
    id: 'ffr-additional-requires-initial',
    name: 'Additional FFR Requires Initial',
    description: '93572 (FFR additional) requires 93571 (FFR initial)',
    severity: 'error',
    learnMoreContent: 'The additional vessel FFR code (93572) can only be billed when the initial vessel FFR (93571) is also performed.',
    check: (context: BillingContext): RuleViolation | null => {
      if (context.hasCode('93572') && !context.hasCode('93571')) {
        return {
          ruleId: 'ffr-additional-requires-initial',
          severity: 'error',
          message: '93572 (FFR additional vessel) requires 93571 (FFR initial vessel).',
          affectedCodes: ['93572'],
          suggestion: 'Add 93571 (FFR initial vessel) or change 93572 to 93571 if only one vessel was measured.',
          canOverride: false
        };
      }
      return null;
    }
  },
  {
    id: 'dcb-addon-requires-base',
    name: 'DCB Add-on Requires Base PCI',
    description: '0914T (DCB add-on) requires a base PCI code',
    severity: 'error',
    learnMoreContent: '0914T is an add-on code for drug-coated balloon treatment on a separate target lesion from the primary PCI procedure.',
    check: (context: BillingContext): RuleViolation | null => {
      const basePCICodes = ['92920', '92924', '92928', '92930', '92933'];
      if (context.hasCode('0914T') && !basePCICodes.some(code => context.hasCode(code))) {
        return {
          ruleId: 'dcb-addon-requires-base',
          severity: 'error',
          message: '0914T (DCB add-on) requires a base PCI code (92920, 92924, 92928, 92930, or 92933).',
          affectedCodes: ['0914T'],
          suggestion: 'Add a base PCI code or use 0913T for standalone DCB procedure.',
          canOverride: false
        };
      }
      return null;
    }
  },
  {
    id: 'dcb-ivus-bundled',
    name: 'IVUS Bundled with DCB',
    description: 'IVUS/OCT is bundled in DCB codes and should not be billed separately',
    severity: 'error',
    learnMoreContent: 'Drug-coated balloon codes (0913T, 0914T) include IVUS/OCT imaging. Do not bill imaging codes separately.',
    check: (context: BillingContext): RuleViolation | null => {
      const dcbCodes = ['0913T', '0914T'];
      const imagingCodes = ['92978', '92979', '0523T', '0524T'];
      const hasDCB = dcbCodes.some(code => context.hasCode(code));
      const hasImaging = imagingCodes.filter(code => context.hasCode(code));

      if (hasDCB && hasImaging.length > 0) {
        return {
          ruleId: 'dcb-ivus-bundled',
          severity: 'error',
          message: `IVUS/OCT codes (${hasImaging.join(', ')}) are bundled in DCB codes. Do not bill separately.`,
          affectedCodes: hasImaging,
          suggestion: 'Remove the IVUS/OCT codes as they are included in the DCB procedure.',
          canOverride: false,
          fixOptions: [
            { label: 'Remove imaging codes', codesToRemove: hasImaging }
          ]
        };
      }
      return null;
    }
  },
  {
    id: 'missing-vessel-modifier',
    name: 'Missing Vessel Modifier',
    description: 'PCI codes require vessel/modifier selection for Medicare billing',
    severity: 'error',
    learnMoreContent: 'All PCI base codes require a vessel modifier (LC, LD, RC, LM, RI) to identify which coronary artery was treated.',
    check: (context: BillingContext): RuleViolation | null => {
      const pciCodes = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'];
      const missingVessel = context.allCodes.filter(c => pciCodes.includes(c.code) && !c.vessel);

      if (missingVessel.length > 0) {
        return {
          ruleId: 'missing-vessel-modifier',
          severity: 'error',
          message: `PCI codes missing vessel modifier: ${missingVessel.map(c => c.code).join(', ')}`,
          affectedCodes: missingVessel.map(c => c.code),
          suggestion: 'Select the appropriate vessel (LAD, LCx, RCA, LM, Ramus) for each PCI code.',
          canOverride: false
        };
      }
      return null;
    }
  },

  // Cardiac catheterization overlap rules
  {
    id: 'right-heart-cath-overlap',
    name: 'Right Heart Cath Overlap',
    description: '93451 (R heart cath) cannot be billed with codes that include R heart cath',
    severity: 'error',
    learnMoreContent: '93451 is a standalone right heart catheterization code. It cannot be billed with combined codes that already include right heart catheterization.',
    check: (context: BillingContext): RuleViolation | null => {
      const rightHeartCodes = ['93453', '93456', '93457', '93460', '93461'];
      if (context.hasCode('93451')) {
        const conflicts = rightHeartCodes.filter(code => context.hasCode(code));
        if (conflicts.length > 0) {
          return {
            ruleId: 'right-heart-cath-overlap',
            severity: 'error',
            message: `93451 (R heart cath) cannot be billed with ${conflicts.join(', ')} which already includes R heart cath.`,
            affectedCodes: ['93451', ...conflicts],
            suggestion: 'Remove 93451 - the right heart cath is included in the other code.',
            canOverride: false,
            fixOptions: [
              { label: `Keep ${conflicts[0]} (includes R heart)`, codesToRemove: ['93451'] },
              { label: 'Keep 93451 only', codesToRemove: conflicts }
            ]
          };
        }
      }
      return null;
    }
  },
  {
    id: 'left-heart-cath-overlap',
    name: 'Left Heart Cath Overlap',
    description: '93452 (L heart cath) cannot be billed with codes that include L heart cath',
    severity: 'error',
    learnMoreContent: '93452 is a standalone left heart catheterization code. It cannot be billed with combined codes that already include left heart catheterization.',
    check: (context: BillingContext): RuleViolation | null => {
      const leftHeartCodes = ['93453', '93455', '93457', '93458', '93459', '93460', '93461'];
      if (context.hasCode('93452')) {
        const conflicts = leftHeartCodes.filter(code => context.hasCode(code));
        if (conflicts.length > 0) {
          return {
            ruleId: 'left-heart-cath-overlap',
            severity: 'error',
            message: `93452 (L heart cath) cannot be billed with ${conflicts.join(', ')} which already includes L heart cath.`,
            affectedCodes: ['93452', ...conflicts],
            suggestion: 'Remove 93452 - the left heart cath is included in the other code.',
            canOverride: false,
            fixOptions: [
              { label: `Keep ${conflicts[0]} (includes L heart)`, codesToRemove: ['93452'] },
              { label: 'Keep 93452 only', codesToRemove: conflicts }
            ]
          };
        }
      }
      return null;
    }
  },
  {
    id: 'combined-heart-cath-overlap',
    name: 'Combined Heart Cath Overlap',
    description: '93453 (combined L+R) cannot be billed with standalone L or R heart cath codes',
    severity: 'error',
    learnMoreContent: '93453 includes both left and right heart catheterization. Do not bill standalone codes separately.',
    check: (context: BillingContext): RuleViolation | null => {
      if (context.hasCode('93453')) {
        const conflicts = ['93451', '93452'].filter(code => context.hasCode(code));
        if (conflicts.length > 0) {
          return {
            ruleId: 'combined-heart-cath-overlap',
            severity: 'error',
            message: `93453 (combined L+R heart cath) already includes ${conflicts.join(' and ')}. Cannot bill separately.`,
            affectedCodes: ['93453', ...conflicts],
            suggestion: 'Keep only 93453 which includes both left and right heart catheterization.',
            canOverride: false,
            fixOptions: [
              { label: 'Keep 93453 (combined)', codesToRemove: conflicts }
            ]
          };
        }
      }
      return null;
    }
  },
  {
    id: 'coronary-angio-exclusive',
    name: 'Coronary Angiography Codes Mutually Exclusive',
    description: 'Only one coronary angiography code (93454-93461) can be billed per session',
    severity: 'error',
    learnMoreContent: 'Coronary angiography codes 93454-93461 are mutually exclusive. Select the single code that best represents all components performed.',
    check: (context: BillingContext): RuleViolation | null => {
      const coronaryAngioCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
      const selectedCodes = coronaryAngioCodes.filter(code => context.hasCode(code));

      if (selectedCodes.length > 1) {
        // Find the most comprehensive code (highest number generally = more components)
        const mostComprehensive = selectedCodes.sort().reverse()[0];
        return {
          ruleId: 'coronary-angio-exclusive',
          severity: 'error',
          message: `Multiple coronary angiography codes selected (${selectedCodes.join(', ')}). Only one can be billed.`,
          affectedCodes: selectedCodes,
          suggestion: 'Select the single code that includes all components performed.',
          canOverride: false,
          fixOptions: selectedCodes.map(code => ({
            label: `Keep ${code} only`,
            codesToRemove: selectedCodes.filter(c => c !== code)
          }))
        };
      }
      return null;
    }
  },
  {
    id: 'coronary-angio-with-standalone-cath',
    name: 'Coronary Angio with Standalone Cath',
    description: 'Cannot bill standalone heart cath codes with coronary angio codes that include the same component',
    severity: 'error',
    learnMoreContent: 'Coronary angiography codes 93455-93461 include heart catheterization components. Do not bill standalone cath codes for the same components.',
    check: (context: BillingContext): RuleViolation | null => {
      // Codes that include left heart cath
      const includesLeftHeart = ['93455', '93457', '93458', '93459', '93460', '93461'];
      // Codes that include right heart cath
      const includesRightHeart = ['93456', '93457', '93460', '93461'];

      const violations: string[] = [];
      const affectedCodes: string[] = [];

      if (context.hasCode('93451')) {
        const conflicts = includesRightHeart.filter(code => context.hasCode(code));
        if (conflicts.length > 0) {
          violations.push(`93451 (R heart) conflicts with ${conflicts.join(', ')}`);
          affectedCodes.push('93451', ...conflicts);
        }
      }

      if (context.hasCode('93452')) {
        const conflicts = includesLeftHeart.filter(code => context.hasCode(code));
        if (conflicts.length > 0) {
          violations.push(`93452 (L heart) conflicts with ${conflicts.join(', ')}`);
          affectedCodes.push('93452', ...conflicts);
        }
      }

      if (violations.length > 0) {
        return {
          ruleId: 'coronary-angio-with-standalone-cath',
          severity: 'error',
          message: violations.join('; '),
          affectedCodes: [...new Set(affectedCodes)],
          suggestion: 'Remove standalone cath codes - they are included in the coronary angio code.',
          canOverride: false
        };
      }
      return null;
    }
  },

  // Warning-level rules (can override with documentation)
  {
    id: 'diagnostic-pci-modifier',
    name: 'Diagnostic Cath + PCI Modifier',
    description: 'Diagnostic cath with PCI same day may need modifier -59',
    severity: 'warning',
    learnMoreContent: 'When diagnostic catheterization is performed with PCI on the same day, modifier -59 should be added to the diagnostic cath code if the criteria for separate billing are met.',
    check: (context: BillingContext): RuleViolation | null => {
      const diagnosticCathCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
      const pciCodes = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'];

      const hasDiagnostic = diagnosticCathCodes.some(code => context.hasCode(code));
      const hasPCI = pciCodes.some(code => context.hasCode(code));

      if (hasDiagnostic && hasPCI) {
        return {
          ruleId: 'diagnostic-pci-modifier',
          severity: 'warning',
          message: 'Diagnostic cath + PCI same day: Modifier -59 will be added. Ensure documentation supports separate billing.',
          affectedCodes: diagnosticCathCodes.filter(code => context.hasCode(code)),
          suggestion: 'Verify: (1) No prior cath in 30 days, (2) Diagnostic cath medically necessary, (3) PCI decision made after diagnostic findings.',
          canOverride: true
        };
      }
      return null;
    }
  },
  {
    id: 'duplicate-pci-same-vessel',
    name: 'Duplicate PCI Same Vessel',
    description: 'Multiple PCI codes assigned to the same vessel',
    severity: 'warning',
    learnMoreContent: 'Generally, only one PCI code should be billed per major coronary artery. Multiple codes may be appropriate for separate lesions in different segments.',
    check: (context: BillingContext): RuleViolation | null => {
      const pciCodes = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'];
      const pciWithVessels = context.allCodes.filter(c => pciCodes.includes(c.code) && c.vessel);

      const vesselCounts: Record<string, string[]> = {};
      pciWithVessels.forEach(c => {
        if (c.vessel) {
          if (!vesselCounts[c.vessel]) vesselCounts[c.vessel] = [];
          vesselCounts[c.vessel].push(c.code);
        }
      });

      const duplicates = Object.entries(vesselCounts).filter(([_, codes]) => codes.length > 1);

      if (duplicates.length > 0) {
        const [vessel, codes] = duplicates[0];
        return {
          ruleId: 'duplicate-pci-same-vessel',
          severity: 'warning',
          message: `Multiple PCI codes (${codes.join(', ')}) assigned to same vessel (${vessel}).`,
          affectedCodes: codes,
          suggestion: 'Verify this represents separate lesions. Document medical necessity for multiple procedures on same vessel.',
          canOverride: true
        };
      }
      return null;
    }
  },

];

/**
 * Run all billing rules against the provided context
 * @param context - The billing context with all codes and helper functions
 * @returns Array of rule violations
 */
export function runBillingRules(context: BillingContext): RuleViolation[] {
  return billingRules
    .map(rule => rule.check(context))
    .filter((v): v is RuleViolation => v !== null);
}

/**
 * Create a billing context from the provided code data
 */
export function createBillingContext(
  codes: Array<{ code: string; vessel?: string }>,
  indication?: string
): BillingContext {
  return {
    allCodes: codes,
    hasCode: (code: string) => codes.some(c => c.code === code),
    getCodeVessel: (code: string) => codes.find(c => c.code === code)?.vessel,
    getCodesInVessel: (vessel: string) => codes.filter(c => c.vessel === vessel).map(c => c.code),
    indication
  };
}

/**
 * Get a specific rule by ID
 */
export function getRule(ruleId: string): BillingRule | undefined {
  return billingRules.find(r => r.id === ruleId);
}
