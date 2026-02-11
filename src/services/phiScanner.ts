import { PHIMatch } from '../types';

interface PHIPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * PHI detection patterns based on HIPAA identifiers
 */
const phiPatterns: PHIPattern[] = [
  {
    id: 'full-name',
    name: 'Potential Full Name',
    pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    severity: 'high',
    description: 'Detected what appears to be a full name (First Last format)'
  },
  {
    id: 'dob',
    name: 'Date of Birth',
    pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    severity: 'high',
    description: 'Detected what appears to be a date (MM/DD/YYYY or similar format)'
  },
  {
    id: 'ssn',
    name: 'Social Security Number',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    severity: 'high',
    description: 'Detected what appears to be a Social Security Number'
  },
  {
    id: 'mrn',
    name: 'Medical Record Number',
    pattern: /\bMRN[:#\s]*\d{6,10}\b/gi,
    severity: 'high',
    description: 'Detected what appears to be a Medical Record Number'
  },
  {
    id: 'phone',
    name: 'Phone Number',
    pattern: /\b\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4}\b/g,
    severity: 'medium',
    description: 'Detected what appears to be a phone number'
  },
  {
    id: 'email',
    name: 'Email Address',
    pattern: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
    severity: 'medium',
    description: 'Detected what appears to be an email address'
  },
  {
    id: 'address',
    name: 'Street Address',
    pattern: /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)\b/gi,
    severity: 'medium',
    description: 'Detected what appears to be a street address'
  },
  {
    id: 'zipcode',
    name: 'ZIP Code',
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    severity: 'low',
    description: 'Detected what appears to be a ZIP code'
  }
];

/**
 * Scan text for potential PHI
 * @param text - The text to scan
 * @param field - The field name being scanned (for reporting)
 * @returns Array of PHI matches found
 */
export function scanForPHI(text: string, field: string = 'text'): PHIMatch[] {
  const matches: PHIMatch[] = [];

  if (!text || typeof text !== 'string') {
    return matches;
  }

  for (const patternDef of phiPatterns) {
    // Reset regex state for global patterns
    patternDef.pattern.lastIndex = 0;

    let match;
    while ((match = patternDef.pattern.exec(text)) !== null) {
      // Filter out common false positives
      const value = match[0];

      // Skip if it looks like a CPT code (5 digits)
      if (patternDef.id === 'ssn' && /^\d{5}$/.test(value.replace(/[-\s]/g, ''))) {
        continue;
      }

      // Skip if it looks like a case ID pattern we expect
      if (patternDef.id === 'full-name' && /^Case\s+\d+$/i.test(value)) {
        continue;
      }

      matches.push({
        pattern: patternDef.name,
        value: value,
        field: field,
        severity: patternDef.severity
      });
    }
  }

  return matches;
}

/**
 * Scan multiple fields for PHI
 * @param fields - Object with field names and values
 * @returns Array of all PHI matches found across fields
 */
export function scanFieldsForPHI(fields: Record<string, string>): PHIMatch[] {
  const allMatches: PHIMatch[] = [];

  for (const [fieldName, value] of Object.entries(fields)) {
    const fieldMatches = scanForPHI(value, fieldName);
    allMatches.push(...fieldMatches);
  }

  return allMatches;
}

/**
 * Auto-scrub detected PHI from text
 * @param text - The text to scrub
 * @returns Scrubbed text with PHI replaced by [REDACTED]
 */
export function scrubPHI(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let scrubbed = text;

  for (const patternDef of phiPatterns) {
    // Only auto-scrub high and medium severity items
    if (patternDef.severity === 'high' || patternDef.severity === 'medium') {
      scrubbed = scrubbed.replace(patternDef.pattern, `[${patternDef.name.toUpperCase()} REDACTED]`);
    }
  }

  return scrubbed;
}

/**
 * Get a summary of PHI scan results
 * @param matches - Array of PHI matches
 * @returns Summary object with counts by severity
 */
export function getPHISummary(matches: PHIMatch[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
  hasHighSeverity: boolean;
} {
  const high = matches.filter(m => m.severity === 'high').length;
  const medium = matches.filter(m => m.severity === 'medium').length;
  const low = matches.filter(m => m.severity === 'low').length;

  return {
    total: matches.length,
    high,
    medium,
    low,
    hasHighSeverity: high > 0
  };
}

/**
 * Check if text contains any high-severity PHI
 * @param text - Text to check
 * @returns true if high-severity PHI detected
 */
export function containsHighSeverityPHI(text: string): boolean {
  const matches = scanForPHI(text);
  return matches.some(m => m.severity === 'high');
}

export default {
  scanForPHI,
  scanFieldsForPHI,
  scrubPHI,
  getPHISummary,
  containsHighSeverityPHI
};
