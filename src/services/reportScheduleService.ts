// Report Schedule Service
// Client-side reminder system for periodic report generation

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebaseConfig';
import { getDevModeSettings } from './devMode';
import { logger } from './logger';

const LOCAL_SCHEDULE_KEY = 'report_schedule';

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek: number;   // 0=Sun..6=Sat, used when frequency='weekly'
  dayOfMonth: number;  // 1-28, used when frequency='monthly'
  lastGeneratedAt: string | null; // ISO timestamp
  isActive: boolean;
}

const defaultSchedule: ReportSchedule = {
  frequency: 'weekly',
  dayOfWeek: 1, // Monday
  dayOfMonth: 1,
  lastGeneratedAt: null,
  isActive: false
};

export async function getReportSchedule(orgId: string): Promise<ReportSchedule> {
  const devSettings = await getDevModeSettings();

  // Try Firestore first (non-dev mode)
  if (!devSettings?.enabled && isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, `organizations/${orgId}/settings/reportSchedule`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...defaultSchedule, ...snap.data() } as ReportSchedule;
      }
    } catch (error) {
      logger.error('Error loading report schedule from Firestore', error);
    }
  }

  // Fall back to local
  try {
    const { value } = await window.storage.get(LOCAL_SCHEDULE_KEY);
    if (value) {
      return { ...defaultSchedule, ...JSON.parse(value) };
    }
  } catch (error) {
    logger.error('Error loading report schedule locally', error);
  }

  return defaultSchedule;
}

export async function saveReportSchedule(orgId: string, schedule: ReportSchedule): Promise<void> {
  // Save locally
  await window.storage.set(LOCAL_SCHEDULE_KEY, JSON.stringify(schedule));

  // Save to Firestore
  const devSettings = await getDevModeSettings();
  if (!devSettings?.enabled && isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, `organizations/${orgId}/settings/reportSchedule`);
      await setDoc(docRef, schedule);
    } catch (error) {
      logger.error('Error saving report schedule to Firestore', error);
    }
  }
}

export function isReportDue(schedule: ReportSchedule): boolean {
  if (!schedule.isActive) return false;

  const now = new Date();
  const lastGenerated = schedule.lastGeneratedAt ? new Date(schedule.lastGeneratedAt) : null;

  if (!lastGenerated) return true; // Never generated

  switch (schedule.frequency) {
    case 'daily': {
      const todayStr = now.toISOString().split('T')[0];
      const lastStr = lastGenerated.toISOString().split('T')[0];
      return todayStr > lastStr;
    }
    case 'weekly': {
      const diffDays = Math.floor((now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 7;
    }
    case 'monthly': {
      const diffMonths = (now.getFullYear() - lastGenerated.getFullYear()) * 12 +
        (now.getMonth() - lastGenerated.getMonth());
      return diffMonths >= 1;
    }
    default:
      return false;
  }
}

export async function markReportGenerated(orgId: string): Promise<void> {
  const schedule = await getReportSchedule(orgId);
  schedule.lastGeneratedAt = new Date().toISOString();
  await saveReportSchedule(orgId, schedule);
}

export function getNextDueDate(schedule: ReportSchedule): Date | null {
  if (!schedule.isActive) return null;

  const now = new Date();
  const last = schedule.lastGeneratedAt ? new Date(schedule.lastGeneratedAt) : now;

  switch (schedule.frequency) {
    case 'daily': {
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      return next;
    }
    case 'weekly': {
      const next = new Date(last);
      next.setDate(next.getDate() + 7);
      return next;
    }
    case 'monthly': {
      const next = new Date(last);
      next.setMonth(next.getMonth() + 1);
      return next;
    }
    default:
      return null;
  }
}
