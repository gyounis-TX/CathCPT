import React from 'react';
import { X, Users, AlertCircle, Check } from 'lucide-react';
import { PatientMatchResult } from '../../types';

interface PatientMatchDialogProps {
  isOpen: boolean;
  matches: PatientMatchResult[];
  candidateName: string;
  onUseExisting: (patientId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export const PatientMatchDialog: React.FC<PatientMatchDialogProps> = ({
  isOpen,
  matches,
  candidateName,
  onUseExisting,
  onCreateNew,
  onClose
}) => {
  if (!isOpen || matches.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Possible Match Found</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-3">
            A patient similar to <span className="font-medium">"{candidateName}"</span> already exists.
            Would you like to use the existing record?
          </p>

          {/* Match List */}
          <div className="space-y-2 mb-4">
            {matches.map((match, idx) => (
              <button
                key={match.patient.id}
                onClick={() => onUseExisting(match.patient.id)}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{match.patient.patientName}</p>
                  <p className="text-xs text-gray-500">
                    DOB: {match.patient.dob}
                    {match.patient.mrn && ` | MRN: ${match.patient.mrn}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{match.matchDetails}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    match.matchType === 'exact_mrn'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {Math.round(match.confidence * 100)}% match
                  </span>
                  <span className={`text-xs mt-1 ${
                    match.patient.isActive ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {match.patient.isActive ? 'Active' : 'Discharged'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Create New Option */}
          <button
            onClick={onCreateNew}
            className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 text-sm"
          >
            Create as New Patient
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientMatchDialog;
