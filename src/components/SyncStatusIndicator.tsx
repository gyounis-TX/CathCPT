import React from 'react';
import { SyncStatus } from '../services/syncService';

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ syncStatus }) => {
  const dotColor = !syncStatus.isOnline
    ? 'bg-red-500'
    : syncStatus.isSyncing
    ? 'bg-amber-500 animate-pulse'
    : 'bg-green-500';

  const label = !syncStatus.isOnline
    ? 'Offline'
    : syncStatus.isSyncing
    ? 'Syncing'
    : 'Online';

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      {syncStatus.pendingCount > 0 && (
        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
          {syncStatus.pendingCount}
        </span>
      )}
    </div>
  );
};
