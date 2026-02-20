import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.storage matching the interface in storage.ts
const storageMap = new Map<string, string>();

const mockStorage = {
  get: vi.fn(async (key: string) => {
    return { value: storageMap.get(key) ?? null };
  }),
  set: vi.fn(async (key: string, value: string) => {
    storageMap.set(key, value);
  }),
  remove: vi.fn(async (key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(async () => {
    storageMap.clear();
  }),
  clearAll: vi.fn(async () => {
    storageMap.clear();
  }),
  keys: vi.fn(async () => {
    return Array.from(storageMap.keys());
  })
};

(window as any).storage = mockStorage;

// Helper to reset storage between tests
export function resetMockStorage() {
  storageMap.clear();
  vi.clearAllMocks();
}

// Mock import.meta.env
vi.stubEnv('DEV', true);
vi.stubEnv('PROD', false);
