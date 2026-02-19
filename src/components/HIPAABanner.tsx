import React from 'react';
import { Shield } from 'lucide-react';

interface HIPAABannerProps {
  onAcknowledge: () => void;
}

export const HIPAABanner: React.FC<HIPAABannerProps> = ({ onAcknowledge }) => {
  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
      <div className="w-full max-w-md px-6 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4">HIPAA Compliance Notice</h2>

        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          This application handles Protected Health Information (PHI). By continuing,
          you acknowledge that you will use this application in accordance with your
          organization's HIPAA policies and procedures.
        </p>

        <button
          onClick={onAcknowledge}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          I Acknowledge
        </button>
      </div>
    </div>
  );
};
