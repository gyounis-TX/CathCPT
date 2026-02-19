// Patient Roster Service — all-patients queries for admin portal

import { Inpatient, PatientWithCharges } from '../types';
import { StoredCharge } from './chargesService';
import { getAllOrgInpatients } from './inpatientService';
import { getPatientChargeHistory } from './adminChargeService';
import { calculateMedicarePayment, getAllInpatientCodes } from '../data/inpatientCodes';

const allCodes = getAllInpatientCodes();

function stripModifier(code: string): string {
  return code.replace(/-\d+$/, '').trim();
}

function getRVUForCode(cptCode: string): number {
  if (cptCode.includes(' + ')) {
    return cptCode.split(' + ').reduce((sum, code) => {
      const baseCode = stripModifier(code.trim());
      const codeData = allCodes.find(c => c.code === baseCode);
      return sum + (codeData?.rvu || 0);
    }, 0);
  }
  const baseCode = stripModifier(cptCode);
  const code = allCodes.find(c => c.code === baseCode);
  return code?.rvu || 0;
}

/** Get all org patients (active + discharged) */
export async function getAllOrgPatients(orgId: string): Promise<Inpatient[]> {
  return getAllOrgInpatients(orgId);
}

/** Get patient with full charge details */
export async function getPatientWithCharges(
  orgId: string,
  patientId: string
): Promise<PatientWithCharges | null> {
  const patients = await getAllOrgInpatients(orgId);
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return null;

  const charges = await getPatientChargeHistory(orgId, patientId);

  let totalRVU = 0;
  charges.forEach(c => {
    totalRVU += c.rvu || getRVUForCode(c.cptCode);
  });

  return {
    patient,
    charges,
    totalCharges: charges.length,
    pendingCharges: charges.filter(c => c.status === 'pending').length,
    billedCharges: charges.filter(c => c.status === 'billed').length,
    totalRVU,
    totalPayment: calculateMedicarePayment(totalRVU),
    lastChargeDate: charges.length > 0
      ? charges[charges.length - 1].chargeDate
      : null
  };
}

/** Search patients by name, MRN, or DOB */
export async function searchPatients(
  orgId: string,
  query: string
): Promise<Inpatient[]> {
  const allPatients = await getAllOrgInpatients(orgId);
  const q = query.toLowerCase().trim();

  if (!q) return allPatients;

  return allPatients.filter(p =>
    p.patientName.toLowerCase().includes(q) ||
    (p.mrn && p.mrn.toLowerCase().includes(q)) ||
    p.dob.includes(q)
  );
}
