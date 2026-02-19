// Invite Service — admin-controlled physician invite system
// Dev mode uses in-memory store; production uses Firestore

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getDevModeSettings } from './devMode';
import { logAuditEvent } from './auditService';
import { logger } from './logger';

// Invite data model
export interface InviteCode {
  code: string;
  organizationId: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'physician' | 'admin';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: 'pending' | 'redeemed' | 'expired';
  redeemedBy?: string;
  redeemedAt?: string;
  expiresAt?: string;
}

// ── In-memory mock store for dev mode ───────────────────────────
const mockInviteStore: InviteCode[] = [];

// ── Helper: generate 8-char invite code ─────────────────────────
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Service functions ───────────────────────────────────────────

/** Create a new invite for a physician */
export async function createInvite(
  orgId: string,
  orgName: string,
  physician: { firstName: string; lastName: string; email: string; role: 'physician' | 'admin' },
  adminId: string,
  adminName: string
): Promise<InviteCode> {
  const code = generateInviteCode();
  const now = new Date().toISOString();

  const invite: InviteCode = {
    code,
    organizationId: orgId,
    organizationName: orgName,
    firstName: physician.firstName,
    lastName: physician.lastName,
    email: physician.email.toLowerCase().trim(),
    role: physician.role,
    createdBy: adminId,
    createdByName: adminName,
    createdAt: now,
    status: 'pending'
  };

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    mockInviteStore.push(invite);
    logger.info('[Invite] Created invite', { code, email: invite.email });
  } else if (isFirebaseConfigured()) {
    const db = getFirebaseDb();
    // Write to top-level inviteCodes collection (for O(1) lookup by code)
    await setDoc(doc(db, 'inviteCodes', code), invite);
    // Mirror under organization for admin listing
    await setDoc(doc(db, `organizations/${orgId}/invites`, code), invite);
  }

  // Log audit event
  await logAuditEvent(orgId, {
    action: 'physician_invited',
    userId: adminId,
    userName: adminName,
    targetPatientId: null,
    targetPatientName: null,
    details: `Invited Dr. ${physician.lastName} (${physician.email}) as ${physician.role}`,
    listContext: null,
    metadata: { targetUserId: physician.email }
  });

  return invite;
}

/** Get all invites for an organization (admin view) */
export async function getOrgInvites(orgId: string): Promise<InviteCode[]> {
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockInviteStore
      .filter(i => i.organizationId === orgId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const invitesRef = collection(db, `organizations/${orgId}/invites`);
  const q = query(invitesRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);

  return snap.docs.map(d => d.data() as InviteCode);
}

/** Look up an invite code (for registration screen) */
export async function lookupInviteCode(code: string): Promise<InviteCode | null> {
  const normalizedCode = code.trim().toUpperCase();

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return mockInviteStore.find(i => i.code === normalizedCode && i.status === 'pending') || null;
  }

  if (!isFirebaseConfigured()) return null;

  const db = getFirebaseDb();
  const inviteDoc = await getDoc(doc(db, 'inviteCodes', normalizedCode));

  if (!inviteDoc.exists()) return null;

  const invite = inviteDoc.data() as InviteCode;
  if (invite.status !== 'pending') return null;

  return invite;
}

/** Redeem an invite code (after Firebase Auth account is created) */
export async function redeemInvite(code: string, firebaseUid: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const now = new Date().toISOString();

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const invite = mockInviteStore.find(i => i.code === normalizedCode);
    if (invite) {
      invite.status = 'redeemed';
      invite.redeemedBy = firebaseUid;
      invite.redeemedAt = now;
    }
    logger.info('[Invite] Redeemed invite', { code: normalizedCode });
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();

  // Update top-level invite code
  await updateDoc(doc(db, 'inviteCodes', normalizedCode), {
    status: 'redeemed',
    redeemedBy: firebaseUid,
    redeemedAt: now
  });

  // Look up invite to get orgId for the mirrored doc
  const inviteDoc = await getDoc(doc(db, 'inviteCodes', normalizedCode));
  if (inviteDoc.exists()) {
    const invite = inviteDoc.data() as InviteCode;

    // Update mirrored org invite
    await updateDoc(doc(db, `organizations/${invite.organizationId}/invites`, normalizedCode), {
      status: 'redeemed',
      redeemedBy: firebaseUid,
      redeemedAt: now
    });

    // Update user document with org association
    await setDoc(doc(db, 'users', firebaseUid), {
      displayName: `Dr. ${invite.firstName} ${invite.lastName}`,
      email: invite.email,
      organizationId: invite.organizationId,
      organizationName: invite.organizationName,
      role: invite.role,
      tier: 'pro',
      createdAt: now
    }, { merge: true });
  }
}

/** Revoke a pending invite (admin action) */
export async function revokeInvite(
  orgId: string,
  code: string,
  adminId: string,
  adminName: string
): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const invite = mockInviteStore.find(i => i.code === normalizedCode);
    if (invite) {
      invite.status = 'expired';
    }
    logger.info('[Invite] Revoked invite', { code: normalizedCode });
  } else if (isFirebaseConfigured()) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, 'inviteCodes', normalizedCode), { status: 'expired' });
    await updateDoc(doc(db, `organizations/${orgId}/invites`, normalizedCode), { status: 'expired' });
  }

  await logAuditEvent(orgId, {
    action: 'physician_removed',
    userId: adminId,
    userName: adminName,
    targetPatientId: null,
    targetPatientName: null,
    details: `Revoked invite code ${normalizedCode}`,
    listContext: null
  });
}
