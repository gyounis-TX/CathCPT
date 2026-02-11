// Polyfill for window.storage API using localStorage
// This replaces the React Native AsyncStorage pattern used in the original code

interface StorageResult {
  value: string | null;
}

const storage = {
  async get(key: string): Promise<StorageResult> {
    try {
      const value = localStorage.getItem(key);
      return { value };
    } catch {
      return { value: null };
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.error('Failed to save to localStorage:', key);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      console.error('Failed to remove from localStorage:', key);
    }
  },
};

// Attach to window for compatibility with the app code
declare global {
  interface Window {
    storage: typeof storage;
  }
}

window.storage = storage;

export default storage;
