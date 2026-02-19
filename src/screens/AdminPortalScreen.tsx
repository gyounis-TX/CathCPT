import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutList,
  Users,
  UserCog,
  ClipboardList,
  Settings,
  RefreshCw
} from 'lucide-react';
import { AdminTab, UserMode, Hospital, Inpatient } from '../types';
import { StoredCharge } from '../services/chargesService';
import { getChargeStats } from '../services/adminChargeService';
import { ChargeQueueTab } from '../components/admin/ChargeQueueTab';
import { PatientRosterTab } from '../components/admin/PatientRosterTab';
import { PhysicianManagementTab } from '../components/admin/PhysicianManagementTab';
import { AuditLogTab } from '../components/admin/AuditLogTab';
import { PracticeSettingsTab } from '../components/admin/PracticeSettingsTab';

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
    setIsRefreshing(false);
  };

  const handleChargesUpdated = async () => {
    await onChargesUpdated();
    await loadStats();
  };

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'chargeQueue', label: 'Charges', icon: <LayoutList className="w-4 h-4" /> },
    { key: 'patientRoster', label: 'Patients', icon: <Users className="w-4 h-4" /> },
    { key: 'physicians', label: 'Team', icon: <UserCog className="w-4 h-4" /> },
    { key: 'auditLog', label: 'Audit', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Stats Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Admin Portal</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            <p className="text-2xl font-bold text-amber-700">{stats.totalPending}</p>
            <p className="text-xs text-amber-600">Pending</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.totalEntered}</p>
            <p className="text-xs text-blue-600">Entered</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.billedToday}</p>
            <p className="text-xs text-green-600">Billed Today</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
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
          />
        )}
        {activeTab === 'patientRoster' && (
          <PatientRosterTab
            orgId={orgId}
            hospitals={hospitals}
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
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        )}
        {activeTab === 'auditLog' && (
          <AuditLogTab orgId={orgId} />
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
