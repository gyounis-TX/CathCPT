// Custom CPT Code Service for the "Other" section
// Allows users to add custom CPT codes not in the standard library

import { logger } from './logger';

const CUSTOM_CODES_KEY = 'custom_cpt_codes';

export interface CustomCPTCode {
  id: string;
  code: string;
  description: string;
  rvu?: number;
  createdAt: string;
  updatedAt?: string;
  userId?: string; // For Pro mode sync
}

// Generate unique ID
function generateId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Validate CPT code format (5 digits or 4 digits + letter)
export function isValidCPTCode(code: string): boolean {
  // Standard CPT: 5 digits (00100-99499)
  // Category II: 4 digits + F (0001F-0015F)
  // Category III: 4 digits + T (0001T-0999T)
  const standardPattern = /^\d{5}$/;
  const categoryIIPattern = /^\d{4}F$/;
  const categoryIIIPattern = /^\d{4}T$/;

  return standardPattern.test(code) || categoryIIPattern.test(code) || categoryIIIPattern.test(code);
}

// Get all custom codes
export async function getCustomCodes(): Promise<CustomCPTCode[]> {
  try {
    const { value } = await window.storage.get(CUSTOM_CODES_KEY);
    if (value) {
      return JSON.parse(value) as CustomCPTCode[];
    }
    return [];
  } catch (error) {
    logger.error('Error loading custom codes', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// Save all custom codes
async function saveCustomCodes(codes: CustomCPTCode[]): Promise<void> {
  try {
    await window.storage.set(CUSTOM_CODES_KEY, JSON.stringify(codes));
  } catch (error) {
    logger.error('Error saving custom codes', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Add a new custom code
export async function addCustomCode(
  code: string,
  description: string,
  rvu?: number
): Promise<CustomCPTCode> {
  if (!isValidCPTCode(code)) {
    throw new Error('Invalid CPT code format. Must be 5 digits, or 4 digits followed by F or T.');
  }

  if (!description.trim()) {
    throw new Error('Description is required.');
  }

  const codes = await getCustomCodes();

  // Check for duplicate code
  if (codes.some(c => c.code === code)) {
    throw new Error(`Code ${code} already exists in your custom codes.`);
  }

  const newCode: CustomCPTCode = {
    id: generateId(),
    code: code.toUpperCase(),
    description: description.trim(),
    rvu: rvu,
    createdAt: new Date().toISOString()
  };

  codes.push(newCode);
  await saveCustomCodes(codes);

  return newCode;
}

// Update an existing custom code
export async function updateCustomCode(
  id: string,
  updates: Partial<Pick<CustomCPTCode, 'code' | 'description' | 'rvu'>>
): Promise<CustomCPTCode> {
  const codes = await getCustomCodes();
  const index = codes.findIndex(c => c.id === id);

  if (index === -1) {
    throw new Error('Custom code not found.');
  }

  if (updates.code && !isValidCPTCode(updates.code)) {
    throw new Error('Invalid CPT code format.');
  }

  if (updates.code) {
    // Check for duplicate code (excluding current)
    if (codes.some(c => c.code === updates.code && c.id !== id)) {
      throw new Error(`Code ${updates.code} already exists in your custom codes.`);
    }
  }

  codes[index] = {
    ...codes[index],
    ...updates,
    code: updates.code?.toUpperCase() || codes[index].code,
    description: updates.description?.trim() || codes[index].description,
    updatedAt: new Date().toISOString()
  };

  await saveCustomCodes(codes);

  return codes[index];
}

// Delete a custom code
export async function deleteCustomCode(id: string): Promise<void> {
  const codes = await getCustomCodes();
  const filtered = codes.filter(c => c.id !== id);

  if (filtered.length === codes.length) {
    throw new Error('Custom code not found.');
  }

  await saveCustomCodes(filtered);
}

// Search custom codes
export function searchCustomCodes(codes: CustomCPTCode[], query: string): CustomCPTCode[] {
  const lowerQuery = query.toLowerCase();
  return codes.filter(
    c => c.code.toLowerCase().includes(lowerQuery) ||
         c.description.toLowerCase().includes(lowerQuery)
  );
}

// Convert custom code to CPTCode format for display
export function customCodeToCPTCode(customCode: CustomCPTCode): {
  code: string;
  summary: string;
  description: string;
  isCustom: boolean;
} {
  return {
    code: customCode.code,
    summary: customCode.description.length > 50
      ? customCode.description.substring(0, 47) + '...'
      : customCode.description,
    description: customCode.description,
    isCustom: true
  };
}

// Clear all custom codes (for dev/testing)
export async function clearAllCustomCodes(): Promise<void> {
  await window.storage.remove(CUSTOM_CODES_KEY);
}

// Export custom codes as JSON (for backup)
export async function exportCustomCodes(): Promise<string> {
  const codes = await getCustomCodes();
  return JSON.stringify(codes, null, 2);
}

// Import custom codes from JSON (for restore)
export async function importCustomCodes(json: string, merge: boolean = true): Promise<number> {
  try {
    const importedCodes = JSON.parse(json) as CustomCPTCode[];

    if (!Array.isArray(importedCodes)) {
      throw new Error('Invalid format: expected array of codes.');
    }

    // Validate all codes
    for (const code of importedCodes) {
      if (!code.code || !code.description || !isValidCPTCode(code.code)) {
        throw new Error(`Invalid code entry: ${code.code}`);
      }
    }

    if (merge) {
      const existingCodes = await getCustomCodes();
      const existingCodeNumbers = new Set(existingCodes.map(c => c.code));

      // Add only new codes
      const newCodes = importedCodes.filter(c => !existingCodeNumbers.has(c.code));

      // Assign new IDs to imported codes
      const codesWithIds = newCodes.map(c => ({
        ...c,
        id: generateId(),
        createdAt: c.createdAt || new Date().toISOString()
      }));

      await saveCustomCodes([...existingCodes, ...codesWithIds]);
      return codesWithIds.length;
    } else {
      // Replace all
      const codesWithIds = importedCodes.map(c => ({
        ...c,
        id: generateId(),
        createdAt: c.createdAt || new Date().toISOString()
      }));

      await saveCustomCodes(codesWithIds);
      return codesWithIds.length;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format.');
    }
    throw error;
  }
}
