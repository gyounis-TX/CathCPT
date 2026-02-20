import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  User,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Trash2,
  LogOut,
  Phone,
  Users,
  RefreshCw,
  Check,
  FileText,
  X,
  Edit2,
  Lock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Inpatient, PatientListType, InpatientCharge, UserMode, Hospital, CallListEntry } from '../types';
import { inpatientCategories, inpatientCategoryColors, calculateMedicarePayment, getAllInpatientCodes, MEDICARE_CONVERSION_FACTOR_2026 } from '../data/inpatientCodes';
import { getAllEPCodes } from '../data/epCodes';
import { getAllEchoCodes } from '../data/echoCodes';
import { StoredCharge, formatDateForStorage, ChargeStatus, canEditCharge } from '../services/chargesService';

interface RoundsScreenProps {
  userMode: UserMode;
  hospitals: Hospital[];
  patients: Inpatient[];
  currentUserId: string;
  callListEntries: CallListEntry[];
  onAddPatient: () => void;
  onAddCharge: (patient: Inpatient) => void;
  onDischargePatient: (patient: Inpatient) => void;
  onRemovePatient: (patient: Inpatient) => void;
  onAddToCallList: () => void;
  onRemoveFromCallList: (entryId: string) => void;
  onClearCallList: () => void;
  charges: Record<string, Record<string, StoredCharge>>; // { patientId: { dateStr: charge } }
  diagnoses: Record<string, string[]>; // { patientId: diagnoses[] }
  onRefresh: () => Promise<void>;
  onEditCharge: (charge: StoredCharge, patient: Inpatient) => void;
  onMarkChargeBilled: (chargeId: string) => Promise<void>;
  onRemoveFromMyList?: (patient: Inpatient) => void;
}

// Mock data for development - Simpsons characters
const mockPatients: Inpatient[] = [
  {
    id: '1',
    organizationId: 'org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'hosp-1',
    hospitalName: 'Springfield General Hospital',
    patientName: 'Simpson, Homer',
    dob: '1956-05-12',
    mrn: 'SGH001',
    isActive: true,
    createdAt: '2024-02-10T08:00:00Z'
  },
  {
    id: '2',
    organizationId: 'org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'hosp-1',
    hospitalName: 'Springfield General Hospital',
    patientName: 'Simpson, Marge',
    dob: '1958-03-19',
    mrn: 'SGH002',
    isActive: true,
    createdAt: '2024-02-11T10:00:00Z'
  },
  {
    id: '3',
    organizationId: 'org-1',
    primaryPhysicianId: 'user-2',
    primaryPhysicianName: 'Dr. Khan',
    hospitalId: 'hosp-2',
    hospitalName: 'Shelbyville Medical Center',
    patientName: 'Burns, Montgomery',
    dob: '1886-09-15',
    mrn: 'SMC001',
    isActive: true,
    createdAt: '2024-02-09T14:00:00Z'
  },
  {
    id: '4',
    organizationId: 'org-1',
    primaryPhysicianId: 'user-3',
    primaryPhysicianName: 'Dr. Bruce',
    hospitalId: 'hosp-1',
    hospitalName: 'Springfield General Hospital',
    patientName: 'Flanders, Ned',
    dob: '1958-01-04',
    isActive: true,
    createdAt: '2024-02-12T08:00:00Z'
  },
  {
    id: '5',
    organizationId: 'org-1',
    primaryPhysicianId: 'user-1',
    primaryPhysicianName: 'Dr. Rivera',
    hospitalId: 'hosp-1',
    hospitalName: 'Springfield General Hospital',
    patientName: 'Bouvier, Jacqueline',
    dob: '1929-02-15',
    mrn: 'SGH003',
    isActive: true,
    createdAt: '2024-02-08T09:00:00Z'
  }
];

// Note: Charges and diagnoses are now passed as props from App.tsx
// Initial mock diagnoses - Homer has existing comprehensive diagnosis list
const initialMockDiagnoses: Record<string, string[]> = {
  '1': ['I21.01', 'I25.10', 'I10', 'E11.9', 'E78.5', 'E66.01', 'G47.33', 'K21.0'], // Homer - STEMI, CAD, HTN, DM2, HLD, Obesity, Sleep Apnea, GERD
  '2': ['I48.91', 'I10'], // Marge - AFib, HTN
  '3': ['I50.22', 'I25.10', 'N18.4', 'E11.65'], // Mr. Burns - CHF, CAD, CKD4, DM with hyperglycemia
  '4': ['I47.2', 'R55'], // Ned - VT, Syncope
  '5': ['I50.32', 'I48.2', 'I10', 'N18.3'] // Grandma Bouvier - Diastolic CHF, Chronic AFib, HTN, CKD3
};

export const RoundsScreen: React.FC<RoundsScreenProps> = ({
  userMode,
  hospitals,
  patients,
  currentUserId,
  callListEntries,
  onAddPatient,
  onAddCharge,
  onDischargePatient,
  onRemovePatient,
  onAddToCallList,
  onRemoveFromCallList,
  onClearCallList,
  charges,
  diagnoses,
  onRefresh,
  onEditCharge,
  onMarkChargeBilled,
  onRemoveFromMyList
}) => {
  const [activeTab, setActiveTab] = useState<PatientListType>('my');
  const [expandedHospitals, setExpandedHospitals] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewingPatient, setReviewingPatient] = useState<Inpatient | null>(null);
  const [dischargingPatient, setDischargingPatient] = useState<Inpatient | null>(null);

  // Swipe-to-discharge state
  const [swipedPatientId, setSwipedPatientId] = useState<string | null>(null);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent, patientId: string) => {
    setSwipeStartX(e.touches[0].clientX);
    setSwipedPatientId(patientId);
    setSwipeOffsetX(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipedPatientId) return;
    const diff = swipeStartX - e.touches[0].clientX;
    // Only allow left swipe (positive diff)
    setSwipeOffsetX(Math.max(0, Math.min(diff, 120)));
  }, [swipedPatientId, swipeStartX]);

  const handleTouchEnd = useCallback((patient: Inpatient) => {
    if (swipeOffsetX > 80) {
      // Threshold reached — open discharge review modal
      setDischargingPatient(patient);
    }
    setSwipedPatientId(null);
    setSwipeOffsetX(0);
  }, [swipeOffsetX]);

  // Auto-expand hospitals that have patients
  useEffect(() => {
    const hospitalIds = new Set(patients.map(p => p.hospitalId));
    hospitals.forEach(h => hospitalIds.add(h.id));
    setExpandedHospitals(hospitalIds);
  }, [hospitals, patients]);

  // Get today's date string for lookups
  const todayDateStr = useMemo(() => formatDateForStorage(new Date()), []);

  // Get all codes for RVU lookup (inpatient + EP + echo)
  const allCodes = useMemo(() => [
    ...getAllInpatientCodes(),
    ...getAllEPCodes(),
    ...getAllEchoCodes()
  ], []);

  // Strip modifier from code (e.g., "99232-25" -> "99232")
  const stripModifier = (code: string): string => {
    // Handle common modifiers like -25, -59, etc.
    return code.replace(/-\d+$/, '').trim();
  };

  // Get RVU for a code (handles combined codes like "99232-25 + 99291")
  const getRVUForCode = (cptCode: string): number => {
    // Check if this is a combined code (e.g., "99232-25 + 99291")
    if (cptCode.includes(' + ')) {
      const codes = cptCode.split(' + ');
      return codes.reduce((sum, code) => {
        const baseCode = stripModifier(code.trim());
        const codeData = allCodes.find(c => c.code === baseCode);
        return sum + (codeData?.rvu || 0);
      }, 0);
    }
    // Single code (may have modifier)
    const baseCode = stripModifier(cptCode);
    const code = allCodes.find(c => c.code === baseCode);
    return code?.rvu || 0;
  };

  // Get charges for reviewing patient
  const reviewCharges = useMemo(() => {
    if (!reviewingPatient) return [];
    const patientCharges = charges[reviewingPatient.id];
    if (!patientCharges) return [];

    // Convert to array and sort by date
    return Object.entries(patientCharges)
      .map(([dateStr, charge]) => {
        const rvu = charge.rvu || getRVUForCode(charge.cptCode);
        return {
          ...charge,
          dateStr,
          rvu,
          payment: calculateMedicarePayment(rvu)
        };
      })
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [reviewingPatient, charges, allCodes]);

  // Calculate totals for hospitalization
  const reviewTotals = useMemo(() => {
    const totalRVU = reviewCharges.reduce((sum, c) => sum + c.rvu, 0);
    const totalPayment = reviewCharges.reduce((sum, c) => sum + c.payment, 0);
    return { totalRVU, totalPayment, chargeCount: reviewCharges.length };
  }, [reviewCharges]);

  // Derive admit date from earliest charge date, falling back to createdAt
  const getAdmitDate = useCallback((patientId: string, createdAt: string): Date => {
    const patientCharges = charges[patientId];
    if (patientCharges) {
      const chargeDates = Object.keys(patientCharges).sort();
      if (chargeDates.length > 0) {
        const earliest = new Date(chargeDates[0] + 'T00:00:00');
        earliest.setHours(0, 0, 0, 0);
        return earliest;
      }
    }
    const fallback = new Date(createdAt);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }, [charges]);

  // Discharge review: compute day-by-day billing analysis
  const dischargeDays = useMemo(() => {
    if (!dischargingPatient) return [];
    const admitDate = getAdmitDate(dischargingPatient.id, dischargingPatient.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: {
      dateStr: string;
      dayNumber: number;
      hasCharge: boolean;
      charge: StoredCharge | null;
      isWeekend: boolean;
      dayLabel: string;
    }[] = [];

    const patientCharges = charges[dischargingPatient.id] || {};
    let dayNumber = 1;
    const current = new Date(admitDate);

    while (current <= today) {
      const dateStr = formatDateForStorage(current);
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const charge = patientCharges[dateStr] || null;
      const dayLabel = current.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      days.push({
        dateStr,
        dayNumber,
        hasCharge: !!charge,
        charge,
        isWeekend,
        dayLabel
      });

      dayNumber++;
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [dischargingPatient, charges, getAdmitDate]);

  const dischargeSummary = useMemo(() => {
    const totalDays = dischargeDays.length;
    const billedDays = dischargeDays.filter(d => d.hasCharge).length;
    const gapCount = totalDays - billedDays;
    return { totalDays, billedDays, gapCount };
  }, [dischargeDays]);

  // Filter patients by active tab (query-based resolution)
  const filteredPatients = useMemo(() => {
    if (activeTab === 'my') {
      return patients.filter(p => p.isActive && p.primaryPhysicianId === currentUserId);
    }
    if (activeTab === 'practice') {
      return patients.filter(p => p.isActive); // all org patients
    }
    if (activeTab === 'call') {
      const callPatientIds = new Set(
        callListEntries.filter(e => e.isActive).map(e => e.inpatientId)
      );
      return patients.filter(p => p.isActive && callPatientIds.has(p.id));
    }
    return [];
  }, [patients, activeTab, currentUserId, callListEntries]);

  // Map call list entries by inpatient ID for quick lookup
  const callEntryByPatientId = useMemo(() => {
    const map = new Map<string, CallListEntry>();
    callListEntries.filter(e => e.isActive).forEach(e => map.set(e.inpatientId, e));
    return map;
  }, [callListEntries]);

  // Group patients by hospital (include all hospitals from the list, even empty ones)
  const patientsByHospital = useMemo(() => {
    const grouped: Record<string, { hospitalName: string; patients: Inpatient[] }> = {};

    // First, create entries for all hospitals from the hospitals prop
    hospitals.forEach(hospital => {
      grouped[hospital.id] = {
        hospitalName: hospital.name,
        patients: []
      };
    });

    // Then add patients to their respective hospitals
    filteredPatients.forEach(patient => {
      const hospitalId = patient.hospitalId;
      if (!grouped[hospitalId]) {
        // If hospital not in list, create it (fallback for patients with unknown hospitals)
        grouped[hospitalId] = {
          hospitalName: patient.hospitalName || 'Unknown Hospital',
          patients: []
        };
      }
      grouped[hospitalId].patients.push(patient);
    });

    return grouped;
  }, [filteredPatients, hospitals]);

  const toggleHospital = (hospitalId: string) => {
    setExpandedHospitals(prev => {
      const next = new Set(prev);
      if (next.has(hospitalId)) {
        next.delete(hospitalId);
      } else {
        next.add(hospitalId);
      }
      return next;
    });
  };

  const handleClearCallList = () => {
    if (confirm('Clear all patients from the Call list? This cannot be undone.')) {
      onClearCallList();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const formatDOB = (dob: string) => {
    const date = new Date(dob);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  };

  const getTodayCharge = (patientId: string): { code: string; description: string } | null => {
    const patientCharges = charges[patientId];
    if (!patientCharges) return null;

    const todayCharge = patientCharges[todayDateStr];
    if (!todayCharge) return null;

    return {
      code: todayCharge.cptCode,
      description: todayCharge.cptDescription || ''
    };
  };

  const getPatientDiagnoses = (patientId: string): string[] => {
    return diagnoses[patientId] || [];
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Rounds</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onAddPatient}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" />
            My Patients
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'practice'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Practice
          </button>
          <button
            onClick={() => setActiveTab('call')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'call'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Phone className="w-4 h-4" />
            Call
          </button>
        </div>

        {/* Call tab header with Add + Clear All */}
        {activeTab === 'call' && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Call Coverage ({filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''})
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAddToCallList()}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add to Call List
              </button>
              {filteredPatients.length > 0 && (
                <button
                  onClick={handleClearCallList}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No patients</p>
            <p className="text-sm">
              {activeTab === 'my' && 'Add your first patient to get started'}
              {activeTab === 'practice' && 'No shared practice patients'}
              {activeTab === 'call' && 'Add patients from My or Practice lists'}
            </p>
            {activeTab === 'call' ? (
              <button
                onClick={() => onAddToCallList()}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add to Call List
              </button>
            ) : (
              <button
                onClick={onAddPatient}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Patient
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(patientsByHospital).map(([hospitalId, { hospitalName, patients: hospitalPatients }]) => (
              <div key={hospitalId}>
                {/* Hospital Header */}
                <button
                  onClick={() => toggleHospital(hospitalId)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-150 text-left"
                >
                  {expandedHospitals.has(hospitalId) ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900">{hospitalName}</span>
                  <span className="text-sm text-gray-500">({hospitalPatients.length})</span>
                </button>

                {/* Patients */}
                {expandedHospitals.has(hospitalId) && (
                  <div className="divide-y divide-gray-100">
                    {hospitalPatients.map(patient => {
                      const todayCharge = getTodayCharge(patient.id);
                      const patientDiagnoses = getPatientDiagnoses(patient.id);

                      return (
                        <div
                          key={patient.id}
                          className="relative overflow-hidden bg-white"
                        >
                          {/* Discharge reveal behind swipe */}
                          {activeTab !== 'call' && (
                            <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-red-500">
                              <div className="text-white text-sm font-medium flex items-center gap-1.5">
                                <LogOut className="w-4 h-4" />
                                Discharge
                              </div>
                            </div>
                          )}

                          {/* Swipeable content */}
                          <div
                            className="relative px-4 py-3 bg-white transition-transform"
                            style={{
                              transform: swipedPatientId === patient.id ? `translateX(-${swipeOffsetX}px)` : 'translateX(0)',
                              transition: swipedPatientId === patient.id ? 'none' : 'transform 0.2s ease-out'
                            }}
                            onTouchStart={activeTab !== 'call' ? (e) => handleTouchStart(e, patient.id) : undefined}
                            onTouchMove={activeTab !== 'call' ? handleTouchMove : undefined}
                            onTouchEnd={activeTab !== 'call' ? () => handleTouchEnd(patient) : undefined}
                          >
                            {/* Patient Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {patient.patientName}
                                </div>
                              </div>
                              {activeTab === 'practice' && patient.primaryPhysicianId !== currentUserId && (
                                <span className="text-xs text-gray-500">
                                  {patient.primaryPhysicianName || 'Other physician'}
                                </span>
                              )}
                              {activeTab === 'call' && (() => {
                                const callEntry = callEntryByPatientId.get(patient.id);
                                return callEntry?.coveringFor ? (
                                  <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200">
                                    Covering for {callEntry.coveringFor}
                                  </span>
                                ) : null;
                              })()}
                            </div>

                            {/* Today's Charge Status */}
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {todayCharge?.code ? (
                                <span className="text-sm text-green-600 flex items-center gap-1">
                                  <Check className="w-4 h-4" />
                                  Today: {todayCharge.code}
                                </span>
                              ) : (
                                <span className="text-sm text-amber-600">
                                  No charges today
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => onAddCharge(patient)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                              >
                                <Plus className="w-4 h-4" />
                                Add Charge
                              </button>
                              <button
                                onClick={() => setReviewingPatient(patient)}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                              >
                                <FileText className="w-4 h-4" />
                                Review
                              </button>
                              {activeTab === 'call' && (
                                <button
                                  onClick={() => {
                                    const entry = callEntryByPatientId.get(patient.id);
                                    if (entry) onRemoveFromCallList(entry.id);
                                  }}
                                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                                  title="Remove from Call List"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {filteredPatients.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} •{' '}
              {filteredPatients.filter(p => getTodayCharge(p.id)?.code).length} charged today
            </span>
            <span className="text-gray-900 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      )}

      {/* Charge Review Modal */}
      {reviewingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-[500px] sm:rounded-xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-50">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hospitalization Review</h2>
                <p className="text-sm text-gray-600">{reviewingPatient.patientName}</p>
              </div>
              <button
                onClick={() => setReviewingPatient(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient Info */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-500">DOB: </span>
                  <span className="text-gray-700">{formatDOB(reviewingPatient.dob)}</span>
                  {reviewingPatient.mrn && (
                    <>
                      <span className="text-gray-300 mx-2">|</span>
                      <span className="text-gray-500">MRN: </span>
                      <span className="text-gray-700">{reviewingPatient.mrn}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{reviewingPatient.hospitalName}</span>
              </div>
            </div>

            {/* Diagnoses */}
            {getPatientDiagnoses(reviewingPatient.id).length > 0 && (
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">DIAGNOSIS CODES</p>
                <div className="flex flex-wrap gap-1.5">
                  {getPatientDiagnoses(reviewingPatient.id).map(code => (
                    <span
                      key={code}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Charges List */}
            <div className="flex-1 overflow-y-auto">
              {reviewCharges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="font-medium">No charges recorded</p>
                  <p className="text-sm">Add charges to see them here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reviewCharges.map((charge, index) => {
                    const isBilled = charge.status === 'billed';
                    const isEntered = charge.status === 'entered';
                    const canEdit = canEditCharge(charge);

                    return (
                      <div key={charge.id} className={`px-4 py-3 ${isBilled ? 'bg-gray-50' : ''}`}>
                        {/* Status Badge Row */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">
                              Day {index + 1}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(charge.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          {/* Status Badge */}
                          <div className="flex items-center gap-1">
                            {isBilled ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Billed
                              </span>
                            ) : isEntered ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                <Check className="w-3 h-3" />
                                Entered
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {charge.cptCode}
                              </span>
                              {charge.cptCode === '00000' && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                  No Charge
                                </span>
                              )}
                            </div>
                            {charge.cptDescription && (
                              <p className="text-sm text-gray-600 mt-0.5">
                                {charge.cptDescription}
                              </p>
                            )}
                            {charge.timeMinutes && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {charge.timeMinutes} minutes
                              </p>
                            )}
                            {/* Diagnoses for this charge */}
                            {charge.diagnoses && charge.diagnoses.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {charge.diagnoses.slice(0, 4).map(dx => (
                                  <span key={dx} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                                    {dx}
                                  </span>
                                ))}
                                {charge.diagnoses.length > 4 && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                    +{charge.diagnoses.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right ml-3">
                            <div className="text-sm font-medium text-gray-700">
                              {charge.rvu.toFixed(2)} RVU
                            </div>
                            <div className="text-sm text-green-600 font-medium">
                              ${charge.payment.toFixed(2)}
                            </div>
                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                if (canEdit) {
                                  onEditCharge(charge, reviewingPatient);
                                } else {
                                  alert('This charge has been billed and cannot be edited.\n\nPlease contact your billing administrator to make changes.');
                                }
                              }}
                              className={`mt-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                canEdit
                                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {canEdit ? (
                                <>
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  Locked
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Admin: Mark as Billed (only for non-billed charges) */}
                        {userMode.role === 'admin' && !isBilled && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => onMarkChargeBilled(charge.id)}
                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              Mark as Billed
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals Footer */}
            <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">Hospitalization Total</p>
                  <p className="text-xs text-gray-400">
                    {reviewTotals.chargeCount} charge{reviewTotals.chargeCount !== 1 ? 's' : ''} •{' '}
                    Admitted {getAdmitDate(reviewingPatient.id, reviewingPatient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {reviewTotals.totalRVU.toFixed(2)} RVU
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    ${reviewTotals.totalPayment.toFixed(2)}
                  </p>
                </div>
              </div>
              {activeTab === 'my' && onRemoveFromMyList && (
                <button
                  onClick={() => {
                    onRemoveFromMyList(reviewingPatient);
                    setReviewingPatient(null);
                  }}
                  className="w-full py-2 px-4 text-amber-600 font-medium hover:bg-amber-50 rounded-lg mb-2"
                >
                  Remove from My List
                </button>
              )}
              <button
                onClick={() => setReviewingPatient(null)}
                className="w-full py-2.5 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Discharge Review Modal */}
      {dischargingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-[500px] sm:rounded-xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 ${
              dischargeSummary.gapCount > 0 ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Discharge Review</h2>
                <p className="text-sm text-gray-600">{dischargingPatient.patientName}</p>
              </div>
              <button
                onClick={() => setDischargingPatient(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Bar */}
            <div className={`px-4 py-3 border-b border-gray-200 ${
              dischargeSummary.gapCount > 0 ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dischargeSummary.gapCount > 0 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    dischargeSummary.gapCount > 0 ? 'text-amber-800' : 'text-green-800'
                  }`}>
                    {dischargeSummary.billedDays} of {dischargeSummary.totalDays} hospital days billed
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Admit {getAdmitDate(dischargingPatient.id, dischargingPatient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Day-by-Day List */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {dischargeDays.map(day => (
                  <div
                    key={day.dateStr}
                    className={`px-4 py-3 ${day.isWeekend ? 'bg-gray-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {day.hasCharge ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">Day {day.dayNumber}</span>
                            <span className={`text-sm ${day.isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                              {day.dayLabel}
                              {day.isWeekend && <span className="text-xs text-gray-400 ml-1">(Weekend)</span>}
                            </span>
                          </div>
                          {day.hasCharge && day.charge ? (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {day.charge.cptCode}
                              </span>
                              <span className="text-xs text-gray-500">
                                {(day.charge.rvu || getRVUForCode(day.charge.cptCode)).toFixed(2)} RVU
                              </span>
                              <span className="text-xs text-green-600">
                                ${calculateMedicarePayment(day.charge.rvu || getRVUForCode(day.charge.cptCode)).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-red-500">No charge</span>
                          )}
                        </div>
                      </div>

                      {!day.hasCharge && (
                        <button
                          onClick={() => onAddCharge(dischargingPatient)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Charge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
              {dischargeSummary.gapCount > 0 && (
                <p className="text-sm text-amber-600 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {dischargeSummary.gapCount} day{dischargeSummary.gapCount !== 1 ? 's' : ''} without charges
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setDischargingPatient(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDischargePatient(dischargingPatient);
                    setDischargingPatient(null);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-1.5 ${
                    dischargeSummary.gapCount > 0
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Discharge Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundsScreen;
