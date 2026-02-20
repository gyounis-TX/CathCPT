import React from 'react';
import { Shield, X } from 'lucide-react';

interface HIPAAInlineBannerProps {
  onAcknowledge: () => void;
}

export const HIPAAInlineBanner: React.FC<HIPAAInlineBannerProps> = ({ onAcknowledge }) => {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-800 leading-snug">
          This app handles PHI. By continuing you agree to follow your organization's HIPAA policies.
        </p>
      </div>
      <button
        onClick={onAcknowledge}
        className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        I Acknowledge
      </button>
    </div>
  );
};
