import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutList,
  Users,
  UserCog,
  ClipboardList,
  Settings,
  RefreshCw,
  BarChart3,
  Activity
} from 'lucide-react';
import { AdminTab, UserMode, Hospital, Inpatient } from '../types';
import { StoredCharge } from '../services/chargesService';
import { getChargeStats } from '../services/adminChargeService';
import { getReportSchedule, isReportDue } from '../services/reportScheduleService';
import { ChargeQueueTab } from '../components/admin/ChargeQueueTab';
import { PatientRosterTab } from '../components/admin/PatientRosterTab';
import { PhysicianManagementTab } from '../components/admin/PhysicianManagementTab';
import { AuditLogTab } from '../components/admin/AuditLogTab';
import { PracticeSettingsTab } from '../components/admin/PracticeSettingsTab';
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
  onChargesUpdated
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('chargeQueue');
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    { key: 'physicians', label: 'Physicians', icon: <UserCog className="w-4 h-4" /> },
    { key: 'auditLog', label: 'Audit Log', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-200 bg-blue-800/50 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
          <PracticeSettingsTab
            orgId={orgId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPortalScreen;
