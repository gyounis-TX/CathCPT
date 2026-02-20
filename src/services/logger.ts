// PHI-safe logging utility
// info and warn are DEV-only — completely silent in production
// error always logs but must never include PHI objects

import { captureException, captureMessage, addBreadcrumb as sentryBreadcrumb } from './sentryConfig';

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.log(`[INFO] ${message}`, context ?? '');
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.warn(`[WARN] ${message}`, context ?? '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error ?? '');
    // Send to Sentry (PHI is scrubbed in beforeSend)
    if (error instanceof Error) {
      captureException(error);
    } else if (error) {
      captureMessage(message);
    }
  }
};

export function addBreadcrumb(category: string, message: string): void {
  sentryBreadcrumb(category, message);
}
