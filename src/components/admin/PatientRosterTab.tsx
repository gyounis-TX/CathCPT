import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Users, Calendar, Building2, FileText, GitMerge } from 'lucide-react';
import { Inpatient, Hospital } from '../../types';
import { StoredCharge } from '../../services/chargesService';
import { getAllOrgPatients, searchPatients } from '../../services/patientRosterService';
import { PatientDetailPanel } from './PatientDetailPanel';
import { PatientMergeDialog } from './PatientMergeDialog';

interface PatientRosterTabProps {
  orgId: string;
  hospitals: Hospital[];
  knownPatients?: Inpatient[];
  charges: Record<string, Record<string, StoredCharge>>;
  diagnoses: Record<string, string[]>;
  currentUserId: string;
  currentUserName: string;
  onChargesUpdated: () => void;
}

type RosterFilter = 'all' | 'active' | 'discharged';

export const PatientRosterTab: React.FC<PatientRosterTabProps> = ({
  orgId,
  hospitals,
  knownPatients,
  charges,
  diagnoses,
  currentUserId,
  currentUserName,
  onChargesUpdated
}) => {
  const [patients, setPatients] = useState<Inpatient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RosterFilter>('all');
  const [selectedPatient, setSelectedPatient] = useState<Inpatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mergeSelection, setMergeSelection] = useState<Inpatient[]>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    if (knownPatients && knownPatients.length > 0) {
      // Use in-memory patients from App.tsx (includes CathLab-created patients)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        setPatients(knownPatients.filter(p =>
          p.patientName.toLowerCase().includes(q) ||
          (p.mrn && p.mrn.toLowerCase().includes(q)) ||
          p.dob.includes(q)
        ));
      } else {
        setPatients(knownPatients);
      }
    } else {
      if (searchQuery.trim()) {
        const results = await searchPatients(orgId, searchQuery);
        setPatients(results);
      } else {
        const all = await getAllOrgPatients(orgId);
        setPatients(all);
      }
    }
    setIsLoading(false);
  }, [orgId, searchQuery, knownPatients]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    let filtered = patients;
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.isActive);
    } else if (statusFilter === 'discharged') {
      filtered = filtered.filter(p => !p.isActive);
    }
    return filtered;
  }, [patients, statusFilter]);

  const getChargeCount = (patientId: string): number => {
    const patientCharges = charges[patientId];
    if (!patientCharges) return 0;
    return Object.keys(patientCharges).length;
  };

  const getLastChargeDate = (patientId: string): string | null => {
    const patientCharges = charges[patientId];
    if (!patientCharges) return null;
    const dates = Object.keys(patientCharges).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  };

  const formatDOB = (dob: string) => {
    const date = new Date(dob);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  };

  const filterPills: { key: RosterFilter; label: string }[] = [
    { key: 'all', label: `All (${patients.length})` },
    { key: 'active', label: `Active (${patients.filter(p => p.isActive).length})` },
    { key: 'discharged', label: `Discharged (${patients.filter(p => !p.isActive).length})` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, MRN, or DOB..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Pills & Merge Button */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 flex-1">
            {filterPills.map(pill => (
              <button
                key={pill.key}
                onClick={() => setStatusFilter(pill.key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  statusFilter === pill.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
          {mergeSelection.length === 2 ? (
            <button
              onClick={() => setShowMergeDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded-full hover:bg-purple-700"
            >
              <GitMerge className="w-3.5 h-3.5" />
              Merge ({mergeSelection.length})
            </button>
          ) : mergeSelection.length > 0 ? (
            <span className="text-xs text-purple-600 font-medium">
              Select {2 - mergeSelection.length} more to merge
            </span>
          ) : null}
          <button
            onClick={() => setMergeSelection(mergeSelection.length > 0 ? [] : [])}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              mergeSelection.length > 0
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Select patients to merge"
          >
            <GitMerge className="w-3.5 h-3.5" />
            Merge
          </button>
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Users className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No patients found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPatients.map(patient => {
              const chargeCount = getChargeCount(patient.id);
              const lastCharge = getLastChargeDate(patient.id);

              return (
                <button
                  key={patient.id}
                  onClick={() => {
                    if (mergeSelection.length > 0 || mergeSelection.some(p => p.id === patient.id)) {
                      // In merge selection mode
                      setMergeSelection(prev => {
                        const exists = prev.find(p => p.id === patient.id);
                        if (exists) return prev.filter(p => p.id !== patient.id);
                        if (prev.length >= 2) return prev;
                        return [...prev, patient];
                      });
                    } else {
                      setSelectedPatient(patient);
                    }
                  }}
                  className={`w-full px-4 py-3 hover:bg-gray-50 text-left flex items-center gap-3 ${
                    mergeSelection.some(p => p.id === patient.id) ? 'bg-purple-50' : 'bg-white'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    patient.isActive ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      patient.isActive ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {patient.patientName.charAt(0)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {patient.patientName}
                      </p>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        patient.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {patient.isActive ? 'Active' : 'Discharged'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      DOB {formatDOB(patient.dob)}
                      {patient.mrn && ` | MRN ${patient.mrn}`}
                      {patient.hospitalName && ` | ${patient.hospitalName}`}
                    </p>
                  </div>

                  {/* Charge Summary */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">
                      {chargeCount} charge{chargeCount !== 1 ? 's' : ''}
                    </p>
                    {lastCharge && (
                      <p className="text-xs text-gray-400">
                        Last: {new Date(lastCharge + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-700">
            {filteredPatients.filter(p => p.isActive).length} active
          </span>
        </div>
      </div>

      {/* Patient Detail Panel */}
      <PatientDetailPanel
        isOpen={!!selectedPatient}
        patient={selectedPatient}
        orgId={orgId}
        adminId={currentUserId}
        adminName={currentUserName}
        onClose={() => setSelectedPatient(null)}
        onChargesUpdated={onChargesUpdated}
      />

      {/* Patient Merge Dialog */}
      {showMergeDialog && mergeSelection.length === 2 && (
        <PatientMergeDialog
          isOpen={showMergeDialog}
          patient1={mergeSelection[0]}
          patient2={mergeSelection[1]}
          orgId={orgId}
          adminId={currentUserId}
          adminName={currentUserName}
          charges={charges}
          onClose={() => {
            setShowMergeDialog(false);
            setMergeSelection([]);
          }}
          onMergeComplete={() => {
            setShowMergeDialog(false);
            setMergeSelection([]);
            loadPatients();
            onChargesUpdated();
          }}
        />
      )}
    </div>
  );
};

export default PatientRosterTab;
