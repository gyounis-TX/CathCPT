import React, { useState, useEffect } from 'react';
import { Heart, Lock, Fingerprint } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../services/firebaseConfig';
import { logAuditEvent } from '../services/auditService';
import {
  isBiometricAvailable,
  getBiometryType,
  authenticateWithBiometric,
  getBiometricPreference
} from '../services/biometricService';

interface LockScreenProps {
  userEmail: string;
  userId?: string;
  orgId?: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ userEmail, userId, orgId, onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceId' | 'touchId' | 'none'>('none');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      const pref = await getBiometricPreference();

      if (available && pref) {
        setBiometricAvailable(true);
        const type = await getBiometryType();
        setBiometricType(type);

        // Auto-trigger biometric on mount
        const success = await authenticateWithBiometric();
        if (success) {
          logUnlock('biometric');
          onUnlock();
        }
      }
    };
    checkBiometric();
  }, []);

  const logUnlock = (method: 'password' | 'biometric') => {
    if (orgId && userId) {
      logAuditEvent(orgId, {
        action: 'session_unlocked',
        userId: userId,
        userName: userEmail,
        targetPatientId: null,
        targetPatientName: null,
        details: `Session unlocked via ${method}`,
        listContext: null,
        metadata: { loginMethod: method }
      });
    }
  };

  const handleBiometricUnlock = async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      logUnlock('biometric');
      onUnlock();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      if (!isFirebaseConfigured()) {
        // In non-Firebase mode, just unlock (dev/demo)
        logUnlock('password');
        onUnlock();
        return;
      }

      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, userEmail, password);
      setPassword('');
      logUnlock('password');
      onUnlock();
    } catch {
      setError('Incorrect password. Please try again.');
      setPassword('');
    } finally {
      setIsVerifying(false);
    }
  };

  const biometricLabel = biometricType === 'faceId' ? 'Use Face ID' : biometricType === 'touchId' ? 'Use Touch ID' : '';

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
      <div className="w-full max-w-sm px-6 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <Heart className="w-8 h-8 text-white" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-800">Session Locked</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Locked due to inactivity. Enter your password to continue.
        </p>

        {/* Biometric button */}
        {biometricAvailable && biometricType !== 'none' && (
          <button
            onClick={handleBiometricUnlock}
            className="w-full mb-4 py-3 flex items-center justify-center gap-2 border-2 border-blue-200 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Fingerprint className="w-5 h-5" />
            {biometricLabel}
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">{userEmail}</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password || isVerifying}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isVerifying ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};
