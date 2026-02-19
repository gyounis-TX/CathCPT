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

  const orgId = userMode.organizationId || 'mock-org-1';

  const loadStats = useCallback(async () => {
    const s = await getChargeStats(orgId);
    setStats(s);
  }, [orgId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
    { key: 'chargeQueue', label: 'Charge Queue', icon: <LayoutList className="w-5 h-5" /> },
    { key: 'patientRoster', label: 'Patients', icon: <Users className="w-5 h-5" /> },
    { key: 'physicians', label: 'Physicians', icon: <UserCog className="w-5 h-5" /> },
    { key: 'auditLog', label: 'Audit Log', icon: <ClipboardList className="w-5 h-5" /> },
    { key: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 bg-[#0D47A1] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-300" />
            <div>
              <h1 className="text-base font-semibold text-white">CathCPT</h1>
              <p className="text-[11px] text-blue-300">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#1976D2] text-white border-l-[3px] border-[#42A5F5]'
                  : 'text-blue-200 hover:bg-[#1565C0] hover:text-white border-l-[3px] border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-5 py-3 border-t border-blue-800">
          <p className="text-[11px] text-blue-300">{currentUserName}</p>
          <p className="text-[10px] text-blue-400">Organization Admin</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Stats Header Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {tabs.find(t => t.key === activeTab)?.label}
              </h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Cards — only show on charge-related tabs */}
          {(activeTab === 'chargeQueue' || activeTab === 'reports') && (
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-amber-700">{stats.totalPending}</p>
                <p className="text-xs text-amber-600 font-medium">Pending</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-blue-700">{stats.totalEntered}</p>
                <p className="text-xs text-blue-600 font-medium">Entered</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-green-700">{stats.billedToday}</p>
                <p className="text-xs text-green-600 font-medium">Billed Today</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-purple-700">{stats.totalRVUPending.toFixed(1)}</p>
                <p className="text-xs text-purple-600 font-medium">RVU Pending</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-emerald-700">${stats.totalPaymentPending.toFixed(0)}</p>
                <p className="text-xs text-emerald-600 font-medium">$ Pending</p>
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
};

export default AdminPortalScreen;
