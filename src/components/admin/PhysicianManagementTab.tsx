import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  RefreshCw,
  Shield,
  User,
  MoreVertical,
  Check,
  Key
} from 'lucide-react';
import { PracticeMember, UserRole } from '../../types';
import {
  getPracticeMembers,
  removePracticeMember,
  changeMemberRole,
  regeneratePracticeCode,
  getPracticeDetails
} from '../../services/practiceConnection';
import { logAuditEvent } from '../../services/auditService';
import { PhysicianDetailDialog } from './PhysicianDetailDialog';

interface PhysicianManagementTabProps {
  orgId: string;
  currentUserId: string;
  currentUserName: string;
}

export const PhysicianManagementTab: React.FC<PhysicianManagementTabProps> = ({
  orgId,
  currentUserId,
  currentUserName
}) => {
  const [members, setMembers] = useState<PracticeMember[]>([]);
  const [practiceCode, setPracticeCode] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PracticeMember | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [memberList, details] = await Promise.all([
      getPracticeMembers(orgId),
      getPracticeDetails(orgId)
    ]);
    setMembers(memberList);
    setPracticeCode(details.practiceCode);
    setPracticeName(details.name);
    setIsLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(practiceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for iOS
      const textArea = document.createElement('textarea');
      textArea.value = practiceCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerate the practice code? The old code will no longer work. Current members will not be affected.')) {
      return;
    }

    setIsRegenerating(true);
    const newCode = await regeneratePracticeCode(orgId);
    setPracticeCode(newCode);

    await logAuditEvent(orgId, {
      action: 'practice_code_regenerated',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: 'Regenerated practice invite code',
      listContext: null
    });

    setIsRegenerating(false);
  };

  const handleChangeRole = async (userId: string, newRole: 'physician' | 'admin') => {
    await changeMemberRole(orgId, userId, newRole as UserRole);
    await logAuditEvent(orgId, {
      action: 'physician_role_changed',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: `Changed role for member to ${newRole}`,
      listContext: null,
      metadata: { targetUserId: userId }
    });
    await loadData();
  };

  const handleRemoveMember = async (userId: string) => {
    await removePracticeMember(orgId, userId);
    await logAuditEvent(orgId, {
      action: 'physician_removed',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: 'Removed member from practice',
      listContext: null,
      metadata: { targetUserId: userId }
    });
    await loadData();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Invite Code Card */}
      <div className="m-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5" />
          <h3 className="font-semibold">Practice Invite Code</h3>
        </div>
        <p className="text-blue-100 text-xs mb-3">
          Share this code with physicians. They enter it in Settings &gt; Practice Connection.
        </p>

        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-3 mb-3">
          <span className="flex-1 text-2xl font-mono font-bold tracking-widest text-center">
            {practiceCode || 'Loading...'}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyCode}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium"
          >
            {copied ? (
              <><Check className="w-4 h-4" />Copied!</>
            ) : (
              <><Copy className="w-4 h-4" />Copy Code</>
            )}
          </button>
          <button
            onClick={handleRegenerateCode}
            disabled={isRegenerating}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="px-4 mb-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Team Members ({members.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-100 mx-4 bg-white rounded-lg border border-gray-200">
        {members.map(member => (
          <button
            key={member.id}
            onClick={() => setSelectedMember(member)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              member.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
            }`}>
              <span className={`text-sm font-bold ${
                member.role === 'admin' ? 'text-purple-600' : 'text-blue-600'
              }`}>
                {(member.displayName || member.email).charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.displayName || member.email}
                </p>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full ${
                  member.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {member.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                  {member.role === 'admin' ? 'Admin' : 'Physician'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {member.email} {member.joinedAt && `• Joined ${formatDate(member.joinedAt)}`}
              </p>
            </div>

            {/* Charge Count */}
            {member.chargeCount !== undefined && member.chargeCount > 0 && (
              <span className="text-xs text-gray-400">
                {member.chargeCount} charges
              </span>
            )}

            <MoreVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>

      <div className="h-4" /> {/* Bottom padding */}

      {/* Detail Dialog */}
      <PhysicianDetailDialog
        isOpen={!!selectedMember}
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onChangeRole={handleChangeRole}
        onRemove={handleRemoveMember}
      />
    </div>
  );
};

export default PhysicianManagementTab;
