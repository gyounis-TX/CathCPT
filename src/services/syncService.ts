// Sync Service for CathCPT Pro
// With Firestore, offline persistence is handled automatically.
// This module provides online/offline status tracking for the UI.

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  failedCount: number;
}

const defaultSyncStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  lastSyncResult: null,
  failedCount: 0
};

let currentStatus: SyncStatus = { ...defaultSyncStatus };

// Get sync status
export async function getSyncStatus(): Promise<SyncStatus> {
  return { ...currentStatus, isOnline: navigator.onLine };
}

// Set online status (called by App.tsx on online/offline events)
export async function setOnlineStatus(isOnline: boolean): Promise<void> {
  currentStatus.isOnline = isOnline;
}

// Process sync queue — no-op with Firestore (auto-syncs)
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
  remaining: number;
}> {
  // Firestore handles offline writes automatically.
  // When connectivity returns, pending writes flush on their own.
  currentStatus.lastSyncTime = new Date().toISOString();
  currentStatus.lastSyncResult = 'success';
  return { success: 0, failed: 0, remaining: 0 };
}
