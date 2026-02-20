// CCI (Correct Coding Initiative) Edits for Cardiology CPT Codes
// Detects code pairs that should not typically be billed together
// unless a modifier exception applies

export interface CCIEditPair {
  column1: string; // Comprehensive code (bundling code)
  column2: string; // Component code (bundled code)
  modifierException: boolean; // True if modifier can override
  description: string;
  category: 'cath_pci' | 'echo' | 'ep' | 'em_procedure' | 'peripheral';
}

export interface CCIViolation {
  column1Code: string;
  column2Code: string;
  description: string;
  modifierException: boolean;
  severity: 'warning';
}

// Common CCI pairs for cardiology
const cciPairs: CCIEditPair[] = [
  // === Cath / PCI Bundles ===
  { column1: '93458', column2: '93454', modifierException: false, description: 'Left heart cath bundles coronary angiography supervision', category: 'cath_pci' },
  { column1: '93459', column2: '93454', modifierException: false, description: 'Combined heart cath bundles coronary angiography supervision', category: 'cath_pci' },
  { column1: '93459', column2: '93455', modifierException: false, description: 'Combined heart cath bundles right heart cath imaging', category: 'cath_pci' },
  { column1: '93459', column2: '93456', modifierException: false, description: 'Combined heart cath bundles right heart cath with angiography', category: 'cath_pci' },
  { column1: '93459', column2: '93457', modifierException: false, description: 'Combined heart cath bundles right heart cath', category: 'cath_pci' },
  { column1: '93459', column2: '93458', modifierException: false, description: 'Combined heart cath bundles left heart cath', category: 'cath_pci' },
  { column1: '92928', column2: '92920', modifierException: false, description: 'PCI with stent bundles PTCA', category: 'cath_pci' },
  { column1: '92933', column2: '92920', modifierException: false, description: 'PCI with stent + atherectomy bundles PTCA', category: 'cath_pci' },
  { column1: '92937', column2: '92920', modifierException: false, description: 'PCI with stent in bypass graft bundles PTCA', category: 'cath_pci' },
  { column1: '92928', column2: '92924', modifierException: true, description: 'PCI with stent bundles PTCA with atherectomy (different vessel allowed)', category: 'cath_pci' },
  { column1: '92941', column2: '92920', modifierException: false, description: 'Acute MI PCI bundles PTCA', category: 'cath_pci' },
  { column1: '92941', column2: '92928', modifierException: true, description: 'Acute MI PCI bundles standard PCI with stent (different vessel)', category: 'cath_pci' },
  { column1: '93458', column2: '93452', modifierException: false, description: 'Left heart cath with coronary angiography bundles left heart cath alone', category: 'cath_pci' },
  { column1: '93460', column2: '93452', modifierException: false, description: 'Cath with injection bundles left heart cath', category: 'cath_pci' },
  { column1: '93460', column2: '93453', modifierException: false, description: 'Cath with injection bundles combined heart cath', category: 'cath_pci' },
  { column1: '93461', column2: '93452', modifierException: false, description: 'Cath with injection (R+L) bundles left heart cath', category: 'cath_pci' },
  { column1: '93461', column2: '93453', modifierException: false, description: 'Cath with injection (R+L) bundles combined heart cath', category: 'cath_pci' },

  // === Echo Bundles ===
  { column1: '93306', column2: '93320', modifierException: false, description: 'Complete TTE with Doppler bundles separate Doppler echo', category: 'echo' },
  { column1: '93306', column2: '93321', modifierException: false, description: 'Complete TTE with Doppler bundles Doppler follow-up', category: 'echo' },
  { column1: '93306', column2: '93325', modifierException: false, description: 'Complete TTE with Doppler bundles Doppler color flow', category: 'echo' },
  { column1: '93312', column2: '93320', modifierException: false, description: 'TEE bundles separate Doppler echo', category: 'echo' },
  { column1: '93312', column2: '93325', modifierException: false, description: 'TEE bundles Doppler color flow', category: 'echo' },
  { column1: '93314', column2: '93312', modifierException: false, description: 'TEE with 3D bundles standard TEE', category: 'echo' },
  { column1: '93351', column2: '93350', modifierException: false, description: 'Stress echo with Doppler bundles stress echo without Doppler', category: 'echo' },
  { column1: '93351', column2: '93320', modifierException: false, description: 'Stress echo with Doppler bundles separate Doppler', category: 'echo' },
  { column1: '93351', column2: '93325', modifierException: false, description: 'Stress echo with Doppler bundles Doppler color flow', category: 'echo' },
  { column1: '93303', column2: '93304', modifierException: false, description: 'Initial TTE bundles follow-up TTE', category: 'echo' },
  { column1: '93306', column2: '93304', modifierException: false, description: 'Complete TTE Doppler bundles follow-up TTE', category: 'echo' },

  // === EP Bundles ===
  { column1: '93620', column2: '93600', modifierException: false, description: 'Comprehensive EP study bundles bundle of His recording', category: 'ep' },
  { column1: '93620', column2: '93602', modifierException: false, description: 'Comprehensive EP study bundles intra-atrial recording', category: 'ep' },
  { column1: '93620', column2: '93603', modifierException: false, description: 'Comprehensive EP study bundles right ventricular recording', category: 'ep' },
  { column1: '93620', column2: '93610', modifierException: false, description: 'Comprehensive EP study bundles intra-atrial pacing', category: 'ep' },
  { column1: '93620', column2: '93612', modifierException: false, description: 'Comprehensive EP study bundles intraventricular pacing', category: 'ep' },
  { column1: '93653', column2: '93620', modifierException: false, description: 'SVT ablation bundles comprehensive EP study', category: 'ep' },
  { column1: '93654', column2: '93620', modifierException: false, description: 'VT ablation bundles comprehensive EP study', category: 'ep' },
  { column1: '93656', column2: '93620', modifierException: false, description: 'AFib ablation bundles comprehensive EP study', category: 'ep' },
  { column1: '93656', column2: '93621', modifierException: false, description: 'AFib ablation bundles LA pacing and recording', category: 'ep' },
  { column1: '93656', column2: '93622', modifierException: false, description: 'AFib ablation bundles LV pacing and recording', category: 'ep' },
  { column1: '93653', column2: '93600', modifierException: false, description: 'SVT ablation bundles bundle of His recording', category: 'ep' },
  { column1: '93654', column2: '93600', modifierException: false, description: 'VT ablation bundles bundle of His recording', category: 'ep' },

  // === E/M + Procedure Bundles ===
  { column1: '99291', column2: '99232', modifierException: true, description: 'Critical care bundles subsequent hospital care (separate service with -25)', category: 'em_procedure' },
  { column1: '99291', column2: '99233', modifierException: true, description: 'Critical care bundles subsequent hospital care (separate service with -25)', category: 'em_procedure' },
  { column1: '99291', column2: '99231', modifierException: true, description: 'Critical care bundles subsequent hospital care (separate service with -25)', category: 'em_procedure' },
  { column1: '99291', column2: '93458', modifierException: true, description: 'Critical care bundles left heart cath (separate service)', category: 'em_procedure' },
  { column1: '99291', column2: '93459', modifierException: true, description: 'Critical care bundles combined heart cath (separate service)', category: 'em_procedure' },
  { column1: '99291', column2: '92928', modifierException: true, description: 'Critical care bundles PCI with stent (separate service)', category: 'em_procedure' },
  { column1: '99291', column2: '33967', modifierException: true, description: 'Critical care bundles IABP insertion (separate service)', category: 'em_procedure' },
  { column1: '99291', column2: '33990', modifierException: true, description: 'Critical care bundles Impella insertion (separate service)', category: 'em_procedure' },

  // === Peripheral Bundles ===
  { column1: '37228', column2: '37226', modifierException: true, description: 'Fem/pop stent + atherectomy bundles iliac stent (different territory)', category: 'peripheral' },
  { column1: '37229', column2: '37226', modifierException: true, description: 'Fem/pop stent + atherectomy bundles iliac stent', category: 'peripheral' },
  { column1: '37230', column2: '37228', modifierException: true, description: 'Tibial stent bundles fem/pop stent (different territory)', category: 'peripheral' },
  { column1: '36247', column2: '36245', modifierException: true, description: 'Third order selective catheterization bundles first order (same vessel)', category: 'peripheral' },
  { column1: '36247', column2: '36246', modifierException: true, description: 'Third order selective catheterization bundles second order (same vessel)', category: 'peripheral' },
  { column1: '36248', column2: '36246', modifierException: true, description: 'Additional second+ order catheterization bundles second order (same vessel)', category: 'peripheral' },
];

/**
 * Validate selected CPT codes against CCI edit pairs.
 * Returns array of violations (warnings only — never blocks submission).
 */
export function validateCCIEdits(selectedCodes: string[]): CCIViolation[] {
  const violations: CCIViolation[] = [];
  const codeSet = new Set(selectedCodes);

  for (const pair of cciPairs) {
    if (codeSet.has(pair.column1) && codeSet.has(pair.column2)) {
      // If modifier exception exists, it's still a warning but less critical
      violations.push({
        column1Code: pair.column1,
        column2Code: pair.column2,
        description: pair.description,
        modifierException: pair.modifierException,
        severity: 'warning'
      });
    }
  }

  return violations;
}

// Export pairs for testing
export { cciPairs };
