import React, { useState, useMemo } from 'react';
import { X, Shield, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { StoredCharge } from '../services/chargesService';
import { preBillingScrub, ValidationResult, getValidationStatus, getActionableSuggestions } from '../services/modifierEngine';
import ValidationBadge from './ValidationBadge';

interface PreBillingScrubDialogProps {
  isOpen: boolean;
  onClose: () => void;
  charges: StoredCharge[];
  onProceed: (results: Map<string, ValidationResult>) => void;
}

export default function PreBillingScrubDialog({
  isOpen,
  onClose,
  charges,
  onProceed
}: PreBillingScrubDialogProps) {
  const [scrubbing, setScrubbing] = useState(false);
  const [results, setResults] = useState<Map<string, ValidationResult> | null>(null);

  const handleScrub = () => {
    setScrubbing(true);
    // Run synchronously but with a visual delay for feedback
    setTimeout(() => {
      const scrubResults = preBillingScrub(charges);
      setResults(scrubResults);
      setScrubbing(false);
    }, 300);
  };

  const summary = useMemo(() => {
    if (!results) return null;
    let clean = 0, warnings = 0, errors = 0, totalSuggestions = 0;
    for (const result of results.values()) {
      const status = getValidationStatus(result);
      if (status === 'clean') clean++;
      else if (status === 'warnings') warnings++;
      else errors++;
      totalSuggestions += getActionableSuggestions(result).length;
    }
    return { clean, warnings, errors, totalSuggestions, total: results.size };
  }, [results]);

  const canProceed = summary && summary.errors === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Pre-Billing Scrub</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {!results && !scrubbing && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-blue-200 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">
                <strong>{charges.length}</strong> charge{charges.length !== 1 ? 's' : ''} ready to scrub
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Validates modifier requirements, NCCI edits, and cross-charge rules
              </p>
              <button
                onClick={handleScrub}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Run Validation Scrub
              </button>
            </div>
          )}

          {scrubbing && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Validating {charges.length} charges...</p>
            </div>
          )}

          {results && summary && (
            <div>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-green-700">{summary.clean}</div>
                  <div className="text-xs text-green-600">Clean</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-amber-700">{summary.warnings}</div>
                  <div className="text-xs text-amber-600">Warnings</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-red-700">{summary.errors}</div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
              </div>

              {summary.totalSuggestions > 0 && (
                <p className="text-sm text-gray-500 mb-3">
                  {summary.totalSuggestions} modifier suggestion{summary.totalSuggestions !== 1 ? 's' : ''} found across all charges
                </p>
              )}

              {/* Charge list with results */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {charges.map(charge => {
                  const result = results.get(charge.id) || null;
                  return (
                    <div key={charge.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-medium">{charge.cptCode}</span>
                        {charge.cptDescription && (
                          <span className="text-xs text-gray-500 ml-1.5 truncate">{charge.cptDescription}</span>
                        )}
                        <div className="text-xs text-gray-400">{charge.chargeDate}</div>
                      </div>
                      <ValidationBadge result={result} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {results && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleScrub}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Re-scrub
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => results && onProceed(results)}
                disabled={!canProceed}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${
                  canProceed
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canProceed ? 'Proceed to Billing' : 'Fix Errors First'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
