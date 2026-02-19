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

// ==================== Pro Mode Types ====================

// User tier and role
export type UserTier = 'individual' | 'pro';
export type UserRole = 'physician' | 'admin' | null;

// User mode for feature gating
export interface UserMode {
  tier: UserTier;
  role: UserRole;
  isDevMode: boolean;
  organizationId: string | null;
  organizationName: string | null;
}

// ==================== Inpatient Rounds Types ====================

// Patient list type
export type PatientListType = 'my' | 'practice' | 'call';

// Inpatient record
export interface Inpatient {
  id: string;
  organizationId: string;
  primaryPhysicianId: string;
  primaryPhysicianName?: string; // denormalized for display
  hospitalId: string;
  hospitalName?: string;
  patientName: string;
  dob: string;
  mrn?: string;
  isActive: boolean;
  dischargedAt?: string;
  coveringFor?: string; // For call patients: whose patient we are covering
  createdAt: string;
  updatedAt?: string;
}

// Call list entry — references an existing inpatient
export interface CallListEntry {
  id: string;
  inpatientId: string;
  addedByUserId: string;
  addedAt: string;
  patientName: string;        // denormalized for display
  hospitalName: string;       // denormalized for display
  coveringFor: string | null; // original physician name (for cross-coverage)
  isActive: boolean;
}

// Admin sub-tab navigation
export type AdminTab = 'chargeQueue' | 'patientRoster' | 'physicians' | 'auditLog' | 'reports' | 'settings';

// Audit log entry
export type AuditAction =
  | 'patient_added'
  | 'patient_discharged'
  | 'patient_removed'
  | 'call_list_add'
  | 'call_list_remove'
  | 'call_list_clear'
  | 'charge_submitted'
  | 'charge_modified'
  | 'charge_marked_entered'
  | 'charge_marked_billed'
  | 'charge_batch_billed'
  | 'physician_invited'
  | 'physician_removed'
  | 'physician_role_changed'
  | 'practice_code_regenerated'
  | 'hospital_added'
  | 'hospital_deactivated'
  | 'cathlab_added'
  | 'cathlab_deactivated'
  | 'patient_merged';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  targetPatientId: string | null;
  targetPatientName: string | null;
  details: string;
  timestamp: string;
  listContext: PatientListType | null;
  metadata?: {
    chargeId?: string;
    chargeDate?: string;
    previousStatus?: string;
    newStatus?: string;
    previousCptCode?: string;
    newCptCode?: string;
    targetUserId?: string;
    batchSize?: number;
  };
}

// Patient diagnosis codes
export interface PatientDiagnosis {
  id: string;
  inpatientId: string;
  icd10Code: string;
  description: string;
  addedByUserId: string;
  addedAt: string;
  isActive: boolean;
}

// Patient diagnoses collection
export interface PatientDiagnoses {
  patientId: string;
  codes: {
    icd10: string;
    description: string;
    addedBy: string;
    addedDate: string;
    isActive: boolean;
  }[];
}

// Inpatient charge
export interface InpatientCharge {
  id: string;
  inpatientId: string;
  chargeDate: string;
  chargedByUserId: string;
  isInitialEncounter: boolean;
  createdAt: string;
  updatedAt?: string;
  status: 'pending' | 'entered' | 'billed';
}

// Charge code entry
export interface InpatientChargeCode {
  id: string;
  chargeId: string;
  cptCode: string;
  description?: string;
  timeMinutes?: number;
  rvu?: number;
}

// ==================== Cath Lab Sync Types ====================

// Synced cath case (Pro mode)
export interface SyncedCathCase {
  id: string;
  userId: string;
  organizationId: string;
  caseDate: string;
  patientInitials: string;
  hospitalId?: string;
  cathLabId?: string;
  inpatientId?: string; // Links to rounds patient if selected
  indication?: string;
  totalRvu: number;
  estimatedPayment: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: string;
  updatedAt?: string;
}

// Cath case codes
export interface SyncedCathCaseCode {
  id: string;
  caseId: string;
  cptCode: string;
  description: string;
  rvu: number;
  modifiers?: string[];
  vessel?: string;
}

// Cath case status
export interface CathCaseStatus {
  id: string;
  caseId: string;
  status: 'pending' | 'reviewed' | 'entered' | 'billed';
  reviewedBy?: string;
  reviewedAt?: string;
  enteredBy?: string;
  enteredAt?: string;
}

// ==================== PHI Scanner Types ====================

export interface PHIMatch {
  pattern: string;
  value: string;
  field: string;
  severity: 'high' | 'medium' | 'low';
}

// ==================== Custom Code Types ====================

export interface CustomCPTCode {
  id: string;
  code: string;
  description: string;
  rvu?: number;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}

// ==================== Code Group Settings ====================

export interface CodeGroupSettings {
  diagnosticCardiac: boolean;
  pci: boolean;
  pciAddOn: boolean;
  intravascularImaging: boolean;
  structuralHeart: boolean;
  tavr: boolean;
  adjunctive: boolean;
  mcs: boolean;
  peripheralAngiography: boolean;
  peripheralIntervention: boolean;
  venousInterventions: boolean;
  endovascular: boolean;
  echocardiography: boolean;
  electrophysiology: boolean;
  miscellaneous: boolean;
  other: true; // Always true, cannot be changed
}

// ==================== ICD-10 Types ====================

export interface ICD10Code {
  code: string;
  description: string;
  shortLabel: string;
  category: 'primary' | 'comorbid' | 'postProcedure';
  subcategory: string;
}

export interface ICD10Usage {
  code: string;
  useCount: number;
  lastUsed: string;
}

// ==================== Practice Connection Types ====================

export interface PracticeConnection {
  practiceCode: string;
  organizationId: string;
  organizationName: string;
  connectedAt: string;
  isActive: boolean;
}

// ==================== Sync Types ====================

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  failedCount: number;
}

// ==================== Dev Mode Types ====================

export interface DevModeSettings {
  enabled: boolean;
  userTier: UserTier;
  userRole: UserRole;
  useMockServer: boolean;
  mockOrganizationId: string | null;
  mockOrganizationName: string | null;
}

// ==================== Organization Types (Admin) ====================

export interface Organization {
  id: string;
  name: string;
  practiceCode: string;
  isActive: boolean;
  createdAt: string;
}

export interface Hospital {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CathLab {
  id: string;
  organizationId: string;
  hospitalId?: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// ==================== Admin Portal Types ====================

export interface PracticeMember {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  joinedAt: string;
  isActive: boolean;
  chargeCount?: number;
}

export interface PatientMatchResult {
  patient: Inpatient;
  matchType: 'exact_mrn' | 'close_name_dob';
  confidence: number;
  matchDetails: string;
}

export interface ChargeQueueFilters {
  status: 'all' | 'pending' | 'entered';
  physicianId: string | null;
  hospitalId: string | null;
  dateRange: { start: string; end: string } | null;
  searchQuery: string;
}

export interface ChargeQueueItem {
  charge: import('../services/chargesService').StoredCharge;
  patient: Inpatient;
  physicianName: string;
  hospitalName: string;
}

export interface PatientWithCharges {
  patient: Inpatient;
  charges: import('../services/chargesService').StoredCharge[];
  totalCharges: number;
  pendingCharges: number;
  billedCharges: number;
  totalRVU: number;
  totalPayment: number;
  lastChargeDate: string | null;
}
