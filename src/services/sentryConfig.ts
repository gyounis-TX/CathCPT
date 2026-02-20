// Sentry error tracking configuration
// PHI is stripped before sending — only safe context is transmitted

import * as Sentry from '@sentry/react';

// PHI patterns to scrub from error data
const PHI_PATTERNS = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,        // Potential full names (First Last)
  /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/g,        // Names in Last, First format
  /\b\d{3}-?\d{2}-?\d{4}\b/g,                // SSN patterns
  /\b\d{2}\/\d{2}\/\d{4}\b/g,                // DOB patterns (MM/DD/YYYY)
  /\b\d{4}-\d{2}-\d{2}\b/g,                  // DOB patterns (YYYY-MM-DD)
  /\bMRN[:\s]*\w+/gi,                         // MRN patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
];

function scrubPHI(str: string): string {
  let result = str;
  for (const pattern of PHI_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function scrubEventData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Scrub exception messages
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) {
        ex.value = scrubPHI(ex.value);
      }
    }
  }

  // Scrub breadcrumb messages
  if (event.breadcrumbs) {
    for (const bc of event.breadcrumbs) {
      if (bc.message) {
        bc.message = scrubPHI(bc.message);
      }
    }
  }

  // Remove any extra data that might contain PHI
  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      const val = event.extra[key];
      if (typeof val === 'string') {
        event.extra[key] = scrubPHI(val);
      }
    }
  }

  return event;
}

export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Skip init if DSN not configured (graceful for dev)
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? 'production' : 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      return scrubEventData(event);
    },
    // Never send user PII
    sendDefaultPii: false,
  });
}

export function setSentryUser(userId: string): void {
  Sentry.setUser({ id: userId });
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}

export function captureException(error: unknown): void {
  Sentry.captureException(error);
}

export function captureMessage(message: string): void {
  Sentry.captureMessage(scrubPHI(message));
}

export function addBreadcrumb(category: string, message: string): void {
  Sentry.addBreadcrumb({ category, message: scrubPHI(message), level: 'info' });
}
