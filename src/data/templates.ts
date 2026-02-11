import { CaseTemplate } from '../types';

/**
 * Built-in case templates for common procedure combinations
 */
export const builtInTemplates: CaseTemplate[] = [
  {
    id: 'stemi-protocol',
    name: 'STEMI Protocol',
    description: 'Standard STEMI intervention with acute MI revascularization and IVUS',
    isBuiltIn: true,
    codes: {
      primary: ['92941', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I21.09'
    },
    includeSedation: true,
    sedationUnits: 1
  },
  {
    id: 'diagnostic-only',
    name: 'Diagnostic Cath Only',
    description: 'Diagnostic coronary angiography with left ventriculography',
    isBuiltIn: true,
    codes: {
      primary: ['93458']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 0
  },
  {
    id: 'elective-pci',
    name: 'Elective PCI (Single Vessel)',
    description: 'Elective single vessel stent placement with IVUS',
    isBuiltIn: true,
    codes: {
      primary: ['92928', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 1
  },
  {
    id: 'multi-vessel-pci',
    name: 'Multi-Vessel PCI',
    description: 'Two-vessel PCI with stenting and IVUS on both vessels',
    isBuiltIn: true,
    codes: {
      primary: ['92928', '92978'],
      vessel2: ['92928', '92979']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 2
  },
  {
    id: 'cto-antegrade',
    name: 'CTO Intervention (Antegrade)',
    description: 'Chronic total occlusion revascularization via antegrade approach with IVUS',
    isBuiltIn: true,
    codes: {
      primary: ['92943', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 3
  },
  {
    id: 'cto-combined',
    name: 'CTO Intervention (Combined Approach)',
    description: 'Complex CTO revascularization with antegrade and retrograde approach',
    isBuiltIn: true,
    codes: {
      primary: ['92945', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 4
  },
  {
    id: 'atherectomy-stent',
    name: 'Atherectomy with Stent',
    description: 'Atherectomy followed by stent placement with IVUS',
    isBuiltIn: true,
    codes: {
      primary: ['92933', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 2
  },
  {
    id: 'pci-ivl',
    name: 'PCI with Lithotripsy (IVL)',
    description: 'Stent placement with coronary intravascular lithotripsy and IVUS',
    isBuiltIn: true,
    codes: {
      primary: ['92928', '92972', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 2
  },
  {
    id: 'diagnostic-pci',
    name: 'Ad Hoc PCI',
    description: 'Diagnostic cath followed by ad hoc PCI on same day',
    isBuiltIn: true,
    codes: {
      primary: ['93458', '92928', '92978']
    },
    indication: {
      category: 'cardiac',
      code: 'I21.4'
    },
    includeSedation: true,
    sedationUnits: 2
  },
  {
    id: 'dcb-standalone',
    name: 'Drug-Coated Balloon (Standalone)',
    description: 'Drug-coated balloon angioplasty as primary treatment',
    isBuiltIn: true,
    codes: {
      primary: ['0913T']
    },
    indication: {
      category: 'cardiac',
      code: 'I25.10'
    },
    includeSedation: true,
    sedationUnits: 1
  },
  {
    id: 'peripheral-iliac',
    name: 'Peripheral Iliac Stent',
    description: 'Iliac artery stent placement for PAD',
    isBuiltIn: true,
    codes: {
      primary: ['37255']
    },
    indication: {
      category: 'peripheral',
      code: 'I70.219'
    },
    includeSedation: true,
    sedationUnits: 1
  },
  {
    id: 'asd-closure',
    name: 'ASD Closure',
    description: 'Percutaneous atrial septal defect closure',
    isBuiltIn: true,
    codes: {
      primary: ['93580']
    },
    indication: {
      category: 'structural',
      code: 'Q21.1'
    },
    includeSedation: true,
    sedationUnits: 2
  },
  {
    id: 'laa-closure',
    name: 'LAA Closure (Watchman)',
    description: 'Left atrial appendage closure for AF stroke prevention',
    isBuiltIn: true,
    codes: {
      primary: ['93592']
    },
    indication: {
      category: 'structural',
      code: 'I48.91'
    },
    includeSedation: true,
    sedationUnits: 2
  },
  {
    id: 'tavr-femoral',
    name: 'TAVR (Percutaneous Femoral)',
    description: 'Transcatheter aortic valve replacement via femoral access',
    isBuiltIn: true,
    codes: {
      primary: ['33361']
    },
    indication: {
      category: 'structural',
      code: 'I35.0'
    },
    includeSedation: false,
    sedationUnits: 0
  }
];

/**
 * Get all built-in templates
 */
export function getBuiltInTemplates(): CaseTemplate[] {
  return builtInTemplates;
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): CaseTemplate | undefined {
  return builtInTemplates.find(t => t.id === id);
}

/**
 * Create a custom template from current case data
 */
export function createCustomTemplate(
  name: string,
  description: string,
  codes: CaseTemplate['codes'],
  indication?: CaseTemplate['indication'],
  includeSedation?: boolean,
  sedationUnits?: number
): CaseTemplate {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    isBuiltIn: false,
    codes,
    indication,
    includeSedation,
    sedationUnits
  };
}

export default {
  builtInTemplates,
  getBuiltInTemplates,
  getTemplateById,
  createCustomTemplate
};
