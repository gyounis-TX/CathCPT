// Firestore Charges Service — CRUD for charges at organizations/{orgId}/charges/{chargeId}
// Flat collection (not nested under inpatients) because some charges use unlinked cath-* IDs

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { StoredCharge } from './chargesService';
import { SavedCase } from '../types';
import { logger } from './logger';
import { validateChargeCodes, validateCrossChargeModifiers } from './modifierEngine';

/** Save (or overwrite) a charge doc using the local charge ID as the Firestore doc ID.
 *  Runs modifier validation automatically and stores the result on the charge. */
export async function saveChargeToFirestore(orgId: string, charge: StoredCharge): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    // Run within-charge validation
    const validationResult = validateChargeCodes([charge.cptCode]);
    charge.validationResult = {
      warnings: validationResult.warnings,
      errors: validationResult.errors,
      scrubbed: validationResult.scrubbed,
      scrubbedAt: new Date().toISOString()
    };

    // Cross-charge validation: fetch same-patient, same-date charges
    try {
      const db = getFirebaseDb();
      const allChargesSnap = await getDocs(collection(db, `organizations/${orgId}/charges`));
      const sameDayCharges = allChargesSnap.docs
        .map(d => ({ ...d.data(), id: d.id } as StoredCharge))
        .filter(c => c.inpatientId === charge.inpatientId && c.chargeDate === charge.chargeDate && c.id !== charge.id);

      if (sameDayCharges.length > 0) {
        const crossResult = validateCrossChargeModifiers([charge.cptCode], sameDayCharges, charge.id);
        charge.validationResult.warnings = [
          ...charge.validationResult.warnings,
          ...crossResult.warnings
        ];
        charge.validationResult.errors = [
          ...charge.validationResult.errors,
          ...crossResult.errors
        ];
      }
    } catch (crossError) {
      logger.error('Cross-charge validation failed (non-blocking)', crossError);
    }

    const db = getFirebaseDb();
    // Strip undefined values — Firestore rejects them
    const clean = Object.fromEntries(Object.entries(charge).filter(([, v]) => v !== undefined));
    await setDoc(doc(db, `organizations/${orgId}/charges`, charge.id), clean);
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

/** Save case history to Firestore (single doc with all cases) */
export async function saveCaseHistoryToFirestore(orgId: string, history: SavedCase[]): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const db = getFirebaseDb();
    await setDoc(doc(db, `organizations/${orgId}/metadata`, 'caseHistory'), { cases: history });
  } catch (error) {
    logger.error('Failed to save case history to Firestore', error);
  }
}

/** Real-time listener for all charges in an org. Returns an unsubscribe function. */
export function onChargesSnapshot(
  orgId: string,
  callback: (charges: StoredCharge[]) => void
): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, `organizations/${orgId}/charges`),
      (snap) => {
        const charges = snap.docs.map(d => ({ ...d.data(), id: d.id } as StoredCharge));
        callback(charges);
      },
      (error) => {
        logger.error('Charges snapshot error', error);
      }
    );
  } catch (error) {
    logger.error('Failed to set up charges snapshot', error);
    return () => {};
  }
}

/** Load case history from Firestore */
export async function loadCaseHistoryFromFirestore(orgId: string): Promise<SavedCase[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, `organizations/${orgId}/metadata`, 'caseHistory'));
    if (snap.exists()) {
      const cases = snap.data()?.cases;
      return Array.isArray(cases) ? cases as SavedCase[] : [];
    }
    return [];
  } catch (error) {
    logger.error('Failed to load case history from Firestore', error);
    return [];
  }
}
