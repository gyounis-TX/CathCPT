import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Shield,
  User,
  MoreVertical,
  Check,
  UserPlus,
  Clock,
  X,
  Mail
} from 'lucide-react';
import { PracticeMember, UserRole } from '../../types';
import {
  getPracticeMembers,
  removePracticeMember,
  changeMemberRole,
  getPracticeDetails
} from '../../services/practiceConnection';
import { getOrgInvites, revokeInvite, InviteCode } from '../../services/inviteService';
import { logAuditEvent } from '../../services/auditService';
import { PhysicianDetailDialog } from './PhysicianDetailDialog';
import { InvitePhysicianDialog } from './InvitePhysicianDialog';

interface PhysicianManagementTabProps {
  orgId: string;
  orgName: string;
  currentUserId: string;
  currentUserName: string;
}

export const PhysicianManagementTab: React.FC<PhysicianManagementTabProps> = ({
  orgId,
  orgName,
  currentUserId,
  currentUserName
}) => {
  const [members, setMembers] = useState<PracticeMember[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<PracticeMember | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [memberList, inviteList] = await Promise.all([
      getPracticeMembers(orgId),
      getOrgInvites(orgId)
    ]);
    setMembers(memberList);
    setInvites(inviteList);
    setIsLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleRevokeInvite = async (invite: InviteCode) => {
    if (!confirm(`Revoke invite for Dr. ${invite.lastName}? They will no longer be able to use this code.`)) {
      return;
    }
    await revokeInvite(orgId, invite.code, currentUserId, currentUserName);
    await loadData();
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

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const redeemedInvites = invites.filter(i => i.status === 'redeemed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Invite Button */}
      <div className="m-4">
        <button
          onClick={() => setShowInviteDialog(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Invite Physician
        </button>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <>
          <div className="px-4 mb-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Pending Invites ({pendingInvites.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-100 mx-4 mb-4 bg-white rounded-lg border border-gray-200">
            {pendingInvites.map(invite => (
              <div key={invite.code} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Dr. {invite.firstName} {invite.lastName}
                    </p>
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                      Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{invite.email}</span>
                  </div>
                </div>

                {/* Code + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopyCode(invite.code)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-mono text-gray-700"
                  >
                    {copiedCode === invite.code ? (
                      <><Check className="w-3 h-3 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> {invite.code}</>
                    )}
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(invite)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Revoke invite"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Team Members */}
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

      {/* Dialogs */}
      <PhysicianDetailDialog
        isOpen={!!selectedMember}
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onChangeRole={handleChangeRole}
        onRemove={handleRemoveMember}
      />

      <InvitePhysicianDialog
        isOpen={showInviteDialog}
        orgId={orgId}
        orgName={orgName}
        adminId={currentUserId}
        adminName={currentUserName}
        onClose={() => setShowInviteDialog(false)}
        onInviteCreated={loadData}
      />
    </div>
  );
};

export default PhysicianManagementTab;
