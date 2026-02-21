import React, { useState, useEffect, useRef } from 'react';
import { Heart, Users, Shield, Settings, LogOut, RefreshCw, History, Lightbulb, HelpCircle, FileText, Stethoscope, List, ClipboardCheck } from 'lucide-react';
import CardiologyCPTApp, { CardiologyCPTAppHandle, CathLabBottomTab } from './CardiologyCPTApp';
import { LoginScreen } from './screens/LoginScreen';
import { RoundsScreen } from './screens/RoundsScreen';
import { AdminPortalScreen } from './screens/AdminPortalScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { UpdatesScreen } from './screens/UpdatesScreen';
import { HelpScreen } from './screens/HelpScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AddPatientDialog } from './components/AddPatientDialog';
import { AddChargeDialog } from './components/AddChargeDialog';
import { CallListPickerDialog } from './components/CallListPickerDialog';
import { CodeGroupSettings } from './components/CodeGroupSettings';
import { LockScreen } from './components/LockScreen';
import { BiometricLoginPrompt } from './components/BiometricLoginPrompt';
import { isBiometricAvailable, getBiometricPreference } from './services/biometricService';
import { HIPAAInlineBanner } from './components/HIPAAInlineBanner';
// HelpPanel replaced by full-screen HelpScreen
import { OfflineBanner } from './components/OfflineBanner';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { ToastContainer } from './components/Toast';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { useToast, showToast } from './hooks/useToast';
import { UserMode, Inpatient, Hospital, CathLab, CallListEntry } from './types';
import { getUserMode, checkUnlockDevMode, DevModeSettings, getDevModeSettings, setDevModeUserType, disableDevMode, mockCharges } from './services/devMode';
import { getCurrentSession, signOut, AuthUser } from './services/authService';
import { initializeFirebase, isFirebaseConfigured } from './services/firebaseConfig';
import { getSyncStatus, SyncStatus, processSyncQueue, setOnlineStatus } from './services/syncService';
import { getPracticeConnection, getHospitals, getCathLabs } from './services/practiceConnection';
import { getOrgInpatients, createInpatient, dischargeInpatient, getLocalPatients, saveLocalPatient, updateLocalPatient } from './services/inpatientService';
import { getCallListEntries, addToCallList, removeFromCallList, clearCallList } from './services/callListService';
import { logAuditEvent } from './services/auditService';
import { logger } from './services/logger';
import { setSentryUser, clearSentryUser } from './services/sentryConfig';
import { checkConcurrentVisit } from './services/concurrentVisitService';
import {
  StoredCharge,
  getChargesByPatientAndDate,
  getStoredDiagnoses,
  saveCharge,
  saveDiagnoses,
  formatDateForStorage,
  updateCharge,
  markChargeBilled,
  relinkChargesToPatient
} from './services/chargesService';

// Active tab type
type AppTab = 'cathlab' | 'rounds' | 'admin';

const App: React.FC = () => {
  // Auth state
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStep, setInitStep] = useState('starting...');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userMode, setUserMode] = useState<UserMode>({
    tier: 'individual',
    role: null,
    isDevMode: false,
    organizationId: null,
    organizationName: null
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppTab>('cathlab');
  const [cathLabBottomTab, setCathLabBottomTab] = useState<CathLabBottomTab>('addcase');

  // Collapsing header state
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastSyncResult: null,
    failedCount: 0
  });

  // Dialog state
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [selectedPatientForCharge, setSelectedPatientForCharge] = useState<Inpatient | null>(null);
  const [showCodeGroupSettings, setShowCodeGroupSettings] = useState(false);
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [showCallListPicker, setShowCallListPicker] = useState(false);
  const [isCrossCoverageAdd, setIsCrossCoverageAdd] = useState(false);

  // Practice data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cathLabs, setCathLabs] = useState<CathLab[]>([]);

  // Ref for CathCPT header buttons
  const cathCPTRef = useRef<CardiologyCPTAppHandle>(null);

  // Patients state (for Rounds)
  const [patients, setPatients] = useState<Inpatient[]>([]);
  const [callListEntries, setCallListEntries] = useState<CallListEntry[]>([]);

  // Charges and diagnoses state
  const [charges, setCharges] = useState<Record<string, Record<string, StoredCharge>>>({});
  const [patientDiagnoses, setPatientDiagnoses] = useState<Record<string, string[]>>({});

  // Edit charge state
  const [editingCharge, setEditingCharge] = useState<StoredCharge | null>(null);

  // Dev mode state
  const [devModeSettings, setDevModeSettings] = useState<DevModeSettings | null>(null);

  // Inline HIPAA banner state (non-blocking)
  const [showHipaaBanner, setShowHipaaBanner] = useState(false);

  // Full-screen view state
  type FullScreenView = null | 'history' | 'updates' | 'settings' | 'help';
  const [fullScreenView, setFullScreenView] = useState<FullScreenView>(null);

  // Biometric enrollment prompt after first login
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  // Help is now a full-screen view via fullScreenView state

  // Toast notifications
  const { toasts, removeToast } = useToast();

  // Track previous lock state for session_locked audit
  const prevIsLockedRef = useRef(false);

  // Session timeout — locks after 5 minutes of inactivity (HIPAA)
  const { isLocked, unlock: unlockSession } = useInactivityTimer(authUser !== null);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Session locked audit log
  useEffect(() => {
    if (isLocked && !prevIsLockedRef.current && authUser) {
      const orgId = userMode.organizationId;
      if (orgId) {
        logAuditEvent(orgId, {
          action: 'session_locked',
          userId: authUser.id,
          userName: authUser.displayName || authUser.email,
          targetPatientId: null,
          targetPatientName: null,
          details: 'Session locked due to inactivity',
          listContext: null
        });
      }
    }
    prevIsLockedRef.current = isLocked;
  }, [isLocked, authUser, userMode.organizationId]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      loadSyncStatus();
      showToast('Back online — changes will sync automatically', 'success');
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      loadSyncStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background screenshot prevention — shows privacy overlay in task switcher
  useEffect(() => {
    const handleVisibilityChange = () => {
      const overlay = document.getElementById('privacy-overlay');
      if (overlay) {
        overlay.style.display = document.hidden ? 'flex' : 'none';
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Collapsing header — hide Row 1 on scroll down, show on scroll up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const y = el.scrollTop;
      if (y > lastScrollYRef.current && y > 60) {
        setHeaderVisible(false);
      } else if (y < lastScrollYRef.current) {
        setHeaderVisible(true);
      }
      lastScrollYRef.current = y;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset header visibility on bottom tab change
  useEffect(() => {
    setHeaderVisible(true);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [cathLabBottomTab]);

  const initializeApp = async () => {
    // Hard deadline — never stay on loading screen longer than 8 seconds
    const masterTimeout = setTimeout(() => {
      logger.warn('App init hit master timeout — forcing load');
      setIsInitializing(false);
    }, 8000);

    try {
      // Check HIPAA acknowledgment (non-blocking — just sets banner visibility)
      try {
        const hipaaResult = await window.storage.get('hipaa_ack_timestamp');
        if (!hipaaResult?.value) {
          setShowHipaaBanner(true);
        }
      } catch {
        setShowHipaaBanner(true);
      }

      // Always initialize Firebase — all users must authenticate
      setInitStep('connecting to server...');
      if (isFirebaseConfigured()) {
        try {
          await initializeFirebase();
        } catch (fbErr) {
          logger.warn('Firebase init failed', fbErr);
        }
      }

      // Check for stored session
      setInitStep('checking credentials...');
      let currentUser: AuthUser | null = null;

      if (isFirebaseConfigured()) {
        try {
          const { user } = await getCurrentSession();
          if (user) {
            currentUser = user;
            setAuthUser(user);
          }
        } catch {
          // No session — user will see login screen
        }
      }

      // No session found — stop here, render will show login gate
      if (!currentUser) {
        setIsInitializing(false);
        clearTimeout(masterTimeout);
        return;
      }

      // User is authenticated — continue loading app data
      setInitStep('loading settings...');
      try {
        const devSettings = await getDevModeSettings();
        setDevModeSettings(devSettings);
      } catch {
        // Dev mode not critical
      }

      setInitStep('checking user mode...');
      const mode = await getUserMode(currentUser);
      setUserMode(mode);

      // Default to admin tab for admin users
      if (mode.role === 'admin') {
        setActiveTab('admin');
      }

      if (mode.tier === 'pro' && mode.organizationId) {
        setInitStep('loading pro data...');
        try {
          await Promise.all([
            loadSyncStatus(),
            loadHospitals(),
            loadPatients(mode.organizationId),
            loadCallList(mode.organizationId, currentUser?.id || 'user-1'),
            loadChargesAndDiagnoses()
          ]);
        } catch (proErr) {
          logger.warn('Pro data load partially failed', proErr);
        }
      }

      setInitStep('done');
    } catch (error) {
      setInitStep('error: ' + (error instanceof Error ? error.message : String(error)));
      logger.error('App initialization error', error);
    } finally {
      clearTimeout(masterTimeout);
      setIsInitializing(false);
    }
  };

  const loadSyncStatus = async () => {
    const status = await getSyncStatus();
    setSyncStatus(status);
  };

  const loadHospitals = async () => {
    // Check storage first (admin-managed hospitals/cath labs persist here)
    const [storedHosp, storedLabs] = await Promise.all([
      window.storage.get('admin_hospitals'),
      window.storage.get('admin_cathLabs'),
    ]);
    if (storedHosp?.value) {
      setHospitals(JSON.parse(storedHosp.value));
    } else {
      const hospitalList = await getHospitals();
      setHospitals(hospitalList);
    }
    if (storedLabs?.value) {
      setCathLabs(JSON.parse(storedLabs.value));
    } else {
      const labList = await getCathLabs();
      setCathLabs(labList);
    }
  };

  const loadPatients = async (orgId: string | null) => {
    if (!orgId) return;
    const backendPatients = await getOrgInpatients(orgId);
    const localPatients = await getLocalPatients();
    const backendIds = new Set(backendPatients.map(p => p.id));
    const merged = [...backendPatients, ...localPatients.filter(p => !backendIds.has(p.id))];
    setPatients(merged);
  };

  const loadCallList = async (orgId: string | null, userId: string) => {
    if (!orgId) return;
    const entries = await getCallListEntries(orgId, userId);
    setCallListEntries(entries);
  };

  const loadChargesAndDiagnoses = async () => {
    const loadedCharges = await getChargesByPatientAndDate();

    // Merge mock charges when in dev mode so Rounds and admin patients see them
    const devSettings = await getDevModeSettings();
    if (devSettings?.enabled) {
      for (const mc of mockCharges) {
        const charge = mc as StoredCharge;
        if (!loadedCharges[charge.inpatientId]) {
          loadedCharges[charge.inpatientId] = {};
        }
        // Only add mock charge if no stored charge exists for that patient/date
        // (stored charges take priority — mock charges may have been persisted after billing)
        if (!loadedCharges[charge.inpatientId][charge.chargeDate]) {
          loadedCharges[charge.inpatientId][charge.chargeDate] = charge;
        }
      }
    }

    setCharges(loadedCharges);

    const loadedDiagnoses = await getStoredDiagnoses();
    // Merge with mock data for Simpsons patients
    const mockDiagnoses: Record<string, string[]> = {
      '1': ['I21.01', 'I25.10', 'I10', 'E11.9', 'E78.5', 'E66.01', 'G47.33', 'K21.0'], // Homer - STEMI, CAD, HTN, DM2, HLD, Obesity, Sleep Apnea, GERD
      '2': ['I48.91', 'I10'], // Marge - AFib, HTN
      '3': ['I50.22', 'I25.10', 'N18.4', 'E11.65'], // Mr. Burns - CHF, CAD, CKD4, DM with hyperglycemia
      '4': ['I47.2', 'R55'], // Ned - VT, Syncope
      '5': ['I50.32', 'I48.2', 'I10', 'N18.3'] // Grandma Bouvier - Diastolic CHF, Chronic AFib, HTN, CKD3
    };
    setPatientDiagnoses({ ...mockDiagnoses, ...loadedDiagnoses });
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    setAuthUser(user);
    setSentryUser(user.id);

    // Update user mode
    const mode = await getUserMode(user);
    setUserMode(mode);

    // Load Pro data
    if (mode.tier === 'pro') {
      await loadSyncStatus();
      await loadHospitals();
      await loadPatients(mode.organizationId);
      await loadCallList(mode.organizationId, user.id);
      await loadChargesAndDiagnoses();
    }

    // Check if biometric enrollment should be offered after email/password login
    try {
      const available = await isBiometricAvailable();
      if (available) {
        const alreadyEnrolled = await getBiometricPreference();
        if (!alreadyEnrolled) {
          setShowBiometricPrompt(true);
        }
      }
    } catch {
      // Non-critical — skip biometric prompt
    }
  };

  const handleLogout = async () => {
    clearSentryUser();
    await signOut();
    setAuthUser(null);
    setUserMode({
      tier: 'individual',
      role: null,
      isDevMode: false,
      organizationId: null,
      organizationName: null
    });
    setActiveTab('cathlab');
  };

  const handleSync = async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    await processSyncQueue();
    await loadSyncStatus();
  };

  const handleAddPatient = () => {
    setShowAddPatient(true);
  };

  const handleAddCharge = (patient: Inpatient) => {
    setSelectedPatientForCharge(patient);
    setShowAddCharge(true);
  };

  const handlePracticeNameChanged = (name: string) => {
    setUserMode(prev => ({ ...prev, organizationName: name }));
  };

  const handleRoundsRefresh = async () => {
    await loadPatients(userMode.organizationId);
    await loadCallList(userMode.organizationId, authUser?.id || 'user-1');
    await loadChargesAndDiagnoses();
  };

  const handlePatientSave = async (patient: Omit<Inpatient, 'id' | 'createdAt' | 'organizationId' | 'primaryPhysicianId'>, diagnoses: string[], cathMatchKey?: string) => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    // Create patient via backend (Firestore or mock) + local backup
    const newPatient = await createInpatient(orgId, {
      ...patient,
      organizationId: orgId,
      primaryPhysicianId: userId,
      primaryPhysicianName: userName,
      isActive: true
    });
    await saveLocalPatient(newPatient);

    // Add patient to state
    setPatients(prev => [...prev, newPatient]);

    // Save diagnoses for the new patient
    if (diagnoses.length > 0) {
      setPatientDiagnoses(prev => ({
        ...prev,
        [newPatient.id]: diagnoses
      }));
      saveDiagnoses(newPatient.id, diagnoses);
    }

    // Audit log
    logAuditEvent(orgId, {
      action: 'patient_added',
      userId,
      userName,
      targetPatientId: newPatient.id,
      targetPatientName: newPatient.patientName,
      details: `Added patient ${newPatient.patientName}`,
      listContext: 'my'
    });

    // Relink cath charges if a cath match was selected
    if (cathMatchKey) {
      try {
        const count = await relinkChargesToPatient(cathMatchKey, newPatient.id);
        if (count > 0) {
          await loadChargesAndDiagnoses();
          logger.info(`Relinked ${count} cath charge(s) from ${cathMatchKey} to ${newPatient.id}`);
        }
      } catch (err) {
        logger.error('Error relinking cath charges', err);
      }
    }

    // If this was a cross-coverage add, also create a call list entry
    if (isCrossCoverageAdd) {
      const entry = await addToCallList(orgId, userId, newPatient, patient.coveringFor);
      setCallListEntries(prev => [...prev, entry]);

      logAuditEvent(orgId, {
        action: 'call_list_add',
        userId,
        userName,
        targetPatientId: newPatient.id,
        targetPatientName: newPatient.patientName,
        details: `Added cross-coverage patient ${newPatient.patientName} to call list`,
        listContext: 'call'
      });

      setIsCrossCoverageAdd(false);
    }

    setShowAddPatient(false);
  };

  const handleCreatePatientFromCharge = async (patient: Omit<Inpatient, 'id' | 'createdAt' | 'organizationId' | 'primaryPhysicianId'>, diagnoses: string[]): Promise<Inpatient> => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    const newPatient = await createInpatient(orgId, {
      ...patient,
      organizationId: orgId,
      primaryPhysicianId: userId,
      primaryPhysicianName: userName,
      isActive: true
    });
    await saveLocalPatient(newPatient);

    setPatients(prev => [...prev, newPatient]);

    if (diagnoses.length > 0) {
      setPatientDiagnoses(prev => ({
        ...prev,
        [newPatient.id]: diagnoses
      }));
      saveDiagnoses(newPatient.id, diagnoses);
    }

    logAuditEvent(orgId, {
      action: 'patient_added',
      userId,
      userName,
      targetPatientId: newPatient.id,
      targetPatientName: newPatient.patientName,
      details: `Auto-added patient ${newPatient.patientName} from cath lab charge`,
      listContext: 'my'
    });

    return newPatient;
  };

  const handleDischargePatient = async (patient: Inpatient) => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    const dischargedAt = new Date().toISOString();
    await dischargeInpatient(orgId, patient.id);
    await updateLocalPatient(patient.id, { isActive: false, dischargedAt });

    setPatients(prev => prev.map(p =>
      p.id === patient.id ? { ...p, isActive: false, dischargedAt } : p
    ));

    logAuditEvent(orgId, {
      action: 'patient_discharged',
      userId,
      userName,
      targetPatientId: patient.id,
      targetPatientName: patient.patientName,
      details: `Discharged patient ${patient.patientName}`,
      listContext: null
    });
  };

  const handleRemovePatient = async (patient: Inpatient) => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    await dischargeInpatient(orgId, patient.id);
    await updateLocalPatient(patient.id, { isActive: false });

    setPatients(prev => prev.map(p =>
      p.id === patient.id ? { ...p, isActive: false } : p
    ));

    logAuditEvent(orgId, {
      action: 'patient_removed',
      userId,
      userName,
      targetPatientId: patient.id,
      targetPatientName: patient.patientName,
      details: `Removed patient ${patient.patientName} from practice`,
      listContext: 'practice'
    });
  };

  const handleRemoveFromMyList = async (patient: Inpatient) => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    await updateLocalPatient(patient.id, { primaryPhysicianId: '' });

    setPatients(prev => prev.map(p =>
      p.id === patient.id ? { ...p, primaryPhysicianId: '' } : p
    ));

    logAuditEvent(orgId, {
      action: 'patient_removed',
      userId,
      userName,
      targetPatientId: patient.id,
      targetPatientName: patient.patientName,
      details: `Removed patient ${patient.patientName} from my list`,
      listContext: 'my'
    });
  };

  const handleAddToCallList = async (patient: Inpatient, coveringFor?: string) => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    const entry = await addToCallList(orgId, userId, patient, coveringFor);
    setCallListEntries(prev => [...prev, entry]);

    logAuditEvent(orgId, {
      action: 'call_list_add',
      userId,
      userName,
      targetPatientId: patient.id,
      targetPatientName: patient.patientName,
      details: `Added ${patient.patientName} to call list${coveringFor ? ` (covering for ${coveringFor})` : ''}`,
      listContext: 'call'
    });
  };

  const handleRemoveFromCallList = async (entryId: string) => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';
    const entry = callListEntries.find(e => e.id === entryId);

    await removeFromCallList(orgId, entryId);
    setCallListEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, isActive: false } : e
    ));

    logAuditEvent(orgId, {
      action: 'call_list_remove',
      userId,
      userName,
      targetPatientId: entry?.inpatientId || null,
      targetPatientName: entry?.patientName || null,
      details: `Removed ${entry?.patientName || 'patient'} from call list`,
      listContext: 'call'
    });
  };

  const handleClearCallList = async () => {
    const orgId = userMode.organizationId || 'org-1';
    const userId = authUser?.id || 'user-1';
    const userName = authUser?.displayName || 'Unknown';

    await clearCallList(orgId, userId);
    setCallListEntries(prev => prev.map(e =>
      e.addedByUserId === userId ? { ...e, isActive: false } : e
    ));

    logAuditEvent(orgId, {
      action: 'call_list_clear',
      userId,
      userName,
      targetPatientId: null,
      targetPatientName: null,
      details: 'Cleared all patients from call list',
      listContext: 'call'
    });
  };

  const handleOpenCallListPicker = () => {
    setShowCallListPicker(true);
  };

  const handleAddCrossCoveragePatient = () => {
    setIsCrossCoverageAdd(true);
    setShowAddPatient(true);
  };

  const handleChargeSave = async (charge: {
    cptCodes: string[]; // Codes with modifiers already applied (e.g., "99232-25")
    cptDescriptions?: string[];
    modifiers?: Map<string, string>;
    timeMinutes?: number;
    diagnoses: string[];
    chargeDate: Date;
  }) => {
    if (!selectedPatientForCharge) {
      setShowAddCharge(false);
      return;
    }

    const patientId = selectedPatientForCharge.id;
    const dateStr = formatDateForStorage(charge.chargeDate);
    const currentUserId = authUser?.id || 'user-1';

    // Check for concurrent visits
    const concurrentWarning = await checkConcurrentVisit(patientId, dateStr, currentUserId);
    if (concurrentWarning) {
      const proceed = window.confirm(
        `${concurrentWarning.physicianName} already has a charge for this patient on this date. Concurrent care is common — continue?`
      );
      if (!proceed) {
        return;
      }
    }

    // Combine multiple codes into a single display string (e.g., "99232-25 + 99291")
    // Codes already have modifiers applied when passed from AddChargeDialog
    const codesDisplay = charge.cptCodes.length > 1
      ? charge.cptCodes.join(' + ')
      : charge.cptCodes[0];
    const descriptionsDisplay = charge.cptDescriptions?.join('; ') || '';

    // Save charge to storage
    const savedCharge = await saveCharge({
      inpatientId: patientId,
      chargeDate: dateStr,
      cptCode: codesDisplay, // Store all codes combined
      cptDescription: descriptionsDisplay,
      timeMinutes: charge.timeMinutes,
      diagnoses: charge.diagnoses
    });

    // Update local state immediately
    setCharges(prev => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || {}),
        [dateStr]: savedCharge
      }
    }));

    // Save and update diagnoses if changed
    if (charge.diagnoses.length > 0) {
      await saveDiagnoses(patientId, charge.diagnoses);
      setPatientDiagnoses(prev => ({
        ...prev,
        [patientId]: charge.diagnoses
      }));
    }

    // Log charge_submitted audit event
    const orgId = userMode.organizationId;
    if (orgId) {
      logAuditEvent(orgId, {
        action: 'charge_submitted',
        userId: authUser?.id || 'user-1',
        userName: authUser?.displayName || 'Unknown',
        targetPatientId: patientId,
        targetPatientName: selectedPatientForCharge.patientName,
        details: `Submitted charge ${codesDisplay} for ${selectedPatientForCharge.patientName}`,
        listContext: null,
        metadata: { chargeId: savedCharge.id, chargeDate: dateStr, newStatus: 'pending' }
      });
    }

    logger.info('Charge saved');
    setShowAddCharge(false);
    setSelectedPatientForCharge(null);
  };

  // Handle editing a charge (open dialog in edit mode, or navigate to CathLab for snapshot edits)
  const handleEditCharge = (charge: StoredCharge, patient: Inpatient) => {
    if (charge.caseSnapshot) {
      // Has case snapshot — open full CathLab case builder
      setActiveTab('cathlab');
      // Small delay to ensure CathLab tab is rendered before calling loadChargeForEdit
      setTimeout(() => {
        cathCPTRef.current?.loadChargeForEdit(charge, patient);
      }, 50);
    } else {
      // Legacy charge (no snapshot) — use simple edit dialog
      setEditingCharge(charge);
      setSelectedPatientForCharge(patient);
      setShowAddCharge(true);
    }
  };

  // Handle updating an existing charge
  const handleUpdateCharge = async (chargeId: string, updates: {
    cptCode: string;
    cptDescription?: string;
    timeMinutes?: number;
    diagnoses: string[];
  }) => {
    try {
      const updatedCharge = await updateCharge(chargeId, updates);
      if (updatedCharge) {
        // Update local state
        setCharges(prev => ({
          ...prev,
          [updatedCharge.inpatientId]: {
            ...(prev[updatedCharge.inpatientId] || {}),
            [updatedCharge.chargeDate]: updatedCharge
          }
        }));

        // Update diagnoses if changed
        if (updates.diagnoses.length > 0 && selectedPatientForCharge) {
          await saveDiagnoses(selectedPatientForCharge.id, updates.diagnoses);
          setPatientDiagnoses(prev => ({
            ...prev,
            [selectedPatientForCharge.id]: updates.diagnoses
          }));
        }

        logger.info('Charge updated');
      }
    } catch (error) {
      logger.error('Error updating charge', error);
      showToast(error instanceof Error ? error.message : 'Failed to update charge', 'error');
    }

    // Close dialog and reset state
    setShowAddCharge(false);
    setSelectedPatientForCharge(null);
    setEditingCharge(null);
  };

  // Handle marking a charge as billed (locks it)
  const handleMarkChargeBilled = async (chargeId: string) => {
    try {
      await markChargeBilled(chargeId);
      // Reload charges to get updated status
      await loadChargesAndDiagnoses();
      logger.info('Charge marked as billed');
    } catch (error) {
      logger.error('Error marking charge as billed', error);
      showToast('Failed to mark charge as billed', 'error');
    }
  };

  const handleVersionTap = async () => {
    const shouldShowDev = await checkUnlockDevMode();
    if (shouldShowDev) {
      setShowDevOptions(true);
    }
  };

  const handleDevModeChange = async (tier: 'individual' | 'pro', role: 'physician' | 'admin' | null) => {
    await setDevModeUserType(tier, role);
    const [mode, devSettings] = await Promise.all([
      getUserMode(authUser),
      getDevModeSettings()
    ]);
    setUserMode(mode);
    setDevModeSettings(devSettings);

    // Default to admin tab when switching to admin role
    if (mode.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('cathlab');
    }

    // Load data if switching to Pro mode
    if (mode.tier === 'pro' && mode.organizationId) {
      await Promise.all([
        loadHospitals(),
        loadPatients(mode.organizationId),
        loadCallList(mode.organizationId, authUser?.id || 'user-1'),
        loadChargesAndDiagnoses()
      ]);
    }
  };

  const handleDisableDevMode = async () => {
    await disableDevMode();
    setDevModeSettings(null);
    setShowDevOptions(false);
    const mode = await getUserMode(authUser);
    setUserMode(mode);
  };

  // Show loading screen during initialization (branded)
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden animate-pulse">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="loadingBgGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4A84B"/>
                  <stop offset="50%" stopColor="#C49A3D"/>
                  <stop offset="100%" stopColor="#9A7830"/>
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="18" fill="url(#loadingBgGold)"/>
              <g transform="translate(28, 5) scale(0.52)">
                <path d="M42,22 C52,8 82,12 82,42 C82,68 42,92 42,92 C42,92 2,68 2,42 C2,12 32,8 42,22" fill="#8B1538"/>
              </g>
              <text x="50" y="72" fontSize="36" fontWeight="900" fill="#F5E6B0" textAnchor="middle" fontFamily="Arial Black, sans-serif">CPT</text>
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">CathCPT</p>
          <p className="text-gray-400 text-sm">{initStep || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Auth gate — no anonymous usage, all users must sign in
  if (!authUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Show lock screen when session is locked (all authenticated users, HIPAA)
  if (isLocked) {
    return (
      <LockScreen
        userEmail={authUser.email}
        userId={authUser.id}
        orgId={userMode.organizationId || undefined}
        authProvider={authUser.authProvider}
        onUnlock={unlockSession}
        onLogout={handleLogout}
      />
    );
  }

  // Check if Pro mode with tab visibility
  const isProMode = userMode.tier === 'pro';
  const showRoundsTab = isProMode && (userMode.role === 'physician' || userMode.role === 'admin');
  const showAdminTab = isProMode && userMode.role === 'admin';
  const showTabBar = showRoundsTab || showAdminTab;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* === FIXED HEADER === */}
      <div className="flex-shrink-0">
        {/* Offline Banner */}
        <OfflineBanner isOffline={!syncStatus.isOnline} />

        {/* Inline HIPAA Banner (non-blocking, first launch only) */}
        {showHipaaBanner && (
          <HIPAAInlineBanner
            onAcknowledge={async () => {
              await window.storage.set('hipaa_ack_timestamp', new Date().toISOString());
              setShowHipaaBanner(false);
            }}
          />
        )}
        {/* Row 1: CathCPT branding + action buttons (collapses on scroll down) */}
        <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {/* Small CathCPT icon */}
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="headerBgGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4A84B"/>
                    <stop offset="50%" stopColor="#C49A3D"/>
                    <stop offset="100%" stopColor="#9A7830"/>
                  </linearGradient>
                </defs>
                <rect width="100" height="100" rx="18" fill="url(#headerBgGold)"/>
                <g transform="translate(28, 5) scale(0.52)">
                  <path d="M42,22 C52,8 82,12 82,42 C82,68 42,92 42,92 C42,92 2,68 2,42 C2,12 32,8 42,22" fill="#8B1538"/>
                </g>
                <text x="50" y="72" fontSize="36" fontWeight="900" fill="#F5E6B0" textAnchor="middle" fontFamily="Arial Black, sans-serif">CPT</text>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-amber-700">CathCPT</h1>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide ${
              userMode.role === 'admin'
                ? 'bg-purple-100 text-purple-700'
                : isProMode
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {userMode.role === 'admin' ? 'Admin' : isProMode ? 'Pro MD' : 'Individual'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Sign Out button (individual mode only — pro users have logout in blue bar) */}
            {!isProMode && (
              <button
                onClick={handleLogout}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} className="text-gray-600" />
              </button>
            )}
            {/* History */}
            <button
              onClick={() => setFullScreenView('history')}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Case History"
            >
              <History size={18} className="text-gray-600" />
            </button>
            {/* 2026 Updates */}
            <button
              onClick={() => setFullScreenView('updates')}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="What's New in 2026"
            >
              <Lightbulb size={18} className="text-gray-600" />
            </button>
            {/* Settings */}
            <button
              onClick={() => setFullScreenView('settings')}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={18} className="text-gray-600" />
            </button>
            {/* Help */}
            <button
              onClick={() => setFullScreenView('help')}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Help"
            >
              <HelpCircle size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Row 2: Blue practice bar */}
        {isProMode && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {userMode.isDevMode && (
                <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-medium rounded">
                  DEV
                </span>
              )}
              <span className="font-medium">
                {userMode.organizationName || 'Pro Mode'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <SyncStatusIndicator syncStatus={syncStatus} />
              <button
                onClick={handleSync}
                disabled={syncStatus.isSyncing}
                className="flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="p-1 hover:bg-white/10 rounded"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Tab navigation */}
        {showTabBar && (
          <div className="bg-white border-b border-gray-200 px-4">
            <div className="flex gap-4">
              <button
                onClick={() => { setActiveTab('cathlab'); setFullScreenView(null); }}
                className={`py-3 px-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cathlab'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Heart size={18} className="inline mr-1.5" />
                Cath Lab
              </button>
              {showRoundsTab && (
                <button
                  onClick={() => { setActiveTab('rounds'); setFullScreenView(null); }}
                  className={`py-3 px-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'rounds'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users size={18} className="inline mr-1.5" />
                  Rounds
                </button>
              )}
              {showAdminTab && (
                <button
                  onClick={() => { setActiveTab('admin'); setFullScreenView(null); }}
                  className={`py-3 px-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'admin'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Shield size={18} className="inline mr-1.5" />
                  Admin Portal
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* === SCROLLABLE CONTENT === */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {/* Full-screen views override tab content */}
        {fullScreenView === 'history' && (
          <HistoryScreen
            onClose={() => setFullScreenView(null)}
            caseHistory={cathCPTRef.current?.getCaseHistory() || []}
            onLoadCase={(savedCase) => {
              cathCPTRef.current?.loadFromHistory(savedCase);
              setFullScreenView(null);
              setCathLabBottomTab('addcase');
            }}
            onDeleteCase={(id) => cathCPTRef.current?.deleteFromHistory(id)}
            onExportHistory={() => cathCPTRef.current?.exportHistory()}
          />
        )}
        {fullScreenView === 'updates' && (
          <UpdatesScreen onClose={() => setFullScreenView(null)} />
        )}
        {fullScreenView === 'help' && (
          <HelpScreen onClose={() => setFullScreenView(null)} />
        )}
        {fullScreenView === 'settings' && (
          <SettingsScreen
            onClose={() => setFullScreenView(null)}
            isProMode={isProMode}
            userRole={userMode.role}
            userName={authUser?.displayName || ''}
            orgId={userMode.organizationId || 'YOCA'}
            hospitals={hospitals}
            cathLabs={cathLabs}
            patients={patients}
            charges={charges}
            onHospitalsChanged={loadHospitals}
            onOpenCodeGroupSettings={() => setShowCodeGroupSettings(true)}
          />
        )}

        {!fullScreenView && activeTab === 'cathlab' && (
          <CardiologyCPTApp
            ref={cathCPTRef}
            isProMode={isProMode}
            patients={patients}
            hospitals={hospitals}
            cathLabs={cathLabs}
            patientDiagnoses={patientDiagnoses}
            orgId={userMode.organizationId || 'YOCA'}
            userName={authUser?.displayName || ''}
            bottomTab={cathLabBottomTab}
            onPatientCreated={handleCreatePatientFromCharge}
            onChargeUpdated={loadChargesAndDiagnoses}
          />
        )}
        {!fullScreenView && activeTab === 'rounds' && (
          <RoundsScreen
              userMode={userMode}
              hospitals={hospitals}
              patients={patients}
              currentUserId={authUser?.id || 'user-1'}
              callListEntries={callListEntries}
              onAddPatient={handleAddPatient}
              onAddCharge={handleAddCharge}
              onDischargePatient={handleDischargePatient}
              onRemovePatient={handleRemovePatient}
              onAddToCallList={handleOpenCallListPicker}
              onRemoveFromCallList={handleRemoveFromCallList}
              onClearCallList={handleClearCallList}
              charges={charges}
              diagnoses={patientDiagnoses}
              onRefresh={handleRoundsRefresh}
              onEditCharge={handleEditCharge}
              onMarkChargeBilled={handleMarkChargeBilled}
              onRemoveFromMyList={handleRemoveFromMyList}
            />
        )}
        {!fullScreenView && activeTab === 'admin' && (
          <AdminPortalScreen
            userMode={userMode}
            hospitals={hospitals}
            patients={patients}
            currentUserId={authUser?.id || 'admin-1'}
            currentUserName={authUser?.displayName || 'Admin'}
            charges={charges}
            diagnoses={patientDiagnoses}
            onRefresh={handleRoundsRefresh}
            onChargesUpdated={loadChargesAndDiagnoses}
            onPracticeNameChanged={handlePracticeNameChanged}
          />
        )}
      </div>

      {/* Bottom Navigation Bar — Cath Lab only, hidden during full-screen views */}
      {activeTab === 'cathlab' && !fullScreenView && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <nav className="flex justify-around items-center h-14" role="tablist" aria-label="Cath Lab sections">
            {([
              { id: 'addcase' as CathLabBottomTab, label: 'Add Case', Icon: FileText },
              { id: 'icd10' as CathLabBottomTab, label: 'ICD-10', Icon: Stethoscope },
              { id: 'cpt' as CathLabBottomTab, label: 'CPT', Icon: List },
              { id: 'review' as CathLabBottomTab, label: 'Review', Icon: ClipboardCheck },
            ]).map(({ id, label, Icon }) => {
              const isActive = cathLabBottomTab === id;
              // Badge counts
              let badge: number | null = null;
              if (id === 'icd10') badge = cathCPTRef.current?.getIcd10Count() || null;
              if (id === 'cpt') badge = cathCPTRef.current?.getCptCount() || null;
              if (id === 'review') badge = cathCPTRef.current?.getViolationCount() || null;

              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={label}
                  onClick={() => { setFullScreenView(null); setCathLabBottomTab(id); }}
                  className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {label}
                  </span>
                  {badge !== null && badge > 0 && (
                    <span className={`absolute top-1 right-1/4 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
                      id === 'review' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Dialogs */}
      <AddPatientDialog
        isOpen={showAddPatient}
        onClose={() => { setShowAddPatient(false); setIsCrossCoverageAdd(false); }}
        onSave={handlePatientSave}
        hospitals={hospitals}
        isCrossCoverage={isCrossCoverageAdd}
      />

      <AddChargeDialog
        isOpen={showAddCharge}
        onClose={() => {
          setShowAddCharge(false);
          setSelectedPatientForCharge(null);
          setEditingCharge(null);
        }}
        patient={selectedPatientForCharge}
        isFirstEncounter={!charges[selectedPatientForCharge?.id || ''] || Object.keys(charges[selectedPatientForCharge?.id || ''] || {}).length === 0}
        isCallCoverage={false}
        previousDiagnoses={selectedPatientForCharge ? (patientDiagnoses[selectedPatientForCharge.id] || []) : []}
        onSave={handleChargeSave}
        editingCharge={editingCharge}
        onUpdate={handleUpdateCharge}
      />

      <CodeGroupSettings
        isOpen={showCodeGroupSettings}
        onClose={() => setShowCodeGroupSettings(false)}
        onSettingsChanged={() => {}}
      />

      <CallListPickerDialog
        isOpen={showCallListPicker}
        onClose={() => setShowCallListPicker(false)}
        patients={patients}
        currentUserId={authUser?.id || 'user-1'}
        callListEntries={callListEntries}
        onAddToCallList={handleAddToCallList}
        onAddCrossCoveragePatient={handleAddCrossCoveragePatient}
      />

      {/* Dev Mode Options Modal */}
      {showDevOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-80 p-4">
            <h3 className="text-lg font-semibold mb-4">Dev Options</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Mode
                </label>
                <select
                  value={`${userMode.tier}-${userMode.role || 'none'}`}
                  onChange={(e) => {
                    const [tier, role] = e.target.value.split('-');
                    handleDevModeChange(
                      tier as 'individual' | 'pro',
                      role === 'none' ? null : role as 'physician' | 'admin'
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="individual-none">Individual</option>
                  <option value="pro-physician">Pro Physician</option>
                  <option value="pro-admin">Pro Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Mock Server</span>
                <span className="text-sm text-gray-500">
                  {devModeSettings?.useMockServer ? 'On' : 'Off'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDisableDevMode}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Disable Dev Mode
              </button>
              <button
                onClick={() => setShowDevOptions(false)}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help is now a full-screen view, rendered in the scrollable content area */}

      {/* Biometric Enrollment Prompt */}
      {showBiometricPrompt && (
        <BiometricLoginPrompt onComplete={() => setShowBiometricPrompt(false)} />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Privacy overlay — covers PHI content in iOS/Android task switcher */}
      <div
        id="privacy-overlay"
        style={{ display: 'none' }}
        className="fixed inset-0 bg-white z-[99999] flex flex-col items-center justify-center"
      >
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-semibold text-gray-700">CathCPT</p>
      </div>
    </div>
  );
};

export default App;
