import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  X,
  Copy,
  Check,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { Hospital, CathLab } from '../../types';
import {
  getHospitals,
  getCathLabs,
  getPracticeDetails,
  addHospital,
  deactivateHospital,
  addCathLab,
  deactivateCathLab
} from '../../services/practiceConnection';
import { logAuditEvent } from '../../services/auditService';

interface PracticeSettingsTabProps {
  orgId: string;
  currentUserId: string;
  currentUserName: string;
}

export const PracticeSettingsTab: React.FC<PracticeSettingsTabProps> = ({
  orgId,
  currentUserId,
  currentUserName
}) => {
  const [practiceName, setPracticeName] = useState('');
  const [practiceCode, setPracticeCode] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cathLabs, setCathLabs] = useState<CathLab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Add dialogs
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [showAddCathLab, setShowAddCathLab] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newCathLabName, setNewCathLabName] = useState('');
  const [newCathLabHospitalId, setNewCathLabHospitalId] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [details, hospitalList, labList] = await Promise.all([
      getPracticeDetails(orgId),
      getHospitals(),
      getCathLabs()
    ]);
    setPracticeName(details.name);
    setPracticeCode(details.practiceCode);
    setHospitals(hospitalList);
    setCathLabs(labList);
    setIsLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(practiceCode);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = practiceCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddHospital = async () => {
    if (!newHospitalName.trim()) return;

    const hospital = await addHospital(orgId, newHospitalName.trim());
    setHospitals(prev => [...prev, hospital]);
    setNewHospitalName('');
    setShowAddHospital(false);

    await logAuditEvent(orgId, {
      action: 'hospital_added',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: `Added hospital: ${hospital.name}`,
      listContext: null
    });
  };

  const handleDeactivateHospital = async (hospital: Hospital) => {
    if (!confirm(`Deactivate ${hospital.name}? Existing patients at this hospital will not be affected.`)) {
      return;
    }

    await deactivateHospital(orgId, hospital.id);
    setHospitals(prev => prev.filter(h => h.id !== hospital.id));

    await logAuditEvent(orgId, {
      action: 'hospital_deactivated',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: `Deactivated hospital: ${hospital.name}`,
      listContext: null
    });
  };

  const handleAddCathLab = async () => {
    if (!newCathLabName.trim()) return;

    const lab = await addCathLab(orgId, newCathLabName.trim(), newCathLabHospitalId || undefined);
    setCathLabs(prev => [...prev, lab]);
    setNewCathLabName('');
    setNewCathLabHospitalId('');
    setShowAddCathLab(false);

    await logAuditEvent(orgId, {
      action: 'cathlab_added',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: `Added cath lab: ${lab.name}`,
      listContext: null
    });
  };

  const handleDeactivateCathLab = async (lab: CathLab) => {
    if (!confirm(`Deactivate ${lab.name}?`)) return;

    await deactivateCathLab(orgId, lab.id);
    setCathLabs(prev => prev.filter(l => l.id !== lab.id));

    await logAuditEvent(orgId, {
      action: 'cathlab_deactivated',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: null,
      targetPatientName: null,
      details: `Deactivated cath lab: ${lab.name}`,
      listContext: null
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Practice Info */}
      <div className="m-4 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Practice Information
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Practice Name</label>
            <p className="text-sm font-medium text-gray-900">{practiceName}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Practice Code</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-gray-900 tracking-wider">
                {practiceCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
              >
                {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hospitals */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Hospitals ({hospitals.length})
          </h3>
          <button
            onClick={() => setShowAddHospital(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium"
          >
            <Plus className="w-3 h-3" />Add
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {hospitals.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No hospitals configured
            </div>
          ) : (
            hospitals.map(hospital => (
              <div key={hospital.id} className="flex items-center gap-3 px-4 py-3">
                <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-900">{hospital.name}</span>
                <button
                  onClick={() => handleDeactivateHospital(hospital)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Deactivate"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Hospital Inline */}
        {showAddHospital && (
          <div className="mt-2 bg-white rounded-lg border border-blue-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newHospitalName}
                onChange={(e) => setNewHospitalName(e.target.value)}
                placeholder="Hospital name..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddHospital()}
              />
              <button
                onClick={handleAddHospital}
                disabled={!newHospitalName.trim()}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddHospital(false); setNewHospitalName(''); }}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cath Labs */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Cath Labs ({cathLabs.length})
          </h3>
          <button
            onClick={() => setShowAddCathLab(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium"
          >
            <Plus className="w-3 h-3" />Add
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {cathLabs.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No cath labs configured
            </div>
          ) : (
            cathLabs.map(lab => {
              const hospital = hospitals.find(h => h.id === lab.hospitalId);
              return (
                <div key={lab.id} className="flex items-center gap-3 px-4 py-3">
                  <Stethoscope className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{lab.name}</p>
                    {hospital && (
                      <p className="text-xs text-gray-500">{hospital.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeactivateCathLab(lab)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Deactivate"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Add Cath Lab Inline */}
        {showAddCathLab && (
          <div className="mt-2 bg-white rounded-lg border border-blue-200 p-3 space-y-2">
            <input
              type="text"
              value={newCathLabName}
              onChange={(e) => setNewCathLabName(e.target.value)}
              placeholder="Cath lab name..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <select
              value={newCathLabHospitalId}
              onChange={(e) => setNewCathLabHospitalId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">No hospital (standalone)</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAddCathLab}
                disabled={!newCathLabName.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Cath Lab
              </button>
              <button
                onClick={() => { setShowAddCathLab(false); setNewCathLabName(''); setNewCathLabHospitalId(''); }}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-4" /> {/* Bottom padding */}
    </div>
  );
};

export default PracticeSettingsTab;
