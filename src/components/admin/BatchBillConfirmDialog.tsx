import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { ChargeQueueItem } from '../../types';
import { batchMarkChargesBilled, batchMarkChargesEntered } from '../../services/adminChargeService';
import { logAuditEvent } from '../../services/auditService';

interface BatchBillConfirmDialogProps {
  isOpen: boolean;
  items: ChargeQueueItem[];
  action: 'entered' | 'billed';
  orgId: string;
  adminId: string;
  adminName: string;
  onClose: () => void;
  onCompleted: () => void;
}

export const BatchBillConfirmDialog: React.FC<BatchBillConfirmDialogProps> = ({
  isOpen,
  items,
  action,
  orgId,
  adminId,
  adminName,
  onClose,
  onCompleted
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const chargeIds = items.map(item => item.charge.id);
      let res: { success: number; failed: number };

      if (action === 'billed') {
        res = await batchMarkChargesBilled(chargeIds, adminId, adminName, orgId);
      } else {
        res = await batchMarkChargesEntered(chargeIds, adminId, adminName);
        if (res.success > 0) {
          await logAuditEvent(orgId, {
            action: 'charge_marked_entered',
            userId: adminId,
            userName: adminName,
            targetPatientId: null,
            targetPatientName: null,
            details: `Batch marked ${res.success} charge${res.success !== 1 ? 's' : ''} as entered`,
            listContext: null,
            metadata: { batchSize: res.success }
          });
        }
      }

      setResult(res);

      // Auto-close after success
      setTimeout(() => {
        setResult(null);
        onCompleted();
        onClose();
      }, 1500);
    } catch (error) {
      alert('Failed to process charges');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate summary stats
  const totalRVU = items.reduce((sum, item) => sum + (item.charge.rvu || 0), 0);
  const uniquePatients = new Set(items.map(item => item.patient.patientName)).size;

  const actionLabel = action === 'billed' ? 'Mark as Billed' : 'Mark as Entered';
  const actionColor = action === 'billed' ? 'green' : 'blue';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-${actionColor}-50`}>
          <h2 className="text-lg font-semibold text-gray-900">
            {result ? 'Complete' : `Confirm Batch ${action === 'billed' ? 'Billing' : 'Entry'}`}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {result ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">
                {result.success} charge{result.success !== 1 ? 's' : ''} processed
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {result.failed} failed
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                      <p className="text-xs text-gray-500">Charges</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{uniquePatients}</p>
                      <p className="text-xs text-gray-500">Patients</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{totalRVU.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Total RVU</p>
                    </div>
                  </div>
                </div>

                {/* Charge list preview */}
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.charge.id} className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.patient.patientName}</p>
                        <p className="text-xs text-gray-500">
                          {item.charge.cptCode} | {item.charge.chargeDate}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.charge.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.charge.status}
                      </span>
                    </div>
                  ))}
                </div>

                {action === 'billed' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Billed charges will be locked and cannot be edited. This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-white disabled:opacity-50 ${
                    action === 'billed'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : actionLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchBillConfirmDialog;
