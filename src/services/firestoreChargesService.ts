// Firestore Charges Service — CRUD for charges at organizations/{orgId}/charges/{chargeId}
// Flat collection (not nested under inpatients) because some charges use unlinked cath-* IDs

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { StoredCharge } from './chargesService';
import { logger } from './logger';

/** Save (or overwrite) a charge doc using the local charge ID as the Firestore doc ID */
export async function saveChargeToFirestore(orgId: string, charge: StoredCharge): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const db = getFirebaseDb();
    await setDoc(doc(db, `organizations/${orgId}/charges`, charge.id), charge);
  } catch (error) {
    logger.error('Failed to save charge to Firestore', error);
  }
}

/** Load all charges for an org */
export async function loadChargesFromFirestore(orgId: string): Promise<StoredCharge[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, `organizations/${orgId}/charges`));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as StoredCharge));
  } catch (error) {
    logger.error('Failed to load charges from Firestore', error);
    return [];
  }
}

/** Update specific fields on a charge doc */
export async function updateChargeInFirestore(
  orgId: string,
  chargeId: string,
  updates: Partial<StoredCharge>
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const db = getFirebaseDb();
    await updateDoc(doc(db, `organizations/${orgId}/charges`, chargeId), updates);
  } catch (error) {
    logger.error('Failed to update charge in Firestore', error);
  }
}

/** Delete a charge doc */
export async function deleteChargeFromFirestore(orgId: string, chargeId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, `organizations/${orgId}/charges`, chargeId));
  } catch (error) {
    logger.error('Failed to delete charge from Firestore', error);
  }
}
