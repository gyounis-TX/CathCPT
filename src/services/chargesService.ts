// Charges Service - Manages inpatient charges with local persistence
// Works with Capacitor Preferences for iOS/Android builds

import { InpatientCharge, InpatientChargeCode, PatientDiagnoses } from '../types';
import { logger } from './logger';

const CHARGES_KEY = 'inpatient_charges';
const CHARGE_CODES_KEY = 'inpatient_charge_codes';
const PATIENT_DIAGNOSES_KEY = 'patient_diagnoses';

// Charge status types
export type ChargeStatus = 'pending' | 'entered' | 'billed';

// Case snapshot — captures full form state for re-editing cath lab cases
export interface CaseSnapshot {
  codes: { primary: { code: string; description: string }[]; vessel2: { code: string; description: string }[]; vessel3: { code: string; description: string }[] };
  vessels: { v1: Record<string, string>; v2: Record<string, string>; v3: Record<string, string> };
  indicationCategory: string;
  indication: string;
  sedation: { included: boolean; units: number };
}

// Stored charge with codes included
export interface StoredCharge {
  id: string;
  inpatientId: string;
  chargeDate: string; // ISO date string YYYY-MM-DD
  cptCode: string;
  cptDescription?: string;
  timeMinutes?: number;
  rvu?: number;
  diagnoses: string[];
  createdAt: string;
  updatedAt?: string;
  status: ChargeStatus;
  // Submitter tracking
  submittedByUserId?: string;
  submittedByUserName?: string;
  // Admin tracking
  enteredAt?: string;
  enteredBy?: string;
  billedAt?: string;
  billedBy?: string;
  // Full case snapshot for re-editing cath lab cases
  caseSnapshot?: CaseSnapshot;
}

// Get all stored charges
export const getStoredCharges = async (): Promise<StoredCharge[]> => {
  try {
    const result = await window.storage.get(CHARGES_KEY);
    if (result?.value) {
      return JSON.parse(result.value);
    }
    return [];
  } catch (error) {
    logger.error('Error loading charges', error);
    return [];
  }
};

// Save a new charge
export const saveCharge = async (charge: Omit<StoredCharge, 'id' | 'createdAt' | 'status'>): Promise<StoredCharge> => {
  const charges = await getStoredCharges();

  const newCharge: StoredCharge = {
    ...charge,
    id: `charge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  charges.push(newCharge);

  try {
    await window.storage.set(CHARGES_KEY, JSON.stringify(charges));
  } catch (error) {
    logger.error('Error saving charge', error);
  }

  return newCharge;
};

// Get charges for a specific patient
export const getChargesForPatient = async (inpatientId: string): Promise<StoredCharge[]> => {
  const charges = await getStoredCharges();
  return charges.filter(c => c.inpatientId === inpatientId);
};

// Get charges for a specific date (format: YYYY-MM-DD)
export const getChargesForDate = async (dateStr: string): Promise<StoredCharge[]> => {
  const charges = await getStoredCharges();
  return charges.filter(c => c.chargeDate === dateStr);
};

// Get today's charges grouped by patient ID
export const getTodayChargesByPatient = async (): Promise<Record<string, StoredCharge>> => {
  const today = formatDateForStorage(new Date());
  const charges = await getChargesForDate(today);

  const byPatient: Record<string, StoredCharge> = {};
  charges.forEach(charge => {
    // Keep the most recent charge for each patient
    if (!byPatient[charge.inpatientId] ||
        new Date(charge.createdAt) > new Date(byPatient[charge.inpatientId].createdAt)) {
      byPatient[charge.inpatientId] = charge;
    }
  });

  return byPatient;
};

// Get charges for multiple dates grouped by patient ID
// Returns charges for each patient on each date
export const getChargesByPatientAndDate = async (): Promise<Record<string, Record<string, StoredCharge>>> => {
  const charges = await getStoredCharges();

  // Structure: { patientId: { dateStr: charge } }
  const byPatientAndDate: Record<string, Record<string, StoredCharge>> = {};

  charges.forEach(charge => {
    if (!byPatientAndDate[charge.inpatientId]) {
      byPatientAndDate[charge.inpatientId] = {};
    }
    // Keep the most recent charge for each patient/date combination
    const existing = byPatientAndDate[charge.inpatientId][charge.chargeDate];
    if (!existing || new Date(charge.createdAt) > new Date(existing.createdAt)) {
      byPatientAndDate[charge.inpatientId][charge.chargeDate] = charge;
    }
  });

  return byPatientAndDate;
};

// Update charge status
export const updateChargeStatus = async (chargeId: string, status: ChargeStatus): Promise<void> => {
  const charges = await getStoredCharges();
  const index = charges.findIndex(c => c.id === chargeId);

  if (index !== -1) {
    charges[index].status = status;
    charges[index].updatedAt = new Date().toISOString();

    // Track admin actions
    if (status === 'entered') {
      charges[index].enteredAt = new Date().toISOString();
    } else if (status === 'billed') {
      charges[index].billedAt = new Date().toISOString();
    }

    await window.storage.set(CHARGES_KEY, JSON.stringify(charges));
  }
};

// Check if a charge can be edited (not billed)
export const canEditCharge = (charge: StoredCharge): boolean => {
  return charge.status !== 'billed';
};

// Update an existing charge (only if not billed)
export const updateCharge = async (
  chargeId: string,
  updates: {
    cptCode?: string;
    cptDescription?: string;
    timeMinutes?: number;
    rvu?: number;
    diagnoses?: string[];
    caseSnapshot?: CaseSnapshot;
  }
): Promise<StoredCharge | null> => {
  const charges = await getStoredCharges();
  const index = charges.findIndex(c => c.id === chargeId);

  if (index === -1) {
    throw new Error('Charge not found');
  }

  const charge = charges[index];

  // Check if charge is billed
  if (charge.status === 'billed') {
    throw new Error('Cannot edit a billed charge. Please contact your billing administrator.');
  }

  // Apply updates
  if (updates.cptCode !== undefined) {
    charges[index].cptCode = updates.cptCode;
  }
  if (updates.cptDescription !== undefined) {
    charges[index].cptDescription = updates.cptDescription;
  }
  if (updates.timeMinutes !== undefined) {
    charges[index].timeMinutes = updates.timeMinutes;
  }
  if (updates.rvu !== undefined) {
    charges[index].rvu = updates.rvu;
  }
  if (updates.diagnoses !== undefined) {
    charges[index].diagnoses = updates.diagnoses;
  }
  if (updates.caseSnapshot !== undefined) {
    charges[index].caseSnapshot = updates.caseSnapshot;
  }

  charges[index].updatedAt = new Date().toISOString();

  // If charge was previously entered, reset to pending since it was modified
  if (charges[index].status === 'entered') {
    charges[index].status = 'pending';
  }

  await window.storage.set(CHARGES_KEY, JSON.stringify(charges));

  return charges[index];
};

// Get a single charge by ID
export const getChargeById = async (chargeId: string): Promise<StoredCharge | null> => {
  const charges = await getStoredCharges();
  return charges.find(c => c.id === chargeId) || null;
};

// Mark charge as entered by admin
// If charge not in storage (e.g. mock data), pass fullCharge to persist it first
export const markChargeEntered = async (chargeId: string, adminName?: string, fullCharge?: StoredCharge): Promise<void> => {
  const charges = await getStoredCharges();
  let index = charges.findIndex(c => c.id === chargeId);

  // If not found in storage but we have the full charge object, add it
  if (index === -1 && fullCharge) {
    charges.push({ ...fullCharge });
    index = charges.length - 1;
  }

  if (index !== -1) {
    charges[index].status = 'entered';
    charges[index].enteredAt = new Date().toISOString();
    charges[index].enteredBy = adminName;
    charges[index].updatedAt = new Date().toISOString();
    await window.storage.set(CHARGES_KEY, JSON.stringify(charges));
  }
};

// Mark charge as billed by admin (locks the charge)
// If charge not in storage (e.g. mock data), pass fullCharge to persist it first
export const markChargeBilled = async (chargeId: string, adminName?: string, fullCharge?: StoredCharge): Promise<void> => {
  const charges = await getStoredCharges();
  let index = charges.findIndex(c => c.id === chargeId);

  // If not found in storage but we have the full charge object, add it
  if (index === -1 && fullCharge) {
    charges.push({ ...fullCharge });
    index = charges.length - 1;
  }

  if (index !== -1) {
    charges[index].status = 'billed';
    charges[index].billedAt = new Date().toISOString();
    charges[index].billedBy = adminName;
    charges[index].updatedAt = new Date().toISOString();
    await window.storage.set(CHARGES_KEY, JSON.stringify(charges));
  }
};

// Delete a charge
export const deleteCharge = async (chargeId: string): Promise<void> => {
  const charges = await getStoredCharges();
  const filtered = charges.filter(c => c.id !== chargeId);
  await window.storage.set(CHARGES_KEY, JSON.stringify(filtered));
};

// ==================== Patient Diagnoses ====================

// Get stored diagnoses for all patients
export const getStoredDiagnoses = async (): Promise<Record<string, string[]>> => {
  try {
    const result = await window.storage.get(PATIENT_DIAGNOSES_KEY);
    if (result?.value) {
      return JSON.parse(result.value);
    }
    return {};
  } catch (error) {
    logger.error('Error loading diagnoses', error);
    return {};
  }
};

// Save diagnoses for a patient
export const saveDiagnoses = async (inpatientId: string, diagnoses: string[]): Promise<void> => {
  const allDiagnoses = await getStoredDiagnoses();
  allDiagnoses[inpatientId] = diagnoses;

  try {
    await window.storage.set(PATIENT_DIAGNOSES_KEY, JSON.stringify(allDiagnoses));
  } catch (error) {
    logger.error('Error saving diagnoses', error);
  }
};

// Get diagnoses for a specific patient
export const getDiagnosesForPatient = async (inpatientId: string): Promise<string[]> => {
  const allDiagnoses = await getStoredDiagnoses();
  return allDiagnoses[inpatientId] || [];
};

// Helper to format date for storage (uses local date, not UTC)
export const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get charges filtered by status
export const getChargesByStatus = async (status: ChargeStatus): Promise<StoredCharge[]> => {
  const charges = await getStoredCharges();
  return charges.filter(c => c.status === status);
};

// Get all org charges (all statuses)
export const getOrgCharges = async (): Promise<StoredCharge[]> => {
  return getStoredCharges();
};

// Helper to check if patient has charge for specific date
export const hasChargeForDate = (
  charges: Record<string, Record<string, StoredCharge>>,
  patientId: string,
  dateStr: string
): boolean => {
  return !!charges[patientId]?.[dateStr];
};

// Get the most recent charge for a patient (any date)
export const getMostRecentCharge = async (inpatientId: string): Promise<StoredCharge | null> => {
  const charges = await getChargesForPatient(inpatientId);
  if (charges.length === 0) return null;

  return charges.reduce((most, current) => {
    return new Date(current.createdAt) > new Date(most.createdAt) ? current : most;
  });
};

// ==================== Reverse Patient Linkage ====================

// Unlinked cath patient — represents a cath-submitted patient not yet on Rounds
export interface UnlinkedCathPatient {
  patientName: string;
  dob: string;
  inpatientKey: string;        // the cath-Name-DOB key
  charges: StoredCharge[];     // all charges under this key
  mostRecentDate: string;      // most recent charge date
}

// Find recent unlinked cath patients (those with inpatientId starting with "cath-")
export const findRecentUnlinkedCathPatients = async (withinDays: number = 7): Promise<UnlinkedCathPatient[]> => {
  const charges = await getStoredCharges();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);
  const cutoffStr = formatDateForStorage(cutoff);

  // Group charges by unlinked cath- keys
  const grouped: Record<string, StoredCharge[]> = {};
  for (const c of charges) {
    if (c.inpatientId.startsWith('cath-') && c.chargeDate >= cutoffStr) {
      if (!grouped[c.inpatientId]) grouped[c.inpatientId] = [];
      grouped[c.inpatientId].push(c);
    }
  }

  return Object.entries(grouped).map(([key, chargeList]) => {
    // Parse name and DOB from key: "cath-Last, First-YYYY-MM-DD"
    const withoutPrefix = key.slice(5); // remove "cath-"
    const dobMatch = withoutPrefix.match(/(\d{4}-\d{2}-\d{2})$/);
    const dob = dobMatch ? dobMatch[1] : '';
    const name = dob ? withoutPrefix.slice(0, -(dob.length + 1)) : withoutPrefix;
    const mostRecent = chargeList.reduce((a, b) => a.chargeDate > b.chargeDate ? a : b);

    return { patientName: name, dob, inpatientKey: key, charges: chargeList, mostRecentDate: mostRecent.chargeDate };
  });
};

// Re-key charges from an old cath- ID to a new rounds patient ID
export const relinkChargesToPatient = async (oldInpatientId: string, newInpatientId: string): Promise<number> => {
  const charges = await getStoredCharges();
  let count = 0;
  for (const c of charges) {
    if (c.inpatientId === oldInpatientId) {
      c.inpatientId = newInpatientId;
      c.updatedAt = new Date().toISOString();
      count++;
    }
  }
  if (count > 0) {
    await window.storage.set(CHARGES_KEY, JSON.stringify(charges));
  }
  return count;
};
