import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, User, MapPin, Fingerprint, Bell, Shield, ChevronRight, Building2, Plus, Trash2, LogOut } from 'lucide-react';
import { isBiometricAvailable, getBiometryType, authenticateWithBiometric, getBiometricPreference, setBiometricPreference } from '../services/biometricService';
import { addHospital as addHospitalToOrg, deactivateHospital as deactivateHospitalFromOrg, addCathLab as addCathLabToOrg, deactivateCathLab as deactivateCathLabFromOrg } from '../services/practiceConnection';
import { Hospital, CathLab, Inpatient } from '../types';
import { StoredCharge } from '../services/chargesService';

interface SettingsScreenProps {
  onClose: () => void;
  isProMode: boolean;
  userRole: 'physician' | 'admin' | null;
  userName: string;
  orgId: string;
  hospitals: Hospital[];
  cathLabs: CathLab[];
  patients: Inpatient[];
  charges: Record<string, Record<string, StoredCharge>>;
  onHospitalsChanged: () => Promise<void>;
  onOpenCodeGroupSettings: () => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  isProMode,
  userRole,
  userName,
  orgId,
  hospitals,
  cathLabs,
  patients,
  charges,
  onHospitalsChanged,
  onOpenCodeGroupSettings,
  onLogout,
}) => {
  // Settings state
  const [cardiologistName, setCardiologistName] = useState('');
  const [cathLocations, setCathLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [individualHospitals, setIndividualHospitals] = useState<string[]>([]);
  const [newHospital, setNewHospital] = useState('');
  const [phiAutoScrub, setPhiAutoScrub] = useState(false);

  // Admin: local org hospital/cath lab lists (optimistic)
  const [localOrgHospitals, setLocalOrgHospitals] = useState<Hospital[]>(hospitals);
  const [localOrgCathLabs, setLocalOrgCathLabs] = useState<CathLab[]>(cathLabs);
  const [newOrgHospital, setNewOrgHospital] = useState('');
  const [newOrgCathLab, setNewOrgCathLab] = useState('');
  const [isAddingHospital, setIsAddingHospital] = useState(false);
  const [isAddingCathLab, setIsAddingCathLab] = useState(false);


  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<'faceId' | 'touchId' | 'none'>('none');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Notification state (pro only)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [billingReminderDays, setBillingReminderDays] = useState(2);
  const [showCustomDays, setShowCustomDays] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');

  // Version tap for dev mode
  const [versionTapCount, setVersionTapCount] = useState(0);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [nameResult, locResult, phiResult, hospResult, notifResult, notifDaysResult, adminHospResult, adminLabsResult] = await Promise.all([
        window.storage.get('cardiologistName'),
        window.storage.get('cathLocations'),
        window.storage.get('phiAutoScrub'),
        window.storage.get('individualHospitals'),
        window.storage.get('notification_billing_reminder_enabled'),
        window.storage.get('notification_billing_reminder_days'),
        window.storage.get('admin_hospitals'),
        window.storage.get('admin_cathLabs'),
      ]);
      if (nameResult?.value) setCardiologistName(nameResult.value);
      if (locResult?.value) setCathLocations(JSON.parse(locResult.value));
      else setCathLocations(['Main Hospital Cath Lab', 'Outpatient Surgery Center']);
      if (phiResult?.value) setPhiAutoScrub(phiResult.value === 'true');
      if (hospResult?.value) setIndividualHospitals(JSON.parse(hospResult.value));
      if (notifResult?.value) setNotificationsEnabled(notifResult.value === 'true');
      if (notifDaysResult?.value) setBillingReminderDays(parseInt(notifDaysResult.value) || 2);

      // Load admin hospitals/cath labs from storage, fall back to props
      if (adminHospResult?.value) {
        setLocalOrgHospitals(JSON.parse(adminHospResult.value));
      } else if (hospitals.length > 0) {
        setLocalOrgHospitals(hospitals);
        await window.storage.set('admin_hospitals', JSON.stringify(hospitals));
      }
      if (adminLabsResult?.value) {
        setLocalOrgCathLabs(JSON.parse(adminLabsResult.value));
      } else if (cathLabs.length > 0) {
        setLocalOrgCathLabs(cathLabs);
        await window.storage.set('admin_cathLabs', JSON.stringify(cathLabs));
      }

      // Biometric
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await getBiometryType();
        setBiometryType(type);
        const pref = await getBiometricPreference();
        setBiometricEnabled(pref);
      }
    } catch {
      setCathLocations(['Main Hospital Cath Lab', 'Outpatient Surgery Center']);
    }
  };

  const handleSave = async () => {
    await Promise.all([
      window.storage.set('cardiologistName', cardiologistName),
      window.storage.set('cathLocations', JSON.stringify(cathLocations)),
      window.storage.set('phiAutoScrub', String(phiAutoScrub)),
      window.storage.set('individualHospitals', JSON.stringify(individualHospitals)),
      window.storage.set('notification_billing_reminder_enabled', String(notificationsEnabled)),
      window.storage.set('notification_billing_reminder_days', String(billingReminderDays)),
    ]);
    onClose();
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      await setBiometricPreference(false);
      setBiometricEnabled(false);
    } else {
      const authenticated = await authenticateWithBiometric();
      if (authenticated) {
        await setBiometricPreference(true);
        setBiometricEnabled(true);
      }
    }
  };

  // Individual mode: local location/hospital management
  const addLocation = () => {
    if (newLocation.trim() && !cathLocations.includes(newLocation.trim())) {
      setCathLocations(prev => [...prev, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (loc: string) => {
    setCathLocations(prev => prev.filter(l => l !== loc));
  };

  const addLocalHospital = () => {
    if (newHospital.trim() && !individualHospitals.includes(newHospital.trim())) {
      setIndividualHospitals(prev => [...prev, newHospital.trim()]);
      setNewHospital('');
    }
  };

  const removeLocalHospital = (h: string) => {
    setIndividualHospitals(prev => prev.filter(x => x !== h));
  };

  // Persist admin lists to storage
  const saveOrgHospitalsToStorage = (list: Hospital[]) => {
    window.storage.set('admin_hospitals', JSON.stringify(list)).catch(() => {});
  };
  const saveOrgCathLabsToStorage = (list: CathLab[]) => {
    window.storage.set('admin_cathLabs', JSON.stringify(list)).catch(() => {});
  };

  // Check if a hospital has open (unbilled) charges
  const getOpenChargeCount = (hospitalId: string): number => {
    const hospitalPatientIds = patients
      .filter(p => p.hospitalId === hospitalId)
      .map(p => p.id);
    if (hospitalPatientIds.length === 0) return 0;
    let count = 0;
    for (const patientId of hospitalPatientIds) {
      const patientCharges = charges[patientId];
      if (patientCharges) {
        for (const charge of Object.values(patientCharges)) {
          if (charge.status !== 'billed') count++;
        }
      }
    }
    return count;
  };

  // Admin/Pro: org-level hospital/cath lab management
  const handleAddOrgHospital = async () => {
    const name = newOrgHospital.trim();
    if (!name) return;
    setIsAddingHospital(true);
    const newH: Hospital = {
      id: `hosp-${Date.now()}`,
      organizationId: orgId,
      name,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...localOrgHospitals, newH];
    setLocalOrgHospitals(updated);
    saveOrgHospitalsToStorage(updated);
    setNewOrgHospital('');
    try {
      await addHospitalToOrg(orgId, name);
      onHospitalsChanged().catch(() => {});
    } catch (err) {
      // Rollback
      const rolledBack = localOrgHospitals;
      setLocalOrgHospitals(rolledBack);
      saveOrgHospitalsToStorage(rolledBack);
      alert(err instanceof Error ? err.message : 'Failed to add hospital');
    } finally {
      setIsAddingHospital(false);
    }
  };

  const handleRemoveOrgHospital = async (hospital: Hospital) => {
    const openCount = getOpenChargeCount(hospital.id);
    if (openCount > 0) {
      alert(`Cannot remove "${hospital.name}" — there ${openCount === 1 ? 'is 1 open charge' : `are ${openCount} open charges`} that must be billed first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to remove "${hospital.name}"? This action cannot be undone.`)) return;
    const updated = localOrgHospitals.filter(h => h.id !== hospital.id);
    setLocalOrgHospitals(updated);
    saveOrgHospitalsToStorage(updated);
    try {
      await deactivateHospitalFromOrg(orgId, hospital.id);
      onHospitalsChanged().catch(() => {});
    } catch (err) {
      const rolledBack = [...localOrgHospitals, hospital];
      setLocalOrgHospitals(rolledBack);
      saveOrgHospitalsToStorage(rolledBack);
      alert(err instanceof Error ? err.message : 'Failed to remove hospital');
    }
  };

  const handleAddOrgCathLab = async () => {
    const name = newOrgCathLab.trim();
    if (!name) return;
    setIsAddingCathLab(true);
    const newL: CathLab = {
      id: `lab-${Date.now()}`,
      organizationId: orgId,
      name,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...localOrgCathLabs, newL];
    setLocalOrgCathLabs(updated);
    saveOrgCathLabsToStorage(updated);
    setNewOrgCathLab('');
    try {
      await addCathLabToOrg(orgId, name);
      onHospitalsChanged().catch(() => {});
    } catch (err) {
      const rolledBack = localOrgCathLabs;
      setLocalOrgCathLabs(rolledBack);
      saveOrgCathLabsToStorage(rolledBack);
      alert(err instanceof Error ? err.message : 'Failed to add cath lab');
    } finally {
      setIsAddingCathLab(false);
    }
  };

  const handleRemoveOrgCathLab = async (lab: CathLab) => {
    if (!window.confirm(`Are you sure you want to remove "${lab.name}"? This action cannot be undone.`)) return;
    const updated = localOrgCathLabs.filter(l => l.id !== lab.id);
    setLocalOrgCathLabs(updated);
    saveOrgCathLabsToStorage(updated);
    try {
      await deactivateCathLabFromOrg(orgId, lab.id);
      onHospitalsChanged().catch(() => {});
    } catch (err) {
      const rolledBack = [...localOrgCathLabs, lab];
      setLocalOrgCathLabs(rolledBack);
      saveOrgCathLabsToStorage(rolledBack);
      alert(err instanceof Error ? err.message : 'Failed to remove cath lab');
    }
  };

  const handleVersionTap = () => {
    setVersionTapCount(prev => prev + 1);
  };

  const activeHospitals = localOrgHospitals.filter(h => h.isActive);
  const activeCathLabs = localOrgCathLabs.filter(l => l.isActive);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <Settings size={22} className="text-gray-700" />
            <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          </div>
        </div>
        {!isProMode && (
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Save
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Physician Name */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <User size={18} className="text-gray-500" />
            <label className="text-sm font-semibold text-gray-700">Physician Name</label>
          </div>
          {isProMode ? (
            <p className="text-sm text-gray-900 font-medium px-3 py-2 bg-gray-50 rounded-lg">
              {userName || cardiologistName || 'Not set'}
            </p>
          ) : (
            <input
              type="text"
              value={cardiologistName}
              onChange={(e) => setCardiologistName(e.target.value)}
              placeholder="Dr. Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
        </div>

        {/* === ADMIN / PRO: Org Hospitals === */}
        {isProMode && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-gray-500" />
                <label className="text-sm font-semibold text-gray-700">Hospitals</label>
                <span className="text-xs text-gray-400">({activeHospitals.length})</span>
              </div>
              {!isAdmin && (
                <span className="text-[10px] text-gray-400 italic">Admin only</span>
              )}
            </div>
            <div className="space-y-2 mb-3">
              {activeHospitals.length === 0 && (
                <p className="text-xs text-gray-400 italic py-1">No hospitals configured</p>
              )}
              {activeHospitals.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{h.name}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveOrgHospital(h)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove hospital"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOrgHospital}
                  onChange={(e) => setNewOrgHospital(e.target.value)}
                  placeholder="Add hospital..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOrgHospital()}
                />
                <button
                  onClick={handleAddOrgHospital}
                  disabled={!newOrgHospital.trim() || isAddingHospital}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        {/* === ADMIN / PRO: Org Cath Labs === */}
        {isProMode && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-gray-500" />
                <label className="text-sm font-semibold text-gray-700">Cath Labs</label>
                <span className="text-xs text-gray-400">({activeCathLabs.length})</span>
              </div>
              {!isAdmin && (
                <span className="text-[10px] text-gray-400 italic">Admin only</span>
              )}
            </div>
            <div className="space-y-2 mb-3">
              {activeCathLabs.length === 0 && (
                <p className="text-xs text-gray-400 italic py-1">No cath labs configured</p>
              )}
              {activeCathLabs.map((lab) => (
                <div key={lab.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-700">{lab.name}</span>
                    {lab.hospitalId && (() => {
                      const parent = localOrgHospitals.find(h => h.id === lab.hospitalId);
                      return parent ? (
                        <span className="ml-2 text-xs text-gray-400">({parent.name})</span>
                      ) : null;
                    })()}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveOrgCathLab(lab)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove cath lab"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOrgCathLab}
                  onChange={(e) => setNewOrgCathLab(e.target.value)}
                  placeholder="Add cath lab..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOrgCathLab()}
                />
                <button
                  onClick={handleAddOrgCathLab}
                  disabled={!newOrgCathLab.trim() || isAddingCathLab}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cath Lab Locations — individual mode only */}
        {!isProMode && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} className="text-gray-500" />
              <label className="text-sm font-semibold text-gray-700">Cath Lab Locations</label>
            </div>
            <div className="space-y-2 mb-3">
              {cathLocations.map((loc) => (
                <div key={loc} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{loc}</span>
                  <button
                    onClick={() => removeLocation(loc)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Add location..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
              />
              <button
                onClick={addLocation}
                disabled={!newLocation.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Hospitals — individual mode only */}
        {!isProMode && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={18} className="text-gray-500" />
              <label className="text-sm font-semibold text-gray-700">Hospitals</label>
            </div>
            <div className="space-y-2 mb-3">
              {individualHospitals.length === 0 && (
                <p className="text-xs text-gray-400 italic">No hospitals added</p>
              )}
              {individualHospitals.map((h) => (
                <div key={h} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{h}</span>
                  <button
                    onClick={() => removeLocalHospital(h)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHospital}
                onChange={(e) => setNewHospital(e.target.value)}
                placeholder="Add hospital..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addLocalHospital()}
              />
              <button
                onClick={addLocalHospital}
                disabled={!newHospital.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Face ID / Touch ID */}
        {biometricAvailable && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint size={18} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">
                  {biometryType === 'faceId' ? 'Face ID' : biometryType === 'touchId' ? 'Touch ID' : 'Biometric'}
                </span>
              </div>
              <button
                onClick={handleBiometricToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  biometricEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {biometricEnabled ? 'Enabled for app unlock' : 'Enable for faster access'}
            </p>
          </div>
        )}

        {/* Notifications — pro mode only */}
        {isProMode && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Notifications</span>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
            {notificationsEnabled && (
              <div className="mt-3 pl-7">
                <label className="text-xs text-gray-600 font-medium">Overdue billing alerts</label>
                <p className="text-[11px] text-gray-400 mt-0.5 mb-1">Alert for patients without a charge placed in this many days</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {[1, 2, 3].map(d => (
                    <button
                      key={d}
                      onClick={() => { setBillingReminderDays(d); setShowCustomDays(false); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        billingReminderDays === d && !showCustomDays
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {d} day{d > 1 ? 's' : ''}
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowCustomDays(true); setCustomDaysInput(String(billingReminderDays)); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                      showCustomDays || ![1, 2, 3].includes(billingReminderDays)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {!showCustomDays && ![1, 2, 3].includes(billingReminderDays)
                      ? `${billingReminderDays} days`
                      : 'Custom'}
                  </button>
                </div>
                {showCustomDays && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={customDaysInput}
                      onChange={(e) => setCustomDaysInput(e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Days"
                    />
                    <span className="text-xs text-gray-500">days</span>
                    <button
                      onClick={() => {
                        const val = parseInt(customDaysInput);
                        if (val >= 1 && val <= 30) {
                          setBillingReminderDays(val);
                          setShowCustomDays(false);
                        }
                      }}
                      disabled={!customDaysInput || parseInt(customDaysInput) < 1 || parseInt(customDaysInput) > 30}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PHI Auto-Scrub — individual mode only */}
        {!isProMode && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">PHI Auto-Scrub</span>
              </div>
              <button
                onClick={() => setPhiAutoScrub(!phiAutoScrub)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  phiAutoScrub ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  phiAutoScrub ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Automatically remove patient identifiers from exported reports
            </p>
          </div>
        )}

        {/* CPT Code Categories */}
        <button
          onClick={() => { onOpenCodeGroupSettings(); }}
          className="w-full bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-700">CPT Code Categories</span>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* Log Out */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-center gap-2 mt-2"
          >
            <LogOut size={18} className="text-red-500" />
            <span className="text-sm font-semibold text-red-500">Log Out</span>
          </button>
        )}

        {/* Version */}
        <div className="text-center pt-4 pb-8">
          <p
            className="text-xs text-gray-400 cursor-default"
            onClick={handleVersionTap}
          >
            CathCPT v2.4 — February 2026
          </p>
          <p className="text-xs text-gray-300 mt-1">A product of Lumen Innovations</p>
        </div>
      </div>
    </div>
  );
};
