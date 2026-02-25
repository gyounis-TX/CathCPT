import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Shield } from 'lucide-react';
import { ValidationResult, getValidationStatus, getActionableSuggestions } from '../services/modifierEngine';

interface ValidationBadgeProps {
  result: ValidationResult | null;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

export default function ValidationBadge({ result, size = 'sm', showTooltip = true }: ValidationBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (!result) {
    return (
      <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-400`}>
        <Shield className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span className="hidden sm:inline">Not scrubbed</span>
      </span>
    );
  }

  const status = getValidationStatus(result);
  const actionable = getActionableSuggestions(result);

  const config = {
    clean: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'Scrubbed',
    },
    warnings: {
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: `${actionable.length + result.warnings.length} issue${(actionable.length + result.warnings.length) !== 1 ? 's' : ''}`,
    },
    errors: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: `${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`,
    },
  }[status];

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} rounded-full ${config.bg} ${config.color} border ${config.border}`}
        onClick={() => showTooltip && setTooltipOpen(!tooltipOpen)}
        onBlur={() => setTooltipOpen(false)}
      >
        <Icon className={iconSize} />
        <span>{config.label}</span>
      </button>

      {showTooltip && tooltipOpen && (status === 'warnings' || status === 'errors') && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700">
          {result.errors.length > 0 && (
            <div className="mb-2">
              <div className="font-semibold text-red-600 mb-1">Errors</div>
              {result.errors.map((err, i) => (
                <div key={i} className="flex gap-1.5 mb-1">
                  <XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
          {actionable.length > 0 && (
            <div className="mb-2">
              <div className="font-semibold text-amber-600 mb-1">Modifier Suggestions</div>
              {actionable.map((s, i) => (
                <div key={i} className="flex gap-1.5 mb-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>{s.code}{s.modifier}</strong>: {s.reason}</span>
                </div>
              ))}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div>
              <div className="font-semibold text-amber-600 mb-1">Warnings</div>
              {result.warnings.map((w, i) => (
                <div key={i} className="flex gap-1.5 mb-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
