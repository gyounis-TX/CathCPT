// Admin Charge Service — centralized charge queries for admin portal
// Dev mode reads from stored charges + mock data, filters in-memory

import { ChargeQueueFilters, ChargeQueueItem, Inpatient } from '../types';
import {
  StoredCharge,
  getStoredCharges,
  markChargeEntered,
  markChargeBilled
} from './chargesService';
import { getDevModeSettings, mockCharges } from './devMode';
import { getAllOrgInpatients } from './inpatientService';
import { logAuditEvent } from './auditService';
import { calculateMedicarePayment } from '../data/inpatientCodes';

/** Get all charges, merging stored + mock if in dev mode */
async function getAllCharges(): Promise<StoredCharge[]> {
  const stored = await getStoredCharges();
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    // Merge mock charges with stored, avoiding duplicates by ID
    const storedIds = new Set(stored.map(c => c.id));
    const merged = [...stored];
    for (const mc of mockCharges) {
      if (!storedIds.has(mc.id)) {
        merged.push(mc as StoredCharge);
      }
    }
    return merged;
  }
  return stored;
}

/** Get charge queue items for admin, with filters applied */
export async function getChargeQueue(
  orgId: string,
  filters: ChargeQueueFilters,
  knownPatients?: Inpatient[]
): Promise<ChargeQueueItem[]> {
  const allCharges = await getAllCharges();
  const patients = knownPatients || await getAllOrgInpatients(orgId);
  const patientMap = new Map(patients.map(p => [p.id, p]));

  let items: ChargeQueueItem[] = [];

  for (const charge of allCharges) {
    const patient = patientMap.get(charge.inpatientId);
    if (!patient) continue;

    items.push({
      charge,
      patient,
      physicianName: charge.submittedByUserName || patient.primaryPhysicianName || 'Unknown',
      hospitalName: patient.hospitalName || 'Unknown'
    });
  }

  // Apply filters
  if (filters.status !== 'all') {
    items = items.filter(item => item.charge.status === filters.status);
  } else {
    // Default: show pending + entered (hide billed)
    items = items.filter(item => item.charge.status !== 'billed');
  }

  if (filters.physicianId) {
    items = items.filter(item =>
      item.charge.submittedByUserId === filters.physicianId ||
      item.patient.primaryPhysicianId === filters.physicianId
    );
  }

  if (filters.hospitalId) {
    items = items.filter(item => item.patient.hospitalId === filters.hospitalId);
  }

  if (filters.dateRange) {
    items = items.filter(item =>
      item.charge.chargeDate >= filters.dateRange!.start &&
      item.charge.chargeDate <= filters.dateRange!.end
    );
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    items = items.filter(item =>
      item.patient.patientName.toLowerCase().includes(q) ||
      (item.patient.mrn && item.patient.mrn.toLowerCase().includes(q)) ||
      item.charge.cptCode.toLowerCase().includes(q)
    );
  }

  // Sort by date descending
  items.sort((a, b) => b.charge.chargeDate.localeCompare(a.charge.chargeDate));

  return items;
}

/** Get full charge history for a specific patient */
export async function getPatientChargeHistory(
  orgId: string,
  patientId: string
): Promise<StoredCharge[]> {
  const allCharges = await getAllCharges();
  return allCharges
    .filter(c => c.inpatientId === patientId)
    .sort((a, b) => a.chargeDate.localeCompare(b.chargeDate));
}

/** Batch mark charges as entered */
export async function batchMarkChargesEntered(
  chargeIds: string[],
  adminId: string,
  adminName: string,
  orgId?: string | null
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of chargeIds) {
    try {
      await markChargeEntered(id, adminName, undefined, orgId);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

/** Batch mark charges as billed */
export async function batchMarkChargesBilled(
  chargeIds: string[],
  adminId: string,
  adminName: string,
  orgId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of chargeIds) {
    try {
      await markChargeBilled(id, adminName, undefined, orgId);
      success++;
    } catch {
      failed++;
    }
  }

  if (success > 0) {
    await logAuditEvent(orgId, {
      action: 'charge_batch_billed',
      userId: adminId,
      userName: adminName,
      targetPatientId: null,
      targetPatientName: null,
      details: `Batch billed ${success} charge${success !== 1 ? 's' : ''} (various DOS)`,
      listContext: null,
      metadata: { batchSize: success }
    });
  }

  return { success, failed };
}

/** Get charge statistics for admin dashboard */
export async function getChargeStats(orgId: string): Promise<{
  totalPending: number;
  totalEntered: number;
  billedToday: number;
  billedThisWeek: number;
  totalRVUPending: number;
  totalPaymentPending: number;
}> {
  const allCharges = await getAllCharges();
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const pending = allCharges.filter(c => c.status === 'pending');
  const entered = allCharges.filter(c => c.status === 'entered');
  const billedToday = allCharges.filter(c =>
    c.status === 'billed' && c.billedAt && c.billedAt.split('T')[0] === today
  );
  const billedThisWeek = allCharges.filter(c =>
    c.status === 'billed' && c.billedAt && c.billedAt.split('T')[0] >= weekAgo
  );

  // Sum RVU and $ for all active (non-billed) charges to match the table footer
  const active = allCharges.filter(c => c.status === 'pending' || c.status === 'entered');
  const totalRVUPending = active.reduce((sum, c) => sum + (c.rvu || 0), 0);
  const totalPaymentPending = calculateMedicarePayment(totalRVUPending);

  return {
    totalPending: pending.length,
    totalEntered: entered.length,
    billedToday: billedToday.length,
    billedThisWeek: billedThisWeek.length,
    totalRVUPending,
    totalPaymentPending
  };
}
