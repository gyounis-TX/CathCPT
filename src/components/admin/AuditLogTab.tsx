import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Users,
  Shield,
  Filter,
  ChevronDown,
  Clock,
  DollarSign,
  UserPlus,
  UserMinus,
  Edit2,
  Check,
  CheckCircle,
  Key,
  Building2,
  GitMerge,
  RefreshCw
} from 'lucide-react';
import { AuditAction, AuditLogEntry } from '../../types';
import { getFilteredAuditLog } from '../../services/auditService';

interface AuditLogTabProps {
  orgId: string;
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  charge_submitted: { icon: <FileText className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50', label: 'Charge Submitted' },
  charge_modified: { icon: <Edit2 className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50', label: 'Charge Modified' },
  charge_marked_entered: { icon: <Check className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50', label: 'Charge Entered' },
  charge_marked_billed: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50', label: 'Charge Billed' },
  charge_batch_billed: { icon: <DollarSign className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50', label: 'Batch Billed' },
  patient_added: { icon: <UserPlus className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Patient Added' },
  patient_discharged: { icon: <UserMinus className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Patient Discharged' },
  patient_removed: { icon: <UserMinus className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Patient Removed' },
  patient_merged: { icon: <GitMerge className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Patient Merged' },
  call_list_add: { icon: <Users className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Call List Add' },
  call_list_remove: { icon: <Users className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Call List Remove' },
  call_list_clear: { icon: <Users className="w-4 h-4" />, color: 'text-green-600 bg-green-50', label: 'Call List Clear' },
  physician_invited: { icon: <UserPlus className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Physician Invited' },
  physician_removed: { icon: <UserMinus className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Physician Removed' },
  physician_role_changed: { icon: <Shield className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Role Changed' },
  practice_code_regenerated: { icon: <Key className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Code Regenerated' },
  hospital_added: { icon: <Building2 className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Hospital Added' },
  hospital_deactivated: { icon: <Building2 className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Hospital Deactivated' },
  cathlab_added: { icon: <Building2 className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Cath Lab Added' },
  cathlab_deactivated: { icon: <Building2 className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Cath Lab Deactivated' },
  user_login: { icon: <Key className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50', label: 'User Login' },
  user_logout: { icon: <Key className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50', label: 'User Logout' },
  user_login_failed: { icon: <Shield className="w-4 h-4" />, color: 'text-red-600 bg-red-50', label: 'Login Failed' },
  session_locked: { icon: <Shield className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50', label: 'Session Locked' },
  session_unlocked: { icon: <Key className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50', label: 'Session Unlocked' },
  data_exported: { icon: <FileText className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50', label: 'Data Exported' },
};

const actionFilterOptions: { value: string; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'charge', label: 'Charge Actions' },
  { value: 'patient', label: 'Patient Actions' },
  { value: 'practice', label: 'Practice Actions' },
];

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ orgId }) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const getActionTypes = (filter: string): AuditAction[] | undefined => {
    if (!filter) return undefined;
    if (filter === 'charge') return ['charge_submitted', 'charge_modified', 'charge_marked_entered', 'charge_marked_billed', 'charge_batch_billed'];
    if (filter === 'patient') return ['patient_added', 'patient_discharged', 'patient_removed', 'patient_merged', 'call_list_add', 'call_list_remove', 'call_list_clear'];
    if (filter === 'practice') return ['physician_invited', 'physician_removed', 'physician_role_changed', 'practice_code_regenerated', 'hospital_added', 'hospital_deactivated', 'cathlab_added', 'cathlab_deactivated', 'user_login', 'user_logout', 'user_login_failed', 'session_locked', 'session_unlocked', 'data_exported'];
    return undefined;
  };

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    const results = await getFilteredAuditLog(orgId, {
      actionTypes: getActionTypes(actionFilter),
      limit: 50
    });
    setEntries(results);
    setHasMore(results.length === 50);
    setIsLoading(false);
  }, [orgId, actionFilter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleLoadMore = async () => {
    if (entries.length === 0) return;
    setIsLoadingMore(true);
    const lastEntry = entries[entries.length - 1];
    const more = await getFilteredAuditLog(orgId, {
      actionTypes: getActionTypes(actionFilter),
      limit: 50,
      startAfterId: lastEntry.id
    });
    setEntries(prev => [...prev, ...more]);
    setHasMore(more.length === 50);
    setIsLoadingMore(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffHours < 48) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
          >
            {actionFilterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={loadEntries}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading audit log...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No entries</p>
            <p className="text-sm">Audit log is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map(entry => {
              const config = actionConfig[entry.action] || {
                icon: <Clock className="w-4 h-4" />,
                color: 'text-gray-600 bg-gray-50',
                label: entry.action
              };

              return (
                <div key={entry.id} className="px-4 py-3 bg-white flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{entry.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{entry.userName}</span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    {entry.targetPatientName && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {entry.targetPatientName}
                      </span>
                    )}
                    {entry.metadata?.chargeDate && (
                      <span className="inline-block mt-1 ml-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                        DOS: {entry.metadata.chargeDate}
                      </span>
                    )}
                  </div>

                  {/* Action Badge */}
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <div className="p-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogTab;
