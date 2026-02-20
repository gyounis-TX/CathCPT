import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info'): void {
  if (globalShowToast) {
    globalShowToast(message, type);
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++idCounter.current}`;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register global handler
  globalShowToast = addToast;

  return { toasts, addToast, removeToast };
}
