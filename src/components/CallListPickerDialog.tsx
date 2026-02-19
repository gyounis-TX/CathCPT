import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check, User, Users } from 'lucide-react';
import { Inpatient, CallListEntry } from '../types';

interface CallListPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Inpatient[];
  currentUserId: string;
  callListEntries: CallListEntry[];
  onAddToCallList: (patient: Inpatient, coveringFor?: string) => void;
  onAddCrossCoveragePatient: () => void;
}

export const CallListPickerDialog: React.FC<CallListPickerDialogProps> = ({
  isOpen,
  onClose,
  patients,
  currentUserId,
  callListEntries,
  onAddToCallList,
  onAddCrossCoveragePatient
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // IDs already on the call list
  const alreadyOnCallList = useMemo(
    () => new Set(callListEntries.filter(e => e.isActive).map(e => e.inpatientId)),
    [callListEntries]
  );

  // Split into my patients and other practice patients
  const myPatients = useMemo(
    () => patients.filter(p => p.isActive && p.primaryPhysicianId === currentUserId && !alreadyOnCallList.has(p.id)),
    [patients, currentUserId, alreadyOnCallList]
  );

  const otherPatients = useMemo(
    () => patients.filter(p => p.isActive && p.primaryPhysicianId !== currentUserId && !alreadyOnCallList.has(p.id)),
    [patients, currentUserId, alreadyOnCallList]
  );

  // Filter by search
  const filterBySearch = (list: Inpatient[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      p.patientName.toLowerCase().includes(q) ||
      p.hospitalName?.toLowerCase().includes(q) ||
      p.mrn?.toLowerCase().includes(q)
    );
  };

  const filteredMy = filterBySearch(myPatients);
  const filteredOther = filterBySearch(otherPatients);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    const allPatients = [...patients];
    selectedIds.forEach(id => {
      const patient = allPatients.find(p => p.id === id);
      if (patient) {
        // For other physicians' patients, set coveringFor to the primary physician name
        const coveringFor = patient.primaryPhysicianId !== currentUserId
          ? patient.primaryPhysicianName || undefined
          : undefined;
        onAddToCallList(patient, coveringFor);
      }
    });
    setSelectedIds(new Set());
    setSearch('');
    onClose();
  };

  if (!isOpen) return null;

  const renderPatientRow = (patient: Inpatient) => {
    const isSelected = selectedIds.has(patient.id);
    return (
      <button
        key={patient.id}
        onClick={() => toggleSelection(patient.id)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
          isSelected ? 'bg-blue-50' : ''
        }`}
      >
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          isSelected
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-gray-300'
        }`}>
          {isSelected && <Check className="w-3 h-3" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{patient.patientName}</p>
          <p className="text-xs text-gray-500 truncate">
            {patient.hospitalName}
            {patient.primaryPhysicianName && patient.primaryPhysicianId !== currentUserId && (
              <> &middot; {patient.primaryPhysicianName}</>
            )}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[440px] sm:rounded-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add to Call List</h2>
          <button
            onClick={() => { setSelectedIds(new Set()); setSearch(''); onClose(); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Patient Lists */}
        <div className="flex-1 overflow-y-auto">
          {/* My Patients Section */}
          {filteredMy.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  My Patients
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredMy.map(renderPatientRow)}
              </div>
            </div>
          )}

          {/* Other Practice Patients Section */}
          {filteredOther.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Other Practice Patients
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredOther.map(renderPatientRow)}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredMy.length === 0 && filteredOther.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm font-medium">
                {search.trim() ? 'No matching patients' : 'All patients are already on the call list'}
              </p>
            </div>
          )}
        </div>

        {/* Cross-Coverage + Add Selected */}
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          <button
            onClick={() => { setSelectedIds(new Set()); setSearch(''); onClose(); onAddCrossCoveragePatient(); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400"
          >
            <Plus className="w-4 h-4" />
            Add Cross-Coverage Patient
          </button>

          <button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {selectedIds.size > 0
              ? `Add ${selectedIds.size} Patient${selectedIds.size > 1 ? 's' : ''} to Call List`
              : 'Select Patients to Add'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallListPickerDialog;
