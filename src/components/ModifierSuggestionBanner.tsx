import React from 'react';
import { AlertTriangle, Check, X, Info, Shield } from 'lucide-react';
import { ModifierSuggestion, ValidationResult, getActionableSuggestions } from '../services/modifierEngine';

interface ModifierSuggestionBannerProps {
  result: ValidationResult | null;
  onAccept?: (suggestion: ModifierSuggestion) => void;
  onDismiss?: (suggestion: ModifierSuggestion) => void;
  compact?: boolean;
}

export default function ModifierSuggestionBanner({
  result,
  onAccept,
  onDismiss,
  compact = false
}: ModifierSuggestionBannerProps) {
  if (!result) return null;

  const actionable = getActionableSuggestions(result);
  const hasIssues = actionable.length > 0 || result.warnings.length > 0 || result.errors.length > 0;

  if (!hasIssues) return null;

  return (
    <div className="space-y-2">
      {/* Errors */}
      {result.errors.map((error, i) => (
        <div key={`err-${i}`} className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <span className="text-red-700 flex-1">{error}</span>
        </div>
      ))}

      {/* Modifier suggestions */}
      {actionable.map((suggestion, i) => (
        <div
          key={`sug-${i}`}
          className={`flex items-start gap-2 ${compact ? 'p-2' : 'p-2.5'} ${
            suggestion.confidence === 'required'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          } border rounded-lg text-sm`}
        >
          <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${
            suggestion.confidence === 'required' ? 'text-amber-500' : 'text-blue-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-semibold ${
                suggestion.confidence === 'required' ? 'text-amber-800' : 'text-blue-800'
              }`}>
                {suggestion.code}{suggestion.modifier}
              </span>
              {suggestion.autoApplied && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Auto-applied</span>
              )}
              {suggestion.confidence === 'required' && !suggestion.autoApplied && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Required</span>
              )}
              {suggestion.confidence === 'recommended' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Recommended</span>
              )}
            </div>
            {!compact && (
              <p className={`mt-0.5 text-xs ${
                suggestion.confidence === 'required' ? 'text-amber-600' : 'text-blue-600'
              }`}>
                {suggestion.reason}
              </p>
            )}
          </div>
          {(onAccept || onDismiss) && !suggestion.autoApplied && (
            <div className="flex items-center gap-1 shrink-0">
              {onAccept && (
                <button
                  type="button"
                  onClick={() => onAccept(suggestion)}
                  className="p-1 rounded hover:bg-green-100 text-green-600"
                  title="Accept modifier"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(suggestion)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Warnings */}
      {result.warnings.map((warning, i) => (
        <div key={`warn-${i}`} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-amber-700 flex-1">{warning}</span>
        </div>
      ))}
    </div>
  );
}
