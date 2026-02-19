// Call List Service — manages call list entries (references to inpatients)
// Dev mode uses in-memory store; production hits Firestore

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getDevModeSettings } from './devMode';
import { CallListEntry, Inpatient } from '../types';

// ── In-memory mock store for dev mode ───────────────────────────

let mockCallListEntries: CallListEntry[] = [];

// ── Service functions ───────────────────────────────────────────

/** Get user's call list entries */
export async function getCallListEntries(orgId: string, userId: string): Promise<CallListEntry[]> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockCallListEntries.filter(e => e.addedByUserId === userId && e.isActive);
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const q = query(
    collection(db, `organizations/${orgId}/callListEntries`),
    where('addedByUserId', '==', userId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CallListEntry));
}

/** Add existing inpatient to call list */
export async function addToCallList(
  orgId: string,
  userId: string,
  patient: Inpatient,
  coveringFor?: string
): Promise<CallListEntry> {
  const entry: Omit<CallListEntry, 'id'> = {
    inpatientId: patient.id,
    addedByUserId: userId,
    addedAt: new Date().toISOString(),
    patientName: patient.patientName,
    hospitalName: patient.hospitalName || '',
    coveringFor: coveringFor || patient.primaryPhysicianName || null,
    isActive: true
  };

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const newEntry: CallListEntry = { id: `call-${Date.now()}`, ...entry };
    mockCallListEntries.push(newEntry);
    return newEntry;
  }

  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');

  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, `organizations/${orgId}/callListEntries`), entry);
  return { id: ref.id, ...entry };
}

/** Remove from call list (soft delete) */
export async function removeFromCallList(orgId: string, entryId: string): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const entry = mockCallListEntries.find(e => e.id === entryId);
    if (entry) entry.isActive = false;
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, `organizations/${orgId}/callListEntries`, entryId), {
    isActive: false
  });
}

/** Clear all call list entries for user */
export async function clearCallList(orgId: string, userId: string): Promise<void> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    mockCallListEntries = mockCallListEntries.map(e =>
      e.addedByUserId === userId ? { ...e, isActive: false } : e
    );
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  const q = query(
    collection(db, `organizations/${orgId}/callListEntries`),
    where('addedByUserId', '==', userId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, { isActive: false });
  });
  await batch.commit();
}
