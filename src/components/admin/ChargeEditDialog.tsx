import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { StoredCharge, updateCharge } from '../../services/chargesService';
import { logAuditEvent } from '../../services/auditService';

interface ChargeEditDialogProps {
  isOpen: boolean;
  charge: StoredCharge | null;
  patientName: string;
  orgId: string;
  adminId: string;
  adminName: string;
  onClose: () => void;
  onSaved: () => void;
}

export const ChargeEditDialog: React.FC<ChargeEditDialogProps> = ({
  isOpen,
  charge,
  patientName,
  orgId,
  adminId,
  adminName,
  onClose,
  onSaved
}) => {
  const [cptCode, setCptCode] = useState('');
  const [cptDescription, setCptDescription] = useState('');
  const [timeMinutes, setTimeMinutes] = useState<number | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (charge) {
      setCptCode(charge.cptCode);
      setCptDescription(charge.cptDescription || '');
      setTimeMinutes(charge.timeMinutes);
    }
  }, [charge]);

  if (!isOpen || !charge) return null;

  const handleSave = async () => {
    if (!cptCode.trim()) return;

    setIsSaving(true);
    try {
      const previousCode = charge.cptCode;
      await updateCharge(charge.id, {
        cptCode: cptCode.trim(),
        cptDescription: cptDescription.trim() || undefined,
        timeMinutes
      });

      await logAuditEvent(orgId, {
        action: 'charge_modified',
        userId: adminId,
        userName: adminName,
        targetPatientId: charge.inpatientId,
        targetPatientName: patientName,
        details: `Modified charge from ${previousCode} to ${cptCode.trim()} for ${patientName}`,
        listContext: null,
        metadata: {
          chargeId: charge.id,
          chargeDate: charge.chargeDate,
          previousCptCode: previousCode,
          newCptCode: cptCode.trim()
        }
      });

      onSaved();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update charge');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Edit Charge</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Info */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">{patientName}</p>
          <p className="text-xs text-gray-400">Date: {charge.chargeDate}</p>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPT Code</label>
            <input
              type="text"
              value={cptCode}
              onChange={(e) => setCptCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 99232"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={cptDescription}
              onChange={(e) => setCptDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time (minutes)</label>
            <input
              type="number"
              value={timeMinutes || ''}
              onChange={(e) => setTimeMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional"
            />
          </div>

          {/* Status Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700">
              Current status: <span className="font-medium">{charge.status}</span>.
              {charge.status === 'entered' && ' Editing will reset status to pending.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !cptCode.trim()}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChargeEditDialog;
