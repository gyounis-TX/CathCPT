import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, DollarSign, ChevronDown, ChevronRight, Check, AlertCircle, Info, Calendar, Search, Plus, AlertTriangle } from 'lucide-react';
import { showToast } from '../hooks/useToast';
import { validateCCIEdits, CCIViolation } from '../data/cciEdits';
import { Inpatient, InpatientCharge } from '../types';

// Date options for charge entry
type DateOption = 'today' | 'yesterday' | '2daysago' | 'custom';

const getDateLabel = (option: DateOption, customDate?: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (option) {
    case 'today':
      return `Today (${formatDateShort(today)})`;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return `Yesterday (${formatDateShort(yesterday)})`;
    case '2daysago':
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return `2 days ago (${formatDateShort(twoDaysAgo)})`;
    case 'custom':
      return customDate ? formatDateShort(customDate) : 'Select date';
  }
};

const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDateFromOption = (option: DateOption, customDate?: Date): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (option) {
    case 'today':
      return today;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    case '2daysago':
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return twoDaysAgo;
    case 'custom':
      return customDate || today;
  }
};
import {
  inpatientCategories,
  inpatientCategoryColors,
  InpatientCode,
  getAllInpatientCodes,
  getFirstEncounterCodes,
  getSubsequentEncounterCodes,
  calculateMedicarePayment,
  MEDICARE_CONVERSION_FACTOR_2026,
  canAddCode,
  getBillingGroup,
  getInpatientCategory,
  PRIMARY_EM_CATEGORIES,
  isAddOnCode,
  checkBillingCompatibility,
  getRequiredModifiers,
  formatCodeWithModifier,
  MODIFIERS,
  ModifierCode,
  getModifierInfo
} from '../data/inpatientCodes';
import {
  icd10Codes,
  ICD10Code,
  categoryColors,
  categoryNames,
  getSubcategoriesByCategory,
  defaultExpandedSubcategories,
  searchICD10Codes
} from '../data/icd10Codes';
import { rankCodesByUsage, recordMultipleCodeUsage } from '../services/icd10Usage';
import { StoredCharge } from '../services/chargesService';

interface AddChargeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Inpatient | null;
  isFirstEncounter: boolean;
  isCallCoverage: boolean;
  previousDiagnoses: string[];
  onSave: (charge: {
    cptCodes: string[]; // Now supports multiple codes with modifiers (e.g., "99232-25")
    cptDescriptions?: string[];
    modifiers?: Map<string, string>; // code -> modifier mapping
    timeMinutes?: number;
    diagnoses: string[];
    chargeDate: Date;
  }) => void;
  // Edit mode props
  editingCharge?: StoredCharge | null;
  onUpdate?: (chargeId: string, updates: {
    cptCode: string;
    cptDescription?: string;
    timeMinutes?: number;
    diagnoses: string[];
  }) => void;
}

export const AddChargeDialog: React.FC<AddChargeDialogProps> = ({
  isOpen,
  onClose,
  patient,
  isFirstEncounter,
  isCallCoverage,
  previousDiagnoses,
  onSave,
  editingCharge,
  onUpdate
}) => {
  const isEditMode = !!editingCharge;
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [timeMinutes, setTimeMinutes] = useState<number | undefined>();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['E/M - Subsequent']));
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<Set<string>>(new Set());
  const [showDiagnoses, setShowDiagnoses] = useState(true);
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [expandedDiagCategories, setExpandedDiagCategories] = useState<Set<string>>(new Set(['primary', 'comorbid']));
  const [expandedDiagSubcategories, setExpandedDiagSubcategories] = useState<Set<string>>(new Set(defaultExpandedSubcategories));
  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateSection, setShowDateSection] = useState(false);
  const [rankedSubcategories, setRankedSubcategories] = useState<Map<string, ICD10Code[]>>(new Map());

  // Helper to parse stored code string (handles "99232-25 + 99291" format)
  const parseStoredCodes = (cptCode: string): string[] => {
    if (!cptCode) return [];
    // Split by " + " to get individual codes
    const codes = cptCode.split(' + ').map(c => c.trim());
    // Strip modifiers (e.g., "99232-25" -> "99232")
    return codes.map(code => code.replace(/-\d+$/, ''));
  };

  // Reset form when dialog opens (or populate for edit mode)
  useEffect(() => {
    if (isOpen) {
      if (editingCharge) {
        // Edit mode - pre-populate with existing charge data
        // Parse the stored code(s) - handles combined codes like "99232-25 + 99291"
        const parsedCodes = parseStoredCodes(editingCharge.cptCode);
        setSelectedCodes(new Set(parsedCodes));
        setTimeMinutes(editingCharge.timeMinutes);
        setSelectedDiagnoses(new Set(editingCharge.diagnoses || []));

        // Expand categories containing the selected codes
        const categoriesToExpand = new Set<string>();
        const allCodes = getAllInpatientCodes();
        parsedCodes.forEach(codeStr => {
          const code = allCodes.find(c => c.code === codeStr);
          if (code) {
            for (const [category, codes] of Object.entries(inpatientCategories)) {
              if (codes.some(c => c.code === codeStr)) {
                categoriesToExpand.add(category);
                break;
              }
            }
          }
        });
        // Also expand common categories for easy access when editing
        categoriesToExpand.add('E/M - Subsequent');
        setExpandedCategories(categoriesToExpand);

        setShowDiagnoses(editingCharge.diagnoses && editingCharge.diagnoses.length > 0);
        setExpandedDiagCategories(new Set(['primary', 'comorbid']));
        setExpandedDiagSubcategories(new Set(defaultExpandedSubcategories));
        // Set date from existing charge
        const chargeDate = new Date(editingCharge.chargeDate + 'T00:00:00');
        setCustomDate(chargeDate);
        setDateOption('custom');
        setShowDatePicker(false);
      } else {
        // Add mode - reset form
        setSelectedCodes(new Set());
        setTimeMinutes(undefined);
        // Pre-select previous diagnoses
        setSelectedDiagnoses(new Set(previousDiagnoses));
        // Expand appropriate categories
        if (isFirstEncounter) {
          setExpandedCategories(new Set(['E/M - Initial Hospital', 'Consults']));
        } else {
          setExpandedCategories(new Set(['E/M - Subsequent']));
        }
        setShowDiagnoses(false);
        setDiagnosisSearch('');
        setExpandedDiagCategories(new Set(['primary', 'comorbid']));
        setExpandedDiagSubcategories(new Set(defaultExpandedSubcategories));
        setDateOption('today');
        setCustomDate(undefined);
        setShowDatePicker(false);
        setShowDateSection(false);
      }
    }
  }, [isOpen, previousDiagnoses, isFirstEncounter, editingCharge]);

  // Rank ICD-10 codes by usage frequency when dialog opens
  useEffect(() => {
    if (isOpen && !isEditMode) {
      const rankCodes = async () => {
        const allSubcats = (['primary', 'comorbid', 'postProcedure'] as const).flatMap(
          cat => getSubcategoriesByCategory(cat)
        );
        const ranked = new Map<string, ICD10Code[]>();
        for (const sub of allSubcats) {
          ranked.set(sub.id, await rankCodesByUsage(sub.codes));
        }
        setRankedSubcategories(ranked);
      };
      rankCodes();
    }
  }, [isOpen, isEditMode]);

  // Get available codes — always show all inpatient codes
  const availableCodes = useMemo(() => {
    return getAllInpatientCodes();
  }, []);

  // Filter categories to show
  const visibleCategories = useMemo(() => {
    const categories: Record<string, InpatientCode[]> = {};

    // Always show all inpatient code categories
    categories['No Charge'] = inpatientCategories['No Charge'];
    categories['E/M - Initial Hospital'] = inpatientCategories['E/M - Initial Hospital'];
    categories['Consults'] = inpatientCategories['Consults'];
    categories['E/M - Subsequent'] = inpatientCategories['E/M - Subsequent'];
    categories['E/M - Discharge'] = inpatientCategories['E/M - Discharge'];
    categories['Critical Care'] = inpatientCategories['Critical Care'];
    categories['Prolonged Services'] = inpatientCategories['Prolonged Services'];

    return categories;
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleDiagnosis = (code: string) => {
    setSelectedDiagnoses(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else if (next.size < 24) {
        next.add(code);
      }
      return next;
    });
  };

  // Get data for all selected codes
  const selectedCodesData = useMemo(() => {
    const allCodes = getAllInpatientCodes();
    return Array.from(selectedCodes).map(code => allCodes.find(c => c.code === code)).filter(Boolean) as InpatientCode[];
  }, [selectedCodes]);

  // Check if any selected code requires time entry
  const requiresTimeEntry = useMemo(() => {
    return selectedCodesData.some(code => code.requiresTime);
  }, [selectedCodesData]);

  // Determine which type of time-requiring code is selected
  const timeEntryType = useMemo(() => {
    const criticalCareCodes = inpatientCategories['Critical Care'] || [];
    const prolongedServicesCodes = inpatientCategories['Prolonged Services'] || [];

    const hasCriticalCare = selectedCodesData.some(code =>
      criticalCareCodes.some(cc => cc.code === code.code && code.requiresTime)
    );
    const hasProlongedServices = selectedCodesData.some(code =>
      prolongedServicesCodes.some(ps => ps.code === code.code && code.requiresTime)
    );

    if (hasCriticalCare && hasProlongedServices) return 'both';
    if (hasCriticalCare) return 'critical_care';
    if (hasProlongedServices) return 'prolonged_services';
    return null;
  }, [selectedCodesData]);

  // Calculate total RVU from all selected codes
  const totalRvu = useMemo(() => {
    return selectedCodesData.reduce((sum, code) => sum + code.rvu, 0);
  }, [selectedCodesData]);

  const estimatedPayment = calculateMedicarePayment(totalRvu);

  // Calculate required modifiers for selected codes
  const requiredModifiers = useMemo(() => {
    return getRequiredModifiers(Array.from(selectedCodes));
  }, [selectedCodes]);

  // CCI edit validation
  const cciViolations = useMemo(() => {
    return validateCCIEdits(Array.from(selectedCodes));
  }, [selectedCodes]);

  // Check if a code needs a modifier
  const getModifierForCode = (code: string): ModifierCode | undefined => {
    return requiredModifiers.get(code);
  };

  // Handle selecting a code (smart logic with modifier support)
  const handleCodeSelect = (code: InpatientCode, category: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      const codeArray = Array.from(prev);

      // If this is an add-on code, toggle it (checkbox behavior)
      if (code.isAddOn) {
        if (next.has(code.code)) {
          next.delete(code.code);
        } else if (canAddCode(code.code, codeArray)) {
          next.add(code.code);
        }
        return next;
      }

      // For primary codes within same category (radio button behavior)
      // Remove any other code from the same category
      const categoryCodes = inpatientCategories[category];
      categoryCodes?.forEach(catCode => {
        if (catCode.code !== code.code) {
          next.delete(catCode.code);
        }
      });

      // Special handling for mutually exclusive groups
      const newGroup = getBillingGroup(category);

      // No Charge is exclusive with everything
      if (code.code === '00000') {
        return new Set(['00000']);
      }

      // If selecting any non-No Charge code, remove No Charge
      next.delete('00000');

      // Primary E/M categories are mutually exclusive with each other
      if (newGroup === 'primary_em') {
        // Remove codes from other primary E/M categories
        PRIMARY_EM_CATEGORIES.forEach(cat => {
          if (cat !== category) {
            inpatientCategories[cat]?.forEach(catCode => {
              next.delete(catCode.code);
            });
          }
        });
        // NOTE: Critical Care + E/M is ALLOWED with modifier -25
        // Do NOT remove Critical Care codes when selecting E/M

        // Also remove Discharge (can't bill with primary E/M)
        inpatientCategories['E/M - Discharge']?.forEach(catCode => {
          next.delete(catCode.code);
        });
      }

      // Discharge codes
      if (category === 'E/M - Discharge') {
        // Remove primary E/M codes (can't bill discharge + E/M same day)
        PRIMARY_EM_CATEGORIES.forEach(cat => {
          inpatientCategories[cat]?.forEach(catCode => {
            next.delete(catCode.code);
          });
        });
        // NOTE: Discharge + Critical Care IS allowed
      }

      // Critical Care (non-add-on, i.e., 99291)
      if (category === 'Critical Care' && !code.isAddOn) {
        // NOTE: Critical Care + E/M is ALLOWED with modifier -25
        // We do NOT remove E/M codes when selecting Critical Care
        // The E/M code will get modifier -25 applied

        // Remove Discharge if adding Critical Care? Actually, these CAN be billed together
        // Patient can be critical, then stabilize and discharge same day
      }

      // Toggle the selected code
      if (next.has(code.code)) {
        next.delete(code.code);
        // If removing 99291, also remove 99292 (add-on requires primary)
        if (code.code === '99291') {
          next.delete('99292');
        }
      } else {
        next.add(code.code);
      }

      // Remove any prolonged services if no primary E/M or discharge code remains
      const hasValidPrimary = Array.from(next).some(c => {
        const cat = getInpatientCategory(c);
        return cat && (PRIMARY_EM_CATEGORIES.includes(cat) || cat === 'E/M - Discharge');
      });
      if (!hasValidPrimary) {
        inpatientCategories['Prolonged Services']?.forEach(catCode => {
          next.delete(catCode.code);
        });
      }

      return next;
    });
  };

  // Check if a code can be selected given current selection
  const canSelectCode = (code: string): boolean => {
    if (selectedCodes.has(code)) return true; // Can always deselect
    return canAddCode(code, Array.from(selectedCodes));
  };

  // Extracted save logic - returns true if save was successful
  const doSave = (): boolean => {
    if (selectedCodes.size === 0) {
      showToast('Please select a charge code', 'warning');
      return false;
    }

    if (requiresTimeEntry && !timeMinutes) {
      showToast('Please enter time for critical care', 'warning');
      return false;
    }

    // Apply modifiers to codes that need them
    const codesArray = Array.from(selectedCodes).map(code => {
      const modifier = getModifierForCode(code);
      return modifier ? formatCodeWithModifier(code, modifier) : code;
    });
    const descriptionsArray = selectedCodesData.map(c => c.summary);

    if (isEditMode && editingCharge && onUpdate) {
      const primaryCode = codesArray[0];
      const primaryCodeData = selectedCodesData[0];
      onUpdate(editingCharge.id, {
        cptCode: primaryCode,
        cptDescription: primaryCodeData?.summary,
        timeMinutes: requiresTimeEntry ? timeMinutes : undefined,
        diagnoses: Array.from(selectedDiagnoses)
      });
    } else {
      onSave({
        cptCodes: codesArray,
        cptDescriptions: descriptionsArray,
        modifiers: requiredModifiers,
        timeMinutes: requiresTimeEntry ? timeMinutes : undefined,
        diagnoses: Array.from(selectedDiagnoses),
        chargeDate: getDateFromOption(dateOption, customDate)
      });
    }

    // Record ICD-10 usage for frequency-based sorting
    if (selectedDiagnoses.size > 0) {
      recordMultipleCodeUsage(Array.from(selectedDiagnoses));
    }

    return true;
  };

  // Reset form for "Save & Add Another"
  const resetForm = () => {
    setSelectedCodes(new Set());
    setTimeMinutes(undefined);
    // Keep diagnoses from previous — they carry forward
    if (isFirstEncounter) {
      setExpandedCategories(new Set(['E/M - Initial Hospital', 'Consults']));
    } else {
      setExpandedCategories(new Set(['E/M - Subsequent']));
    }
    setShowDiagnoses(false);
    setDiagnosisSearch('');
    setDateOption('today');
    setCustomDate(undefined);
    setShowDatePicker(false);
    setShowDateSection(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (doSave()) onClose();
  };

  const handleSaveAndContinue = () => {
    if (doSave()) {
      showToast('Charge saved', 'success');
      resetForm();
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[480px] sm:rounded-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Edit Charge' : 'Add Charge'}
            </h2>
            <p className="text-sm text-gray-500">{patient.patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selection - compact chip, expandable */}
        {!isEditMode && (
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => setShowDateSection(!showDateSection)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                {getDateLabel(dateOption, customDate)}
              </span>
              {showDateSection ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showDateSection && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(['today', 'yesterday', '2daysago'] as DateOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setDateOption(option);
                      setShowDatePicker(false);
                      setShowDateSection(false);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      dateOption === option && !showDatePicker
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {getDateLabel(option)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setDateOption('custom');
                    setShowDatePicker(true);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    dateOption === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {dateOption === 'custom' && customDate
                    ? formatDateShort(customDate)
                    : 'Other...'}
                </button>
                {showDatePicker && (
                  <div className="w-full mt-1">
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={customDate ? customDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value + 'T00:00:00');
                          setCustomDate(date);
                          setDateOption('custom');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Show date info in edit mode (read-only) */}
        {isEditMode && editingCharge && (
          <div className="px-4 pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date of Service
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
              {new Date(editingCharge.chargeDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
              <span className="text-gray-400 ml-2">(cannot be changed)</span>
            </div>
          </div>
        )}

        {/* Encounter Type Banner */}
        {isFirstEncounter && (
          <div className="mx-4 mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              First encounter with this patient - consult and initial hospital codes available
            </p>
          </div>
        )}
        {isCallCoverage && !isFirstEncounter && (
          <div className="mx-4 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Call coverage - all codes available for weekend/coverage billing
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Code Categories */}
            {Object.entries(visibleCategories).map(([category, codes]) => {
              const colors = inpatientCategoryColors[category];
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className={`border rounded-lg overflow-hidden ${colors.border}`}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg} active:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className={`text-sm font-medium ${colors.text}`}>{category}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-2 space-y-1 bg-white">
                      {codes.map(code => {
                        const isSelected = selectedCodes.has(code.code);
                        const canSelect = canSelectCode(code.code);
                        const isDisabled = !canSelect && !isSelected;

                        return (
                          <button
                            key={code.code}
                            type="button"
                            onClick={() => !isDisabled && handleCodeSelect(code, category)}
                            disabled={isDisabled}
                            className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-150 ${
                              isSelected
                                ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                                : isDisabled
                                ? 'opacity-40 cursor-not-allowed border border-transparent'
                                : 'hover:bg-gray-50 active:bg-gray-100 active:scale-[0.99] border border-transparent'
                            }`}
                          >
                            {/* Radio button for primary codes, checkbox for add-ons */}
                            {code.isAddOn ? (
                              // Checkbox style for add-on codes
                              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600'
                                  : isDisabled
                                  ? 'border-gray-200'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </span>
                            ) : (
                              // Radio button style for primary codes
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600'
                                  : isDisabled
                                  ? 'border-gray-200'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                                  {code.code}
                                </span>
                                {code.isAddOn && (
                                  <span className={`px-1.5 py-0.5 text-xs rounded ${isDisabled ? 'bg-gray-50 text-gray-400' : 'bg-purple-100 text-purple-600'}`}>
                                    Add-on
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm line-clamp-2 ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                                {code.summary}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-xs ${isDisabled ? 'text-gray-300' : 'text-gray-500'}`}>
                                  RVU: {code.rvu.toFixed(2)}
                                </span>
                                <span className={`text-xs ${isDisabled ? 'text-gray-300' : 'text-green-600'}`}>
                                  ${calculateMedicarePayment(code.rvu).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Time Entry for Critical Care or Prolonged Services */}
            {requiresTimeEntry && timeEntryType === 'critical_care' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <label className="block text-sm font-medium text-red-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Critical Care Time (minutes)
                </label>
                <input
                  type="number"
                  value={timeMinutes || ''}
                  onChange={(e) => setTimeMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Enter total minutes (30-74 for 99291)"
                  min={30}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <p className="mt-1 text-xs text-red-600">
                  99291: 30-74 min | 99292: each additional 30 min
                </p>
              </div>
            )}

            {requiresTimeEntry && timeEntryType === 'prolonged_services' && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Prolonged Services Time (minutes)
                </label>
                <input
                  type="number"
                  value={timeMinutes || ''}
                  onChange={(e) => setTimeMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Enter total prolonged care minutes"
                  min={15}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                />
                <p className="mt-1 text-xs text-stone-600">
                  99354/99356: 30-74 min | 99355/99357: each additional 30 min
                </p>
              </div>
            )}

            {requiresTimeEntry && timeEntryType === 'both' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="block text-sm font-medium text-amber-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Total Time (minutes)
                </label>
                <input
                  type="number"
                  value={timeMinutes || ''}
                  onChange={(e) => setTimeMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Enter total minutes for Critical Care + Prolonged Services"
                  min={30}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="mt-1 text-xs text-amber-600">
                  Both Critical Care and Prolonged Services selected
                </p>
              </div>
            )}

            {/* Diagnosis Codes */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 mt-3">
              <button
                type="button"
                onClick={() => setShowDiagnoses(!showDiagnoses)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Diagnosis Codes ({selectedDiagnoses.size})
                  </span>
                  {previousDiagnoses.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {previousDiagnoses.length} carried forward from previous visits
                    </p>
                  )}
                </div>
                {showDiagnoses ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showDiagnoses && (
                <div className="mt-2 space-y-2">
                  {/* Selected Diagnoses */}
                  {selectedDiagnoses.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedDiagnoses).map(code => {
                        const icdCode = icd10Codes.find(c => c.code === code);
                        const colors = icdCode ? categoryColors[icdCode.category] : null;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => toggleDiagnosis(code)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full hover:opacity-80 ${
                              colors ? `${colors.chipBg} ${colors.chipText}` : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {icdCode?.shortLabel || code}
                            <X className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Search / Add ICD-10 Code */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={diagnosisSearch}
                        onChange={(e) => setDiagnosisSearch(e.target.value.toUpperCase())}
                        placeholder="Search or enter ICD-10 code (e.g., I25.10)"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Search results or add custom code */}
                    {diagnosisSearch.length >= 2 && (
                      <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                        {(() => {
                          const results = searchICD10Codes(diagnosisSearch).slice(0, 8);

                          if (results.length > 0) {
                            return results.map(code => (
                              <button
                                key={code.code}
                                type="button"
                                onClick={() => {
                                  toggleDiagnosis(code.code);
                                  setDiagnosisSearch('');
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                                  selectedDiagnoses.has(code.code) ? 'bg-blue-50' : ''
                                }`}
                              >
                                <span className="font-medium text-gray-900">{code.shortLabel}</span>
                                <span className="text-xs text-gray-400">{code.code}</span>
                                <span className="text-gray-600 truncate">{code.description}</span>
                                {selectedDiagnoses.has(code.code) && (
                                  <Check className="w-4 h-4 text-blue-600 ml-auto flex-shrink-0" />
                                )}
                              </button>
                            ));
                          }

                          // No results - offer to add as custom code if it looks like an ICD-10
                          const isValidFormat = /^[A-Z]\d{2}(\.\d{1,4})?$/i.test(diagnosisSearch);
                          if (isValidFormat) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  toggleDiagnosis(diagnosisSearch);
                                  setDiagnosisSearch('');
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 active:bg-blue-100"
                              >
                                <Plus className="w-4 h-4 text-blue-600" />
                                <span className="text-blue-600">Add "{diagnosisSearch}" as custom code</span>
                              </button>
                            );
                          }

                          return (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No matching codes. Enter a valid ICD-10 format (e.g., I25.10)
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Two-Level Accordion: Categories > Subcategories > Code Buttons */}
                  {!diagnosisSearch.trim() && (
                    <div className="space-y-2">
                      {(['primary', 'comorbid', 'postProcedure'] as const).map(category => {
                        const colors = categoryColors[category];
                        const isCategoryExpanded = expandedDiagCategories.has(category);
                        const subcategories = getSubcategoriesByCategory(category);

                        return (
                          <div key={category} className={`border rounded-lg ${colors.border}`}>
                            {/* Category Header */}
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedDiagCategories(prev => {
                                  const next = new Set(prev);
                                  if (next.has(category)) next.delete(category);
                                  else next.add(category);
                                  return next;
                                });
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left ${colors.bg}`}
                            >
                              <span className={`text-sm font-medium ${colors.text}`}>
                                {categoryNames[category]}
                              </span>
                              {isCategoryExpanded ? (
                                <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                              ) : (
                                <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                              )}
                            </button>

                            {/* Subcategories */}
                            {isCategoryExpanded && (
                              <div className="bg-white">
                                {subcategories.map(sub => {
                                  const isSubExpanded = expandedDiagSubcategories.has(sub.id);

                                  return (
                                    <div key={sub.id} className="border-t border-gray-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedDiagSubcategories(prev => {
                                            const next = new Set(prev);
                                            if (next.has(sub.id)) next.delete(sub.id);
                                            else next.add(sub.id);
                                            return next;
                                          });
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-gray-50"
                                      >
                                        <span className="text-xs font-medium text-gray-600">
                                          {sub.label}
                                          <span className="text-gray-400 ml-1">({sub.codes.length})</span>
                                        </span>
                                        {isSubExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        )}
                                      </button>

                                      {isSubExpanded && (
                                        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                                          {(rankedSubcategories.get(sub.id) || sub.codes).map(code => (
                                            <button
                                              key={code.code}
                                              type="button"
                                              onClick={() => toggleDiagnosis(code.code)}
                                              className={`px-2 py-1 text-xs rounded-full border transition-colors active:scale-95 ${
                                                selectedDiagnoses.has(code.code)
                                                  ? `${colors.chipSelected} border-transparent`
                                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                                              }`}
                                              title={`${code.code} — ${code.description}`}
                                            >
                                              {code.shortLabel}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer with RVU Summary */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            {/* Selected codes summary with modifiers */}
            {selectedCodes.size > 0 && !selectedCodes.has('00000') && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1 mb-2">
                  {Array.from(selectedCodes).map(code => {
                    const modifier = getModifierForCode(code);
                    return (
                      <span
                        key={code}
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          modifier
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {modifier ? `${code}${modifier}` : code}
                      </span>
                    );
                  })}
                </div>

                {/* Modifier notification with official language */}
                {requiredModifiers.size > 0 && (() => {
                  const modifierCode = Array.from(requiredModifiers.values())[0];
                  const modifierInfo = getModifierInfo(modifierCode);
                  const hasCriticalCare = selectedCodes.has('99291') || selectedCodes.has('99292');
                  const hasEM = Array.from(selectedCodes).some(c =>
                    PRIMARY_EM_CATEGORIES.includes(getInpatientCategory(c) || '')
                  );

                  return (
                    <div className="mb-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-purple-800">
                          <p className="font-semibold mb-1.5">
                            Modifier {modifierCode} Required: {modifierInfo.name}
                          </p>

                          {hasCriticalCare && hasEM ? (
                            <div className="space-y-2">
                              <p>
                                <span className="font-medium">Same-Day E/M + Critical Care Billing:</span>{' '}
                                The E/M service may be billed concurrently with critical care
                                <span className="font-semibold"> only if</span> it represents a{' '}
                                <span className="font-semibold">significant, separately identifiable service</span>{' '}
                                performed <span className="font-semibold">prior to</span> the patient's condition
                                requiring critical care.
                              </p>
                              <div className="bg-white/50 p-2 rounded border border-purple-100">
                                <p className="font-medium mb-1">Documentation Requirements:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-purple-700">
                                  <li>E/M service must be distinct from critical care evaluation</li>
                                  <li>Document separate chief complaint or reason for the E/M visit</li>
                                  <li>Time and medical decision-making must be documented separately</li>
                                  <li>Critical care time begins when patient meets critical illness criteria</li>
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <p>{modifierInfo.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CCI Edit Warnings */}
                {cciViolations.length > 0 && (
                  <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold mb-1">CCI Edit Warning</p>
                        {cciViolations.map((v, i) => (
                          <p key={i} className="mb-0.5">
                            <span className="font-medium">{v.column1Code} + {v.column2Code}:</span>{' '}
                            {v.description}
                            {v.modifierException && (
                              <span className="text-amber-600"> (modifier exception may apply)</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Total RVU: <span className="font-medium text-gray-900">{totalRvu.toFixed(2)}</span>
                  </span>
                  <span className="text-green-600 font-medium">
                    Est. Medicare: ${estimatedPayment.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            {selectedCodes.has('00000') && (
              <div className="mb-3 text-sm text-gray-500 text-center">
                No charge - patient seen but no billable service
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedCodes.size === 0}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode ? 'Update Charge' : `Save ${selectedCodes.size > 1 ? `${selectedCodes.size} Codes` : 'Charge'}`}
              </button>
            </div>
            {/* Save & Add Another - only in add mode */}
            {!isEditMode && selectedCodes.size > 0 && (
              <button
                type="button"
                onClick={handleSaveAndContinue}
                className="w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors"
              >
                Save & Add Another
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChargeDialog;
