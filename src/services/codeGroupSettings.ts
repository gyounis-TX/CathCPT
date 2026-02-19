// Code Group Settings Service
// Allows users to show/hide CPT code categories based on their specialty

import { logger } from './logger';


const CODE_GROUP_SETTINGS_KEY = 'code_group_visibility';

export interface CodeGroupSettings {
  // Cath Lab Categories
  diagnosticCardiac: boolean;
  pci: boolean;
  pciAddOn: boolean;
  intravascularImaging: boolean;
  structuralHeart: boolean;
  tavr: boolean;
  adjunctive: boolean;
  mcs: boolean;

  // Peripheral Categories
  peripheralAngiography: boolean; // All peripheral angiography categories
  peripheralIntervention: boolean; // All peripheral intervention categories
  venousInterventions: boolean;
  endovascular: boolean; // EVAR, TEVAR

  // Imaging
  echocardiography: boolean;

  // Electrophysiology
  electrophysiology: boolean;

  // Miscellaneous
  miscellaneous: boolean;

  // Other - ALWAYS TRUE, cannot be changed
  other: true;
}

// Default settings - all categories visible
export const defaultCodeGroupSettings: CodeGroupSettings = {
  diagnosticCardiac: true,
  pci: true,
  pciAddOn: true,
  intravascularImaging: true,
  structuralHeart: true,
  tavr: true,
  adjunctive: true,
  mcs: true,
  peripheralAngiography: true,
  peripheralIntervention: true,
  venousInterventions: true,
  endovascular: true,
  echocardiography: true,
  electrophysiology: true,
  miscellaneous: true,
  other: true
};

// Preset configurations for common specialties
export type SpecialtyPreset = 'all' | 'interventional' | 'electrophysiology' | 'general' | 'custom';

export const specialtyPresets: Record<SpecialtyPreset, Partial<CodeGroupSettings>> = {
  all: defaultCodeGroupSettings,

  interventional: {
    diagnosticCardiac: true,
    pci: true,
    pciAddOn: true,
    intravascularImaging: true,
    structuralHeart: true,
    tavr: true,
    adjunctive: true,
    mcs: true,
    peripheralAngiography: true,
    peripheralIntervention: true,
    venousInterventions: true,
    endovascular: true,
    echocardiography: false, // Usually not read by interventionalists
    electrophysiology: false, // Not done by interventionalists
    miscellaneous: true,
    other: true
  },

  electrophysiology: {
    diagnosticCardiac: true, // May do diagnostic caths
    pci: false,
    pciAddOn: false,
    intravascularImaging: false,
    structuralHeart: true, // LAA closure, etc.
    tavr: false,
    adjunctive: true,
    mcs: false,
    peripheralAngiography: false,
    peripheralIntervention: false,
    venousInterventions: false,
    endovascular: false,
    echocardiography: true, // ICE guidance
    electrophysiology: true, // Main focus
    miscellaneous: true,
    other: true
  },

  general: {
    diagnosticCardiac: true,
    pci: false,
    pciAddOn: false,
    intravascularImaging: false,
    structuralHeart: false,
    tavr: false,
    adjunctive: true,
    mcs: false,
    peripheralAngiography: false,
    peripheralIntervention: false,
    venousInterventions: false,
    endovascular: false,
    echocardiography: true, // Main diagnostic tool
    electrophysiology: false,
    miscellaneous: true,
    other: true
  },

  custom: {} // User-defined
};

// Mapping of settings keys to category names in cptCategories.ts
export const settingToCategoriesMap: Record<keyof Omit<CodeGroupSettings, 'other'>, string[]> = {
  diagnosticCardiac: ['Diagnostic Cardiac'],
  pci: ['PCI'],
  pciAddOn: ['PCI Add-on Procedures'],
  intravascularImaging: ['Intravascular Imaging & Physiology'],
  structuralHeart: ['Structural Heart Interventions'],
  tavr: ['TAVR'],
  adjunctive: ['Adjunctive Procedures'],
  mcs: ['MCS'],
  peripheralAngiography: [
    'Aortoiliac/Abdominal',
    'Lower Extremity',
    'Upper Extremity',
    'Renal Angiography',
    'Mesenteric Angiography',
    'Pelvic',
    'Carotid/Cerebrovascular',
    'Thoracic Aortography'
  ],
  peripheralIntervention: [
    'Iliac',
    'Femoral/Popliteal',
    'Tibial/Peroneal',
    'Inframalleolar',
    'Renal Intervention',
    'Mesenteric Intervention',
    'Carotid Stenting',
    'Subclavian/Innominate',
    'Arterial Thrombectomy',
    'Thrombolysis'
  ],
  venousInterventions: [
    'Venography',
    'IVC Filter',
    'Venous Stenting',
    'Venous Thrombectomy'
  ],
  endovascular: ['EVAR', 'TEVAR'],
  echocardiography: [], // Handled by echoCodes.ts
  electrophysiology: [], // Handled by epCodes.ts
  miscellaneous: ['Retrieval']
};

// Get current settings
export async function getCodeGroupSettings(): Promise<CodeGroupSettings> {
  try {
    const { value } = await window.storage.get(CODE_GROUP_SETTINGS_KEY);
    if (value) {
      const saved = JSON.parse(value) as Partial<CodeGroupSettings>;
      // Merge with defaults to ensure all keys exist and 'other' is always true
      return { ...defaultCodeGroupSettings, ...saved, other: true };
    }
    return defaultCodeGroupSettings;
  } catch (error) {
    logger.error('Error loading code group settings', error);
    return defaultCodeGroupSettings;
  }
}

// Save settings
export async function saveCodeGroupSettings(settings: CodeGroupSettings): Promise<void> {
  try {
    // Ensure 'other' is always true
    const settingsToSave = { ...settings, other: true as const };
    await window.storage.set(CODE_GROUP_SETTINGS_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    logger.error('Error saving code group settings', error);
    throw error;
  }
}

// Apply a preset
export async function applyPreset(preset: SpecialtyPreset): Promise<CodeGroupSettings> {
  const presetSettings = specialtyPresets[preset];
  const newSettings: CodeGroupSettings = {
    ...defaultCodeGroupSettings,
    ...presetSettings,
    other: true
  };
  await saveCodeGroupSettings(newSettings);
  return newSettings;
}

// Toggle a single setting
export async function toggleSetting(
  key: keyof Omit<CodeGroupSettings, 'other'>,
  value: boolean
): Promise<CodeGroupSettings> {
  const current = await getCodeGroupSettings();
  const updated = { ...current, [key]: value };
  await saveCodeGroupSettings(updated);
  return updated;
}

// Check if a category should be visible
export function isCategoryVisible(
  categoryName: string,
  settings: CodeGroupSettings
): boolean {
  // "Other" category is always visible
  if (categoryName.toLowerCase() === 'other') {
    return true;
  }

  // Check each setting to see if the category belongs to it
  for (const [settingKey, categories] of Object.entries(settingToCategoriesMap)) {
    if (categories.includes(categoryName)) {
      return settings[settingKey as keyof CodeGroupSettings] ?? true;
    }
  }

  // Default to visible if not found in any mapping
  return true;
}

// Filter categories based on settings
export function filterVisibleCategories(
  categoryNames: string[],
  settings: CodeGroupSettings
): string[] {
  return categoryNames.filter(name => isCategoryVisible(name, settings));
}

// Get description for each setting (for UI display)
export const settingDescriptions: Record<keyof Omit<CodeGroupSettings, 'other'>, string> = {
  diagnosticCardiac: 'Diagnostic Cardiac Catheterization',
  pci: 'Percutaneous Coronary Intervention (PCI)',
  pciAddOn: 'PCI Add-on Procedures (IVL, Thrombectomy)',
  intravascularImaging: 'IVUS, OCT, FFR',
  structuralHeart: 'ASD/VSD Closure, LAA, TMVR, TTVR',
  tavr: 'Transcatheter Aortic Valve Replacement',
  adjunctive: 'Biopsy, Transseptal, Pericardiocentesis',
  mcs: 'Impella, ECMO, IABP',
  peripheralAngiography: 'Peripheral Vascular Angiography',
  peripheralIntervention: 'Peripheral Vascular Intervention',
  venousInterventions: 'IVC Filters, Venous Stenting, Thrombectomy',
  endovascular: 'EVAR, TEVAR',
  echocardiography: 'TTE, TEE, Stress Echo, ICE',
  electrophysiology: 'EP Studies, Ablation, Device Implants',
  miscellaneous: 'Foreign Body Retrieval, Other'
};

// Reset to defaults
export async function resetToDefaults(): Promise<CodeGroupSettings> {
  await saveCodeGroupSettings(defaultCodeGroupSettings);
  return defaultCodeGroupSettings;
}
