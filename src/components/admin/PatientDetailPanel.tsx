import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Calendar,
  Clock,
  Edit2,
  Check,
  CheckCircle,
  Lock,
  DollarSign,
  FileText
} from 'lucide-react';
import { Inpatient, PatientWithCharges } from '../../types';
import { StoredCharge, markChargeEntered, markChargeBilled } from '../../services/chargesService';
import { getPatientWithCharges } from '../../services/patientRosterService';
import { logAuditEvent } from '../../services/auditService';
import { calculateMedicarePayment, getAllInpatientCodes } from '../../data/inpatientCodes';
import { ChargeEditDialog } from './ChargeEditDialog';

interface PatientDetailPanelProps {
  isOpen: boolean;
  patient: Inpatient | null;
  orgId: string;
  adminId: string;
  adminName: string;
  onClose: () => void;
  onChargesUpdated: () => void;
}

export const PatientDetailPanel: React.FC<PatientDetailPanelProps> = ({
  isOpen,
  patient,
  orgId,
  adminId,
  adminName,
  onClose,
  onChargesUpdated
}) => {
  const [patientData, setPatientData] = useState<PatientWithCharges | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCharge, setEditingCharge] = useState<StoredCharge | null>(null);

  const allCodes = useMemo(() => getAllInpatientCodes(), []);

  const getRVU = (cptCode: string): number => {
    if (cptCode.includes(' + ')) {
      return cptCode.split(' + ').reduce((sum, code) => {
        const baseCode = code.replace(/-\d+$/, '').trim();
        const codeData = allCodes.find(c => c.code === baseCode);
        return sum + (codeData?.rvu || 0);
      }, 0);
    }
    const baseCode = cptCode.replace(/-\d+$/, '').trim();
    const code = allCodes.find(c => c.code === baseCode);
    return code?.rvu || 0;
  };

  useEffect(() => {
    if (patient && isOpen) {
      loadPatientData();
    }
  }, [patient, isOpen]);

  const loadPatientData = async () => {
    if (!patient) return;
    setIsLoading(true);
    const data = await getPatientWithCharges(orgId, patient.id);
    setPatientData(data);
    setIsLoading(false);
  };

  const handleMarkEntered = async (charge: StoredCharge) => {
    await markChargeEntered(charge.id, adminName);
    await logAuditEvent(orgId, {
      action: 'charge_marked_entered',
      userId: adminId,
      userName: adminName,
      targetPatientId: patient?.id || null,
      targetPatientName: patient?.patientName || null,
      details: `Marked charge ${charge.cptCode} as entered for ${patient?.patientName}`,
      listContext: null,
      metadata: { chargeId: charge.id, previousStatus: charge.status, newStatus: 'entered' }
    });
    await loadPatientData();
    onChargesUpdated();
  };

  const handleMarkBilled = async (charge: StoredCharge) => {
    await markChargeBilled(charge.id, adminName);
    await logAuditEvent(orgId, {
      action: 'charge_marked_billed',
      userId: adminId,
      userName: adminName,
      targetPatientId: patient?.id || null,
      targetPatientName: patient?.patientName || null,
      details: `Marked charge ${charge.cptCode} as billed for ${patient?.patientName}`,
      listContext: null,
      metadata: { chargeId: charge.id, previousStatus: charge.status, newStatus: 'billed' }
    });
    await loadPatientData();
    onChargesUpdated();
  };

  if (!isOpen || !patient) return null;

  const formatDOB = (dob: string) => {
    const date = new Date(dob);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[500px] sm:rounded-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{patient.patientName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                patient.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {patient.isActive ? 'Active' : 'Discharged'}
              </span>
              {patient.primaryPhysicianName && (
                <span className="text-xs text-gray-500">{patient.primaryPhysicianName}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Info */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              {formatDOB(patient.dob)}
            </div>
            {patient.mrn && (
              <span className="text-gray-600">MRN: {patient.mrn}</span>
            )}
          </div>
          {patient.hospitalName && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              {patient.hospitalName}
            </div>
          )}
        </div>

        {/* Stats */}
        {patientData && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900">{patientData.totalCharges}</p>
                <p className="text-xs text-gray-500">Charges</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-600">{patientData.pendingCharges}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{patientData.totalRVU.toFixed(1)}</p>
                <p className="text-xs text-gray-500">RVU</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">${patientData.totalPayment.toFixed(0)}</p>
                <p className="text-xs text-gray-500">Payment</p>
              </div>
            </div>
          </div>
        )}

        {/* Charges List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : !patientData || patientData.charges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium">No charges recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {patientData.charges.map((charge, index) => {
                const rvu = charge.rvu || getRVU(charge.cptCode);
                const payment = calculateMedicarePayment(rvu);
                const isBilled = charge.status === 'billed';
                const isEntered = charge.status === 'entered';

                return (
                  <div key={charge.id} className={`px-4 py-3 ${isBilled ? 'bg-gray-50' : ''}`}>
                    {/* Date & Status */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Day {index + 1}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(charge.chargeDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </span>
                      </div>
                      {isBilled ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />Billed
                        </span>
                      ) : isEntered ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          <Check className="w-3 h-3" />Entered
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Charge Details */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {charge.cptCode}
                        </span>
                        {charge.cptDescription && (
                          <p className="text-sm text-gray-600 mt-0.5">{charge.cptDescription}</p>
                        )}
                        {charge.submittedByUserName && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            By {charge.submittedByUserName}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-medium text-gray-700">{rvu.toFixed(2)} RVU</p>
                        <p className="text-sm text-green-600 font-medium">${payment.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {!isBilled && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setEditingCharge(charge)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium"
                        >
                          <Edit2 className="w-3 h-3" />Edit
                        </button>
                        {charge.status === 'pending' && (
                          <button
                            onClick={() => handleMarkEntered(charge)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium"
                          >
                            <Check className="w-3 h-3" />Mark Entered
                          </button>
                        )}
                        <button
                          onClick={() => handleMarkBilled(charge)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 bg-green-50 hover:bg-green-100 rounded font-medium"
                        >
                          <CheckCircle className="w-3 h-3" />Mark Billed
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
          >
            Close
          </button>
        </div>

        {/* Edit Dialog */}
        <ChargeEditDialog
          isOpen={!!editingCharge}
          charge={editingCharge}
          patientName={patient.patientName}
          orgId={orgId}
          adminId={adminId}
          adminName={adminName}
          onClose={() => setEditingCharge(null)}
          onSaved={() => { loadPatientData(); onChargesUpdated(); }}
        />
      </div>
    </div>
  );
};

export default PatientDetailPanel;
