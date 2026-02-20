// Concurrent Visit Detection Service
// Checks if another physician already has a charge for the same patient on the same date

import { getStoredCharges, StoredCharge } from './chargesService';

export interface ConcurrentVisitWarning {
  existingCharge: StoredCharge;
  physicianName: string;
}

/**
 * Check if another physician already has a charge for this patient on this date.
 * Returns null if no concurrent visit found.
 */
export async function checkConcurrentVisit(
  patientId: string,
  chargeDate: string,
  currentUserId: string
): Promise<ConcurrentVisitWarning | null> {
  const charges = await getStoredCharges();

  const match = charges.find(
    c =>
      c.inpatientId === patientId &&
      c.chargeDate === chargeDate &&
      c.submittedByUserId &&
      c.submittedByUserId !== currentUserId
  );

  if (match) {
    return {
      existingCharge: match,
      physicianName: match.submittedByUserName || 'Another physician'
    };
  }

  return null;
}
