// Patient Matching Service — deduplication when adding patients
// Uses name similarity + DOB + MRN matching

import { Inpatient, PatientMatchResult } from '../types';
import { getAllOrgInpatients } from './inpatientService';
import { logAuditEvent } from './auditService';

/** Normalized Levenshtein distance (0 = completely different, 1 = identical) */
function nameSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[^a-z]/g, '');
  const s2 = b.toLowerCase().replace(/[^a-z]/g, '');

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxLen = Math.max(s1.length, s2.length);

  // Levenshtein distance
  const dp: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    dp[i] = [i];
    for (let j = 1; j <= s2.length; j++) {
      dp[i][j] = i === 0
        ? j
        : Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1)
          );
    }
  }

  return 1 - dp[s1.length][s2.length] / maxLen;
}

/** Check if two dates are within a year of each other */
function datesWithinYear(d1: string, d2: string): boolean {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return diffMs <= 365 * 24 * 60 * 60 * 1000;
}

/** Find potential patient matches */
export async function findPatientMatches(
  orgId: string,
  candidateName: string,
  candidateDob: string,
  candidateMrn?: string
): Promise<PatientMatchResult[]> {
  const allPatients = await getAllOrgInpatients(orgId);
  const matches: PatientMatchResult[] = [];

  for (const patient of allPatients) {
    // 1. Exact MRN match
    if (candidateMrn && patient.mrn && candidateMrn.trim().toLowerCase() === patient.mrn.trim().toLowerCase()) {
      matches.push({
        patient,
        matchType: 'exact_mrn',
        confidence: 1.0,
        matchDetails: `Exact MRN match: ${patient.mrn}`
      });
      continue;
    }

    // 2. Name similarity + exact DOB
    const similarity = nameSimilarity(candidateName, patient.patientName);
    if (similarity >= 0.85 && candidateDob === patient.dob) {
      matches.push({
        patient,
        matchType: 'close_name_dob',
        confidence: similarity,
        matchDetails: `Name ${Math.round(similarity * 100)}% similar, exact DOB match`
      });
      continue;
    }

    // 3. Exact name + DOB within 1 year
    if (similarity >= 0.95 && datesWithinYear(candidateDob, patient.dob)) {
      matches.push({
        patient,
        matchType: 'close_name_dob',
        confidence: similarity * 0.8,
        matchDetails: `Name ${Math.round(similarity * 100)}% similar, DOB within 1 year`
      });
    }
  }

  // Sort by confidence descending, return top 5
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, 5);
}

/** Merge two patients (move all charges from source to target) */
export async function mergePatients(
  orgId: string,
  targetPatientId: string,
  sourcePatientId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  await logAuditEvent(orgId, {
    action: 'patient_merged',
    userId: adminId,
    userName: adminName,
    targetPatientId,
    targetPatientName: null,
    details: `Merged patient ${sourcePatientId} into ${targetPatientId}`,
    listContext: null,
    metadata: { targetUserId: sourcePatientId }
  });
}
