// Patient Deduplication Service
// Detects potential duplicate patients and supports admin merge operations

import { Inpatient, PatientMatchResult, AuditAction } from '../types';
import { getStoredCharges, StoredCharge } from './chargesService';
import { logAuditEvent } from './auditService';
import { logger } from './logger';

/**
 * Normalize a name for comparison:
 * - lowercase
 * - strip common titles/suffixes
 * - handle "Last, First" format
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(dr\.?|mr\.?|mrs\.?|ms\.?|jr\.?|sr\.?|ii|iii|iv)\b/gi, '')
    .replace(/[,.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two names are similar (normalized match)
 */
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (n1 === n2) return true;

  // Check reversed order (First Last vs Last First)
  const parts1 = n1.split(' ').filter(Boolean);
  const parts2 = n2.split(' ').filter(Boolean);

  if (parts1.length >= 2 && parts2.length >= 2) {
    const reversed1 = [...parts1].reverse().join(' ');
    if (reversed1 === n2) return true;
  }

  return false;
}

/**
 * Find duplicate patients based on MRN match or name+DOB similarity
 */
export function findDuplicatePatients(
  newPatient: { patientName: string; dob: string; mrn?: string },
  existingPatients: Inpatient[]
): PatientMatchResult[] {
  const matches: PatientMatchResult[] = [];

  for (const existing of existingPatients) {
    // Exact MRN match (highest confidence)
    if (newPatient.mrn && existing.mrn && newPatient.mrn === existing.mrn) {
      matches.push({
        patient: existing,
        matchType: 'exact_mrn',
        confidence: 1.0,
        matchDetails: `MRN ${existing.mrn} matches exactly`
      });
      continue;
    }

    // Similar name + same DOB
    if (
      newPatient.dob === existing.dob &&
      namesMatch(newPatient.patientName, existing.patientName)
    ) {
      matches.push({
        patient: existing,
        matchType: 'close_name_dob',
        confidence: 0.8,
        matchDetails: `Similar name and same date of birth (${existing.dob})`
      });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

/**
 * Merge two patients: move all charges from duplicate to canonical, deactivate duplicate
 */
export async function mergePatients(
  canonicalId: string,
  duplicateId: string,
  orgId: string,
  adminId: string,
  adminName: string
): Promise<{ chargesMoved: number }> {
  // Get all charges and reassign duplicateId charges to canonicalId
  const charges = await getStoredCharges();
  let chargesMoved = 0;

  const updatedCharges = charges.map(charge => {
    if (charge.inpatientId === duplicateId) {
      chargesMoved++;
      return { ...charge, inpatientId: canonicalId, updatedAt: new Date().toISOString() };
    }
    return charge;
  });

  // Save updated charges
  await window.storage.set('inpatient_charges', JSON.stringify(updatedCharges));

  // Log audit event
  await logAuditEvent(orgId, {
    action: 'patient_merged' as AuditAction,
    userId: adminId,
    userName: adminName,
    targetPatientId: canonicalId,
    targetPatientName: null,
    details: `Merged patient ${duplicateId} into ${canonicalId}, moved ${chargesMoved} charge(s)`,
    listContext: null
  });

  logger.info('Patient merge completed', { canonicalId, duplicateId, chargesMoved });

  return { chargesMoved };
}
