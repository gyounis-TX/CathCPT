// Storage abstraction layer with AES-256-GCM encryption at rest
// Uses Capacitor Preferences for iOS/Android, localStorage for web

import { Preferences } from '@capacitor/preferences';
import { logger } from './services/logger';

interface StorageResult {
  value: string | null;
}

// Encryption key storage slot (not encrypted itself)
const ENC_KEY_SLOT = '_enc_key';

// Check if running in Capacitor (iOS/Android)
const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

// Wrap a promise with a timeout - falls back to localStorage if native bridge hangs
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Storage timeout')), ms)
    )
  ]);
}

const TIMEOUT_MS = 3000;

// ── Encryption helpers (AES-256-GCM via Web Crypto API) ──────────

let _cachedKey: CryptoKey | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getRawValue(key: string): Promise<string | null> {
  if (isCapacitor()) {
    try {
      const result = await withTimeout(Preferences.get({ key }), TIMEOUT_MS);
      return result.value ?? null;
    } catch {
      logger.warn('Capacitor Preferences get failed, falling back to localStorage');
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setRawValue(key: string, value: string): Promise<void> {
  if (isCapacitor()) {
    try {
      await withTimeout(Preferences.set({ key, value }), TIMEOUT_MS);
      return;
    } catch {
      logger.warn('Capacitor Preferences set failed, falling back to localStorage');
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    logger.error('Storage set error', e);
  }
}

async function removeRawValue(key: string): Promise<void> {
  if (isCapacitor()) {
    try {
      await withTimeout(Preferences.remove({ key }), TIMEOUT_MS);
      return;
    } catch {
      logger.warn('Capacitor Preferences remove failed, falling back to localStorage');
    }
  }
  try {
    localStorage.removeItem(key);
  } catch (e) {
    logger.error('Storage remove error', e);
  }
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  // Try to load existing key
  const stored = await getRawValue(ENC_KEY_SLOT);
  if (stored) {
    try {
      const rawKey = base64ToArrayBuffer(stored);
      _cachedKey = await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
      return _cachedKey;
    } catch (e) {
      logger.error('Failed to import encryption key, generating new one', e);
    }
  }

  // Generate new key on first launch
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  await setRawValue(ENC_KEY_SLOT, arrayBufferToBase64(exported));
  _cachedKey = key;
  return key;
}

async function encryptValue(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return arrayBufferToBase64(iv.buffer) + ':' + arrayBufferToBase64(ciphertext);
}

async function decryptValue(stored: string): Promise<string> {
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) {
    // Unencrypted legacy data — return as-is (will be re-encrypted on next write)
    return stored;
  }

  const ivPart = stored.substring(0, colonIdx);
  const ctPart = stored.substring(colonIdx + 1);

  // Validate it looks like base64 (not just a JSON value with a colon)
  try {
    atob(ivPart);
    atob(ctPart);
  } catch {
    // Not valid base64 — this is unencrypted legacy data containing a colon
    return stored;
  }

  try {
    const key = await getEncryptionKey();
    const iv = new Uint8Array(base64ToArrayBuffer(ivPart));
    const ciphertext = base64ToArrayBuffer(ctPart);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // Decryption failed — likely unencrypted legacy data that happened to have base64-like segments
    return stored;
  }
}

// ── Public storage API ───────────────────────────────────────────

const storage = {
  async get(key: string): Promise<StorageResult> {
    // Never encrypt the encryption key slot itself
    if (key === ENC_KEY_SLOT) {
      const value = await getRawValue(key);
      return { value };
    }

    const raw = await getRawValue(key);
    if (raw === null) return { value: null };

    try {
      const plaintext = await decryptValue(raw);

      // If it was unencrypted legacy data, re-encrypt it in place (seamless migration)
      const colonIdx = raw.indexOf(':');
      const isLegacy = colonIdx === -1 || (() => {
        try { atob(raw.substring(0, colonIdx)); return false; } catch { return true; }
      })();
      if (isLegacy) {
        try {
          const encrypted = await encryptValue(plaintext);
          await setRawValue(key, encrypted);
        } catch {
          // Migration failed — non-critical, will retry on next read
        }
      }

      return { value: plaintext };
    } catch {
      // Fallback: return raw value if decryption fails entirely
      return { value: raw };
    }
  },

  async set(key: string, value: string): Promise<void> {
    // Never encrypt the encryption key slot itself
    if (key === ENC_KEY_SLOT) {
      await setRawValue(key, value);
      return;
    }

    try {
      const encrypted = await encryptValue(value);
      await setRawValue(key, encrypted);
    } catch (e) {
      logger.error('Encryption failed, storing raw', e);
      await setRawValue(key, value);
    }
  },

  async remove(key: string): Promise<void> {
    await removeRawValue(key);
  },

  async clear(): Promise<void> {
    if (isCapacitor()) {
      try {
        await withTimeout(Preferences.clear(), TIMEOUT_MS);
        return;
      } catch {
        logger.warn('Capacitor Preferences clear failed, falling back to localStorage');
      }
    }
    try {
      localStorage.clear();
    } catch (e) {
      logger.error('Storage clear error', e);
    }
  },

  /** Wipe all stored data including encryption key. Used for secure logout. */
  async clearAll(): Promise<void> {
    _cachedKey = null;
    await this.clear();
  },

  async keys(): Promise<string[]> {
    if (isCapacitor()) {
      try {
        const result = await withTimeout(Preferences.keys(), TIMEOUT_MS);
        return result.keys || [];
      } catch {
        logger.warn('Capacitor Preferences keys failed, falling back to localStorage');
      }
    }
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }
};

// Attach to window for global access
declare global {
  interface Window {
    storage: typeof storage;
  }
}

window.storage = storage;

export default storage;
