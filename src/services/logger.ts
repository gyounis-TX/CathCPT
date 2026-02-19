// PHI-safe logging utility
// info and warn are DEV-only — completely silent in production
// error always logs but must never include PHI objects

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.log(`[INFO] ${message}`, context ?? '');
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.warn(`[WARN] ${message}`, context ?? '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error ?? '');
  }
};
