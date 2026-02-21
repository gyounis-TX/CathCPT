import React, { useState, useEffect } from 'react';
import { Fingerprint, X } from 'lucide-react';
import { isBiometricAvailable, getBiometryType, authenticateWithBiometric, getBiometricPreference, setBiometricPreference } from '../services/biometricService';

interface BiometricLoginPromptProps {
  onComplete: () => void;
}

export const BiometricLoginPrompt: React.FC<BiometricLoginPromptProps> = ({ onComplete }) => {
  const [biometryLabel, setBiometryLabel] = useState('Biometric');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    getBiometryType().then(type => {
      if (type === 'faceId') setBiometryLabel('Face ID');
      else if (type === 'touchId') setBiometryLabel('Touch ID');
    });
  }, []);

  const handleEnable = async () => {
    setIsAuthenticating(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        await setBiometricPreference(true);
      }
    } finally {
      setIsAuthenticating(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-end p-3">
          <button
            onClick={handleSkip}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <Fingerprint size={32} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Enable {biometryLabel}?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Use {biometryLabel} for faster, more secure access to CathCPT. You can change this later in Settings.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={handleEnable}
              disabled={isAuthenticating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isAuthenticating ? 'Verifying...' : `Enable ${biometryLabel}`}
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium rounded-xl transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
