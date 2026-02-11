// Core types for all features

export interface CPTCode {
  code: string;
  summary: string;
  description: string;
  isNew?: boolean;
  isAddOn?: boolean;
  requiresVessel?: boolean;
  isDivider?: boolean;
}

export interface SelectedCode {
  code: string;
  description: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface CaseTemplate {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  codes: {
    primary: string[];
    vessel2?: string[];
    vessel3?: string[];
  };
  indication?: {
    category: 'cardiac' | 'peripheral' | 'structural';
    code: string;
  };
  includeSedation?: boolean;
  sedationUnits?: number;
}

export interface SavedCase {
  id: string;
  timestamp: number;
  caseId: string;
  location: string;
  codes: {
    primary: SelectedCode[];
    vessel2: SelectedCode[];
    vessel3: SelectedCode[];
  };
  vessels: {
    v1: Record<string, string>;
    v2: Record<string, string>;
    v3: Record<string, string>;
  };
  indication: string;
  totalRVU: number;
  estimatedPayment: number;
}

export interface BillingRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'suggestion';
  check: (context: BillingContext) => RuleViolation | null;
  learnMoreContent?: string;
}

export interface RuleViolation {
  ruleId: string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  affectedCodes: string[];
  suggestion?: string;
  canOverride: boolean;
  // Actionable fix options
  fixOptions?: {
    label: string;
    codesToRemove: string[];
    codeToAdd?: string;
  }[];
}

export interface BillingContext {
  allCodes: Array<{ code: string; vessel?: string }>;
  hasCode: (code: string) => boolean;
  getCodeVessel: (code: string) => string | undefined;
  getCodesInVessel: (vessel: string) => string[];
  indication?: string;
}

export interface PHIMatch {
  pattern: string;
  value: string;
  field: string;
  severity: 'high' | 'medium' | 'low';
}

export interface PHISettings {
  strictMode: boolean;
  autoScrub: boolean;
}
