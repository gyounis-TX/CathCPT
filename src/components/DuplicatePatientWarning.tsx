import React from 'react';
import { AlertTriangle, User, ArrowRight } from 'lucide-react';
import { PatientMatchResult } from '../types';

interface DuplicatePatientWarningProps {
  matches: PatientMatchResult[];
  onContinueAnyway: () => void;
  onViewExisting: (patientId: string) => void;
}

export const DuplicatePatientWarning: React.FC<DuplicatePatientWarningProps> = ({
  matches,
  onContinueAnyway,
  onViewExisting
}) => {
  if (matches.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Possible Duplicate{matches.length > 1 ? 's' : ''} Found
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            {matches.length === 1
              ? 'A patient with similar information already exists.'
              : `${matches.length} patients with similar information already exist.`}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {matches.map(match => (
          <div
            key={match.patient.id}
            className="flex items-center justify-between p-2 bg-white rounded border border-amber-200"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{match.patient.patientName}</p>
                <p className="text-xs text-gray-500">
                  {match.matchDetails} ({Math.round(match.confidence * 100)}% confidence)
                </p>
              </div>
            </div>
            <button
              onClick={() => onViewExisting(match.patient.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
            >
              View <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onContinueAnyway}
        className="w-full py-2 text-sm text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 font-medium"
      >
        Continue Anyway — Add as New Patient
      </button>
    </div>
  );
};
