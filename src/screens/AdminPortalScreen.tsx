import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutList,
  Users,
  UserCog,
  ClipboardList,
  RefreshCw,
  BarChart3,
  Activity,
  Settings,
  Mail,
  Sparkles
} from 'lucide-react';
import { AdminTab, UserMode, Hospital, Inpatient } from '../types';
import { StoredCharge } from '../services/chargesService';
import { getChargeNotificationSettings, updateChargeNotificationSettings, getOrgMembers } from '../services/notificationSettingsService';
import { OpNoteExtractorScreen } from './OpNoteExtractorScreen';
import { getChargeStats } from '../services/adminChargeService';
import { getReportSchedule, isReportDue } from '../services/reportScheduleService';
import { ChargeQueueTab } from '../components/admin/ChargeQueueTab';
import { PatientRosterTab } from '../components/admin/PatientRosterTab';
import { PhysicianManagementTab } from '../components/admin/PhysicianManagementTab';
import { AuditLogTab } from '../components/admin/AuditLogTab';
import { ReportsTab } from '../components/admin/ReportsTab';

interface AdminPortalScreenProps {
  userMode: UserMode;
  hospitals: Hospital[];
  patients: Inpatient[];
  currentUserId: string;
  currentUserName: string;
  charges: Record<string, Record<string, StoredCharge>>;
  diagnoses: Record<string, string[]>;
  onRefresh: () => Promise<void>;
  onChargesUpdated: () => Promise<void>;
  onPracticeNameChanged?: (name: string) => void;
}

export const AdminPortalScreen: React.FC<AdminPortalScreenProps> = ({
  userMode,
  hospitals,
  patients,
  currentUserId,
  currentUserName,
  charges,
  diagnoses,
  onRefresh,
  onChargesUpdated,
  onPracticeNameChanged
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('chargeQueue');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOpNoteExtractor, setShowOpNoteExtractor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalEntered: 0,
    billedToday: 0,
    billedThisWeek: 0,
    totalRVUPending: 0,
    totalPaymentPending: 0
  });
  const [reportsDue, setReportsDue] = useState(false);

  // Charge notification settings
  const [chargeNotifEnabled, setChargeNotifEnabled] = useState(false);
  const [chargeNotifRecipients, setChargeNotifRecipients] = useState<string[]>([]);
  const [orgMembers, setOrgMembers] = useState<{id: string; displayName: string; email: string}[]>([]);
  const [chargeNotifLoading, setChargeNotifLoading] = useState(false);

  const orgId = userMode.organizationId || 'YOCA';

  const loadStats = useCallback(async () => {
    const s = await getChargeStats(orgId);
    setStats(s);
  }, [orgId]);

  const checkReportSchedule = useCallback(async () => {
    const schedule = await getReportSchedule(orgId);
    setReportsDue(isReportDue(schedule));
  }, [orgId]);

  useEffect(() => {
    loadStats();
    checkReportSchedule();
  }, [loadStats, checkReportSchedule]);

  // Load charge notification settings
  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      setChargeNotifLoading(true);
      try {
        const [settings, members] = await Promise.all([
          getChargeNotificationSettings(orgId),
          getOrgMembers(orgId),
        ]);
        setChargeNotifEnabled(settings.enabled);
        setChargeNotifRecipients(settings.recipientUserIds);
        setOrgMembers(members);
      } catch (err) {
        console.error('Failed to load charge notification settings', err);
      } finally {
        setChargeNotifLoading(false);
      }
    };
    load();
  }, [orgId]);

  const saveChargeNotifSettings = async (enabled: boolean, recipients: string[]) => {
    try {
      await updateChargeNotificationSettings(orgId, { enabled, recipientUserIds: recipients });
    } catch (err) {
      console.error('Failed to save charge notification settings', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    await loadStats();
    setRefreshKey(prev => prev + 1);
    setIsRefreshing(false);
  };

  const handleChargesUpdated = async () => {
    await onChargesUpdated();
    await loadStats();
  };

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'chargeQueue', label: 'Charges', icon: <LayoutList className="w-4 h-4" /> },
    { key: 'patientRoster', label: 'Patients', icon: <Users className="w-4 h-4" /> },
    { key: 'physicians', label: 'Practice', icon: <UserCog className="w-4 h-4" /> },
    { key: 'auditLog', label: 'Audit Log', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  if (showOpNoteExtractor) {
    return (
      <OpNoteExtractorScreen
        onClose={() => setShowOpNoteExtractor(false)}
        orgId={orgId}
        userId={currentUserId}
        userName={currentUserName}
        patients={patients}
        onChargeCreated={() => {
          handleChargesUpdated();
          setShowOpNoteExtractor(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-[#0D47A1] px-4 pt-2 pb-0 flex-shrink-0">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-300" />
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">Admin Portal</h1>
              <p className="text-[10px] text-blue-300">{currentUserName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOpNoteExtractor(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-200 bg-blue-800/50 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Op Note
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-200 bg-blue-800/50 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Horizontal scrollable tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-0 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-colors flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-gray-50 text-[#0D47A1]'
                  : 'text-blue-200 hover:text-white hover:bg-blue-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'reports' && reportsDue && (
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards — only show on charge-related tabs */}
      {(activeTab === 'chargeQueue' || activeTab === 'reports') && (
        <div className="bg-white border-b border-gray-200 px-3 py-3 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-lg font-bold text-amber-700 leading-tight">{stats.totalPending}</p>
              <p className="text-[10px] text-amber-600 font-medium">Pending</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-lg font-bold text-blue-700 leading-tight">{stats.totalEntered}</p>
              <p className="text-[10px] text-blue-600 font-medium">Entered</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-lg font-bold text-green-700 leading-tight">{stats.billedToday}</p>
              <p className="text-[10px] text-green-600 font-medium">Billed Today</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <p className="text-lg font-bold text-purple-700 leading-tight">{stats.totalRVUPending.toFixed(1)}</p>
              <p className="text-[10px] text-purple-600 font-medium">RVU Pending</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-lg font-bold text-emerald-700 leading-tight">${stats.totalPaymentPending.toFixed(0)}</p>
              <p className="text-[10px] text-emerald-600 font-medium">$ Pending</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chargeQueue' && (
          <ChargeQueueTab
            orgId={orgId}
            hospitals={hospitals}
            patients={patients}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onChargesUpdated={handleChargesUpdated}
            refreshKey={refreshKey}
          />
        )}
        {activeTab === 'patientRoster' && (
          <PatientRosterTab
            orgId={orgId}
            hospitals={hospitals}
            knownPatients={patients}
            charges={charges}
            diagnoses={diagnoses}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onChargesUpdated={handleChargesUpdated}
          />
        )}
        {activeTab === 'physicians' && (
          <PhysicianManagementTab
            orgId={orgId}
            orgName={userMode.organizationName || 'Practice'}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onPracticeNameChanged={onPracticeNameChanged}
          />
        )}
        {activeTab === 'auditLog' && (
          <AuditLogTab orgId={orgId} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab
            orgId={orgId}
            hospitals={hospitals}
            patients={patients}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        )}
        {activeTab === 'settings' && (
          <div className="p-4 overflow-y-auto h-full space-y-4">
            {/* Charge Notifications */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Charge Notifications</span>
                </div>
                <button
                  onClick={() => {
                    const next = !chargeNotifEnabled;
                    setChargeNotifEnabled(next);
                    saveChargeNotifSettings(next, chargeNotifRecipients);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    chargeNotifEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    chargeNotifEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mb-2 pl-7">Email selected team members when a physician submits a charge</p>
              {chargeNotifEnabled && (
                <div className="mt-3 pl-7 space-y-2">
                  {chargeNotifLoading ? (
                    <p className="text-xs text-gray-400">Loading team members...</p>
                  ) : orgMembers.length === 0 ? (
                    <p className="text-xs text-gray-400">No team members found</p>
                  ) : (
                    orgMembers.map(member => (
                      <label key={member.id} className="flex items-center gap-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={chargeNotifRecipients.includes(member.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...chargeNotifRecipients, member.id]
                              : chargeNotifRecipients.filter(id => id !== member.id);
                            setChargeNotifRecipients(next);
                            saveChargeNotifSettings(chargeNotifEnabled, next);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm text-gray-700">{member.displayName}</p>
                          <p className="text-[11px] text-gray-400">{member.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortalScreen;
