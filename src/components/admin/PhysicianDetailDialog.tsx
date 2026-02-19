import React from 'react';
import { X, Mail, Calendar, FileText, Shield, User } from 'lucide-react';
import { PracticeMember } from '../../types';

interface PhysicianDetailDialogProps {
  isOpen: boolean;
  member: PracticeMember | null;
  onClose: () => void;
  onChangeRole: (userId: string, newRole: 'physician' | 'admin') => void;
  onRemove: (userId: string) => void;
}

export const PhysicianDetailDialog: React.FC<PhysicianDetailDialogProps> = ({
  isOpen,
  member,
  onClose,
  onChangeRole,
  onRemove
}) => {
  if (!isOpen || !member) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Member Details</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {(member.displayName || member.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {member.displayName || 'No Name'}
              </p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                member.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {member.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {member.role === 'admin' ? 'Admin' : 'Physician'}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{member.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Joined {formatDate(member.joinedAt)}</span>
            </div>
            {member.chargeCount !== undefined && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{member.chargeCount} charges submitted</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => {
                const newRole = member.role === 'admin' ? 'physician' : 'admin';
                if (confirm(`Change ${member.displayName || member.email}'s role to ${newRole}?`)) {
                  onChangeRole(member.id, newRole);
                  onClose();
                }
              }}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm"
            >
              Change to {member.role === 'admin' ? 'Physician' : 'Admin'}
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove ${member.displayName || member.email} from the practice? They will need to rejoin with the practice code.`)) {
                  onRemove(member.id);
                  onClose();
                }
              }}
              className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 text-sm"
            >
              Remove from Practice
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhysicianDetailDialog;
