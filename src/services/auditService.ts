// Audit Service — logs patient add/remove/discharge events
// Dev mode stores in-memory; production writes to Firestore

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getDevModeSettings } from './devMode';
import { AuditAction, AuditLogEntry } from '../types';
import { mockAuditEntries } from './devMode';
import { logger } from './logger';

// ── In-memory mock store for dev mode ───────────────────────────

const mockAuditLog: AuditLogEntry[] = [];

// ── PHI minimization helpers ─────────────────────────────────────

/** Convert a full name to initials: "John Smith" → "J.S.", "Smith, John" → "S.J." */
function toInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(p => p[0].toUpperCase() + '.')
    .join('');
}

/** Minimize PHI in audit event before storage */
function minimizePHI(event: Omit<AuditLogEntry, 'id' | 'timestamp'>): Omit<AuditLogEntry, 'id' | 'timestamp'> {
  const minimized = { ...event };

  // Convert patient name to initials
  if (minimized.targetPatientName) {
    minimized.targetPatientName = toInitials(minimized.targetPatientName);
  }

  // Scrub full names from details text — replace known patient name patterns with initials
  if (minimized.details && minimized.targetPatientName) {
    // The details field often contains the original name; replace with initials
    minimized.details = minimized.details
      .replace(/for\s+[\w,.\s]+(?=\s*$)/i, `for patient ${minimized.targetPatientName}`)
      .replace(/patient\s+[\w,.\s]+(?=\s+to\s)/i, `patient ${minimized.targetPatientName}`)
      .replace(/Added\s+patient\s+[\w,.\s]+$/i, `Added patient ${minimized.targetPatientName}`)
      .replace(/Discharged\s+patient\s+[\w,.\s]+$/i, `Discharged patient ${minimized.targetPatientName}`)
      .replace(/Removed\s+patient\s+[\w,.\s]+/i, `Removed patient ${minimized.targetPatientName}`);
  }

  return minimized;
}

// ── Service functions ───────────────────────────────────────────

/** Log an audit event (PHI is automatically minimized) */
export async function logAuditEvent(
  orgId: string,
  event: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  const minimized = minimizePHI(event);
  const entry = { ...minimized, timestamp: new Date().toISOString() };

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    mockAuditLog.push({ id: `audit-${Date.now()}`, ...entry });
    logger.info('[Audit] event logged', { action: entry.action });
    return;
  }

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  await addDoc(collection(db, `organizations/${orgId}/auditLog`), entry);
}

/** Get audit log (paginated, for admin portal) */
export async function getAuditLog(
  orgId: string,
  options?: { limit?: number; startAfterId?: string }
): Promise<AuditLogEntry[]> {
  const pageSize = options?.limit || 50;

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    const sorted = [...mockAuditLog].sort(
      (a, b) => b.timestamp.localeCompare(a.timestamp)
    );
    return sorted.slice(0, pageSize);
  }

  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  let q = query(
    collection(db, `organizations/${orgId}/auditLog`),
    orderBy('timestamp', 'desc'),
    limit(pageSize)
  );

  if (options?.startAfterId) {
    const afterDoc = await getDoc(doc(db, `organizations/${orgId}/auditLog`, options.startAfterId));
    if (afterDoc.exists()) {
      q = query(
        collection(db, `organizations/${orgId}/auditLog`),
        orderBy('timestamp', 'desc'),
        startAfter(afterDoc),
        limit(pageSize)
      );
    }
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
}

/** Get filtered audit log (for admin portal) */
export async function getFilteredAuditLog(
  orgId: string,
  filters: {
    actionTypes?: AuditAction[];
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    startAfterId?: string;
  }
): Promise<AuditLogEntry[]> {
  const pageSize = filters.limit || 50;

  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    // Combine session log with mock entries
    let combined = [...mockAuditLog, ...mockAuditEntries as AuditLogEntry[]];

    if (filters.actionTypes && filters.actionTypes.length > 0) {
      combined = combined.filter(e => filters.actionTypes!.includes(e.action));
    }
    if (filters.userId) {
      combined = combined.filter(e => e.userId === filters.userId);
    }
    if (filters.startDate) {
      combined = combined.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      combined = combined.filter(e => e.timestamp <= filters.endDate!);
    }

    combined.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filters.startAfterId) {
      const idx = combined.findIndex(e => e.id === filters.startAfterId);
      if (idx !== -1) {
        combined = combined.slice(idx + 1);
      }
    }

    return combined.slice(0, pageSize);
  }

  // Production: Firestore query with filters
  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const constraints: any[] = [orderBy('timestamp', 'desc'), limit(pageSize)];

  const q2 = query(collection(db, `organizations/${orgId}/auditLog`), ...constraints);
  const snap = await getDocs(q2);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));

  // Client-side filter for action types and user (Firestore doesn't support OR on different fields easily)
  if (filters.actionTypes && filters.actionTypes.length > 0) {
    results = results.filter(e => filters.actionTypes!.includes(e.action));
  }
  if (filters.userId) {
    results = results.filter(e => e.userId === filters.userId);
  }

  return results;
}
