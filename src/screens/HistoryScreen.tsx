import React from 'react';
import { ArrowLeft, Download, Clock, Trash2, History } from 'lucide-react';
import { SavedCase } from '../types';

interface HistoryScreenProps {
  onClose: () => void;
  caseHistory: SavedCase[];
  onLoadCase: (savedCase: SavedCase) => void;
  onDeleteCase: (id: string) => void;
  onExportHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onClose,
  caseHistory,
  onLoadCase,
  onDeleteCase,
  onExportHistory,
}) => {
  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <History size={22} className="text-gray-700" />
            <h1 className="text-lg font-semibold text-gray-900">Case History</h1>
          </div>
        </div>
        {caseHistory.length > 0 && (
          <button
            onClick={onExportHistory}
            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1.5 font-medium"
          >
            <Download size={15} />
            Export
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {caseHistory.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No case history yet</p>
            <p className="text-sm mt-1">Cases will be saved when you generate reports</p>
          </div>
        ) : (
          <div className="space-y-3">
            {caseHistory.map((savedCase) => (
              <div key={savedCase.id} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-800">{savedCase.caseId || 'Unnamed Case'}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(savedCase.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      ${savedCase.estimatedPayment.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {savedCase.totalRVU.toFixed(2)} RVUs
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {savedCase.location} • {savedCase.codes.primary.length + savedCase.codes.vessel2.length + savedCase.codes.vessel3.length} codes
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadCase(savedCase)}
                    className="flex-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium"
                  >
                    Load Case
                  </button>
                  <button
                    onClick={() => onDeleteCase(savedCase.id)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
