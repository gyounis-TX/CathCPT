// Platform detection utility for CathCPT
// Replaces ad-hoc (window as any).Capacitor checks with clean helpers

import { Capacitor } from '@capacitor/core';

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatformName(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
