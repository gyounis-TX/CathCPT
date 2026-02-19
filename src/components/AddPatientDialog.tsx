import React, { useState, useEffect } from 'react';
import { X, User, Building2, Calendar, Hash, ChevronDown, ChevronRight, Search, Check, Users } from 'lucide-react';
import { logger } from '../services/logger';
import { Inpatient, Hospital, PatientMatchResult } from '../types';
import {
  icd10Codes,
  categoryNames,
  categoryColors,
  MAX_DIAGNOSIS_CODES,
  searchICD10Codes,
  getSubcategoriesByCategory,
  defaultExpandedSubcategories,
  ICD10Code,
  ICD10Subcategory
} from '../data/icd10Codes';
import { findPatientMatches } from '../services/patientMatchingService';
import { PatientMatchDialog } from './admin/PatientMatchDialog';

interface AddPatientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Omit<Inpatient, 'id' | 'createdAt' | 'organizationId' | 'primaryPhysicianId'>, diagnoses: string[]) => void;
  onUseExisting?: (patientId: string) => void;
  hospitals: Hospital[];
  isCrossCoverage?: boolean;
  orgId?: string;
}

export const AddPatientDialog: React.FC<AddPatientDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  onUseExisting,
  hospitals,
  isCrossCoverage = false,
  orgId
}) => {
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState(''); // stored as YYYY-MM-DD
  const [dobDisplay, setDobDisplay] = useState(''); // displayed as MM/DD/YYYY
  const [mrn, setMrn] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [coveringFor, setCoveringFor] = useState('');
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<Set<string>>(new Set());
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['primary']));
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set(defaultExpandedSubcategories));
  const [showDiagnosisSection, setShowDiagnosisSection] = useState(false);
  const [patientMatches, setPatientMatches] = useState<PatientMatchResult[]>([]);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [pendingPatientData, setPendingPatientData] = useState<{
    patient: Omit<Inpatient, 'id' | 'createdAt' | 'organizationId' | 'primaryPhysicianId'>;
    diagnoses: string[];
  } | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPatientName('');
      setDob('');
      setDobDisplay('');
      setMrn('');
      setHospitalId(hospitals[0]?.id || '');
      setCoveringFor('');
      setSelectedDiagnoses(new Set());
      setDiagnosisSearch('');
      setExpandedCategories(new Set(['primary']));
      setExpandedSubcategories(new Set(defaultExpandedSubcategories));
      setShowDiagnosisSection(false);
    }
  }, [isOpen, hospitals]);

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

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
      }
      return next;
    });
  };

  const toggleDiagnosis = (code: string) => {
    setSelectedDiagnoses(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else if (next.size < MAX_DIAGNOSIS_CODES) {
        next.add(code);
      }
      return next;
    });
  };

  // Auto-format DOB as MM/DD/YYYY and convert to YYYY-MM-DD for storage
  const handleDobChange = (raw: string) => {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '').slice(0, 8);

    // Build display with slashes
    let display = '';
    if (digits.length <= 2) {
      display = digits;
    } else if (digits.length <= 4) {
      display = digits.slice(0, 2) + '/' + digits.slice(2);
    } else {
      display = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    }
    setDobDisplay(display);

    // Convert to YYYY-MM-DD when complete
    if (digits.length === 8) {
      const mm = digits.slice(0, 2);
      const dd = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      setDob(`${yyyy}-${mm}-${dd}`);
    } else {
      setDob('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      alert('Patient name is required');
      return;
    }

    if (!dob) {
      alert('Date of birth is required');
      return;
    }

    if (!hospitalId) {
      alert('Please select a hospital');
      return;
    }

    const hospital = hospitals.find(h => h.id === hospitalId);
    const patientData = {
      hospitalId,
      hospitalName: hospital?.name,
      patientName: patientName.trim(),
      dob,
      mrn: mrn.trim() || undefined,
      isActive: true,
      coveringFor: isCrossCoverage && coveringFor.trim() ? coveringFor.trim() : undefined
    };
    const diagnosesArr = Array.from(selectedDiagnoses);

    // Check for patient matches if orgId is provided
    if (orgId) {
      try {
        const matches = await findPatientMatches(orgId, patientName.trim(), dob, mrn.trim() || undefined);

        if (matches.length > 0) {
          // Exact MRN match -> auto-map silently
          const exactMrn = matches.find(m => m.matchType === 'exact_mrn');
          if (exactMrn && onUseExisting) {
            onUseExisting(exactMrn.patient.id);
            onClose();
            return;
          }

          // Close name+DOB matches -> show dialog
          setPendingPatientData({ patient: patientData, diagnoses: diagnosesArr });
          setPatientMatches(matches);
          setShowMatchDialog(true);
          return;
        }
      } catch (err) {
        // If matching fails, proceed with normal save
        logger.error('Patient matching error', err);
      }
    }

    onSave(patientData, diagnosesArr);
    onClose();
  };

  const searchResults = diagnosisSearch.trim()
    ? searchICD10Codes(diagnosisSearch)
    : [];

  // Find the ICD10Code object for a given code string (for display in selected chips)
  const findCode = (code: string): ICD10Code | undefined =>
    icd10Codes.find(c => c.code === code);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[480px] sm:rounded-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isCrossCoverage ? 'Add Cross-Coverage Patient' : 'Add Patient'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Patient Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Last, First"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* DOB and MRN */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={dobDisplay}
                    onChange={(e) => handleDobChange(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MRN
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    placeholder="Optional"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Hospital */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hospital *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  required
                >
                  <option value="">Select hospital...</option>
                  {hospitals.map(hospital => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Covering For (Cross-coverage mode only) */}
            {isCrossCoverage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Covering For
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={coveringFor}
                    onChange={(e) => setCoveringFor(e.target.value)}
                    placeholder="Dr. Smith, Dr. Jones, etc."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the name of the physician whose patient you are covering
                </p>
              </div>
            )}

            {/* Diagnosis Codes Section */}
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowDiagnosisSection(!showDiagnosisSection)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Diagnosis Codes ({selectedDiagnoses.size} selected)
                  </span>
                  <p className="text-xs text-gray-500">
                    Primary diagnoses and comorbid conditions support medical complexity
                  </p>
                </div>
                {showDiagnosisSection ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showDiagnosisSection && (
                <div className="mt-3 space-y-3">
                  {/* Selected Diagnoses */}
                  {selectedDiagnoses.size > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg">
                      {Array.from(selectedDiagnoses).map(code => {
                        const icdCode = findCode(code);
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

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={diagnosisSearch}
                      onChange={(e) => setDiagnosisSearch(e.target.value)}
                      placeholder="Search ICD-10 codes..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Search Results */}
                  {diagnosisSearch.trim() && searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {searchResults.slice(0, 10).map(code => (
                        <button
                          key={code.code}
                          type="button"
                          onClick={() => {
                            toggleDiagnosis(code.code);
                            setDiagnosisSearch('');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedDiagnoses.has(code.code)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300'
                          }`}>
                            {selectedDiagnoses.has(code.code) && <Check className="w-3 h-3" />}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{code.shortLabel}</span>
                          <span className="text-xs text-gray-400">{code.code}</span>
                          <span className="text-sm text-gray-500 truncate">{code.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Two-Level Accordion: Categories > Subcategories > Code Buttons */}
                  {!diagnosisSearch.trim() && (
                    <div className="space-y-2">
                      {(['primary', 'comorbid', 'postProcedure'] as const).map(category => {
                        const colors = categoryColors[category];
                        const isCategoryExpanded = expandedCategories.has(category);
                        const subcategories = getSubcategoriesByCategory(category);

                        return (
                          <div key={category} className={`border rounded-lg ${colors.border}`}>
                            {/* Category Header */}
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
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
                                  const isSubExpanded = expandedSubcategories.has(sub.id);

                                  return (
                                    <div key={sub.id} className="border-t border-gray-100">
                                      {/* Subcategory Header */}
                                      <button
                                        type="button"
                                        onClick={() => toggleSubcategory(sub.id)}
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

                                      {/* Code Buttons */}
                                      {isSubExpanded && (
                                        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                                          {sub.codes.map(code => (
                                            <button
                                              key={code.code}
                                              type="button"
                                              onClick={() => toggleDiagnosis(code.code)}
                                              className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                                selectedDiagnoses.has(code.code)
                                                  ? `${colors.chipSelected} border-transparent`
                                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
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

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>

      {/* Patient Match Dialog */}
      <PatientMatchDialog
        isOpen={showMatchDialog}
        matches={patientMatches}
        candidateName={patientName}
        onUseExisting={(patientId) => {
          setShowMatchDialog(false);
          if (onUseExisting) {
            onUseExisting(patientId);
          }
          onClose();
        }}
        onCreateNew={() => {
          setShowMatchDialog(false);
          if (pendingPatientData) {
            onSave(pendingPatientData.patient, pendingPatientData.diagnoses);
          }
          onClose();
        }}
        onClose={() => setShowMatchDialog(false)}
      />
    </div>
  );
};

export default AddPatientDialog;
