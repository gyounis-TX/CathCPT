// Biometric Authentication Service
// Uses @aparajita/capacitor-biometric-auth for Face ID / Touch ID
// Falls back gracefully on web (always returns unavailable)

import { logger } from './logger';

const BIOMETRIC_PREF_KEY = 'biometric_enabled';

type BiometryType = 'faceId' | 'touchId' | 'none';

// Check if running in Capacitor
function isNative(): boolean {
  return typeof (window as any).Capacitor !== 'undefined';
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;

  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function getBiometryType(): Promise<BiometryType> {
  if (!isNative()) return 'none';

  try {
    const { BiometricAuth, BiometryType: BType } = await import('@aparajita/capacitor-biometric-auth');
    const result = await BiometricAuth.checkBiometry();
    if (!result.isAvailable) return 'none';
    if (result.biometryType === BType.faceId) return 'faceId';
    if (result.biometryType === BType.touchId) return 'touchId';
    return 'none';
  } catch {
    return 'none';
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!isNative()) return false;

  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({
      reason: 'Unlock CathCPT',
      cancelTitle: 'Use Password',
      allowDeviceCredential: false,
    });
    return true;
  } catch (error) {
    logger.info('Biometric auth failed or cancelled');
    return false;
  }
}

export async function getBiometricPreference(): Promise<boolean> {
  try {
    const result = await window.storage.get(BIOMETRIC_PREF_KEY);
    return result?.value === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await window.storage.set(BIOMETRIC_PREF_KEY, String(enabled));
}
