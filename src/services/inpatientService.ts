// Inpatient Service — Firestore CRUD for inpatients
// Dev mode returns mock data; production hits Firestore

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getDevModeSettings } from './devMode';
import { Inpatient } from '../types';

// ── Mock data for dev mode ──────────────────────────────────────

const mockInpatients: Inpatient[] = [
  {
    id: '1',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'mock-hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Simpson, Homer',
    dob: '1956-05-12',
    mrn: 'MH001',
    isActive: true,
    createdAt: '2024-02-10T08:00:00Z'
  },
  {
    id: '2',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'mock-hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Simpson, Marge',
    dob: '1958-03-19',
    mrn: 'MH002',
    isActive: true,
    createdAt: '2024-02-11T10:00:00Z'
  },
  {
    id: '3',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-2',
    primaryPhysicianName: 'Dr. Hibbert',
    hospitalId: 'mock-hosp-2',
    hospitalName: 'City Medical Center',
    patientName: 'Burns, Montgomery',
    dob: '1886-09-15',
    mrn: 'CMC001',
    isActive: true,
    createdAt: '2024-02-09T14:00:00Z'
  },
  {
    id: '4',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-3',
    primaryPhysicianName: 'Dr. Nick',
    hospitalId: 'mock-hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Flanders, Ned',
    dob: '1958-01-04',
    isActive: true,
    createdAt: '2024-02-12T08:00:00Z'
  },
  {
    id: '5',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'mock-hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Bouvier, Jacqueline',
    dob: '1929-02-15',
    mrn: 'MH003',
    isActive: true,
    createdAt: '2024-02-08T09:00:00Z'
  },
  {
    id: '6',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-2',
    primaryPhysicianName: 'Dr. Hibbert',
    hospitalId: 'mock-hosp-2',
    hospitalName: 'City Medical Center',
    patientName: 'Van Houten, Kirk',
    dob: '1962-07-20',
    mrn: 'CMC002',
    isActive: false,
    dischargedAt: '2024-02-10T16:00:00Z',
    createdAt: '2024-02-03T11:00:00Z'
  },
  {
    id: '7',
    organizationId: 'mock-org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'mock-hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Carlson, Carl',
    dob: '1960-11-05',
    mrn: 'MH004',
    isActive: false,
    dischargedAt: '2024-02-12T14:00:00Z',
    createdAt: '2024-02-06T08:00:00Z'
  }
];

// ── Service functions ───────────────────────────────────────────

/** Get all active org inpatients (Practice tab — superset) */
export async function getOrgInpatients(orgId: string): Promise<Inpatient[]> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockInpatients.filter(p => p.isActive);
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const q = query(
    collection(db, `organizations/${orgId}/inpatients`),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Inpatient));
}

/** Get current user's patients (My tab) */
export async function getMyInpatients(orgId: string, userId: string): Promise<Inpatient[]> {
  const all = await getOrgInpatients(orgId);
  return all.filter(p => p.primaryPhysicianId === userId);
}

/** Create a new inpatient */
export async function createInpatient(
  orgId: string,
  data: Omit<Inpatient, 'id' | 'createdAt'>
): Promise<Inpatient> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const newPatient: Inpatient = {
      ...data,
      id: `patient-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    mockInpatients.push(newPatient);
    return newPatient;
  }

  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');

  const db = getFirebaseDb();
  const docData = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, `organizations/${orgId}/inpatients`), docData);
  return { id: ref.id, ...docData } as Inpatient;
}

/** Discharge a patient (set isActive=false, dischargedAt) */
export async function dischargeInpatient(orgId: string, inpatientId: string): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const patient = mockInpatients.find(p => p.id === inpatientId);
    if (patient) {
      patient.isActive = false;
      patient.dischargedAt = new Date().toISOString();
    }
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, `organizations/${orgId}/inpatients`, inpatientId), {
    isActive: false,
    dischargedAt: new Date().toISOString()
  });
}

/** Remove from practice (soft delete — set isActive=false) */
export async function removeFromPractice(orgId: string, inpatientId: string): Promise<void> {
  return dischargeInpatient(orgId, inpatientId);
}

/** Get ALL org inpatients including discharged (for admin roster) */
export async function getAllOrgInpatients(orgId: string): Promise<Inpatient[]> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockInpatients.filter(p => p.organizationId === orgId || orgId === 'mock-org-1');
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const q = query(collection(db, `organizations/${orgId}/inpatients`));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Inpatient));
}
