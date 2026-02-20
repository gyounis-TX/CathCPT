import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${
        isOffline ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        You are offline — changes will sync when connected.
      </div>
    </div>
  );
};
