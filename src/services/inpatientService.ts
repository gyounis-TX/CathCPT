// Inpatient Service — Firestore CRUD for inpatients
// Dev mode returns mock data; production hits Firestore

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getDevModeSettings } from './devMode';
import { Inpatient } from '../types';
import { logger } from './logger';

const LOCAL_INPATIENTS_KEY = 'local_inpatients';

// ── Local storage layer (persists across reloads / offline) ─────

export async function getLocalPatients(): Promise<Inpatient[]> {
  try {
    const result = await window.storage.get(LOCAL_INPATIENTS_KEY);
    if (result?.value) {
      return JSON.parse(result.value);
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveLocalPatient(patient: Inpatient): Promise<void> {
  try {
    const patients = await getLocalPatients();
    const idx = patients.findIndex(p => p.id === patient.id);
    if (idx >= 0) {
      patients[idx] = patient;
    } else {
      patients.push(patient);
    }
    await window.storage.set(LOCAL_INPATIENTS_KEY, JSON.stringify(patients));
  } catch {
    // Non-critical — backend is source of truth
  }
}

export async function updateLocalPatient(
  id: string,
  updates: Partial<Inpatient>
): Promise<void> {
  try {
    const patients = await getLocalPatients();
    const idx = patients.findIndex(p => p.id === id);
    if (idx >= 0) {
      patients[idx] = { ...patients[idx], ...updates };
      await window.storage.set(LOCAL_INPATIENTS_KEY, JSON.stringify(patients));
    }
  } catch {
    // Non-critical
  }
}

// ── Mock data for dev mode ──────────────────────────────────────

const mockInpatients: Inpatient[] = [
  {
    id: '1',
    organizationId: 'YOCA',
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
    organizationId: 'YOCA',
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
    organizationId: 'YOCA',
    primaryPhysicianId: 'user-2',
    primaryPhysicianName: 'Dr. Khan',
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
    organizationId: 'YOCA',
    primaryPhysicianId: 'user-3',
    primaryPhysicianName: 'Dr. Bruce',
    hospitalId: 'mock-hosp-1',
    hospitalName: 'Memorial Hospital',
    patientName: 'Flanders, Ned',
    dob: '1958-01-04',
    isActive: true,
    createdAt: '2024-02-12T08:00:00Z'
  },
  {
    id: '5',
    organizationId: 'YOCA',
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
    organizationId: 'YOCA',
    primaryPhysicianId: 'user-2',
    primaryPhysicianName: 'Dr. Khan',
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
    organizationId: 'YOCA',
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
  const raw = { ...data, createdAt: new Date().toISOString() };
  // Strip undefined values — Firestore rejects them
  const docData = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
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

// Update an inpatient's fields (e.g. fix hospitalId after dedup)
export async function updateInpatient(orgId: string, inpatientId: string, fields: Partial<Inpatient>): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirebaseDb();
  await updateDoc(doc(db, `organizations/${orgId}/inpatients`, inpatientId), fields);
}

/** Real-time listener for active org inpatients. Returns an unsubscribe function. */
export function onOrgInpatientsSnapshot(
  orgId: string,
  callback: (patients: Inpatient[]) => void
): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, `organizations/${orgId}/inpatients`),
      where('isActive', '==', true)
    );
    return onSnapshot(
      q,
      (snap) => {
        const patients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Inpatient));
        callback(patients);
      },
      (error) => {
        logger.error('Inpatients snapshot error', error);
      }
    );
  } catch (error) {
    logger.error('Failed to set up inpatients snapshot', error);
    return () => {};
  }
}

/** Get ALL org inpatients including discharged (for admin roster) */
export async function getAllOrgInpatients(orgId: string): Promise<Inpatient[]> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockInpatients.filter(p => p.organizationId === orgId || orgId === 'YOCA');
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const q = query(collection(db, `organizations/${orgId}/inpatients`));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Inpatient));
}
