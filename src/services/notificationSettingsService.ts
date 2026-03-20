import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from './firebaseConfig';

interface ChargeNotificationSettings {
  enabled: boolean;
  recipientUserIds: string[];
}

interface OrgMember {
  id: string;
  displayName: string;
  email: string;
}

export async function getChargeNotificationSettings(orgId: string): Promise<ChargeNotificationSettings> {
  const db = getFirebaseDb();
  const orgDoc = await getDoc(doc(db, 'organizations', orgId));
  const data = orgDoc.data();
  return data?.chargeNotifications || { enabled: false, recipientUserIds: [] };
}

export async function updateChargeNotificationSettings(
  orgId: string,
  settings: ChargeNotificationSettings
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'organizations', orgId), {
    chargeNotifications: settings,
  });
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    displayName: d.data().displayName || d.data().email || 'Unknown',
    email: d.data().email || '',
  }));
}
