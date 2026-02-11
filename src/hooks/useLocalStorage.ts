import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for persisting state to localStorage using the window.storage API
 * @param key - The storage key
 * @param defaultValue - Default value if nothing is stored
 * @returns Tuple of [value, setValue] similar to useState
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (newValue: T | ((prev: T) => T)) => Promise<void>] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial value from storage
  useEffect(() => {
    const loadValue = async () => {
      try {
        const result = await window.storage.get(key);
        if (result?.value) {
          setValue(JSON.parse(result.value));
        }
      } catch (error) {
        console.warn(`Failed to load ${key} from storage:`, error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadValue();
  }, [key]);

  // Save function that persists to storage
  const save = useCallback(async (newValue: T | ((prev: T) => T)) => {
    try {
      const valueToSave = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(value)
        : newValue;
      setValue(valueToSave);
      await window.storage.set(key, JSON.stringify(valueToSave));
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error);
    }
  }, [key, value]);

  return [value, save];
}

export default useLocalStorage;
