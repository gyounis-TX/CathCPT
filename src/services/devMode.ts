// Dev Mode Service
// Provides testing toggle for switching between Individual/Pro modes during development

import { UserTier, UserRole, AuthUser } from './authService';
import { logger } from './logger';

const DEV_MODE_KEY = 'dev_mode_override';
const DEV_MODE_UNLOCK_COUNT_KEY = 'dev_mode_unlock_count';

export interface DevModeSettings {
  enabled: boolean;
  userTier: UserTier;
  userRole: UserRole;
  useMockServer: boolean;
  mockOrganizationId: string | null;
  mockOrganizationName: string | null;
}

export interface UserMode {
  tier: UserTier;
  role: UserRole;
  isDevMode: boolean;
  organizationId: string | null;
  organizationName: string | null;
}

// Default dev mode settings
const defaultDevModeSettings: DevModeSettings = {
  enabled: false,
  userTier: 'individual',
  userRole: null,
  useMockServer: false,
  mockOrganizationId: null,
  mockOrganizationName: null
};

// Mock data for testing
export const mockOrganizations = [
  { id: 'YOCA', name: 'Younis Cardiology' },
  { id: 'mock-org-2', name: 'City Heart Center' },
  { id: 'mock-org-3', name: 'University Cardiology Group' }
];

export const mockHospitals = [
  { id: 'mock-hosp-1', name: 'DHC', organizationId: 'YOCA' },
  { id: 'mock-hosp-2', name: 'HMH', organizationId: 'YOCA' },
  { id: 'mock-hosp-3', name: 'BSLMC', organizationId: 'YOCA' }
];

export const mockCathLabs = [
  { id: 'mock-lab-1', name: 'DHC Cath Lab', hospitalId: 'mock-hosp-1' },
  { id: 'mock-lab-2', name: 'HMH Cath Lab', hospitalId: 'mock-hosp-2' },
  { id: 'mock-lab-3', name: 'BSLMC Cath Lab', hospitalId: 'mock-hosp-3' }
];

export const mockPracticeMembers = [
  {
    id: 'user-1',
    email: 'gyounis@youniscardiology.com',
    displayName: 'Dr. George Younis',
    role: 'admin' as const,
    joinedAt: '2025-01-01T10:00:00Z',
    isActive: true,
    chargeCount: 42
  },
  {
    id: 'user-2',
    email: 'dr.khan@youniscardiology.com',
    displayName: 'Dr. Khan',
    role: 'physician' as const,
    joinedAt: '2025-01-20T10:00:00Z',
    isActive: true,
    chargeCount: 18
  },
  {
    id: 'user-3',
    email: 'dr.bruce@youniscardiology.com',
    displayName: 'Dr. Bruce',
    role: 'physician' as const,
    joinedAt: '2025-02-01T10:00:00Z',
    isActive: true,
    chargeCount: 7
  }
];

export const mockCharges = [
  {
    id: 'mock-charge-1',
    inpatientId: '1',
    chargeDate: new Date().toISOString().split('T')[0],
    cptCode: '99223',
    cptDescription: 'Initial hospital care, high complexity',
    rvu: 3.86,
    diagnoses: ['I21.01', 'I25.10', 'I10'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'pending' as const,
    submittedByUserId: 'user-1',
    submittedByUserName: 'Dr. George Younis'
  },
  {
    id: 'mock-charge-2',
    inpatientId: '1',
    chargeDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    cptCode: '99232',
    cptDescription: 'Subsequent hospital care, moderate complexity',
    rvu: 1.39,
    diagnoses: ['I21.01', 'I25.10'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'entered' as const,
    submittedByUserId: 'user-1',
    submittedByUserName: 'Dr. George Younis',
    enteredAt: new Date(Date.now() - 43200000).toISOString(),
    enteredBy: 'Dr. George Younis'
  },
  {
    id: 'mock-charge-3',
    inpatientId: '2',
    chargeDate: new Date().toISOString().split('T')[0],
    cptCode: '99232',
    cptDescription: 'Subsequent hospital care, moderate complexity',
    rvu: 1.39,
    diagnoses: ['I48.91', 'I10'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'pending' as const,
    submittedByUserId: 'user-1',
    submittedByUserName: 'Dr. George Younis'
  },
  {
    id: 'mock-charge-4',
    inpatientId: '3',
    chargeDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    cptCode: '99222',
    cptDescription: 'Initial hospital care, moderate complexity',
    rvu: 2.61,
    diagnoses: ['I50.22', 'I25.10', 'N18.4'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'billed' as const,
    submittedByUserId: 'user-2',
    submittedByUserName: 'Dr. Khan',
    enteredAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
    enteredBy: 'Dr. George Younis',
    billedAt: new Date(Date.now() - 86400000).toISOString(),
    billedBy: 'Dr. George Younis'
  },
  {
    id: 'mock-charge-5',
    inpatientId: '3',
    chargeDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    cptCode: '99232',
    cptDescription: 'Subsequent hospital care, moderate complexity',
    rvu: 1.39,
    diagnoses: ['I50.22', 'I25.10'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending' as const,
    submittedByUserId: 'user-2',
    submittedByUserName: 'Dr. Khan'
  },
  {
    id: 'mock-charge-6',
    inpatientId: '4',
    chargeDate: new Date().toISOString().split('T')[0],
    cptCode: '99231',
    cptDescription: 'Subsequent hospital care, low complexity',
    rvu: 0.99,
    diagnoses: ['I47.2', 'R55'],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'entered' as const,
    submittedByUserId: 'user-3',
    submittedByUserName: 'Dr. Bruce',
    enteredAt: new Date(Date.now() - 3600000).toISOString(),
    enteredBy: 'Dr. George Younis'
  },
  {
    id: 'mock-charge-7',
    inpatientId: '5',
    chargeDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    cptCode: '99223',
    cptDescription: 'Initial hospital care, high complexity',
    rvu: 3.86,
    diagnoses: ['I50.32', 'I48.2', 'I10', 'N18.3'],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: 'billed' as const,
    submittedByUserId: 'user-1',
    submittedByUserName: 'Dr. George Younis',
    billedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    billedBy: 'Dr. George Younis'
  },
  {
    id: 'mock-charge-8',
    inpatientId: '5',
    chargeDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    cptCode: '99232',
    cptDescription: 'Subsequent hospital care, moderate complexity',
    rvu: 1.39,
    diagnoses: ['I50.32', 'I48.2'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'pending' as const,
    submittedByUserId: 'user-1',
    submittedByUserName: 'Dr. George Younis'
  }
];

export const mockAuditEntries = [
  {
    id: 'audit-mock-1',
    action: 'charge_submitted' as const,
    userId: 'user-1',
    userName: 'Dr. George Younis',
    targetPatientId: '1',
    targetPatientName: 'Simpson, Homer',
    details: 'Submitted charge 99223 for Simpson, Homer',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    listContext: null,
    metadata: { chargeId: 'mock-charge-1', chargeDate: new Date().toISOString().split('T')[0], newStatus: 'pending' }
  },
  {
    id: 'audit-mock-2',
    action: 'charge_marked_entered' as const,
    userId: 'admin-1',
    userName: 'Dr. George Younis',
    targetPatientId: '1',
    targetPatientName: 'Simpson, Homer',
    details: 'Marked charge 99232 as entered for Simpson, Homer',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    listContext: null,
    metadata: { chargeId: 'mock-charge-2', chargeDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], previousStatus: 'pending', newStatus: 'entered' }
  },
  {
    id: 'audit-mock-3',
    action: 'charge_marked_billed' as const,
    userId: 'admin-1',
    userName: 'Dr. George Younis',
    targetPatientId: '3',
    targetPatientName: 'Burns, Montgomery',
    details: 'Marked charge 99222 as billed for Burns, Montgomery',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    listContext: null,
    metadata: { chargeId: 'mock-charge-4', chargeDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], previousStatus: 'entered', newStatus: 'billed' }
  },
  {
    id: 'audit-mock-4',
    action: 'patient_added' as const,
    userId: 'user-1',
    userName: 'Dr. George Younis',
    targetPatientId: '1',
    targetPatientName: 'Simpson, Homer',
    details: 'Added patient Simpson, Homer',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    listContext: 'my' as const
  },
  {
    id: 'audit-mock-5',
    action: 'charge_submitted' as const,
    userId: 'user-2',
    userName: 'Dr. Khan',
    targetPatientId: '3',
    targetPatientName: 'Burns, Montgomery',
    details: 'Submitted charge 99222 for Burns, Montgomery',
    timestamp: new Date(Date.now() - 2.5 * 86400000).toISOString(),
    listContext: null,
    metadata: { chargeId: 'mock-charge-4', chargeDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], newStatus: 'pending' }
  },
  {
    id: 'audit-mock-6',
    action: 'practice_code_regenerated' as const,
    userId: 'admin-1',
    userName: 'Dr. George Younis',
    targetPatientId: null,
    targetPatientName: null,
    details: 'Regenerated practice invite code',
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    listContext: null
  }
];

// In-memory cache to avoid repeated storage reads + decryption
let _devSettingsCache: DevModeSettings | null | undefined = undefined;
let _devSettingsCacheTime = 0;
const DEV_CACHE_TTL = 2000; // 2 seconds

// Get dev mode settings
export async function getDevModeSettings(): Promise<DevModeSettings | null> {
  // Return cached value if fresh
  if (_devSettingsCache !== undefined && Date.now() - _devSettingsCacheTime < DEV_CACHE_TTL) {
    return _devSettingsCache;
  }

  try {
    const result = await window.storage.get(DEV_MODE_KEY);
    if (result?.value) {
      const settings = JSON.parse(result.value) as DevModeSettings;
      if (settings.enabled) {
        _devSettingsCache = settings;
        _devSettingsCacheTime = Date.now();
        return settings;
      }
    }
    _devSettingsCache = null;
    _devSettingsCacheTime = Date.now();
    return null;
  } catch {
    return null;
  }
}

// Save dev mode settings
export async function saveDevModeSettings(settings: DevModeSettings): Promise<void> {
  // Invalidate cache on write
  _devSettingsCache = settings.enabled ? settings : null;
  _devSettingsCacheTime = Date.now();
  try {
    await window.storage.set(DEV_MODE_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error('Error saving dev mode settings', error);
    throw error;
  }
}

// Enable dev mode
export async function enableDevMode(
  tier: UserTier = 'individual',
  role: UserRole = null
): Promise<void> {
  const settings: DevModeSettings = {
    enabled: true,
    userTier: tier,
    userRole: role,
    useMockServer: true,
    mockOrganizationId: role ? mockOrganizations[0].id : null,
    mockOrganizationName: role ? mockOrganizations[0].name : null
  };
  await saveDevModeSettings(settings);
}

// Disable dev mode
export async function disableDevMode(): Promise<void> {
  await saveDevModeSettings(defaultDevModeSettings);
}

// Toggle dev mode
export async function toggleDevMode(): Promise<boolean> {
  const settings = await getDevModeSettings();
  if (settings?.enabled) {
    await disableDevMode();
    return false;
  } else {
    await enableDevMode();
    return true;
  }
}

// Set dev mode tier and role
export async function setDevModeUserType(tier: UserTier, role: UserRole): Promise<void> {
  const currentSettings = await getDevModeSettings();

  const settings: DevModeSettings = {
    enabled: true,
    userTier: tier,
    userRole: role,
    useMockServer: currentSettings?.useMockServer ?? true,
    mockOrganizationId: tier === 'pro' && role ? mockOrganizations[0].id : null,
    mockOrganizationName: tier === 'pro' && role ? mockOrganizations[0].name : null
  };

  await saveDevModeSettings(settings);
}

// Get current user mode (checks dev override first, then real auth)
export async function getUserMode(
  authenticatedUser: AuthUser | null = null
): Promise<UserMode> {
  // Check dev mode override first
  const devSettings = await getDevModeSettings();
  if (devSettings?.enabled) {
    return {
      tier: devSettings.userTier,
      role: devSettings.userRole,
      isDevMode: true,
      organizationId: devSettings.mockOrganizationId,
      organizationName: devSettings.mockOrganizationName
    };
  }

  // Use authenticated user if available
  if (authenticatedUser) {
    return {
      tier: authenticatedUser.tier,
      role: authenticatedUser.role,
      isDevMode: false,
      organizationId: authenticatedUser.organizationId,
      organizationName: authenticatedUser.organizationName
    };
  }

  // Default to individual mode
  return {
    tier: 'individual',
    role: null,
    isDevMode: false,
    organizationId: null,
    organizationName: null
  };
}

// Check if dev mode is unlocked (requires 5 taps on version number)
export async function isDevModeUnlocked(): Promise<boolean> {
  const settings = await getDevModeSettings();
  return settings?.enabled ?? false;
}

// Increment unlock counter (for 5-tap unlock)
export async function incrementUnlockCounter(): Promise<number> {
  try {
    const result = await window.storage.get(DEV_MODE_UNLOCK_COUNT_KEY);
    let count = result?.value ? parseInt(result.value, 10) : 0;
    count += 1;

    await window.storage.set(DEV_MODE_UNLOCK_COUNT_KEY, count.toString());

    // Reset counter after timeout (2 seconds between taps)
    setTimeout(async () => {
      const currentResult = await window.storage.get(DEV_MODE_UNLOCK_COUNT_KEY);
      if (currentResult?.value && parseInt(currentResult.value, 10) === count) {
        await window.storage.set(DEV_MODE_UNLOCK_COUNT_KEY, '0');
      }
    }, 2000);

    return count;
  } catch {
    return 0;
  }
}

// Reset unlock counter
export async function resetUnlockCounter(): Promise<void> {
  await window.storage.set(DEV_MODE_UNLOCK_COUNT_KEY, '0');
}

// Check if should show dev options (5 taps on version)
export async function checkUnlockDevMode(): Promise<boolean> {
  const count = await incrementUnlockCounter();
  if (count >= 5) {
    await resetUnlockCounter();
    return true;
  }
  return false;
}

// Toggle mock server
export async function toggleMockServer(): Promise<boolean> {
  const settings = await getDevModeSettings();
  if (settings?.enabled) {
    settings.useMockServer = !settings.useMockServer;
    await saveDevModeSettings(settings);
    return settings.useMockServer;
  }
  return false;
}

// Clear all dev mode data (for testing)
export async function clearDevModeData(): Promise<void> {
  await window.storage.remove(DEV_MODE_KEY);
  await window.storage.remove(DEV_MODE_UNLOCK_COUNT_KEY);
}

// Get mock user for dev mode
export function getMockUser(tier: UserTier, role: UserRole): AuthUser {
  return {
    id: 'user-1',
    email: 'gyounis@youniscardiology.com',
    tier,
    role,
    organizationId: tier === 'pro' ? mockOrganizations[0].id : null,
    organizationName: tier === 'pro' ? mockOrganizations[0].name : null,
    displayName: 'Dr. George Younis',
    createdAt: '2025-01-01T10:00:00Z'
  };
}

// Helper to check feature availability based on user mode
export function isFeatureAvailable(feature: string, userMode: UserMode): boolean {
  const proOnlyFeatures = [
    'rounds',
    'sync',
    'practiceConnection',
    'adminPortal',
    'cloudBackup',
    'multiDevice'
  ];

  const adminOnlyFeatures = ['adminPortal', 'manageUsers', 'manageCathLabs', 'reports'];

  if (adminOnlyFeatures.includes(feature)) {
    return userMode.tier === 'pro' && userMode.role === 'admin';
  }

  if (proOnlyFeatures.includes(feature)) {
    return userMode.tier === 'pro';
  }

  // All other features available to everyone
  return true;
}
