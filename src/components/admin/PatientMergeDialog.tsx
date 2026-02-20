import React, { useState } from 'react';
import { X, GitMerge, AlertTriangle, ArrowRight } from 'lucide-react';
import { Inpatient } from '../../types';
import { mergePatients } from '../../services/patientDeduplicationService';
import { StoredCharge } from '../../services/chargesService';

interface PatientMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patient1: Inpatient | null;
  patient2: Inpatient | null;
  charges: Record<string, Record<string, StoredCharge>>;
  orgId: string;
  adminId: string;
  adminName: string;
  onMergeComplete: () => void;
}

export const PatientMergeDialog: React.FC<PatientMergeDialogProps> = ({
  isOpen,
  onClose,
  patient1,
  patient2,
  charges,
  orgId,
  adminId,
  adminName,
  onMergeComplete
}) => {
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !patient1 || !patient2) return null;

  const getChargeCount = (patientId: string): number => {
    const patientCharges = charges[patientId];
    if (!patientCharges) return 0;
    return Object.keys(patientCharges).length;
  };

  const p1Charges = getChargeCount(patient1.id);
  const p2Charges = getChargeCount(patient2.id);

  const canonical = canonicalId === patient1.id ? patient1 : canonicalId === patient2.id ? patient2 : null;
  const duplicate = canonicalId === patient1.id ? patient2 : canonicalId === patient2.id ? patient1 : null;

  const handleMerge = async () => {
    if (!canonical || !duplicate) return;

    setIsMerging(true);
    setError('');

    try {
      await mergePatients(canonical.id, duplicate.id, orgId, adminId, adminName);
      onMergeComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setIsMerging(false);
    }
  };

  const renderPatientCard = (patient: Inpatient, chargeCount: number, isCanonical: boolean | null) => (
    <button
      onClick={() => setCanonicalId(patient.id)}
      className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
        canonicalId === patient.id
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <p className="text-sm font-medium text-gray-900">{patient.patientName}</p>
      <p className="text-xs text-gray-500 mt-1">DOB: {patient.dob}</p>
      {patient.mrn && <p className="text-xs text-gray-500">MRN: {patient.mrn}</p>}
      <p className="text-xs text-gray-500">{patient.hospitalName || 'Unknown hospital'}</p>
      <p className="text-xs text-gray-700 mt-1 font-medium">{chargeCount} charge{chargeCount !== 1 ? 's' : ''}</p>
      {canonicalId === patient.id && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
          Keep this record
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Merge Patients</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-600">
            Select which patient record to keep. All charges from the other record will be moved to the selected one.
          </p>

          <div className="flex gap-3">
            {renderPatientCard(patient1, p1Charges, canonicalId === patient1.id ? true : canonicalId === patient2.id ? false : null)}
            {renderPatientCard(patient2, p2Charges, canonicalId === patient2.id ? true : canonicalId === patient1.id ? false : null)}
          </div>

          {canonical && duplicate && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Merge Preview</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span>{duplicate.patientName}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium">{canonical.patientName}</span>
                  </div>
                  <p className="text-xs mt-1">
                    {getChargeCount(duplicate.id)} charge(s) will be moved. The duplicate record will be deactivated.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
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
            onClick={handleMerge}
            disabled={!canonicalId || isMerging}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMerging ? 'Merging...' : 'Confirm Merge'}
          </button>
        </div>
      </div>
    </div>
  );
};
