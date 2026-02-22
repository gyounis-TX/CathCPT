// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronRight, Check, Settings, X, Save, Info, AlertCircle, DollarSign, Maximize2, Shield, Search, Star, FileText, History, Clock, Download, Trash2, BookOpen, Lightbulb, List, Sparkles, Plus, Edit2 } from 'lucide-react';
import { CaseTemplate, SavedCase, RuleViolation, Inpatient, Hospital, CathLab, PHIMatch } from './types';
import { builtInTemplates, createCustomTemplate } from './data/templates';
import { runBillingRules, createBillingContext, getRule } from './data/billingRules';
import { cptCategories } from './data/cptCategories';
import { echoCategories } from './data/echoCodes';
import { epCategories } from './data/epCodes';
import { getCustomCodes, addCustomCode, updateCustomCode, deleteCustomCode, CustomCPTCode } from './services/customCodes';
import { getDevModeSettings, enableDevMode, setDevModeUserType, disableDevMode, DevModeSettings } from './services/devMode';
import { logger } from './services/logger';
import { saveCharge, updateCharge, formatDateForStorage, StoredCharge, CaseSnapshot } from './services/chargesService';
import { logAuditEvent } from './services/auditService';
import { scanFieldsForPHI, scrubPHI } from './services/phiScanner';
import { searchICD10Codes } from './data/icd10Codes';
import { CodeGroupSettings } from './components/CodeGroupSettings';
import { validateCCIEdits, CCIViolation } from './data/cciEdits';
import { checkConcurrentVisit } from './services/concurrentVisitService';
import { showToast } from './hooks/useToast';

// Category color mapping for visual distinction
const categoryColors: Record<string, { dot: string; bg: string; text: string; border: string; hoverBg: string }> = {
  'Diagnostic Cardiac': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100' },
  'PCI': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  'PCI Add-on Procedures': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
  'Intravascular Imaging & Physiology': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', hoverBg: 'hover:bg-cyan-100' },
  'Structural Heart Interventions': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100' },
  'TAVR': { dot: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', hoverBg: 'hover:bg-pink-100' },
  // Peripheral Vascular Angiography submenus - improved colors
  'Peripheral Vascular Angiography': { dot: 'bg-sky-600', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-300', hoverBg: 'hover:bg-sky-100' },
  'Aortoiliac/Abdominal': { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-200', hoverBg: 'hover:bg-sky-100' },
  'Lower Extremity': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100' },
  'Upper Extremity': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', hoverBg: 'hover:bg-cyan-100' },
  'Renal': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100' },
  'Mesenteric': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
  'Pelvic': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100' },
  // Peripheral Intervention submenus
  'Peripheral Intervention': { dot: 'bg-teal-600', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-300', hoverBg: 'hover:bg-teal-100' },
  'Iliac': { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200', hoverBg: 'hover:bg-teal-100' },
  'Femoral/Popliteal': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', hoverBg: 'hover:bg-green-100' },
  'Tibial/Peroneal': { dot: 'bg-lime-500', bg: 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-200', hoverBg: 'hover:bg-lime-100' },
  'Inframalleolar': { dot: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-100' },
  // Venous Interventions submenus
  'Venous Interventions': { dot: 'bg-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-300', hoverBg: 'hover:bg-indigo-100' },
  'Venography': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100' },
  'IVC Filter': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100' },
  'Venous Stenting': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100' },
  'Venous Thrombectomy': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-100' },
  'Adjunctive Procedures': { dot: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-200', hoverBg: 'hover:bg-slate-100' },
  'MCS': { dot: 'bg-red-600', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  // Miscellaneous submenus
  'Miscellaneous': { dot: 'bg-gray-600', bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-300', hoverBg: 'hover:bg-gray-100' },
  'Thrombolysis': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', hoverBg: 'hover:bg-orange-100' },
  'Arterial Thrombectomy': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  'Retrieval': { dot: 'bg-stone-500', bg: 'bg-stone-50', text: 'text-stone-900', border: 'border-stone-200', hoverBg: 'hover:bg-stone-100' },
  // Endovascular submenus
  'Endovascular': { dot: 'bg-rose-600', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-300', hoverBg: 'hover:bg-rose-100' },
  'Carotid/Cerebrovascular': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100' },
  'Carotid Stenting': { dot: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', hoverBg: 'hover:bg-pink-100' },
  'Thoracic Aortography': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  'EVAR': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', hoverBg: 'hover:bg-orange-100' },
  'TEVAR': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
  'Subclavian/Innominate': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-100' },
  // Echocardiography subcategories
  'Echocardiography': { dot: 'bg-sky-600', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-300', hoverBg: 'hover:bg-sky-100' },
  'TTE Complete': { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-200', hoverBg: 'hover:bg-sky-100' },
  'TTE Limited': { dot: 'bg-sky-400', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-200', hoverBg: 'hover:bg-sky-100' },
  'TTE with Doppler': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', hoverBg: 'hover:bg-cyan-100' },
  'TEE': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100' },
  'Stress Echo': { dot: 'bg-lime-500', bg: 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-200', hoverBg: 'hover:bg-lime-100' },
  'Congenital Echo': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100' },
  'Contrast Echo': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
  'Strain Imaging': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100' },
  '3D Echo': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100' },
  'ICE': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-100' },
  // Electrophysiology subcategories
  'Electrophysiology': { dot: 'bg-violet-600', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-300', hoverBg: 'hover:bg-violet-100' },
  'EP Studies': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100' },
  'SVT/AVNRT Ablation': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100' },
  'Atrial Flutter Ablation': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100' },
  'Atrial Fibrillation Ablation': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100' },
  'VT Ablation': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  'Pacemaker Implant': { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200', hoverBg: 'hover:bg-teal-100' },
  'ICD Implant': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', hoverBg: 'hover:bg-orange-100' },
  'CRT Implant': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
  'Leadless Pacemaker': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', hoverBg: 'hover:bg-cyan-100' },
  'Subcutaneous ICD': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100' },
  'Device Revision': { dot: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-200', hoverBg: 'hover:bg-slate-100' },
  'Lead Extraction': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-100' },
  'Loop Recorder': { dot: 'bg-lime-500', bg: 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-200', hoverBg: 'hover:bg-lime-100' },
  'External Cardioversion': { dot: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', hoverBg: 'hover:bg-pink-100' },
  'Tilt Table': { dot: 'bg-stone-500', bg: 'bg-stone-50', text: 'text-stone-900', border: 'border-stone-200', hoverBg: 'hover:bg-stone-100' },
  // Other/Custom Codes
  'Other': { dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-300', hoverBg: 'hover:bg-gray-100' },
  // Endovascular subcategories - intervention categories
  'Renal Intervention': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100' },
  'Mesenteric Intervention': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
};

// Default colors for categories not in mapping
const defaultCategoryColor = { dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-200', hoverBg: 'hover:bg-gray-100' };

// Indication code lookup sets for diagnosis auto-recall
const cardiacIndicationCodes = new Set([
  'I21.09','I21.4','I25.110','I25.10','I25.119','I50.9','I50.23','R94.31','I25.700',
  'I48.91','I34.0','I34.1','I35.0','I35.1','I42.0','I42.1','I47.2','R07.9','I63.9',
  'I11.0','Z95.1','Z95.5','I50.43','I25.5','I25.2'
]);
const peripheralIndicationCodes = new Set([
  'I70.219','I70.269','I73.9','I70.213','I70.261','I70.262','I70.263','I70.25','I70.0',
  'I74.3','I74.5','I70.1','I77.1','I65.2','E11.51','I96','I70.92','Z95.820'
]);
const structuralIndicationCodes = new Set([
  'I35.0','I34.0','I34.1','I35.1','I35.2','I34.2','Q21.1','Q21.0','Q21.8','I37.0',
  'I36.0','I36.1','I38','I50.9','I48.91','Q22.0','Q22.1','T82.0','I34.8','I42.2'
]);

// Bottom tab type for cath lab sectioning
export type CathLabBottomTab = 'addcase' | 'icd10' | 'cpt' | 'review';

interface CardiologyCPTAppProps {
  isProMode?: boolean;
  patients?: Inpatient[];
  hospitals?: Hospital[];
  cathLabs?: CathLab[];
  patientDiagnoses?: Record<string, string[]>;
  orgId?: string;
  userName?: string;
  bottomTab?: CathLabBottomTab;
  onPatientCreated?: (patient: Omit<Inpatient, 'id' | 'createdAt' | 'organizationId' | 'primaryPhysicianId'>, diagnoses: string[]) => Promise<Inpatient>;
  onChargeUpdated?: () => void;
  onBadgeCounts?: (counts: { icd10: number; cpt: number; violations: number }) => void;
}

export interface CardiologyCPTAppHandle {
  openHistory: () => void;
  openUpdates: () => void;
  openSettings: () => void;
  loadChargeForEdit: (charge: StoredCharge, patient: Inpatient) => void;
  getIcd10Count: () => number;
  getCptCount: () => number;
  getViolationCount: () => number;
  getCaseHistory: () => SavedCase[];
  loadFromHistory: (savedCase: SavedCase) => void;
  deleteFromHistory: (id: string) => void;
  exportHistory: () => void;
}

const CardiologyCPTApp = forwardRef<CardiologyCPTAppHandle, CardiologyCPTAppProps>(({ isProMode = false, patients = [], hospitals = [], cathLabs = [], patientDiagnoses = {}, orgId, userName = '', bottomTab = 'addcase', onPatientCreated, onChargeUpdated, onBadgeCounts }, ref) => {
  // Patient matching state (replaces caseId)
  const [patientName, setPatientName] = useState('');
  const [patientDob, setPatientDob] = useState(''); // stored as YYYY-MM-DD
  const [patientDobDisplay, setPatientDobDisplay] = useState(''); // displayed as MM/DD/YYYY
  const [matchedPatient, setMatchedPatient] = useState<Inpatient | null>(null);
  const [patientSuggestions, setPatientSuggestions] = useState<Inpatient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [procedureDateOption, setProcedureDateOption] = useState('today');
  const [procedureDateText, setProcedureDateText] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [includeSedation, setIncludeSedation] = useState(false);
  const [sedationUnits, setSedationUnits] = useState(0);
  const [showChargeSubmitted, setShowChargeSubmitted] = useState(false);
  const [submittedChargeInfo, setSubmittedChargeInfo] = useState<{ codeCount: number; totalRVU: number; estimatedPayment: number } | null>(null);
  const [selectedIndication, setSelectedIndication] = useState('');
  const [otherIndication, setOtherIndication] = useState('');
  const [indicationCategory, setIndicationCategory] = useState('cardiac');
  const [selectedCardiacIndication, setSelectedCardiacIndication] = useState('');
  const [selectedPeripheralIndication, setSelectedPeripheralIndication] = useState('');
  const [selectedStructuralIndication, setSelectedStructuralIndication] = useState('');
  const [otherCardiacIndication, setOtherCardiacIndication] = useState('');
  const [otherPeripheralIndication, setOtherPeripheralIndication] = useState('');
  const [otherStructuralIndication, setOtherStructuralIndication] = useState('');
  const [codeVessels, setCodeVessels] = useState({}); // Track vessels per code: { 'code': 'vessel' }
  const [selectedCodesVessel2, setSelectedCodesVessel2] = useState([]); // Second vessel PCI codes
  const [codeVesselsV2, setCodeVesselsV2] = useState({});
  const [selectedCodesVessel3, setSelectedCodesVessel3] = useState([]); // Third vessel PCI codes
  const [codeVesselsV3, setCodeVesselsV3] = useState({});
  const [showModifierGuide, setShowModifierGuide] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [imagingVessels, setImagingVessels] = useState({});
  const [dcbVessels, setDcbVessels] = useState({});
  const [expandedPCIVessels, setExpandedPCIVessels] = useState({});
  const [expandedIndicationSections, setExpandedIndicationSections] = useState({ cardiac: true, peripheral: false, structural: false });
  const [indicationSearch, setIndicationSearch] = useState('');
  const [expandedSedation, setExpandedSedation] = useState(false);

  // === NEW FEATURE STATE ===
  // Feature 1: Code Search
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Codes (Other section)
  const [customCodes, setCustomCodes] = useState<CustomCPTCode[]>([]);
  const [showAddCustomCode, setShowAddCustomCode] = useState(false);
  const [newCustomCode, setNewCustomCode] = useState('');
  const [newCustomDescription, setNewCustomDescription] = useState('');
  const [newCustomRVU, setNewCustomRVU] = useState('');
  const [editingCustomCode, setEditingCustomCode] = useState<CustomCPTCode | null>(null);

  // Dev Mode
  const [showDevMode, setShowDevMode] = useState(false);
  const [devModeSettings, setDevModeSettings] = useState<DevModeSettings | null>(null);
  const [selectedDevTier, setSelectedDevTier] = useState<'individual' | 'pro'>('individual');
  const [selectedDevRole, setSelectedDevRole] = useState<'physician' | 'admin' | null>(null);

  // Code Group Settings
  const [showCodeGroupSettings, setShowCodeGroupSettings] = useState(false);

  // Feature 2: Favorites
  const [favorites, setFavorites] = useState<string[]>([]);

  // Feature 4: Case Templates
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CaseTemplate[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [swipedTemplateId, setSwipedTemplateId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number>(0);

  // Feature 5: Case History
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [caseHistory, setCaseHistory] = useState<SavedCase[]>([]);

  // Feature 7: Billing Rules Engine
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  const [overriddenRules, setOverriddenRules] = useState<string[]>([]);
  const [showRuleDetails, setShowRuleDetails] = useState<string | null>(null);

  // 2026 Updates Info
  const [show2026Updates, setShow2026Updates] = useState(false);

  // Settings state
  const [cardiologistName, setCardiologistName] = useState('');
  const [cathLocations, setCathLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');

  // PHI scanning state (individual mode only)
  const [phiMatches, setPhiMatches] = useState<PHIMatch[]>([]);
  const [showPHIWarning, setShowPHIWarning] = useState(false);
  const [phiAutoScrub, setPhiAutoScrub] = useState(false);
  const [phiBypassOnce, setPhiBypassOnce] = useState(false);
  const [pendingReportGeneration, setPendingReportGeneration] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Edit-mode state (for editing existing charges from Rounds)
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [editingChargeDate, setEditingChargeDate] = useState<string | null>(null);

  // Expose methods for App.tsx header buttons + badge counts + history data
  useImperativeHandle(ref, () => ({
    openHistory: () => setShowHistoryModal(true),
    openUpdates: () => setShow2026Updates(true),
    openSettings: () => setShowSettings(true),
    getIcd10Count: () => {
      let count = 0;
      if (selectedCardiacIndication) count++;
      if (selectedPeripheralIndication) count++;
      if (selectedStructuralIndication) count++;
      return count;
    },
    getCptCount: () => selectedCodes.length + selectedCodesVessel2.length + selectedCodesVessel3.length,
    getViolationCount: () => ruleViolations.filter(v => v.severity === 'error').length,
    getCaseHistory: () => caseHistory,
    loadFromHistory: (savedCase: SavedCase) => loadFromHistory(savedCase),
    deleteFromHistory: (id: string) => deleteFromHistory(id),
    exportHistory: () => exportHistory(),
    loadChargeForEdit: (charge: StoredCharge, patient: Inpatient) => {
      // Set editing state
      setEditingChargeId(charge.id);
      setEditingChargeDate(charge.chargeDate);

      // Set patient info
      setMatchedPatient(patient);
      setPatientName(patient.patientName);
      setPatientDob(patient.dob || '');
      setPatientDobDisplay('');
      setShowSuggestions(false);
      setPatientSuggestions([]);

      // Set procedure date
      setProcedureDateOption('other');
      setProcedureDateText(charge.chargeDate);

      // Set location
      setSelectedLocation(patient.hospitalName || '');

      // Load case snapshot if available
      if (charge.caseSnapshot) {
        const snap = charge.caseSnapshot;
        setSelectedCodes(snap.codes.primary);
        setSelectedCodesVessel2(snap.codes.vessel2);
        setSelectedCodesVessel3(snap.codes.vessel3);
        setCodeVessels(snap.vessels.v1);
        setCodeVesselsV2(snap.vessels.v2);
        setCodeVesselsV3(snap.vessels.v3);
        setIncludeSedation(snap.sedation.included);
        setSedationUnits(snap.sedation.units);

        // Set indication category and value
        if (snap.indicationCategory) {
          setIndicationCategory(snap.indicationCategory);
        }
        if (snap.indication) {
          // Determine which indication type it belongs to
          if (cardiacIndicationCodes.has(snap.indication)) {
            setSelectedCardiacIndication(snap.indication);
            setSelectedPeripheralIndication('');
            setSelectedStructuralIndication('');
          } else if (peripheralIndicationCodes.has(snap.indication)) {
            setSelectedPeripheralIndication(snap.indication);
            setSelectedCardiacIndication('');
            setSelectedStructuralIndication('');
          } else if (structuralIndicationCodes.has(snap.indication)) {
            setSelectedStructuralIndication(snap.indication);
            setSelectedCardiacIndication('');
            setSelectedPeripheralIndication('');
          }
        }
      }

      // Clear any previous submission state
      setShowChargeSubmitted(false);
      setSubmittedChargeInfo(null);
    },
  }));

  // Push badge counts to parent whenever relevant state changes
  useEffect(() => {
    if (!onBadgeCounts) return;
    let icd10 = 0;
    if (selectedCardiacIndication) icd10++;
    if (selectedPeripheralIndication) icd10++;
    if (selectedStructuralIndication) icd10++;
    const cpt = selectedCodes.length + selectedCodesVessel2.length + selectedCodesVessel3.length;
    const violations = ruleViolations.filter(v => v.severity === 'error').length;
    onBadgeCounts({ icd10, cpt, violations });
  }, [selectedCodes, selectedCodesVessel2, selectedCodesVessel3, selectedCardiacIndication, selectedPeripheralIndication, selectedStructuralIndication, ruleViolations, onBadgeCounts]);

  // Auto-recall diagnoses when a patient match is selected
  useEffect(() => {
    if (!matchedPatient) return;
    const codes = patientDiagnoses[matchedPatient.id];
    if (!codes || codes.length === 0) return;

    // Match each diagnosis code against the indication lists
    for (const code of codes) {
      if (cardiacIndicationCodes.has(code)) {
        setSelectedCardiacIndication(code);
      } else if (peripheralIndicationCodes.has(code)) {
        setSelectedPeripheralIndication(code);
      } else if (structuralIndicationCodes.has(code)) {
        setSelectedStructuralIndication(code);
      }
    }
  }, [matchedPatient, patientDiagnoses]);

  // Initialize default settings and load from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load cardiologist name
        const cardioResult = await window.storage.get('cardiologistName');
        if (cardioResult?.value) {
          setCardiologistName(cardioResult.value);
        }

        // Load cath locations
        const locationsResult = await window.storage.get('cathLocations');
        if (locationsResult?.value) {
          setCathLocations(JSON.parse(locationsResult.value));
        } else {
          // Set defaults if no saved locations
          setCathLocations(['Main Hospital Cath Lab', 'Outpatient Surgery Center']);
        }

        // Load PHI auto-scrub setting
        const phiScrubResult = await window.storage.get('phiAutoScrub');
        if (phiScrubResult?.value) {
          setPhiAutoScrub(phiScrubResult.value === 'true');
        }

        // Load favorites
        const favoritesResult = await window.storage.get('cathcpt_favorites');
        if (favoritesResult?.value) {
          setFavorites(JSON.parse(favoritesResult.value));
        }

        // Load custom templates
        const templatesResult = await window.storage.get('cathcpt_custom_templates');
        if (templatesResult?.value) {
          setCustomTemplates(JSON.parse(templatesResult.value));
        }

        // Load case history
        const historyResult = await window.storage.get('cathcpt_case_history');
        if (historyResult?.value) {
          setCaseHistory(JSON.parse(historyResult.value));
        }

        // Load custom codes
        const loadedCustomCodes = await getCustomCodes();
        setCustomCodes(loadedCustomCodes);

        // Load dev mode settings
        const devSettings = await getDevModeSettings();
        setDevModeSettings(devSettings);
        if (devSettings) {
          setSelectedDevTier(devSettings.userTier);
          setSelectedDevRole(devSettings.userRole);
        }
      } catch (error) {
        // If storage fails, use defaults
        logger.info('Loading settings from storage failed, using defaults');
        setCathLocations(['Main Hospital Cath Lab', 'Outpatient Surgery Center']);
      }
    };

    loadSettings();
  }, []);


  // Save favorites when changed
  useEffect(() => {
    window.storage.set('cathcpt_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Real-time billing rules validation
  useEffect(() => {
    const allCodes = [
      ...selectedCodes.map(c => ({ code: c.code, vessel: codeVessels[c.code] })),
      ...selectedCodesVessel2.map(c => ({ code: c.code, vessel: codeVesselsV2[c.code] })),
      ...selectedCodesVessel3.map(c => ({ code: c.code, vessel: codeVesselsV3[c.code] }))
    ];

    if (allCodes.length > 0) {
      const currentIndication = selectedCardiacIndication || selectedPeripheralIndication || selectedStructuralIndication;
      const context = createBillingContext(allCodes, currentIndication);
      const violations = runBillingRules(context);
      setRuleViolations(violations);
    } else {
      setRuleViolations([]);
    }
  }, [selectedCodes, selectedCodesVessel2, selectedCodesVessel3, codeVessels, codeVesselsV2, codeVesselsV3, selectedCardiacIndication, selectedPeripheralIndication, selectedStructuralIndication]);

  // PHI scanning on patient name (individual mode only)
  useEffect(() => {
    if (isProMode) {
      setPhiMatches([]);
      return;
    }
    if (patientName.trim().length >= 2) {
      const matches = scanFieldsForPHI({ patientName });
      setPhiMatches(matches);
    } else {
      setPhiMatches([]);
    }
  }, [patientName, isProMode]);

  // After PHI warning modal dismissal, re-trigger submission if pending
  useEffect(() => {
    if (pendingReportGeneration && !showPHIWarning) {
      setPendingReportGeneration(false);
      handleSubmitCharges();
    }
  }, [pendingReportGeneration, showPHIWarning]);

  // Official Coronary Artery Modifier Guide
  const coronaryModifiers = [
    { modifier: 'LC', artery: 'Left circumflex', branches: 'Obtuse marginal 1, Obtuse marginal 2' },
    { modifier: 'LD', artery: 'Left anterior descending', branches: 'Diagonal 1, Diagonal 2' },
    { modifier: 'LM', artery: 'Left main', branches: 'N/A' },
    { modifier: 'RC', artery: 'Right', branches: 'Posterior descending, Posterolateral' },
    { modifier: 'RI', artery: 'Ramus Intermedius', branches: 'N/A' }
  ];

  // === NEW FEATURE FUNCTIONS ===

  // Feature 1: Code Search - Filter codes by search query
  const filterCodes = useCallback((categories: Record<string, any[]>, query: string) => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    const filtered: Record<string, any[]> = {};
    for (const [cat, codes] of Object.entries(categories)) {
      const matches = codes.filter(c =>
        c.code.includes(q) ||
        c.summary?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
      if (matches.length) filtered[cat] = matches;
    }
    return filtered;
  }, []);

  // Feature 2: Favorites - Toggle and check favorites
  const toggleFavorite = useCallback((code: string) => {
    setFavorites(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const isFavorite = useCallback((code: string) => favorites.includes(code), [favorites]);

  // Get favorite codes from all categories
  const getFavoriteCodes = useMemo(() => {
    const allCodes: any[] = [];
    // Include standard CPT categories
    Object.values(cptCategories).forEach(codes => {
      codes.forEach(code => {
        if (favorites.includes(code.code)) {
          allCodes.push(code);
        }
      });
    });
    // Include echo categories
    Object.values(echoCategories).forEach(codes => {
      codes.forEach(code => {
        if (favorites.includes(code.code)) {
          allCodes.push(code);
        }
      });
    });
    // Include EP categories
    Object.values(epCategories).forEach(codes => {
      codes.forEach(code => {
        if (favorites.includes(code.code)) {
          allCodes.push(code);
        }
      });
    });
    // Include custom codes
    customCodes.forEach(code => {
      if (favorites.includes(code.code)) {
        allCodes.push({ code: code.code, description: code.description, summary: code.description, rvu: code.rvu });
      }
    });
    return allCodes;
  }, [favorites, customCodes]);

  // Custom Codes - Handlers
  const handleSaveCustomCode = useCallback(async () => {
    if (!newCustomCode.trim() || !newCustomDescription.trim()) return;

    try {
      if (editingCustomCode) {
        // Update existing code
        await updateCustomCode(editingCustomCode.id, {
          code: newCustomCode.trim(),
          description: newCustomDescription.trim(),
          rvu: newCustomRVU ? parseFloat(newCustomRVU) : undefined
        });
      } else {
        // Add new code
        await addCustomCode(
          newCustomCode.trim(),
          newCustomDescription.trim(),
          newCustomRVU ? parseFloat(newCustomRVU) : undefined
        );
      }
      const updatedCodes = await getCustomCodes();
      setCustomCodes(updatedCodes);
      setShowAddCustomCode(false);
      setNewCustomCode('');
      setNewCustomDescription('');
      setNewCustomRVU('');
      setEditingCustomCode(null);
    } catch (error) {
      logger.error('Error saving custom code', error);
      alert(error instanceof Error ? error.message : 'Error saving code');
    }
  }, [newCustomCode, newCustomDescription, newCustomRVU, editingCustomCode]);

  const handleDeleteCustomCode = useCallback(async (customCode: CustomCPTCode) => {
    if (!confirm(`Delete custom code ${customCode.code}?`)) return;
    try {
      await deleteCustomCode(customCode.id);
      const updatedCodes = await getCustomCodes();
      setCustomCodes(updatedCodes);
    } catch (error) {
      logger.error('Error deleting custom code', error);
    }
  }, []);

  const handleEditCustomCode = useCallback((customCode: CustomCPTCode) => {
    setEditingCustomCode(customCode);
    setNewCustomCode(customCode.code);
    setNewCustomDescription(customCode.description);
    setNewCustomRVU(customCode.rvu?.toString() || '');
    setShowAddCustomCode(true);
  }, []);

  // Dev Mode handlers
  const handleOpenDevMode = useCallback(async () => {
    await enableDevMode();
    const settings = await getDevModeSettings();
    setDevModeSettings(settings);
    if (settings) {
      setSelectedDevTier(settings.userTier);
      setSelectedDevRole(settings.userRole);
    }
    setShowDevMode(true);
  }, []);

  const handleApplyDevMode = useCallback(async () => {
    await setDevModeUserType(selectedDevTier, selectedDevRole);
    const settings = await getDevModeSettings();
    setDevModeSettings(settings);
    setShowDevMode(false);
    // Reload to apply changes
    window.location.reload();
  }, [selectedDevTier, selectedDevRole]);

  const handleDisableDevMode = useCallback(async () => {
    await disableDevMode();
    setDevModeSettings(null);
    setShowDevMode(false);
    window.location.reload();
  }, []);

  // Feature 4: Case Templates - Load and save templates
  const loadTemplate = useCallback((template: CaseTemplate) => {
    // Clear current selections
    setSelectedCodes([]);
    setSelectedCodesVessel2([]);
    setSelectedCodesVessel3([]);
    setCodeVessels({});
    setCodeVesselsV2({});
    setCodeVesselsV3({});

    // Find code details from categories
    const findCodeDetails = (codeNum: string) => {
      for (const codes of Object.values(cptCategories)) {
        const found = codes.find(c => c.code === codeNum);
        if (found) return { code: found.code, description: found.description };
      }
      return { code: codeNum, description: '' };
    };

    // Load primary codes
    if (template.codes.primary) {
      const primaryCodes = template.codes.primary.map(findCodeDetails);
      setSelectedCodes(primaryCodes);
    }

    // Load vessel 2 codes
    if (template.codes.vessel2) {
      const vessel2Codes = template.codes.vessel2.map(findCodeDetails);
      setSelectedCodesVessel2(vessel2Codes);
    }

    // Load vessel 3 codes
    if (template.codes.vessel3) {
      const vessel3Codes = template.codes.vessel3.map(findCodeDetails);
      setSelectedCodesVessel3(vessel3Codes);
    }

    // Load indication
    if (template.indication) {
      switch (template.indication.category) {
        case 'cardiac':
          setSelectedCardiacIndication(template.indication.code);
          setSelectedPeripheralIndication('');
          setSelectedStructuralIndication('');
          break;
        case 'peripheral':
          setSelectedPeripheralIndication(template.indication.code);
          setSelectedCardiacIndication('');
          setSelectedStructuralIndication('');
          break;
        case 'structural':
          setSelectedStructuralIndication(template.indication.code);
          setSelectedCardiacIndication('');
          setSelectedPeripheralIndication('');
          break;
      }
    }

    // Load sedation
    if (template.includeSedation !== undefined) {
      setIncludeSedation(template.includeSedation);
    }
    if (template.sedationUnits !== undefined) {
      setSedationUnits(template.sedationUnits);
    }

    setShowTemplateModal(false);
  }, []);

  const saveAsTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) return;

    const newTemplate = createCustomTemplate(
      newTemplateName,
      newTemplateDescription,
      {
        primary: selectedCodes.map(c => c.code),
        vessel2: selectedCodesVessel2.map(c => c.code),
        vessel3: selectedCodesVessel3.map(c => c.code)
      },
      selectedCardiacIndication ? { category: 'cardiac', code: selectedCardiacIndication } :
      selectedPeripheralIndication ? { category: 'peripheral', code: selectedPeripheralIndication } :
      selectedStructuralIndication ? { category: 'structural', code: selectedStructuralIndication } : undefined,
      includeSedation,
      sedationUnits
    );

    const updatedTemplates = [...customTemplates, newTemplate];
    setCustomTemplates(updatedTemplates);
    await window.storage.set('cathcpt_custom_templates', JSON.stringify(updatedTemplates));

    setNewTemplateName('');
    setNewTemplateDescription('');
    setShowSaveTemplateModal(false);
  }, [newTemplateName, newTemplateDescription, selectedCodes, selectedCodesVessel2, selectedCodesVessel3, selectedCardiacIndication, selectedPeripheralIndication, selectedStructuralIndication, includeSedation, sedationUnits, customTemplates]);

  const deleteCustomTemplate = useCallback(async (templateId: string) => {
    const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
    setCustomTemplates(updatedTemplates);
    await window.storage.set('cathcpt_custom_templates', JSON.stringify(updatedTemplates));
  }, [customTemplates]);

  // Feature 5: Case History - Save and manage history
  const saveToHistory = useCallback(async () => {
    const rvuCalc = calculateRVUAndReimbursement();
    const newCase: SavedCase = {
      id: `case-${Date.now()}`,
      timestamp: Date.now(),
      caseId: patientName || '',
      location: selectedLocation,
      codes: {
        primary: selectedCodes,
        vessel2: selectedCodesVessel2,
        vessel3: selectedCodesVessel3
      },
      vessels: {
        v1: codeVessels,
        v2: codeVesselsV2,
        v3: codeVesselsV3
      },
      indication: selectedCardiacIndication || selectedPeripheralIndication || selectedStructuralIndication || '',
      totalRVU: parseFloat(rvuCalc.totalWorkRVU),
      estimatedPayment: parseFloat(rvuCalc.totalWorkRVU) * 36.04
    };

    const updatedHistory = [newCase, ...caseHistory].slice(0, 50); // Keep last 50
    setCaseHistory(updatedHistory);
    await window.storage.set('cathcpt_case_history', JSON.stringify(updatedHistory));
  }, [patientName, selectedLocation, selectedCodes, selectedCodesVessel2, selectedCodesVessel3, codeVessels, codeVesselsV2, codeVesselsV3, selectedCardiacIndication, selectedPeripheralIndication, selectedStructuralIndication, caseHistory]);

  // Auto-format DOB as MM/DD/YYYY and convert to YYYY-MM-DD for storage
  const handlePatientDobChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let display = '';
    if (digits.length <= 2) {
      display = digits;
    } else if (digits.length <= 4) {
      display = digits.slice(0, 2) + '/' + digits.slice(2);
    } else {
      display = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    }
    setPatientDobDisplay(display);
    if (digits.length === 8) {
      const mm = digits.slice(0, 2);
      const dd = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      setPatientDob(`${yyyy}-${mm}-${dd}`);
    } else {
      setPatientDob('');
    }
  };

  const loadFromHistory = useCallback((savedCase: SavedCase) => {
    setPatientName(savedCase.caseId);
    setMatchedPatient(null);
    setPatientDob('');
    setPatientDobDisplay('');
    setSelectedLocation(savedCase.location);
    setSelectedCodes(savedCase.codes.primary);
    setSelectedCodesVessel2(savedCase.codes.vessel2);
    setSelectedCodesVessel3(savedCase.codes.vessel3);
    setCodeVessels(savedCase.vessels.v1);
    setCodeVesselsV2(savedCase.vessels.v2);
    setCodeVesselsV3(savedCase.vessels.v3);

    // Set indication
    if (savedCase.indication) {
      const cardiacMatch = cardiacIndications.find(i => i.code === savedCase.indication);
      const peripheralMatch = peripheralIndications.find(i => i.code === savedCase.indication);
      const structuralMatch = structuralIndications.find(i => i.code === savedCase.indication);

      if (cardiacMatch) {
        setSelectedCardiacIndication(savedCase.indication);
        setSelectedPeripheralIndication('');
        setSelectedStructuralIndication('');
      } else if (peripheralMatch) {
        setSelectedPeripheralIndication(savedCase.indication);
        setSelectedCardiacIndication('');
        setSelectedStructuralIndication('');
      } else if (structuralMatch) {
        setSelectedStructuralIndication(savedCase.indication);
        setSelectedCardiacIndication('');
        setSelectedPeripheralIndication('');
      }
    }

    setShowHistoryModal(false);
  }, []);

  const deleteFromHistory = useCallback(async (caseId: string) => {
    const updatedHistory = caseHistory.filter(c => c.id !== caseId);
    setCaseHistory(updatedHistory);
    await window.storage.set('cathcpt_case_history', JSON.stringify(updatedHistory));
  }, [caseHistory]);

  const exportHistory = useCallback(() => {
    const data = JSON.stringify(caseHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cathcpt-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [caseHistory]);

  // Feature 7: Billing Rules Engine - Override rules
  const toggleRuleOverride = useCallback((ruleId: string) => {
    setOverriddenRules(prev =>
      prev.includes(ruleId) ? prev.filter(r => r !== ruleId) : [...prev, ruleId]
    );
  }, []);

  // Apply a fix option from billing rules validation
  const applyRuleFix = useCallback((codesToRemove: string[], codeToAdd?: string) => {
    // Remove codes from all vessel selections
    if (codesToRemove.length > 0) {
      setSelectedCodes(prev => prev.filter(c => !codesToRemove.includes(c.code)));
      setSelectedCodesVessel2(prev => prev.filter(c => !codesToRemove.includes(c.code)));
      setSelectedCodesVessel3(prev => prev.filter(c => !codesToRemove.includes(c.code)));

      // Also clean up vessel mappings
      setCodeVessels(prev => {
        const updated = { ...prev };
        codesToRemove.forEach(code => delete updated[code]);
        return updated;
      });
      setCodeVesselsV2(prev => {
        const updated = { ...prev };
        codesToRemove.forEach(code => delete updated[code]);
        return updated;
      });
      setCodeVesselsV3(prev => {
        const updated = { ...prev };
        codesToRemove.forEach(code => delete updated[code]);
        return updated;
      });
    }

    // Add replacement code if specified
    if (codeToAdd) {
      const codeInfo = Object.values(cptCategories).flat().find(c => c.code === codeToAdd);
      if (codeInfo) {
        setSelectedCodes(prev => {
          if (prev.some(c => c.code === codeToAdd)) return prev;
          return [...prev, { code: codeToAdd, description: codeInfo.description }];
        });
      }
    }
  }, []);

  // Get active (non-overridden) violations
  const activeViolations = useMemo(() => {
    return ruleViolations.filter(v =>
      !overriddenRules.includes(v.ruleId) || v.severity === 'error'
    );
  }, [ruleViolations, overriddenRules]);

  // Check if there are blocking errors
  const hasBlockingErrors = useMemo(() => {
    return activeViolations.some(v => v.severity === 'error');
  }, [activeViolations]);

  // CCI Edit Validation
  const cciViolations = useMemo(() => {
    const allCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3];
    if (allCodes.length < 2) return [];
    return validateCCIEdits(allCodes.map(c => c.code));
  }, [selectedCodes, selectedCodesVessel2, selectedCodesVessel3]);

  // 2026 Medicare Fee Schedule (National Average - Facility Setting)
  const medicareFeeSchedule2026 = {
    // Diagnostic Catheterization
    '93454': { rvus: 8.47, payment: 305.50 },
    '93455': { rvus: 10.03, payment: 361.70 },
    '93456': { rvus: 11.72, payment: 422.60 },
    '93457': { rvus: 13.28, payment: 478.80 },
    '93458': { rvus: 12.19, payment: 439.50 },
    '93459': { rvus: 13.75, payment: 495.70 },
    '93460': { rvus: 15.41, payment: 555.50 },
    '93461': { rvus: 16.97, payment: 611.70 },
    '93451': { rvus: 6.83, payment: 246.20 },
    '93452': { rvus: 8.39, payment: 302.40 },
    '93453': { rvus: 10.05, payment: 362.40 },
    
    // PCI Base Codes
    '92920': { rvus: 11.83, payment: 426.60 },
    '92924': { rvus: 14.52, payment: 523.50 },
    '92928': { rvus: 15.74, payment: 567.50 },
    '92930': { rvus: 19.82, payment: 714.60 },
    '92933': { rvus: 18.60, payment: 670.60 },
    '92937': { rvus: 16.21, payment: 584.30 },
    '92941': { rvus: 20.44, payment: 736.90 },
    '92943': { rvus: 21.18, payment: 763.60 },
    '92945': { rvus: 24.86, payment: 896.40 },
    
    // Drug-Coated Balloon (NEW 2026)
    '0913T': { rvus: 16.20, payment: 583.90 },
    '0914T': { rvus: 5.40, payment: 194.70 },
    
    // PCI Add-on Procedures
    '92972': { rvus: 3.85, payment: 138.80 },
    '92973': { rvus: 2.97, payment: 107.10 },
    '92974': { rvus: 4.12, payment: 148.50 },
    
    // Intravascular Imaging & Physiology
    '92978': { rvus: 2.86, payment: 103.10 },
    '92979': { rvus: 2.14, payment: 77.20 },
    '93571': { rvus: 2.75, payment: 99.20 },
    '93572': { rvus: 2.06, payment: 74.30 },
    '0523T': { rvus: 3.20, payment: 115.40 },
    '0524T': { rvus: 2.40, payment: 86.50 },
    
    // Moderate Sedation
    '99152': { rvus: 2.49, payment: 89.80 },
    '99153': { rvus: 1.14, payment: 41.10 },
    
    // Structural Heart
    '93580': { rvus: 21.54, payment: 776.60 },
    '93581': { rvus: 24.83, payment: 895.30 },
    '93582': { rvus: 18.72, payment: 674.90 },
    '93583': { rvus: 22.16, payment: 798.90 },
    '93590': { rvus: 19.45, payment: 701.20 },
    '93591': { rvus: 6.84, payment: 246.60 },
    '93592': { rvus: 20.38, payment: 734.70 },
    '33418': { rvus: 25.50, payment: 919.00 },
    '33419': { rvus: 8.50, payment: 306.30 },
    '0569T': { rvus: 24.00, payment: 864.90 },
    '0570T': { rvus: 7.50, payment: 270.30 },
    
    // TAVR
    '33361': { rvus: 45.23, payment: 1630.30 },
    '33362': { rvus: 47.89, payment: 1726.20 },
    '33363': { rvus: 49.12, payment: 1770.50 },
    '33364': { rvus: 48.55, payment: 1749.90 },
    '33365': { rvus: 51.78, payment: 1866.10 },
    '33366': { rvus: 52.34, payment: 1886.30 },
    
    // Adjunctive
    '93462': { rvus: 5.12, payment: 184.60 },
    '93463': { rvus: 3.45, payment: 124.40 },
    '93464': { rvus: 4.67, payment: 168.40 },
    '93505': { rvus: 6.23, payment: 224.60 },

    // MCS
    '33990': { rvus: 12.45, payment: 448.80 },
    '33991': { rvus: 15.67, payment: 564.90 },
    '33989': { rvus: 8.34, payment: 300.70 },

    // Venography
    '36010': { rvus: 3.20, payment: 115.30 },
    '36011': { rvus: 4.50, payment: 162.20 },
    '36012': { rvus: 5.50, payment: 198.20 },
    '75820': { rvus: 1.80, payment: 64.90 },
    '75822': { rvus: 2.30, payment: 82.90 },
    '75825': { rvus: 2.00, payment: 72.10 },
    '75827': { rvus: 2.00, payment: 72.10 },

    // IVC Filter
    '37191': { rvus: 10.00, payment: 360.40 },
    '37192': { rvus: 12.50, payment: 450.50 },
    '37193': { rvus: 16.00, payment: 576.60 },

    // Venous Stenting/Angioplasty
    '37238': { rvus: 19.00, payment: 684.80 },
    '37239': { rvus: 9.50, payment: 342.40 },
    '37248': { rvus: 15.50, payment: 558.60 },
    '37249': { rvus: 7.75, payment: 279.30 },

    // Venous Thrombectomy
    '37187': { rvus: 24.00, payment: 865.00 },
    '37188': { rvus: 12.00, payment: 432.50 },

    // Thrombolysis
    '37211': { rvus: 13.00, payment: 468.50 },
    '37212': { rvus: 13.00, payment: 468.50 },
    '37213': { rvus: 7.00, payment: 252.30 },
    '37214': { rvus: 8.50, payment: 306.30 },

    // Arterial Thrombectomy
    '37184': { rvus: 26.00, payment: 937.00 },
    '37185': { rvus: 13.00, payment: 468.50 },
    '37186': { rvus: 9.50, payment: 342.40 },

    // Retrieval
    '37197': { rvus: 12.00, payment: 432.50 }
  };

  // 2026 Medicare RVU and Fee Schedule Data (approximate, verify with current CMS data)
  // CF (Conversion Factor) for 2026 Medicare = approximately $36.04
  const rvuData = {
    // Diagnostic Cath - Right Heart
    '93451': { workRVU: 2.54, totalRVU: 6.83, fee: 246 },
    '93452': { workRVU: 3.30, totalRVU: 8.39, fee: 302 },
    '93453': { workRVU: 4.00, totalRVU: 10.05, fee: 362 },
    
    // Diagnostic Cath - Coronary
    '93454': { workRVU: 4.50, totalRVU: 12.85, fee: 424 },
    '93455': { workRVU: 5.20, totalRVU: 14.20, fee: 469 },
    '93456': { workRVU: 5.80, totalRVU: 15.50, fee: 512 },
    '93457': { workRVU: 6.50, totalRVU: 17.00, fee: 561 },
    '93458': { workRVU: 6.20, totalRVU: 16.50, fee: 545 },
    '93459': { workRVU: 7.00, totalRVU: 18.20, fee: 601 },
    '93460': { workRVU: 7.50, totalRVU: 19.50, fee: 644 },
    '93461': { workRVU: 8.20, totalRVU: 21.00, fee: 693 },
    
    // PCI Base Codes
    '92920': { workRVU: 11.69, totalRVU: 28.44, fee: 939 },
    '92924': { workRVU: 13.50, totalRVU: 31.75, fee: 1048 },
    '92928': { workRVU: 13.17, totalRVU: 30.89, fee: 1019 },
    '92930': { workRVU: 16.28, totalRVU: 36.75, fee: 1213 },
    '92933': { workRVU: 14.87, totalRVU: 34.20, fee: 1129 },
    '92937': { workRVU: 13.17, totalRVU: 30.89, fee: 1019 },
    '92941': { workRVU: 13.17, totalRVU: 30.89, fee: 1019 },
    '92943': { workRVU: 17.50, totalRVU: 38.90, fee: 1284 },
    '92945': { workRVU: 21.00, totalRVU: 44.50, fee: 1469 },
    
    // Drug-Coated Balloon
    '0913T': { workRVU: 12.00, totalRVU: 29.50, fee: 974 },
    '0914T': { workRVU: 3.50, totalRVU: 8.20, fee: 271 },
    
    // PCI Add-ons
    '92972': { workRVU: 2.50, totalRVU: 6.15, fee: 203 },
    '92973': { workRVU: 2.20, totalRVU: 5.50, fee: 182 },
    '92974': { workRVU: 1.80, totalRVU: 4.50, fee: 149 },
    
    // Intravascular Imaging & Physiology
    '92978': { workRVU: 1.69, totalRVU: 4.18, fee: 138 },
    '92979': { workRVU: 1.69, totalRVU: 4.18, fee: 138 },
    '93571': { workRVU: 1.50, totalRVU: 3.75, fee: 124 },
    '93572': { workRVU: 1.50, totalRVU: 3.75, fee: 124 },
    '0523T': { workRVU: 1.85, totalRVU: 4.60, fee: 152 },
    '0524T': { workRVU: 1.40, totalRVU: 3.50, fee: 116 },
    
    // Sedation
    '99152': { workRVU: 1.42, totalRVU: 3.15, fee: 104 },
    '99153': { workRVU: 0.98, totalRVU: 2.18, fee: 72 },
    
    // Structural Heart
    '33274': { workRVU: 22.00, totalRVU: 48.00, fee: 1585 },
    '93580': { workRVU: 18.00, totalRVU: 40.00, fee: 1320 },
    '93581': { workRVU: 20.50, totalRVU: 45.00, fee: 1485 },
    '93582': { workRVU: 16.50, totalRVU: 37.00, fee: 1221 },
    '93583': { workRVU: 19.00, totalRVU: 42.00, fee: 1386 },
    '93590': { workRVU: 17.00, totalRVU: 38.00, fee: 1254 },
    '93591': { workRVU: 5.00, totalRVU: 11.00, fee: 363 },
    '93592': { workRVU: 17.50, totalRVU: 39.00, fee: 1287 },
    '33418': { workRVU: 20.00, totalRVU: 44.00, fee: 1452 },
    '33419': { workRVU: 6.50, totalRVU: 14.50, fee: 479 },
    '0569T': { workRVU: 19.00, totalRVU: 42.00, fee: 1386 },
    '0570T': { workRVU: 5.50, totalRVU: 12.50, fee: 413 },
    
    // TAVR
    '33361': { workRVU: 35.00, totalRVU: 75.00, fee: 2475 },
    '33362': { workRVU: 36.50, totalRVU: 78.00, fee: 2574 },
    '33363': { workRVU: 37.00, totalRVU: 79.50, fee: 2624 },
    '33364': { workRVU: 36.80, totalRVU: 79.00, fee: 2607 },
    '33365': { workRVU: 38.50, totalRVU: 82.00, fee: 2706 },
    '33366': { workRVU: 39.00, totalRVU: 83.00, fee: 2739 },
    '33367': { workRVU: 8.00, totalRVU: 17.00, fee: 561 },
    '33368': { workRVU: 37.50, totalRVU: 80.00, fee: 2640 },
    '33369': { workRVU: 38.00, totalRVU: 81.00, fee: 2673 },
    
    // Peripheral Diagnostic Codes
    '36200': { workRVU: 1.50, totalRVU: 4.00, fee: 144 },
    '36215': { workRVU: 2.00, totalRVU: 5.50, fee: 198 },
    '36216': { workRVU: 2.50, totalRVU: 6.50, fee: 234 },
    '36217': { workRVU: 3.00, totalRVU: 7.50, fee: 270 },
    '36245': { workRVU: 2.00, totalRVU: 5.50, fee: 198 },
    '36246': { workRVU: 2.50, totalRVU: 6.50, fee: 234 },
    '36247': { workRVU: 3.00, totalRVU: 7.50, fee: 270 },
    '75625': { workRVU: 1.50, totalRVU: 4.00, fee: 144 },
    '75710': { workRVU: 1.10, totalRVU: 3.00, fee: 108 },
    '75716': { workRVU: 1.50, totalRVU: 4.00, fee: 144 },
    '75722': { workRVU: 0.80, totalRVU: 2.20, fee: 79 },
    '75724': { workRVU: 1.20, totalRVU: 3.20, fee: 115 },
    '75736': { workRVU: 0.80, totalRVU: 2.20, fee: 79 },
    '75774': { workRVU: 0.50, totalRVU: 1.50, fee: 54 },

    // Peripheral Intervention - Iliac
    '37254': { workRVU: 8.50, totalRVU: 20.00, fee: 660 },
    '37255': { workRVU: 10.00, totalRVU: 24.00, fee: 792 },
    '37256': { workRVU: 11.50, totalRVU: 27.00, fee: 891 },
    '37257': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '37258': { workRVU: 10.50, totalRVU: 25.00, fee: 825 },
    '37259': { workRVU: 12.00, totalRVU: 29.00, fee: 957 },
    '37260': { workRVU: 13.50, totalRVU: 32.00, fee: 1056 },
    '37261': { workRVU: 15.00, totalRVU: 36.00, fee: 1188 },
    '37262': { workRVU: 3.00, totalRVU: 7.00, fee: 231 },
    
    // Peripheral Intervention - Femoral/Popliteal
    '37263': { workRVU: 9.00, totalRVU: 21.00, fee: 693 },
    '37264': { workRVU: 10.50, totalRVU: 25.00, fee: 825 },
    '37265': { workRVU: 12.00, totalRVU: 28.00, fee: 924 },
    '37266': { workRVU: 13.50, totalRVU: 32.00, fee: 1056 },
    '37267': { workRVU: 11.00, totalRVU: 26.00, fee: 858 },
    '37268': { workRVU: 12.50, totalRVU: 30.00, fee: 990 },
    '37269': { workRVU: 14.00, totalRVU: 33.00, fee: 1089 },
    '37270': { workRVU: 15.50, totalRVU: 37.00, fee: 1221 },
    '37271': { workRVU: 4.00, totalRVU: 9.50, fee: 314 },
    '37272': { workRVU: 4.50, totalRVU: 10.50, fee: 347 },
    '37273': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37274': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37275': { workRVU: 4.50, totalRVU: 10.50, fee: 347 },
    '37276': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37277': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37278': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '37279': { workRVU: 3.00, totalRVU: 7.00, fee: 231 },
    
    // Peripheral Intervention - Tibial/Peroneal
    '37280': { workRVU: 10.00, totalRVU: 23.00, fee: 759 },
    '37281': { workRVU: 11.50, totalRVU: 27.00, fee: 891 },
    '37282': { workRVU: 13.00, totalRVU: 30.00, fee: 990 },
    '37283': { workRVU: 14.50, totalRVU: 34.00, fee: 1122 },
    '37284': { workRVU: 12.00, totalRVU: 28.00, fee: 924 },
    '37285': { workRVU: 13.50, totalRVU: 32.00, fee: 1056 },
    '37286': { workRVU: 15.00, totalRVU: 35.00, fee: 1155 },
    '37287': { workRVU: 16.50, totalRVU: 39.00, fee: 1287 },
    '37288': { workRVU: 4.50, totalRVU: 10.50, fee: 347 },
    '37289': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37290': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37291': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '37292': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37293': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },
    '37294': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '37295': { workRVU: 6.50, totalRVU: 15.00, fee: 495 },
    
    // Peripheral Intervention - Inframalleolar (NEW 2026)
    '37296': { workRVU: 11.00, totalRVU: 26.00, fee: 858 },
    '37297': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '37298': { workRVU: 5.00, totalRVU: 12.00, fee: 396 },
    '37299': { workRVU: 5.50, totalRVU: 13.00, fee: 429 },

    // Venography
    '36010': { workRVU: 1.20, totalRVU: 3.20, fee: 115 },
    '36011': { workRVU: 1.80, totalRVU: 4.50, fee: 162 },
    '36012': { workRVU: 2.20, totalRVU: 5.50, fee: 198 },
    '75820': { workRVU: 0.70, totalRVU: 1.80, fee: 65 },
    '75822': { workRVU: 0.90, totalRVU: 2.30, fee: 83 },
    '75825': { workRVU: 0.80, totalRVU: 2.00, fee: 72 },
    '75827': { workRVU: 0.80, totalRVU: 2.00, fee: 72 },

    // IVC Filter Procedures
    '37191': { workRVU: 4.00, totalRVU: 10.00, fee: 360 },
    '37192': { workRVU: 5.00, totalRVU: 12.50, fee: 450 },
    '37193': { workRVU: 6.50, totalRVU: 16.00, fee: 576 },

    // Venous Stenting/Angioplasty
    '37238': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '37239': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },
    '37248': { workRVU: 6.50, totalRVU: 15.50, fee: 559 },
    '37249': { workRVU: 3.25, totalRVU: 7.75, fee: 279 },

    // Venous Thrombectomy
    '37187': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },
    '37188': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },

    // Thrombolysis
    '37211': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '37212': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '37213': { workRVU: 3.00, totalRVU: 7.00, fee: 252 },
    '37214': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },

    // Arterial Thrombectomy
    '37184': { workRVU: 11.00, totalRVU: 26.00, fee: 937 },
    '37185': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '37186': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },

    // Retrieval
    '37197': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },

    // Adjunctive Procedures
    '75630': { workRVU: 1.20, totalRVU: 3.00, fee: 99 },
    '75726': { workRVU: 0.80, totalRVU: 2.00, fee: 66 },
    '93505': { workRVU: 3.00, totalRVU: 7.50, fee: 248 },
    '93462': { workRVU: 4.00, totalRVU: 9.50, fee: 314 },
    '93463': { workRVU: 2.50, totalRVU: 6.00, fee: 198 },
    '93464': { workRVU: 3.50, totalRVU: 8.50, fee: 281 },
    '93566': { workRVU: 1.00, totalRVU: 2.50, fee: 83 },
    '93567': { workRVU: 0.80, totalRVU: 2.00, fee: 66 },
    '93568': { workRVU: 1.20, totalRVU: 3.00, fee: 99 },
    
    // MCS (Mechanical Circulatory Support)
    '33990': { workRVU: 9.00, totalRVU: 21.00, fee: 693 },
    '33991': { workRVU: 11.00, totalRVU: 26.00, fee: 858 },
    '33989': { workRVU: 6.00, totalRVU: 14.00, fee: 462 },
    '33992': { workRVU: 7.50, totalRVU: 18.00, fee: 594 },
    '33993': { workRVU: 9.00, totalRVU: 21.00, fee: 756 },
    '33995': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '33997': { workRVU: 15.00, totalRVU: 36.00, fee: 1188 },

    // ECMO
    '33946': { workRVU: 12.00, totalRVU: 28.00, fee: 1009 },
    '33947': { workRVU: 14.00, totalRVU: 33.00, fee: 1189 },
    '33948': { workRVU: 13.00, totalRVU: 30.00, fee: 1081 },
    '33949': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '33951': { workRVU: 8.50, totalRVU: 20.00, fee: 721 },
    '33952': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },

    // Pericardiocentesis
    '33016': { workRVU: 4.50, totalRVU: 10.50, fee: 378 },
    '33017': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },

    // Temporary Pacing
    '33210': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },
    '33211': { workRVU: 4.50, totalRVU: 11.00, fee: 396 },

    // Vascular Access
    '36000': { workRVU: 0.50, totalRVU: 1.20, fee: 43 },
    '36140': { workRVU: 0.80, totalRVU: 2.00, fee: 72 },

    // Miscellaneous
    '92950': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },
    '92998': { workRVU: 6.00, totalRVU: 14.00, fee: 504 },
    '93503': { workRVU: 2.00, totalRVU: 5.00, fee: 180 },

    // Carotid/Cerebrovascular Catheter Placement
    '36221': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },
    '36222': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },
    '36223': { workRVU: 6.00, totalRVU: 14.50, fee: 522 },
    '36224': { workRVU: 7.00, totalRVU: 17.00, fee: 612 },
    '36225': { workRVU: 5.50, totalRVU: 13.00, fee: 468 },
    '36226': { workRVU: 6.50, totalRVU: 15.50, fee: 559 },
    '36227': { workRVU: 2.50, totalRVU: 6.00, fee: 216 },
    '36228': { workRVU: 3.00, totalRVU: 7.00, fee: 252 },

    // Carotid Angiography S&I
    '75676': { workRVU: 1.07, totalRVU: 2.80, fee: 101 },
    '75680': { workRVU: 1.30, totalRVU: 3.40, fee: 122 },

    // Carotid Stenting
    '37215': { workRVU: 18.00, totalRVU: 42.00, fee: 1512 },
    '37216': { workRVU: 16.00, totalRVU: 38.00, fee: 1369 },
    '37217': { workRVU: 20.00, totalRVU: 47.00, fee: 1693 },
    '37218': { workRVU: 19.00, totalRVU: 45.00, fee: 1621 },

    // Thoracic Aortography
    '75600': { workRVU: 1.00, totalRVU: 2.50, fee: 90 },
    '75605': { workRVU: 1.20, totalRVU: 3.00, fee: 108 },

    // EVAR
    '34701': { workRVU: 25.00, totalRVU: 58.00, fee: 2089 },
    '34702': { workRVU: 28.00, totalRVU: 65.00, fee: 2341 },
    '34703': { workRVU: 30.00, totalRVU: 70.00, fee: 2522 },
    '34704': { workRVU: 22.00, totalRVU: 51.00, fee: 1837 },
    '34705': { workRVU: 32.00, totalRVU: 75.00, fee: 2702 },
    '34706': { workRVU: 12.00, totalRVU: 28.00, fee: 1009 },
    '34707': { workRVU: 4.00, totalRVU: 9.50, fee: 342 },
    '34708': { workRVU: 6.00, totalRVU: 14.00, fee: 504 },
    '34709': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '34710': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },
    '34711': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },
    '34712': { workRVU: 3.50, totalRVU: 8.50, fee: 306 },
    '34713': { workRVU: 3.03, totalRVU: 7.12, fee: 256 },
    '34714': { workRVU: 6.19, totalRVU: 14.78, fee: 532 },
    '34717': { workRVU: 40.77, totalRVU: 92.50, fee: 3330 },
    '34718': { workRVU: 20.00, totalRVU: 46.00, fee: 1656 },
    '34808': { workRVU: 3.57, totalRVU: 8.50, fee: 306 },
    '34812': { workRVU: 4.41, totalRVU: 10.50, fee: 378 },
    '34820': { workRVU: 7.82, totalRVU: 18.50, fee: 666 },
    '34833': { workRVU: 10.24, totalRVU: 24.50, fee: 882 },
    '34834': { workRVU: 3.83, totalRVU: 9.00, fee: 324 },
    '0254T': { workRVU: 28.00, totalRVU: 65.00, fee: 2340 },
    '0255T': { workRVU: 10.00, totalRVU: 24.00, fee: 864 },

    // Vascular Embolization
    '37241': { workRVU: 4.62, totalRVU: 10.75, fee: 387 },
    '37242': { workRVU: 5.25, totalRVU: 12.50, fee: 450 },

    // TEVAR
    '33880': { workRVU: 35.00, totalRVU: 82.00, fee: 2954 },
    '33881': { workRVU: 33.00, totalRVU: 77.00, fee: 2774 },
    '33883': { workRVU: 10.00, totalRVU: 24.00, fee: 865 },
    '33884': { workRVU: 5.00, totalRVU: 12.00, fee: 432 },
    '33886': { workRVU: 8.00, totalRVU: 19.00, fee: 685 },
    '33889': { workRVU: 15.00, totalRVU: 35.00, fee: 1261 },
    '33891': { workRVU: 18.00, totalRVU: 42.00, fee: 1512 },

    // Renal/Visceral Intervention
    '37220': { workRVU: 6.37, totalRVU: 15.25, fee: 549 },
    '37221': { workRVU: 7.44, totalRVU: 17.50, fee: 630 },

    // Renal Denervation
    '0338T': { workRVU: 8.00, totalRVU: 19.00, fee: 684 },
    '0339T': { workRVU: 10.00, totalRVU: 24.00, fee: 864 },

    // Subclavian/Innominate Interventions
    '37226': { workRVU: 9.00, totalRVU: 21.00, fee: 756 },
    '37227': { workRVU: 11.00, totalRVU: 26.00, fee: 937 },
    '37236': { workRVU: 8.50, totalRVU: 20.00, fee: 720 },
    '37237': { workRVU: 4.25, totalRVU: 10.00, fee: 360 },
    '37246': { workRVU: 6.00, totalRVU: 14.00, fee: 504 },
    '37247': { workRVU: 3.00, totalRVU: 7.00, fee: 252 },

    // Echocardiography - TTE
    '93306': { workRVU: 1.30, totalRVU: 3.22, fee: 116 },
    '93307': { workRVU: 0.92, totalRVU: 2.28, fee: 82 },
    '93308': { workRVU: 0.53, totalRVU: 1.31, fee: 47 },

    // Echocardiography - Doppler Add-ons
    '93320': { workRVU: 0.38, totalRVU: 0.94, fee: 34 },
    '93321': { workRVU: 0.21, totalRVU: 0.52, fee: 19 },
    '93325': { workRVU: 0.17, totalRVU: 0.42, fee: 15 },

    // Echocardiography - TEE
    '93312': { workRVU: 2.13, totalRVU: 5.28, fee: 190 },
    '93313': { workRVU: 0.96, totalRVU: 2.38, fee: 86 },
    '93314': { workRVU: 1.17, totalRVU: 2.90, fee: 104 },
    '93315': { workRVU: 2.50, totalRVU: 6.20, fee: 223 },
    '93316': { workRVU: 1.10, totalRVU: 2.73, fee: 98 },
    '93317': { workRVU: 1.40, totalRVU: 3.47, fee: 125 },
    '93318': { workRVU: 2.75, totalRVU: 6.82, fee: 246 },

    // Echocardiography - Stress Echo
    '93350': { workRVU: 1.10, totalRVU: 2.73, fee: 98 },
    '93351': { workRVU: 1.50, totalRVU: 3.72, fee: 134 },

    // Echocardiography - Congenital
    '93303': { workRVU: 1.75, totalRVU: 4.34, fee: 156 },
    '93304': { workRVU: 0.85, totalRVU: 2.11, fee: 76 },

    // Echocardiography - Contrast & Strain (Add-ons)
    '93352': { workRVU: 0.15, totalRVU: 0.37, fee: 13 },
    '93356': { workRVU: 0.25, totalRVU: 0.62, fee: 22 },

    // Echocardiography - 3D Echo
    '93355': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },
    '76376': { workRVU: 0.20, totalRVU: 0.50, fee: 18 },
    '76377': { workRVU: 0.50, totalRVU: 1.24, fee: 45 },

    // Echocardiography - Intracardiac Echo
    '93662': { workRVU: 2.00, totalRVU: 4.96, fee: 179 },

    // Electrophysiology - EP Studies (Diagnostic)
    '93600': { workRVU: 3.75, totalRVU: 9.30, fee: 335 },
    '93602': { workRVU: 3.24, totalRVU: 8.03, fee: 289 },
    '93603': { workRVU: 3.24, totalRVU: 8.03, fee: 289 },
    '93609': { workRVU: 3.84, totalRVU: 9.52, fee: 343 },
    '93610': { workRVU: 3.35, totalRVU: 8.31, fee: 299 },
    '93612': { workRVU: 3.24, totalRVU: 8.03, fee: 289 },
    '93613': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },
    '93618': { workRVU: 4.11, totalRVU: 10.19, fee: 367 },
    '93619': { workRVU: 10.23, totalRVU: 25.37, fee: 914 },
    '93620': { workRVU: 3.82, totalRVU: 9.47, fee: 341 },
    '93621': { workRVU: 2.14, totalRVU: 5.31, fee: 191 },
    '93622': { workRVU: 2.50, totalRVU: 6.20, fee: 223 },
    '93623': { workRVU: 1.76, totalRVU: 4.36, fee: 157 },
    '93624': { workRVU: 6.86, totalRVU: 17.01, fee: 613 },
    '93631': { workRVU: 9.88, totalRVU: 24.50, fee: 883 },
    '93640': { workRVU: 4.55, totalRVU: 11.28, fee: 406 },
    '93641': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '93642': { workRVU: 2.79, totalRVU: 6.92, fee: 249 },

    // Electrophysiology - Ablation
    '93650': { workRVU: 9.28, totalRVU: 23.01, fee: 829 },
    '93653': { workRVU: 18.79, totalRVU: 46.60, fee: 1680 },
    '93654': { workRVU: 27.32, totalRVU: 67.75, fee: 2442 },
    '93655': { workRVU: 6.50, totalRVU: 16.12, fee: 581 },
    '93656': { workRVU: 24.25, totalRVU: 60.14, fee: 2167 },
    '93657': { workRVU: 5.00, totalRVU: 12.40, fee: 447 },

    // Electrophysiology - Pacemaker Implant
    '33206': { workRVU: 7.91, totalRVU: 19.62, fee: 707 },
    '33207': { workRVU: 7.59, totalRVU: 18.82, fee: 678 },
    '33208': { workRVU: 9.69, totalRVU: 24.03, fee: 866 },
    '33212': { workRVU: 4.83, totalRVU: 11.98, fee: 432 },
    '33213': { workRVU: 5.14, totalRVU: 12.75, fee: 460 },
    '33227': { workRVU: 5.11, totalRVU: 12.67, fee: 457 },
    '33228': { workRVU: 5.36, totalRVU: 13.29, fee: 479 },
    '33229': { workRVU: 5.64, totalRVU: 13.99, fee: 504 },

    // Electrophysiology - ICD Implant
    '33249': { workRVU: 13.81, totalRVU: 34.25, fee: 1234 },
    '33230': { workRVU: 6.60, totalRVU: 16.37, fee: 590 },
    '33231': { workRVU: 6.28, totalRVU: 15.57, fee: 561 },
    '33240': { workRVU: 7.00, totalRVU: 17.36, fee: 626 },
    '33262': { workRVU: 6.81, totalRVU: 16.89, fee: 609 },
    '33263': { workRVU: 7.07, totalRVU: 17.53, fee: 632 },
    '33264': { workRVU: 7.35, totalRVU: 18.23, fee: 657 },

    // Electrophysiology - CRT (BiV) Implant
    '33224': { workRVU: 8.50, totalRVU: 21.08, fee: 760 },
    '33225': { workRVU: 5.00, totalRVU: 12.40, fee: 447 },
    '33226': { workRVU: 5.75, totalRVU: 14.26, fee: 514 },

    // Electrophysiology - Leadless Pacemaker (33274 already in Structural)
    '33275': { workRVU: 10.50, totalRVU: 26.03, fee: 938 },

    // Electrophysiology - Subcutaneous ICD
    '33270': { workRVU: 12.38, totalRVU: 30.70, fee: 1106 },
    '33271': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '33272': { workRVU: 6.00, totalRVU: 14.88, fee: 536 },
    '33273': { workRVU: 5.25, totalRVU: 13.02, fee: 469 },

    // Electrophysiology - Device Revision/Upgrade
    '33214': { workRVU: 7.75, totalRVU: 19.22, fee: 693 },
    '33215': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },
    '33216': { workRVU: 4.85, totalRVU: 12.03, fee: 433 },
    '33217': { workRVU: 6.50, totalRVU: 16.12, fee: 581 },
    '33218': { workRVU: 4.25, totalRVU: 10.54, fee: 380 },
    '33220': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '33221': { workRVU: 5.50, totalRVU: 13.64, fee: 491 },
    '33222': { workRVU: 4.00, totalRVU: 9.92, fee: 357 },
    '33223': { workRVU: 4.50, totalRVU: 11.16, fee: 402 },

    // Electrophysiology - Lead Extraction
    '33234': { workRVU: 8.50, totalRVU: 21.08, fee: 760 },
    '33235': { workRVU: 10.50, totalRVU: 26.03, fee: 938 },
    '33241': { workRVU: 22.00, totalRVU: 54.56, fee: 1966 },
    '33244': { workRVU: 12.00, totalRVU: 29.76, fee: 1072 },

    // Electrophysiology - Loop Recorder
    '33285': { workRVU: 2.25, totalRVU: 5.58, fee: 201 },
    '33286': { workRVU: 1.50, totalRVU: 3.72, fee: 134 },

    // Electrophysiology - External Cardioversion
    '92960': { workRVU: 2.72, totalRVU: 6.75, fee: 243 },
    '92961': { workRVU: 5.25, totalRVU: 13.02, fee: 469 },

    // Electrophysiology - Tilt Table / Autonomic Testing
    '95921': { workRVU: 1.25, totalRVU: 3.10, fee: 112 },
    '95922': { workRVU: 1.50, totalRVU: 3.72, fee: 134 },
    '95924': { workRVU: 2.75, totalRVU: 6.82, fee: 246 }
  };

  // Top 25 cardiac procedure indications with ICD-10 codes (most to least common)
  const cardiacIndications = [
    { code: 'I21.09', description: 'STEMI (ST-Elevation Myocardial Infarction)' },
    { code: 'I21.4', description: 'NSTEMI (Non-ST-Elevation Myocardial Infarction)' },
    { code: 'I25.110', description: 'Unstable Angina' },
    { code: 'I25.10', description: 'Coronary Artery Disease without Angina' },
    { code: 'I25.119', description: 'Stable Angina' },
    { code: 'I50.9', description: 'Heart Failure, Unspecified' },
    { code: 'I50.23', description: 'Acute on Chronic Systolic Heart Failure' },
    { code: 'R94.31', description: 'Abnormal Stress Test' },
    { code: 'I25.700', description: 'Atherosclerosis of Coronary Artery Bypass Graft' },
    { code: 'I48.91', description: 'Atrial Fibrillation' },
    { code: 'I34.0', description: 'Mitral Valve Stenosis' },
    { code: 'I34.1', description: 'Mitral Valve Prolapse' },
    { code: 'I35.0', description: 'Aortic Valve Stenosis' },
    { code: 'I35.1', description: 'Aortic Valve Insufficiency' },
    { code: 'I42.0', description: 'Dilated Cardiomyopathy' },
    { code: 'I42.1', description: 'Hypertrophic Cardiomyopathy' },
    { code: 'I47.2', description: 'Ventricular Tachycardia' },
    { code: 'R07.9', description: 'Chest Pain, Unspecified' },
    { code: 'I63.9', description: 'Cerebral Infarction (Stroke Workup)' },
    { code: 'I11.0', description: 'Hypertensive Heart Disease with Heart Failure' },
    { code: 'Z95.1', description: 'Status Post CABG' },
    { code: 'Z95.5', description: 'Status Post Coronary Angioplasty' },
    { code: 'I50.43', description: 'Acute on Chronic Combined Systolic and Diastolic Heart Failure' },
    { code: 'I25.5', description: 'Ischemic Cardiomyopathy' },
    { code: 'I25.2', description: 'Old Myocardial Infarction' }
  ];

  // Top peripheral vascular indications
  const peripheralIndications = [
    { code: 'I70.219', description: 'Atherosclerosis with Intermittent Claudication' },
    
    { code: 'I70.269', description: 'Critical Limb Ischemia with Rest Pain' },
    { code: 'I73.9', description: 'Peripheral Vascular Disease, Unspecified' },
    { code: 'I70.213', description: 'Atherosclerosis with Claudication, Bilateral Legs' },
    { code: 'I70.261', description: 'Atherosclerosis with Gangrene, Right Leg' },
    { code: 'I70.262', description: 'Atherosclerosis with Gangrene, Left Leg' },
    { code: 'I70.263', description: 'Atherosclerosis with Gangrene, Bilateral Legs' },
    { code: 'I70.25', description: 'Atherosclerosis with Ulceration' },
    { code: 'I70.0', description: 'Atherosclerosis of Aorta' },
    { code: 'I74.3', description: 'Arterial Embolism of Lower Extremity' },
    { code: 'I74.5', description: 'Arterial Embolism of Iliac Artery' },
    { code: 'I70.1', description: 'Atherosclerosis of Renal Artery' },
    { code: 'I77.1', description: 'Arterial Stenosis' },
    { code: 'I65.2', description: 'Carotid Artery Stenosis' },
    { code: 'E11.51', description: 'Type 2 Diabetes with Diabetic Peripheral Angiopathy' },
    { code: 'I96', description: 'Gangrene, Not Elsewhere Classified' },
    { code: 'I70.92', description: 'Chronic Total Occlusion of Artery of Extremity' },
    { code: 'Z95.820', description: 'Status Post Peripheral Vascular Angioplasty' }
  ];

  // Top structural heart indications
  const structuralIndications = [
    { code: 'I35.0', description: 'Severe Aortic Stenosis (for TAVR)' },
    { code: 'I34.0', description: 'Nonrheumatic Mitral Stenosis' },
    { code: 'I34.1', description: 'Nonrheumatic Mitral Valve Prolapse' },
    { code: 'I35.1', description: 'Nonrheumatic Aortic Insufficiency' },
    { code: 'I35.2', description: 'Aortic Stenosis with Insufficiency' },
    { code: 'I34.2', description: 'Nonrheumatic Mitral Insufficiency' },
    { code: 'Q21.1', description: 'Atrial Septal Defect (ASD)' },
    { code: 'Q21.0', description: 'Ventricular Septal Defect (VSD)' },
    { code: 'Q21.8', description: 'Patent Foramen Ovale (PFO)' },
    { code: 'I37.0', description: 'Pulmonary Valve Stenosis' },
    { code: 'I36.0', description: 'Nonrheumatic Tricuspid Stenosis' },
    { code: 'I36.1', description: 'Nonrheumatic Tricuspid Insufficiency' },
    { code: 'I38', description: 'Endocarditis, Valve Unspecified' },
    { code: 'I50.9', description: 'Heart Failure (for structural intervention)' },
    { code: 'I48.91', description: 'Atrial Fibrillation (for LAA closure)' },
    { code: 'Q22.0', description: 'Pulmonary Valve Atresia' },
    { code: 'Q22.1', description: 'Congenital Pulmonary Valve Stenosis' },
    { code: 'T82.0', description: 'Mechanical Complication of Heart Valve Prosthesis' },
    { code: 'I34.8', description: 'Other Nonrheumatic Mitral Valve Disorders' },
    { code: 'I42.2', description: 'Other Hypertrophic Cardiomyopathy (for septal reduction)' }
  ];

  const analyzeBundlingRules = () => {
    const billable = [];
    const bundled = [];
    const warnings = [];
    
    const codes = selectedCodes.map(c => c.code);
    
    // Check for diagnostic cath with PCI on same day
    const diagnosticCathCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
    const pciCodes = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'];
    
    const hasDiagnosticCath = codes.some(c => diagnosticCathCodes.includes(c));
    const hasPCI = codes.some(c => pciCodes.includes(c));
    
    if (hasDiagnosticCath && hasPCI) {
      warnings.push({
        type: 'Diagnostic Cath + PCI (Modifier -59 Applicable)',
        message: 'Diagnostic catheterization with PCI on the same day CAN be billed separately using modifier -59 when medical necessity criteria are met.',
        criteria: [
          '✓ Use modifier -59 on the diagnostic cath code when billing separately',
          'Criteria for separate billing with modifier -59:',
          '• No prior diagnostic cath within reasonable period (usually 30 days)',
          '• Diagnostic cath was medically necessary (not solely for PCI guidance)',
          '• Decision to perform PCI occurred AFTER reviewing new diagnostic findings',
          '• Documentation must clearly support medical necessity for both procedures'
        ]
      });
    }
    
    // Check for IVUS/FFR with PCI
    const imagingCodes = ['92978', '92979', '93571', '93572', '0523T', '0524T'];
    const hasImaging = codes.some(c => imagingCodes.includes(c));
    
    if (hasImaging && hasPCI) {
      const imagingInList = codes.filter(c => imagingCodes.includes(c));
      imagingInList.forEach(code => {
        billable.push({
          code: code,
          reason: 'Add-on code - separately billable when performed with PCI'
        });
      });
    }
    
    // Check for mechanical thrombectomy
    if (codes.includes('92973') && hasPCI) {
      billable.push({
        code: '92973',
        reason: 'Add-on code for mechanical thrombectomy - separately billable with PCI when documented'
      });
    }
    
    // Check for IVL
    if (codes.includes('92972') && hasPCI) {
      billable.push({
        code: '92972',
        reason: 'Add-on code for coronary intravascular lithotripsy - separately billable with PCI'
      });
    }

    // Check for Drug-Coated Balloon codes
    if (codes.includes('0913T')) {
      billable.push({
        code: '0913T',
        reason: 'Drug-coated balloon as standalone procedure - includes IVUS/OCT when performed'
      });
      
      // Check if user also selected IVUS/OCT - these should be bundled
      const imagingWithDCB = codes.filter(c => ['92978', '92979', '0523T', '0524T'].includes(c));
      if (imagingWithDCB.length > 0) {
        imagingWithDCB.forEach(code => {
          bundled.push({
            code: code,
            reason: 'BUNDLED with drug-coated balloon (0913T) - imaging is included in DCB code'
          });
        });
      }
      
      warnings.push({
        type: 'Drug-Coated Balloon (0913T)',
        message: 'This code is COMPREHENSIVE and includes:',
        criteria: [
          'Drug delivery by intracoronary balloon (drug-coated or drug-eluting)',
          'Mechanical dilation by non-drug delivery balloon angioplasty',
          'Endoluminal imaging (IVUS or OCT) when performed',
          'Imaging supervision, interpretation, and report',
          'Do NOT separately bill IVUS (92978/92979) or OCT (0523T/0524T) when included in DCB procedure'
        ]
      });
    }
    
    if (codes.includes('0914T')) {
      const basePCICodes = ['92920', '92924', '92928', '92930', '92933'];
      const hasBasePCI = codes.some(c => basePCICodes.includes(c));
      
      if (hasBasePCI) {
        billable.push({
          code: '0914T',
          reason: 'Add-on drug-coated balloon for separate target lesion - use with base PCI code'
        });
      }
      
      warnings.push({
        type: 'Drug-Coated Balloon Add-on (0914T)',
        message: 'This add-on code requires:',
        criteria: [
          'Must be performed on SEPARATE target lesion from base PCI procedure',
          'Base procedure must be balloon angioplasty (92920), stent (92928/92930), or atherectomy (92924/92933)',
          'Includes IVUS/OCT when performed on the DCB lesion',
          'List separately in addition to primary PCI code'
        ]
      });
    }

    // Check for Brachytherapy
    if (codes.includes('92974') && hasPCI) {
      billable.push({
        code: '92974',
        reason: 'Add-on code for brachytherapy radiation delivery device placement'
      });
    }
    
    // Peripheral vascular bundling - new 2026 codes include all imaging
    const peripheralCodes = codes.filter(c => c.startsWith('372') && parseInt(c) >= 37254 && parseInt(c) <= 37299);
    if (peripheralCodes.length > 0) {
      warnings.push({
        type: 'Peripheral Vascular 2026 Bundling',
        message: 'New 2026 peripheral codes (37254-37299) are COMPREHENSIVE and bundle:',
        criteria: [
          'All catheter placements and repositioning',
          'All contrast injections',
          'All roadmapping and completion angiography',
          'Imaging supervision and interpretation',
          'Closure of arteriotomy by pressure or closure device',
          'Diagnostic angiography only separately billable if specific criteria met (see below)'
        ]
      });
      
      warnings.push({
        type: 'Diagnostic Angiography with Peripheral Intervention',
        message: 'Diagnostic angiography may be separately billable ONLY if ALL criteria met:',
        criteria: [
          'No prior study available',
          'OR patient condition changed since prior study',
          'OR inadequate visualization on prior study',  
          'OR clinical change during procedure since prior study',
          'AND decision to treat was based on these findings',
          'Documentation must clearly support medical necessity'
        ]
      });
    }
    
    // Check for moderate sedation
    if (includeSedation) {
      billable.push({
        code: '99152',
        reason: 'Moderate sedation initial 15 minutes - separately billable'
      });
      if (sedationUnits > 0) {
        billable.push({
          code: '99153',
          reason: `Moderate sedation additional ${sedationUnits} x 15 minutes - separately billable`
        });
      }
    }
    
    // Multiple PCI in same artery
    const pciCodesSelected = codes.filter(c => pciCodes.includes(c));
    if (pciCodesSelected.length > 1) {
      warnings.push({
        type: 'Multiple PCI Codes',
        message: 'When coding multiple PCI procedures:',
        criteria: [
          'Use coronary artery modifiers (LD, LC, RC, LM, RI) to specify which artery',
          'Report one code per major coronary artery',
          'Branches are now included in base codes (no separate add-on codes in 2026)',
          'For multiple vessels, report each base code that describes the most intensive intervention',
          'NCCI edits may require modifier 59 or XS for different arteries'
        ]
      });
    }
    
    // Add all selected codes to billable if not specifically bundled
    selectedCodes.forEach(sc => {
      if (!billable.some(b => b.code === sc.code) && !bundled.some(b => b.code === sc.code)) {
        billable.push({
          code: sc.code,
          reason: 'Primary procedure code'
        });
      }
    });
    
    return { billable, bundled, warnings };
  };

  // Comprehensive validation and feedback analysis
  const generateFeedbackAnalysis = () => {
    const feedback = {
      errors: [],
      warnings: [],
      validCodes: [],
      invalidCombos: [],
      recommendations: []
    };

    // Combine all PCI codes from all sections
    const allPCICodes = [
      ...selectedCodes.filter(c => ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'].includes(c.code)),
      ...selectedCodesVessel2,
      ...selectedCodesVessel3
    ];

    // Check for vessel modifiers
    const mainPCIMissingVessels = selectedCodes.filter(c => 
      ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'].includes(c.code) && !codeVessels[c.code]
    );
    const add1MissingVessels = selectedCodesVessel2.filter(c => !codeVesselsV2[c.code]);
    const add2MissingVessels = selectedCodesVessel3.filter(c => !codeVesselsV3[c.code]);

    if (mainPCIMissingVessels.length > 0) {
      feedback.errors.push(`Primary PCI codes missing vessel: ${mainPCIMissingVessels.map(c => c.code).join(', ')}`);
    }
    if (add1MissingVessels.length > 0) {
      feedback.errors.push(`Additional Vessel #1 codes missing vessel: ${add1MissingVessels.map(c => c.code).join(', ')}`);
    }
    if (add2MissingVessels.length > 0) {
      feedback.errors.push(`Additional Vessel #2 codes missing vessel: ${add2MissingVessels.map(c => c.code).join(', ')}`);
    }

    // Check for duplicate vessels
    const allVessels = [
      ...Object.entries(codeVessels).map(([code, vessel]) => ({ code, vessel, section: 'Primary' })),
      ...Object.entries(codeVesselsV2).map(([code, vessel]) => ({ code, vessel, section: 'Additional #1' })),
      ...Object.entries(codeVesselsV3).map(([code, vessel]) => ({ code, vessel, section: 'Additional #2' }))
    ];

    const vesselGroups = {};
    allVessels.forEach(({ code, vessel, section }) => {
      if (!vesselGroups[vessel]) vesselGroups[vessel] = [];
      vesselGroups[vessel].push({ code, section });
    });

    Object.entries(vesselGroups).forEach(([vessel, codes]) => {
      if (codes.length > 1) {
        const sameVesselCodes = codes.map(c => `${c.code} (${c.section})`).join(', ');
        feedback.warnings.push(`Same vessel ${vessel} used for: ${sameVesselCodes}. Verify this is intentional (e.g., different lesions in same artery).`);
      }
    });

    // Check for invalid combinations
    const allSelectedCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3];
    const codes = allSelectedCodes.map(c => c.code);

    // Check diagnostic cath with PCI
    const diagnosticCathCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
    const hasDiagnosticCath = codes.some(c => diagnosticCathCodes.includes(c));
    const hasPCI = allPCICodes.length > 0;

    if (hasDiagnosticCath && hasPCI) {
      feedback.recommendations.push('Diagnostic Cath + PCI same session detected: Modifier -59 will be automatically added to diagnostic cath code(s) in the generated report.');
      feedback.warnings.push('Diagnostic cath with PCI same session: Ensure documentation supports medical necessity - (1) No prior cath in 30 days, (2) Diagnostic cath was medically necessary, (3) Decision for PCI made AFTER reviewing diagnostic findings.');
    }

    // Check for 0913T with IVUS/OCT
    if (codes.includes('0913T') && codes.some(c => ['92978', '92979', '0523T', '0524T'].includes(c))) {
      feedback.invalidCombos.push({
        codes: '0913T (DCB) with IVUS/OCT codes',
        issue: 'IVUS/OCT is included in 0913T',
        action: 'Remove separate IVUS/OCT codes (92978, 92979, 0523T, 0524T) - already bundled in DCB'
      });
    }

    // Check for 0914T without base PCI
    if (codes.includes('0914T')) {
      const basePCICodes = ['92920', '92924', '92928', '92930', '92933'];
      const hasBasePCI = codes.some(c => basePCICodes.includes(c));
      if (!hasBasePCI) {
        feedback.invalidCombos.push({
          codes: '0914T without base PCI code',
          issue: '0914T is an add-on code requiring base PCI procedure',
          action: 'Add base PCI code (92920, 92924, 92928, 92930, or 92933)'
        });
      }
    }

    // Check for multiple CTO codes
    const ctoCodes = codes.filter(c => ['92943', '92945'].includes(c));
    if (ctoCodes.length > 1) {
      feedback.warnings.push('Multiple CTO codes selected. Use 92943 for antegrade only, 92945 for combined antegrade/retrograde. Do not bill both.');
    }

    // Validate codes to submit
    const bundlingAnalysis = analyzeBundlingRules();
    
    // Add valid codes
    allSelectedCodes.forEach(code => {
      const isPCICode = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'].includes(code.code);
      const isDiagnosticCath = diagnosticCathCodes.includes(code.code);
      const vessel = codeVessels[code.code] || codeVesselsV2[code.code] || codeVesselsV3[code.code];
      
      if (isPCICode && vessel) {
        const modifier = vessel.match(/\(([^)]+)\)/)?.[1] || '';
        feedback.validCodes.push(`${code.code}-${modifier}`);
      } else if (isDiagnosticCath && hasPCI) {
        // Add -59 modifier to diagnostic cath when PCI is also being performed
        feedback.validCodes.push(`${code.code}-59`);
      } else if (!isPCICode) {
        feedback.validCodes.push(code.code);
      }
    });

    // Add sedation if applicable
    if (includeSedation) {
      feedback.validCodes.push('99152');
      if (sedationUnits > 0) {
        feedback.validCodes.push(`99153 x${sedationUnits}`);
      }
    }

    // Recommendations
    if (allPCICodes.length > 0 && !codes.some(c => ['92978', '92979', '0523T', '0524T', '93571', '93572'].includes(c)) && !codes.includes('0913T')) {
      feedback.recommendations.push('Consider adding intravascular imaging (IVUS/OCT) or physiology (FFR) for optimal lesion assessment');
    }

    if (allPCICodes.length >= 2) {
      feedback.recommendations.push('Multi-vessel PCI detected. Ensure each code has appropriate vessel modifier (LC, LD, RC, LM, RI)');
    }

    return feedback;
  };

  // Calculate total RVUs and reimbursement - updates dynamically as codes are added/removed
  const calculateRVUAndReimbursement = () => {
    // Combine all selected codes from all vessel sections
    const allCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3];
    let totalWorkRVU = 0;
    let totalRVU = 0;
    let totalFee = 0;
    const breakdown = [];

    allCodes.forEach(codeItem => {
      const rvuInfo = rvuData[codeItem.code];
      // Get vessel modifier if applicable
      const vessel = codeVessels[codeItem.code] || codeVesselsV2[codeItem.code] || codeVesselsV3[codeItem.code];
      const modifier = vessel ? vessel.match(/\(([^)]+)\)/)?.[1] : null;
      const displayCode = modifier ? `${codeItem.code}-${modifier}` : codeItem.code;
      
      if (rvuInfo) {
        totalWorkRVU += rvuInfo.workRVU;
        totalRVU += rvuInfo.totalRVU;
        totalFee += rvuInfo.fee;
        breakdown.push({
          code: displayCode,
          description: codeItem.summary || '',
          workRVU: rvuInfo.workRVU,
          totalRVU: rvuInfo.totalRVU,
          fee: rvuInfo.fee
        });
      } else {
        // Handle codes without RVU data - show as pending/unknown
        breakdown.push({
          code: displayCode,
          description: codeItem.summary || '',
          workRVU: 0,
          totalRVU: 0,
          fee: 0,
          noData: true
        });
      }
    });

    // Add sedation if included
    if (includeSedation) {
      const sedRVU = rvuData['99152'];
      if (sedRVU) {
        totalWorkRVU += sedRVU.workRVU;
        totalRVU += sedRVU.totalRVU;
        totalFee += sedRVU.fee;
        breakdown.push({
          code: '99152',
          description: 'Moderate sedation, initial 15 min',
          workRVU: sedRVU.workRVU,
          totalRVU: sedRVU.totalRVU,
          fee: sedRVU.fee
        });
      }

      if (sedationUnits > 0) {
        const addSedRVU = rvuData['99153'];
        if (addSedRVU) {
          totalWorkRVU += addSedRVU.workRVU * sedationUnits;
          totalRVU += addSedRVU.totalRVU * sedationUnits;
          totalFee += addSedRVU.fee * sedationUnits;
          breakdown.push({
            code: `99153 x${sedationUnits}`,
            description: `Moderate sedation, additional ${sedationUnits * 15} min`,
            workRVU: addSedRVU.workRVU * sedationUnits,
            totalRVU: addSedRVU.totalRVU * sedationUnits,
            fee: addSedRVU.fee * sedationUnits
          });
        }
      }
    }

    return {
      totalWorkRVU: totalWorkRVU.toFixed(2),
      totalRVU: totalRVU.toFixed(2),
      totalFee: totalFee.toFixed(2),
      breakdown,
      codeCount: allCodes.length + (includeSedation ? 1 : 0) + (includeSedation && sedationUnits > 0 ? 1 : 0)
    };
  };

  const toggleDescription = (codeKey) => {
    setExpandedDescriptions(prev => ({ ...prev, [codeKey]: !prev[codeKey] }));
  };

  const togglePCIVessel = (vesselKey) => {
    setExpandedPCIVessels(prev => ({ ...prev, [vesselKey]: !prev[vesselKey] }));
  };

  const setImagingVesselForCode = (code, vessel) => {
    setImagingVessels(prev => ({ ...prev, [code]: vessel }));
  };

  const setDcbVesselForCode = (code, vessel) => {
    setDcbVessels(prev => ({ ...prev, [code]: vessel }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleCode = (code, description, summary) => {
    setSelectedCodes(prev => {
      const exists = prev.find(c => c.code === code);
      if (exists) {
        // Remove code and its vessel mapping
        setCodeVessels(prevVessels => {
          const newVessels = { ...prevVessels };
          delete newVessels[code];
          return newVessels;
        });
        return prev.filter(c => c.code !== code);
      } else {
        return [...prev, { code, description, summary: summary || '' }];
      }
    });
  };

  const setVesselForCode = (code, vessel) => {
    setCodeVessels(prev => ({
      ...prev,
      [code]: vessel
    }));
  };

  // Helper functions for Vessel 2
  const toggleCodeV2 = (code, description, summary) => {
    setSelectedCodesVessel2(prev => {
      const exists = prev.find(c => c.code === code);
      if (exists) {
        setCodeVesselsV2(prevVessels => {
          const newVessels = { ...prevVessels };
          delete newVessels[code];
          return newVessels;
        });
        return prev.filter(c => c.code !== code);
      } else {
        return [...prev, { code, description, summary: summary || '' }];
      }
    });
  };

  const setVesselForCodeV2 = (code, vessel) => {
    setCodeVesselsV2(prev => ({
      ...prev,
      [code]: vessel
    }));
  };

  // Helper functions for Vessel 3
  const toggleCodeV3 = (code, description, summary) => {
    setSelectedCodesVessel3(prev => {
      const exists = prev.find(c => c.code === code);
      if (exists) {
        setCodeVesselsV3(prevVessels => {
          const newVessels = { ...prevVessels };
          delete newVessels[code];
          return newVessels;
        });
        return prev.filter(c => c.code !== code);
      } else {
        return [...prev, { code, description, summary: summary || '' }];
      }
    });
  };

  const setVesselForCodeV3 = (code, vessel) => {
    setCodeVesselsV3(prev => ({
      ...prev,
      [code]: vessel
    }));
  };

  const isCodeSelected = (code) => {
    return selectedCodes.some(c => c.code === code);
  };

  // Comprehensive coding analysis function
  const analyzeCoding = () => {
    const errors = [];
    const warnings = [];
    const billable = [];
    const bundled = [];
    
    // Combine all PCI codes from all vessels
    const allPCICodes = [
      ...selectedCodes.filter(c => ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)),
      ...selectedCodesVessel2.filter(c => ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)),
      ...selectedCodesVessel3.filter(c => ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code))
    ];
    
    // Get all vessels used
    const vessel1Data = Object.entries(codeVessels).map(([code, vessel]) => ({ code, vessel, section: 1 }));
    const vessel2Data = Object.entries(codeVesselsV2).map(([code, vessel]) => ({ code, vessel, section: 2 }));
    const vessel3Data = Object.entries(codeVesselsV3).map(([code, vessel]) => ({ code, vessel, section: 3 }));
    const allVesselData = [...vessel1Data, ...vessel2Data, ...vessel3Data];
    
    // Check for duplicate vessels in different sections
    const vesselCounts = {};
    allVesselData.forEach(v => {
      vesselCounts[v.vessel] = (vesselCounts[v.vessel] || 0) + 1;
    });
    
    Object.entries(vesselCounts).forEach(([vessel, count]) => {
      if (count > 1) {
        warnings.push({
          type: 'warning',
          message: `Multiple procedures coded for ${vessel}. Ensure these represent separate lesions in different segments, or consider using complex stenting code (92930) if appropriate.`
        });
      }
    });
    
    // Check for diagnostic cath with PCI
    const diagnosticCodes = selectedCodes.filter(c => 
      ['93454','93455','93456','93457','93458','93459','93460','93461'].includes(c.code)
    );
    
    if (diagnosticCodes.length > 0 && allPCICodes.length > 0) {
      warnings.push({
        type: 'info',
        message: 'Diagnostic cath + PCI same day: Use modifier -59 on diagnostic cath code when billing separately. Ensure documentation supports: (1) no prior cath within 30 days, (2) diagnostic cath medically necessary, (3) PCI decision made after reviewing new diagnostic findings.'
      });
    }
    
    // Check for missing vessel selections
    const pciCodesV1 = selectedCodes.filter(c => 
      ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)
    );
    const missingVessels1 = pciCodesV1.filter(c => !codeVessels[c.code]);
    
    const pciCodesV2 = selectedCodesVessel2.filter(c => 
      ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)
    );
    const missingVessels2 = pciCodesV2.filter(c => !codeVesselsV2[c.code]);
    
    const pciCodesV3 = selectedCodesVessel3.filter(c => 
      ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)
    );
    const missingVessels3 = pciCodesV3.filter(c => !codeVesselsV3[c.code]);
    
    if (missingVessels1.length > 0 || missingVessels2.length > 0 || missingVessels3.length > 0) {
      const allMissing = [...missingVessels1, ...missingVessels2, ...missingVessels3].map(c => c.code).join(', ');
      errors.push({
        type: 'error',
        message: `PCI codes missing vessel/modifier selection: ${allMissing}. Cannot submit without vessel modifiers for Medicare billing.`
      });
    }
    
    // Check for IVUS/OCT with Drug-Coated Balloon
    const dcbCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3].filter(c => c.code === '0913T' || c.code === '0914T');
    const imagingCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3].filter(c => ['92978','92979','0523T','0524T'].includes(c.code));
    
    if (dcbCodes.length > 0 && imagingCodes.length > 0) {
      imagingCodes.forEach(img => {
        bundled.push({
          code: img.code,
          reason: 'BUNDLED with Drug-Coated Balloon (0913T/0914T) - imaging is included in DCB code, do not bill separately'
        });
      });
      warnings.push({
        type: 'warning',
        message: 'Drug-Coated Balloon codes include IVUS/OCT imaging. These imaging codes have been marked as bundled.'
      });
    }
    
    // Check for 0914T without base PCI
    const dcbAddOn = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3].filter(c => c.code === '0914T');
    const basePCI = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3].filter(c => 
      ['92920','92924','92928','92930','92933'].includes(c.code)
    );
    
    if (dcbAddOn.length > 0 && basePCI.length === 0) {
      errors.push({
        type: 'error',
        message: '0914T (DCB add-on) requires a base PCI code (92920, 92924, 92928, 92930, or 92933) on a separate lesion.'
      });
    }
    
    // Build billable list - combine all codes from all sections
    const allCodes = [
      ...selectedCodes.map(c => ({ ...c, vessel: codeVessels[c.code], section: 1 })),
      ...selectedCodesVessel2.map(c => ({ ...c, vessel: codeVesselsV2[c.code], section: 2 })),
      ...selectedCodesVessel3.map(c => ({ ...c, vessel: codeVesselsV3[c.code], section: 3 }))
    ];
    
    allCodes.forEach(c => {
      if (!bundled.find(b => b.code === c.code)) {
        billable.push({
          code: c.code,
          description: c.description,
          vessel: c.vessel || null,
          section: c.section
        });
      }
    });
    
    // Add sedation if applicable
    if (includeSedation) {
      billable.push({
        code: '99152',
        description: 'Moderate sedation initial 15 minutes',
        vessel: null,
        section: 0
      });
      if (sedationUnits > 0) {
        billable.push({
          code: '99153',
          description: `Moderate sedation additional ${sedationUnits} units x 15 minutes`,
          vessel: null,
          section: 0
        });
      }
    }
    
    return { errors, warnings, billable, bundled };
  };

  // RVU and Reimbursement Calculator
  const calculateRVUsAndReimbursement = () => {
    const analysis = analyzeCoding();
    let totalRVUs = 0;
    let totalReimbursement = 0;
    const breakdown = [];
    
    analysis.billable.forEach(item => {
      const feeData = medicareFeeSchedule2026[item.code];
      if (feeData) {
        totalRVUs += feeData.rvus;
        totalReimbursement += feeData.payment;
        
        breakdown.push({
          code: item.code,
          description: item.description,
          vessel: item.vessel,
          section: item.section,
          rvus: feeData.rvus,
          payment: feeData.payment
        });
      }
    });
    
    return {
      totalRVUs: totalRVUs.toFixed(2),
      totalReimbursement: totalReimbursement.toFixed(2),
      breakdown
    };
  };

  const saveSettings = async () => {
    try {
      // Save cardiologist name
      await window.storage.set('cardiologistName', cardiologistName);
      
      // Save cath locations
      await window.storage.set('cathLocations', JSON.stringify(cathLocations));
      
      setShowSettings(false);
      
      // Show brief success message
      alert('Settings saved successfully!');
    } catch (error) {
      logger.error('Failed to save settings', error);
      alert('Settings saved for this session only.');
      setShowSettings(false);
    }
  };

  const addLocation = () => {
    if (newLocation.trim() && !cathLocations.includes(newLocation.trim())) {
      setCathLocations([...cathLocations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (location) => {
    setCathLocations(cathLocations.filter(loc => loc !== location));
  };

  const getIndicationList = () => {
    switch (indicationCategory) {
      case 'cardiac':
        return cardiacIndications;
      case 'peripheral':
        return peripheralIndications;
      case 'structural':
        return structuralIndications;
      default:
        return cardiacIndications;
    }
  };

  // Generate formatted email body for individual mode clipboard/email export
  const generateEmailBody = () => {
    const rvuCalc = calculateRVUAndReimbursement();
    const allCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3];
    const pciCodeList = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945', '0913T', '0914T'];
    const diagnosticCathCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
    const hasPCI = allCodes.some(c => pciCodeList.includes(c.code));

    const chargeDate = procedureDateText;

    const currentIndication = selectedCardiacIndication || selectedPeripheralIndication || selectedStructuralIndication || '';

    let body = '';
    body += '========================================\n';
    body += '  CONFIDENTIAL - BILLING INFORMATION\n';
    body += '========================================\n\n';
    body += `Physician: ${cardiologistName || 'Not specified'}\n`;
    body += `Case ID / Patient: ${patientName || 'Not specified'}\n`;
    body += `Date of Procedure: ${chargeDate}\n`;
    body += `Location: ${selectedLocation || 'Not specified'}\n`;
    body += '\n--- Procedure Indication (ICD-10) ---\n';
    if (currentIndication && currentIndication !== 'other') {
      body += `  ${currentIndication}\n`;
    }
    if (selectedCardiacIndication === 'other' && otherCardiacIndication) {
      body += `  Cardiac: ${otherCardiacIndication}\n`;
    }
    if (selectedPeripheralIndication === 'other' && otherPeripheralIndication) {
      body += `  Peripheral: ${otherPeripheralIndication}\n`;
    }
    if (selectedStructuralIndication === 'other' && otherStructuralIndication) {
      body += `  Structural: ${otherStructuralIndication}\n`;
    }
    body += '\n--- CPT Codes ---\n';
    allCodes.forEach(c => {
      const isPCICode = pciCodeList.includes(c.code);
      const isDiagnosticCath = diagnosticCathCodes.includes(c.code);
      const vessel = codeVessels[c.code] || codeVesselsV2[c.code] || codeVesselsV3[c.code];
      let displayCode = c.code;
      if (isPCICode && vessel) {
        const modifier = vessel.match(/\(([^)]+)\)/)?.[1] || '';
        displayCode = `${c.code}-${modifier}`;
      } else if (isDiagnosticCath && hasPCI) {
        displayCode = `${c.code}-59`;
      }
      const desc = c.description || c.summary || '';
      body += `  ${displayCode}  ${desc}\n`;
    });
    if (includeSedation) {
      body += '  99152  Moderate sedation, initial 15 min\n';
      if (sedationUnits > 0) {
        body += `  99153 x${sedationUnits}  Moderate sedation, additional ${sedationUnits * 15} min\n`;
      }
    }
    body += '\n--- Billing Summary ---\n';
    body += `Total Work RVU: ${rvuCalc.totalWorkRVU}\n`;
    body += `Total RVU: ${rvuCalc.totalRVU}\n`;
    body += `Estimated Medicare Payment: $${(parseFloat(rvuCalc.totalWorkRVU) * 36.04).toFixed(2)}\n`;
    body += '\n';

    // Bundling/billing guidance from rule violations
    const activeViolations = ruleViolations.filter(v => !overriddenRules.includes(v.ruleId));
    if (activeViolations.length > 0) {
      body += '--- Billing Guidance ---\n';
      activeViolations.forEach(v => {
        body += `  [${v.severity.toUpperCase()}] ${v.message}\n`;
        if (v.suggestion) body += `    Suggestion: ${v.suggestion}\n`;
      });
      body += '\n';
    }

    body += '========================================\n';
    body += '  This information is confidential and\n';
    body += '  intended solely for billing purposes.\n';
    body += '========================================\n';

    return body;
  };

  const handleSubmitCharges = async () => {
    // Validate required fields
    if (!patientName.trim()) {
      alert('Please enter a patient name');
      return;
    }
    if (!matchedPatient && !patientDob) {
      alert('Please enter a date of birth for new patients');
      return;
    }

    if (!procedureDateText) {
      alert('Please select a procedure date');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a procedure location');
      return;
    }

    if (selectedCodes.length === 0 && selectedCodesVessel2.length === 0 && selectedCodesVessel3.length === 0 && !includeSedation) {
      alert('Please select at least one CPT code or moderate sedation');
      return;
    }

    // Check for blocking billing rule errors
    if (hasBlockingErrors) {
      alert('Please resolve all billing rule errors before submitting charges.');
      return;
    }

    // Warn if no moderate sedation is included
    if (!includeSedation) {
      const proceed = window.confirm(
        'No moderate sedation codes are included.\n\nMost cath lab procedures require sedation billing (99152/99153). Are you sure you want to submit without sedation?'
      );
      if (!proceed) return;
    }

    // Check that all PCI codes have vessel modifiers (all three sections)
    const mainPCI = selectedCodes.filter(c =>
      ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'].includes(c.code)
    );

    const missingVesselsMain = mainPCI.filter(c => !codeVessels[c.code]);
    const missingVesselsAdd1 = selectedCodesVessel2.filter(c => !codeVesselsV2[c.code]);
    const missingVesselsAdd2 = selectedCodesVessel3.filter(c => !codeVesselsV3[c.code]);

    const allMissing = [
      ...missingVesselsMain.map(c => `${c.code} (Primary)`),
      ...missingVesselsAdd1.map(c => `${c.code} (Add Vessel #1)`),
      ...missingVesselsAdd2.map(c => `${c.code} (Add Vessel #2)`)
    ];

    if (allMissing.length > 0) {
      alert(`Please select vessel/modifier for the following PCI codes:\n\n${allMissing.join('\n')}\n\nVessel modifiers are required for Medicare billing.`);
      return;
    }

    // Individual mode: PHI check before submission
    if (!isProMode) {
      const matches = scanFieldsForPHI({ patientName });
      if (matches.length > 0 && !phiBypassOnce) {
        if (phiAutoScrub) {
          // Auto-scrub and continue
          setPatientName(scrubPHI(patientName));
          setMatchedPatient(null);
        } else {
          // Show PHI warning modal, return early
          setPhiMatches(matches);
          setShowPHIWarning(true);
          setPendingReportGeneration(true);
          return;
        }
      }
    }

    // Concurrent visit detection (only for new charges in Pro mode)
    if (!editingChargeId && matchedPatient && orgId) {
      const chargeDate = procedureDateText;
      const concurrent = await checkConcurrentVisit(matchedPatient.id, chargeDate, 'user-1');
      if (concurrent) {
        const proceed = window.confirm(
          `${concurrent.otherPhysicianName} already has a charge for this patient on ${chargeDate}. ` +
          `Concurrent care is common — continue?`
        );
        if (!proceed) return;
      }
    }

    // Save to history
    await saveToHistory();

    // Build combined charge from all selected codes
    const allCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3];
    const pciCodeList = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945', '0913T', '0914T'];
    const diagnosticCathCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
    const hasPCI = allCodes.some(c => pciCodeList.includes(c.code));

    const codeStrings = allCodes.map(c => {
      const isPCICode = pciCodeList.includes(c.code);
      const isDiagnosticCath = diagnosticCathCodes.includes(c.code);
      const vessel = codeVessels[c.code] || codeVesselsV2[c.code] || codeVesselsV3[c.code];

      if (isPCICode && vessel) {
        const modifier = vessel.match(/\(([^)]+)\)/)?.[1] || '';
        return `${c.code}-${modifier}`;
      }
      if (isDiagnosticCath && hasPCI) {
        return `${c.code}-59`;
      }
      return c.code;
    });

    // Add sedation codes if included
    if (includeSedation) {
      codeStrings.push('99152');
      if (sedationUnits > 0) {
        for (let i = 0; i < sedationUnits; i++) {
          codeStrings.push('99153');
        }
      }
    }

    const descriptionStrings = allCodes.map(c => c.description || c.summary || '');
    if (includeSedation) {
      descriptionStrings.push('Moderate sedation, initial 15 min');
      if (sedationUnits > 0) {
        for (let i = 0; i < sedationUnits; i++) {
          descriptionStrings.push('Moderate sedation, addl 15 min');
        }
      }
    }

    // Calculate RVU
    const rvuCalc = calculateRVUAndReimbursement();
    const totalRVU = parseFloat(rvuCalc.totalWorkRVU) || 0;
    const totalPayment = totalRVU * 36.04;

    // Collect diagnoses from selected indications
    const diagnoses: string[] = [];
    if (selectedCardiacIndication && selectedCardiacIndication !== 'other') {
      diagnoses.push(selectedCardiacIndication);
    }
    if (selectedPeripheralIndication && selectedPeripheralIndication !== 'other') {
      diagnoses.push(selectedPeripheralIndication);
    }
    if (selectedStructuralIndication && selectedStructuralIndication !== 'other') {
      diagnoses.push(selectedStructuralIndication);
    }

    // Get charge date directly from the date picker text
    const chargeDate: string = procedureDateText || formatDateForStorage(new Date());

    // Auto-create inpatient record if no match and DOB is provided
    let resolvedPatient = matchedPatient;
    if (!resolvedPatient && patientDob && onPatientCreated) {
      const hospitalMatch = hospitals.find(h => h.name === selectedLocation);
      resolvedPatient = await onPatientCreated({
        patientName: patientName.trim(),
        dob: patientDob,
        hospitalId: hospitalMatch?.id || '',
        hospitalName: selectedLocation,
        isActive: true
      }, diagnoses);
      setMatchedPatient(resolvedPatient);
    }

    // Build case snapshot for future re-editing
    const caseSnapshot: CaseSnapshot = {
      codes: { primary: selectedCodes, vessel2: selectedCodesVessel2, vessel3: selectedCodesVessel3 },
      vessels: { v1: codeVessels, v2: codeVesselsV2, v3: codeVesselsV3 },
      indicationCategory,
      indication: selectedCardiacIndication || selectedPeripheralIndication || selectedStructuralIndication || '',
      sedation: { included: includeSedation, units: sedationUnits }
    };

    if (editingChargeId) {
      // Edit mode — update existing charge
      await updateCharge(editingChargeId, {
        cptCode: codeStrings.join(' + '),
        cptDescription: descriptionStrings.join(' + '),
        rvu: totalRVU,
        diagnoses,
        caseSnapshot
      }, orgId);

      // Clear editing state
      setEditingChargeId(null);
      setEditingChargeDate(null);

      // Notify parent to refresh charges
      await onChargeUpdated?.();
    } else {
      // Normal mode — save new charge
      const savedCathCharge = await saveCharge({
        inpatientId: resolvedPatient ? resolvedPatient.id : `cath-${patientName.trim()}-${patientDob}`,
        chargeDate,
        cptCode: codeStrings.join(' + '),
        cptDescription: descriptionStrings.join(' + '),
        rvu: totalRVU,
        diagnoses,
        submittedByUserName: userName || cardiologistName || undefined,
        caseSnapshot
      }, orgId);

      // Log charge_submitted audit event
      if (orgId) {
        logAuditEvent(orgId, {
          action: 'charge_submitted',
          userId: 'user-1',
          userName: userName || cardiologistName || 'Unknown',
          targetPatientId: resolvedPatient?.id || null,
          targetPatientName: resolvedPatient?.patientName || patientName.trim(),
          details: `Submitted cath lab charge ${codeStrings.join(' + ')} for ${resolvedPatient?.patientName || patientName.trim()}`,
          listContext: null,
          metadata: { chargeId: savedCathCharge.id, chargeDate, newStatus: 'pending' }
        });
      }

      // Notify parent to refresh charges (so Rounds sees the new charge)
      await onChargeUpdated?.();
    }

    // Show confirmation
    setSubmittedChargeInfo({
      codeCount: codeStrings.length,
      totalRVU,
      estimatedPayment: totalPayment
    });
    setShowChargeSubmitted(true);
    setPhiBypassOnce(false);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
                <button onClick={() => setShowSettings(false)}>
                  <X size={24} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Physician Name — editable in individual mode, read-only in Pro */}
                {isProMode ? (
                  (userName || cardiologistName) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Physician
                      </label>
                      <p className="text-sm text-gray-900 font-medium px-4 py-2 bg-gray-50 rounded-lg">
                        {userName || cardiologistName}
                      </p>
                    </div>
                  )
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Physician Name
                    </label>
                    <input
                      type="text"
                      value={cardiologistName}
                      onChange={(e) => setCardiologistName(e.target.value)}
                      placeholder="Dr. Smith"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Cath Lab Locations — individual mode only */}
                {!isProMode && (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cath Lab Locations
                    </label>
                    <div className="space-y-2 mb-3">
                      {cathLocations.map((loc, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-gray-800 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">{loc}</span>
                          <button
                            onClick={() => {
                              const updated = cathLocations.filter((_, idx) => idx !== i);
                              setCathLocations(updated);
                            }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="Add new location..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newLocation.trim()) {
                            setCathLocations([...cathLocations, newLocation.trim()]);
                            setNewLocation('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newLocation.trim()) {
                            setCathLocations([...cathLocations, newLocation.trim()]);
                            setNewLocation('');
                          }
                        }}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* PHI Auto-Scrub — individual mode only */}
                {!isProMode && (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={phiAutoScrub}
                        onChange={(e) => setPhiAutoScrub(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Auto-scrub PHI before export</span>
                        <p className="text-xs text-gray-500">Automatically redact detected names, dates, and identifiers when generating reports</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Code Group Settings */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPT Code Categories
                  </label>
                  <button
                    onClick={() => { setShowSettings(false); setShowCodeGroupSettings(true); }}
                    className="w-full flex items-center justify-between p-3 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <List size={18} className="text-indigo-600" />
                      <span className="text-indigo-700 font-medium">Manage Code Categories</span>
                    </div>
                    <ChevronRight size={18} className="text-indigo-600" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Show/hide CPT code groups based on your specialty</p>
                </div>

                {/* Dev Mode */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Developer Options
                  </label>
                  <button
                    onClick={handleOpenDevMode}
                    className="w-full flex items-center justify-between p-3 border border-yellow-300 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 font-semibold">🛠️ Dev Mode</span>
                      {devModeSettings?.enabled && (
                        <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded">
                          {devModeSettings.userTier === 'pro' ? `Pro ${devModeSettings.userRole}` : 'Individual'}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-yellow-600" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Test Pro features without a backend</p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200">
                {!isProMode ? (
                  <button
                    onClick={async () => {
                      await window.storage.set('cardiologistName', cardiologistName);
                      await window.storage.set('cathLocations', JSON.stringify(cathLocations));
                      await window.storage.set('phiAutoScrub', String(phiAutoScrub));
                      setShowSettings(false);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save size={18} />
                    Save Settings
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dev Mode Modal */}
        {showDevMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  🛠️ Dev Mode
                </h2>
                <button onClick={() => setShowDevMode(false)}>
                  <X size={24} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Test different user modes without requiring a backend. Changes will reload the app.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Mode
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDevTier === 'individual' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}>
                      <input
                        type="radio"
                        name="devTier"
                        checked={selectedDevTier === 'individual'}
                        onChange={() => { setSelectedDevTier('individual'); setSelectedDevRole(null); }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">Individual</div>
                        <div className="text-sm text-gray-600">Default mode - Cath Lab only, email export</div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDevTier === 'pro' && selectedDevRole === 'physician' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}>
                      <input
                        type="radio"
                        name="devTier"
                        checked={selectedDevTier === 'pro' && selectedDevRole === 'physician'}
                        onChange={() => { setSelectedDevTier('pro'); setSelectedDevRole('physician'); }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">Pro Physician</div>
                        <div className="text-sm text-gray-600">Cath Lab + Rounds tab, sync enabled</div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDevTier === 'pro' && selectedDevRole === 'admin' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}>
                      <input
                        type="radio"
                        name="devTier"
                        checked={selectedDevTier === 'pro' && selectedDevRole === 'admin'}
                        onChange={() => { setSelectedDevTier('pro'); setSelectedDevRole('admin'); }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">Pro Admin</div>
                        <div className="text-sm text-gray-600">Admin portal access</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {devModeSettings?.enabled && (
                    <button
                      onClick={handleDisableDevMode}
                      className="flex-1 py-2 px-4 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50"
                    >
                      Disable Dev Mode
                    </button>
                  )}
                  <button
                    onClick={handleApplyDevMode}
                    className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                  >
                    Apply & Reload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PHI Warning Modal (individual mode only) */}
        {showPHIWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-red-600 px-4 py-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield size={20} />
                  PHI Warning
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  The following potential PHI was detected in the patient name field:
                </p>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  {phiMatches.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-800">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.severity === 'high' ? 'bg-red-500' : m.severity === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                      <span className="font-medium">{m.pattern}:</span>
                      <span>"{m.value}"</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Individual mode exports are not HIPAA-hardened. Consider scrubbing PHI before generating reports.
                </p>
              </div>
              <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => {
                    setPatientName(scrubPHI(patientName));
                    setMatchedPatient(null);
                    setShowPHIWarning(false);
                    setPendingReportGeneration(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Scrub & Generate
                </button>
                <button
                  onClick={() => {
                    setShowPHIWarning(false);
                    setPendingReportGeneration(false);
                  }}
                  className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors text-sm"
                >
                  Go Back
                </button>
                <button
                  onClick={() => {
                    setShowPHIWarning(false);
                    setPhiBypassOnce(true);
                    setPendingReportGeneration(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-lg transition-colors text-sm"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2026 Updates Modal */}
        {show2026Updates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Lightbulb size={24} className="text-yellow-500" />
                  What's New in 2026
                </h2>
                <button onClick={() => setShow2026Updates(false)}>
                  <X size={24} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">🎉 New Drug-Coated Balloon (DCB) Codes</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li><strong>0913T</strong> - DCB single vessel (standalone) - includes IVUS/OCT</li>
                    <li><strong>0914T</strong> - DCB add-on for separate lesion - includes IVUS/OCT</li>
                  </ul>
                  <p className="text-xs text-green-600 mt-2 italic">Note: IVUS/OCT is bundled into DCB codes - do not bill separately</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">🦶 New Inframalleolar (Foot) Codes</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li><strong>37296</strong> - Inframalleolar, straightforward lesion, PTA</li>
                    <li><strong>37297</strong> - Inframalleolar, complex lesion, PTA</li>
                    <li><strong>37298</strong> - Inframalleolar, additional vessel, straightforward (add-on)</li>
                    <li><strong>37299</strong> - Inframalleolar, additional vessel, complex (add-on)</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">📦 Peripheral Vascular Code Restructure</h3>
                  <p className="text-sm text-purple-700 mb-2">
                    All peripheral vascular codes (37254-37299) have been restructured into comprehensive codes that bundle:
                  </p>
                  <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                    <li>All imaging (IVUS, angiography)</li>
                    <li>Access and closure devices</li>
                    <li>Crossing devices and embolic protection</li>
                  </ul>
                  <p className="text-xs text-purple-600 mt-2 italic">Do not bill imaging codes separately with peripheral interventions</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-2">⚠️ Billing Reminders</h3>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• DCB codes include imaging - no separate 92978/92979</li>
                    <li>• New peripheral codes are comprehensive - no separate imaging</li>
                    <li>• CTO codes 92943/92945 remain mutually exclusive</li>
                    <li>• Always verify vessel modifiers for multi-vessel PCI</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShow2026Updates(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Case History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <History size={24} />
                  Case History
                </h2>
                <div className="flex items-center gap-2">
                  {caseHistory.length > 0 && (
                    <button
                      onClick={exportHistory}
                      className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Download size={16} />
                      Export
                    </button>
                  )}
                  <button onClick={() => setShowHistoryModal(false)}>
                    <X size={24} className="text-gray-500 hover:text-gray-700" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {caseHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No case history yet</p>
                    <p className="text-sm mt-1">Cases will be saved when you generate reports</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {caseHistory.map((savedCase) => (
                      <div key={savedCase.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-800">{savedCase.caseId || 'Unnamed Case'}</div>
                            <div className="text-sm text-gray-600">
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
                            onClick={() => loadFromHistory(savedCase)}
                            className="flex-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm"
                          >
                            Load Case
                          </button>
                          <button
                            onClick={() => deleteFromHistory(savedCase.id)}
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
          </div>
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FileText size={24} />
                  Case Templates
                </h2>
                <button onClick={() => setShowTemplateModal(false)}>
                  <X size={24} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {/* Built-in Templates */}
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Built-in Templates</h3>
                <div className="space-y-2 mb-6">
                  {builtInTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="w-full p-4 border border-gray-200 rounded-lg text-left hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                    >
                      <div className="font-semibold text-gray-800">{template.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.codes.primary.map(code => (
                          <span key={code} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">{code}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Templates */}
                {customTemplates.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Your Templates</h3>
                    <p className="text-xs text-gray-500 mb-2">← Swipe left to delete</p>
                    <div className="space-y-2">
                      {customTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="relative overflow-hidden rounded-lg"
                          onTouchStart={(e) => {
                            setTouchStartX(e.touches[0].clientX);
                          }}
                          onTouchEnd={(e) => {
                            const touchEndX = e.changedTouches[0].clientX;
                            const diff = touchStartX - touchEndX;
                            if (diff > 80) {
                              // Swiped left - show delete
                              setSwipedTemplateId(template.id);
                            } else if (diff < -50) {
                              // Swiped right - hide delete
                              setSwipedTemplateId(null);
                            }
                          }}
                        >
                          {/* Delete button behind */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center"
                            style={{ display: swipedTemplateId === template.id ? 'flex' : 'none' }}
                          >
                            <button
                              onClick={() => {
                                deleteCustomTemplate(template.id);
                                setSwipedTemplateId(null);
                              }}
                              className="text-white p-2"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                          {/* Template card */}
                          <div
                            style={{
                              transform: swipedTemplateId === template.id ? 'translateX(-80px)' : 'translateX(0)',
                              transition: 'transform 0.2s ease-out'
                            }}
                            className="flex items-center gap-2 bg-white"
                          >
                            <button
                              onClick={() => {
                                if (swipedTemplateId !== template.id) {
                                  loadTemplate(template);
                                } else {
                                  setSwipedTemplateId(null);
                                }
                              }}
                              className="flex-1 p-4 border border-gray-200 rounded-lg text-left hover:bg-green-50 hover:border-green-300 transition-colors"
                            >
                              <div className="font-semibold text-gray-800">{template.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{template.description || 'Custom template'}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.codes.primary.slice(0, 4).map(code => (
                                  <span key={code} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{code}</span>
                                ))}
                                {template.codes.primary.length > 4 && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">+{template.codes.primary.length - 4} more</span>
                                )}
                              </div>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Template Modal */}
        {showSaveTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Save as Template</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    placeholder="e.g., My Standard PCI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    placeholder="Brief description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveTemplateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAsTemplate}
                    disabled={!newTemplateName.trim()}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === ADD CASE TAB === */}
        {bottomTab === 'addcase' && (<>
        {/* Case Information - HIPAA Compliant */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={24} className="text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">Case Information</h2>
            </div>
            {/* Template Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <FileText size={16} />
                Load Template
              </button>
              {(selectedCodes.length > 0 || selectedCodesVessel2.length > 0 || selectedCodesVessel3.length > 0) && (
                <button
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1"
                >
                  <Save size={16} />
                  Save Template
                </button>
              )}
            </div>
          </div>

          {/* Edit mode banner */}
          {editingChargeId && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-300 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Editing charge for {editingChargeDate} — {patientName}
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingChargeId(null);
                  setEditingChargeDate(null);
                  setSelectedCodes([]);
                  setSelectedCodesVessel2([]);
                  setSelectedCodesVessel3([]);
                  setCodeVessels({});
                  setCodeVesselsV2({});
                  setCodeVesselsV3({});
                  setPatientName('');
                  setPatientDob('');
                  setPatientDobDisplay('');
                  setMatchedPatient(null);
                  setShowSuggestions(false);
                  setPatientSuggestions([]);
                  setProcedureDateOption('today');
                  setProcedureDateText(new Date().toISOString().split('T')[0]);
                  setSelectedLocation('');
                  setIncludeSedation(false);
                  setSedationUnits(0);
                  setSelectedCardiacIndication('');
                  setSelectedPeripheralIndication('');
                  setSelectedStructuralIndication('');
                  setIndicationSearch('');
                }}
                className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Name *
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => {
                  const val = e.target.value;
                  setPatientName(val);
                  if (matchedPatient) {
                    setMatchedPatient(null);
                  }
                  if (val.length >= 2 && patients.length > 0) {
                    const lower = val.toLowerCase();
                    const matches = patients.filter(p =>
                      p.isActive && p.patientName.toLowerCase().includes(lower)
                    ).slice(0, 8);
                    setPatientSuggestions(matches);
                    setShowSuggestions(matches.length > 0);
                  } else {
                    setPatientSuggestions([]);
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (patientSuggestions.length > 0 && !matchedPatient) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                maxLength={100}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800 ${!isProMode && phiMatches.length > 0 ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-300'}`}
                placeholder="Last, First"
              />
              {/* Autocomplete dropdown */}
              {showSuggestions && patientSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPatientName(p.patientName);
                        setMatchedPatient(p);
                        setPatientDob('');
                        setPatientDobDisplay('');
                        setShowSuggestions(false);
                        setPatientSuggestions([]);
                        // Auto-select hospital as location if available
                        if (p.hospitalName) {
                          setSelectedLocation(p.hospitalName);
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{p.patientName}</div>
                      <div className="text-xs text-gray-500">{p.hospitalName || 'No hospital'}{p.dob ? ` · DOB: ${p.dob}` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
              {/* Match indicator chip */}
              {matchedPatient && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-700">
                  <Check size={14} className="text-green-600" />
                  <span>Linked: {matchedPatient.patientName}{matchedPatient.hospitalName ? ` — ${matchedPatient.hospitalName}` : ''}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchedPatient(null);
                      setPatientName('');
                      setPatientDob('');
                      setPatientDobDisplay('');
                    }}
                    className="ml-1 text-green-500 hover:text-green-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {/* DOB field for new (unmatched) patients */}
              {!matchedPatient && patientName.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={patientDobDisplay}
                    onChange={(e) => handlePatientDobChange(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800"
                  />
                </div>
              )}

              {/* PHI Warning — individual mode only */}
              {!isProMode && phiMatches.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800">Potential PHI Detected</p>
                      <ul className="mt-1 space-y-0.5">
                        {phiMatches.map((m, i) => (
                          <li key={i} className="text-xs text-red-700">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${m.severity === 'high' ? 'bg-red-500' : m.severity === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                            {m.pattern}: "{m.value}"
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientName(scrubPHI(patientName));
                          setMatchedPatient(null);
                        }}
                        className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                      >
                        Scrub PHI
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedure Date *
              </label>
              {/* Horizontal 1-week calendar: today → 6 days ago + Other */}
              {(() => {
                const today = new Date();
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(today);
                  d.setDate(today.getDate() - i);
                  return {
                    dateStr: d.toISOString().split('T')[0],
                    dayName: dayNames[d.getDay()],
                    dayNum: d.getDate(),
                    month: monthNames[d.getMonth()],
                    isToday: i === 0,
                  };
                });
                return (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {last7Days.map((day) => {
                      const isSelected = procedureDateOption !== 'other' && procedureDateText === day.dateStr;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => {
                            setProcedureDateOption(day.isToday ? 'today' : 'date');
                            setProcedureDateText(day.dateStr);
                          }}
                          className={`flex flex-col items-center min-w-[52px] py-2 px-1.5 rounded-xl border-2 text-xs font-medium transition-all flex-shrink-0 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <span className="text-[10px] text-gray-400 uppercase">{day.dayName}</span>
                          <span className="text-lg font-bold leading-tight">{day.dayNum}</span>
                          <span className="text-[10px] text-gray-400">{day.month}</span>
                        </button>
                      );
                    })}
                    {/* Other button */}
                    <button
                      type="button"
                      onClick={() => {
                        setProcedureDateOption('other');
                        setProcedureDateText('');
                      }}
                      className={`flex flex-col items-center justify-center min-w-[52px] py-2 px-1.5 rounded-xl border-2 text-xs font-medium transition-all flex-shrink-0 ${
                        procedureDateOption === 'other'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="text-[10px] text-gray-400">Other</span>
                      <span className="text-base font-bold leading-tight">...</span>
                    </button>
                  </div>
                );
              })()}
              {/* Other: show date input */}
              {procedureDateOption === 'other' && (
                <input
                  type="date"
                  value={procedureDateText}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setProcedureDateText(e.target.value)}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedure Location *
              </label>
              <div className="space-y-2">
                {(() => {
                  // Individual mode: use local cathLocations from Settings
                  // Pro mode: use admin-managed hospitals + cathLabs props
                  if (!isProMode) {
                    if (cathLocations.length === 0) {
                      return <p className="text-gray-500 text-sm italic">No locations configured. Add cath lab locations in Settings.</p>;
                    }
                    return cathLocations.map((location, index) => (
                      <label key={`loc-${index}`} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedLocation === location
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="location"
                          value={location}
                          checked={selectedLocation === location}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-gray-700">{location}</span>
                      </label>
                    ));
                  }
                  const hospitalNames = hospitals.filter(h => h.isActive).map(h => h.name);
                  const cathLabNames = cathLabs.filter(l => l.isActive).map(l => l.name);
                  // Deduplicate: cathLabs that aren't already a hospital name
                  const cathOnly = cathLabNames.filter(name => !hospitalNames.includes(name));
                  const mergedLocations = [...hospitalNames, ...cathOnly];
                  if (mergedLocations.length === 0) {
                    return <p className="text-gray-500 text-sm italic">No locations configured. Ask your admin to add hospitals and cath labs in the Admin Portal.</p>;
                  }
                  return mergedLocations.map((location, index) => (
                    <label key={`loc-${index}`} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedLocation === location
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="location"
                        value={location}
                        checked={selectedLocation === location}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-gray-700">{location}</span>
                      {index < hospitalNames.length ? (
                        <span className="ml-auto text-xs text-gray-400">Hospital</span>
                      ) : (
                        <span className="ml-auto text-xs text-gray-400">Cath Lab</span>
                      )}
                    </label>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        </>)}

        {/* === ICD-10 TAB === */}
        {bottomTab === 'icd10' && (<>
        {/* Procedure Indication Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={22} className="text-amber-500" />
            Procedure Indications (ICD-10)
          </h2>
          <p className="text-sm text-gray-600 mb-4">Select one indication from each applicable category</p>

          {/* ICD-10 Search */}
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={indicationSearch}
                onChange={(e) => setIndicationSearch(e.target.value)}
                placeholder="Search ICD-10 codes (e.g., I25.10, chest pain)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {indicationSearch.length >= 2 && (() => {
              const results = searchICD10Codes(indicationSearch).slice(0, 8);
              if (results.length === 0) {
                return (
                  <div className="mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500">
                    No matching ICD-10 codes found
                  </div>
                );
              }
              return (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                  {results.map(code => {
                    // Determine which category this code belongs to for selection
                    const isCardiac = code.category === 'primary';
                    const isComorbid = code.category === 'comorbid';
                    const isSelected =
                      selectedCardiacIndication === code.code ||
                      selectedPeripheralIndication === code.code ||
                      selectedStructuralIndication === code.code;
                    return (
                      <button
                        key={code.code}
                        type="button"
                        onClick={() => {
                          // Set as cardiac indication (most common for cath lab)
                          if (isCardiac || isComorbid) {
                            setSelectedCardiacIndication(code.code);
                          } else {
                            setSelectedStructuralIndication(code.code);
                          }
                          setIndicationSearch('');
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <span className="font-mono font-medium text-gray-900 whitespace-nowrap">{code.code}</span>
                        <span className="text-gray-600 truncate">{code.description}</span>
                        {isSelected && <Check size={16} className="text-indigo-600 ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Cardiac Indications */}
          <div className="mb-6">
            <button
              onClick={() => setExpandedIndicationSections(prev => ({ ...prev, cardiac: !prev.cardiac }))}
              className="w-full text-lg font-semibold text-red-900 mb-3 flex items-center gap-2 hover:bg-red-50 p-2 rounded-lg transition-colors"
            >
              {expandedIndicationSections.cardiac ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Cardiac Indications
              {selectedCardiacIndication && <Check size={18} className="text-green-600 ml-auto" />}
            </button>
            {expandedIndicationSections.cardiac && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border-l-4 border-red-200 pl-4">
              {cardiacIndications.map((indication) => (
                <label
                  key={indication.code}
                  className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer transition-all ${
                    selectedCardiacIndication === indication.code
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (selectedCardiacIndication === indication.code) {
                      setSelectedCardiacIndication('');
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="cardiacIndication"
                    value={indication.code}
                    checked={selectedCardiacIndication === indication.code}
                    onChange={(e) => {
                      setSelectedCardiacIndication(e.target.value);
                      setOtherCardiacIndication('');
                    }}
                    className="w-4 h-4 text-red-600 mt-1 flex-shrink-0"
                  />
                  <div className="flex-grow">
                    <div className="font-semibold text-red-900 text-sm">{indication.code}</div>
                    <div className="text-xs text-gray-700">{indication.description}</div>
                  </div>
                </label>
              ))}
              
              <label
                className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer transition-all ${
                  selectedCardiacIndication === 'other'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (selectedCardiacIndication === 'other') {
                    setSelectedCardiacIndication('');
                    setOtherCardiacIndication('');
                  }
                }}
              >
                <input
                  type="radio"
                  name="cardiacIndication"
                  value="other"
                  checked={selectedCardiacIndication === 'other'}
                  onChange={(e) => setSelectedCardiacIndication(e.target.value)}
                  className="w-4 h-4 text-red-600 mt-1 flex-shrink-0"
                />
                <div className="flex-grow">
                  <div className="font-semibold text-red-900 text-sm">Other</div>
                  {selectedCardiacIndication === 'other' && (
                    <input
                      type="text"
                      value={otherCardiacIndication}
                      onChange={(e) => setOtherCardiacIndication(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full mt-2 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter ICD-10 code and description"
                    />
                  )}
                </div>
              </label>
            </div>
            )}
          </div>

          {/* Peripheral Indications */}
          <div className="mb-6">
            <button
              onClick={() => setExpandedIndicationSections(prev => ({ ...prev, peripheral: !prev.peripheral }))}
              className="w-full text-lg font-semibold text-green-900 mb-3 flex items-center gap-2 hover:bg-green-50 p-2 rounded-lg transition-colors"
            >
              {expandedIndicationSections.peripheral ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Peripheral Indications
              {selectedPeripheralIndication && <Check size={18} className="text-green-600 ml-auto" />}
            </button>
            {expandedIndicationSections.peripheral && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border-l-4 border-green-200 pl-4">
              {peripheralIndications.map((indication) => (
                <label 
                  key={indication.code}
                  className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer transition-all ${
                    selectedPeripheralIndication === indication.code
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (selectedPeripheralIndication === indication.code) {
                      setSelectedPeripheralIndication('');
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="peripheralIndication"
                    value={indication.code}
                    checked={selectedPeripheralIndication === indication.code}
                    onChange={(e) => {
                      setSelectedPeripheralIndication(e.target.value);
                      setOtherPeripheralIndication('');
                    }}
                    className="w-4 h-4 text-green-600 mt-1 flex-shrink-0"
                  />
                  <div className="flex-grow">
                    <div className="font-semibold text-green-900 text-sm">{indication.code}</div>
                    <div className="text-xs text-gray-700">{indication.description}</div>
                  </div>
                </label>
              ))}
              
              <label 
                className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer transition-all ${
                  selectedPeripheralIndication === 'other'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (selectedPeripheralIndication === 'other') {
                    setSelectedPeripheralIndication('');
                    setOtherPeripheralIndication('');
                  }
                }}
              >
                <input
                  type="radio"
                  name="peripheralIndication"
                  value="other"
                  checked={selectedPeripheralIndication === 'other'}
                  onChange={(e) => setSelectedPeripheralIndication(e.target.value)}
                  className="w-4 h-4 text-green-600 mt-1 flex-shrink-0"
                />
                <div className="flex-grow">
                  <div className="font-semibold text-green-900 text-sm">Other</div>
                  {selectedPeripheralIndication === 'other' && (
                    <input
                      type="text"
                      value={otherPeripheralIndication}
                      onChange={(e) => setOtherPeripheralIndication(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full mt-2 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter ICD-10 code and description"
                    />
                  )}
                </div>
              </label>
            </div>
            )}
          </div>

          {/* Structural Indications */}
          <div>
            <button
              onClick={() => setExpandedIndicationSections(prev => ({ ...prev, structural: !prev.structural }))}
              className="w-full text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2 hover:bg-purple-50 p-2 rounded-lg transition-colors"
            >
              {expandedIndicationSections.structural ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              Structural Indications
              {selectedStructuralIndication && <Check size={18} className="text-green-600 ml-auto" />}
            </button>
            {expandedIndicationSections.structural && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border-l-4 border-purple-200 pl-4">
              {structuralIndications.map((indication) => (
                <label 
                  key={indication.code}
                  className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer transition-all ${
                    selectedStructuralIndication === indication.code
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (selectedStructuralIndication === indication.code) {
                      setSelectedStructuralIndication('');
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="structuralIndication"
                    value={indication.code}
                    checked={selectedStructuralIndication === indication.code}
                    onChange={(e) => {
                      setSelectedStructuralIndication(e.target.value);
                      setOtherStructuralIndication('');
                    }}
                    className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0"
                  />
                  <div className="flex-grow">
                    <div className="font-semibold text-purple-900 text-sm">{indication.code}</div>
                    <div className="text-xs text-gray-700">{indication.description}</div>
                  </div>
                </label>
              ))}
              
              <label 
                className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer transition-all ${
                  selectedStructuralIndication === 'other'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (selectedStructuralIndication === 'other') {
                    setSelectedStructuralIndication('');
                    setOtherStructuralIndication('');
                  }
                }}
              >
                <input
                  type="radio"
                  name="structuralIndication"
                  value="other"
                  checked={selectedStructuralIndication === 'other'}
                  onChange={(e) => setSelectedStructuralIndication(e.target.value)}
                  className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0"
                />
                <div className="flex-grow">
                  <div className="font-semibold text-purple-900 text-sm">Other</div>
                  {selectedStructuralIndication === 'other' && (
                    <input
                      type="text"
                      value={otherStructuralIndication}
                      onChange={(e) => setOtherStructuralIndication(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full mt-2 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter ICD-10 code and description"
                    />
                  )}
                </div>
              </label>
            </div>
            )}
          </div>
        </div>

        </>)}

        {/* === CPT TAB (Sedation at top) === */}
        {bottomTab === 'cpt' && (<>
        {/* Moderate Sedation Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={() => setExpandedSedation(!expandedSedation)}
            className="w-full text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            {expandedSedation ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
            <Sparkles size={22} className="text-purple-500" />
            Moderate Sedation
            {includeSedation && <Check size={18} className="text-green-600 ml-auto" />}
          </button>

          {expandedSedation && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-gray-50 transition-all">
              <input
                type="checkbox"
                checked={includeSedation}
                onChange={(e) => {
                  setIncludeSedation(e.target.checked);
                  if (!e.target.checked) setSedationUnits(0);
                }}
                className="w-5 h-5 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-gray-800">99152 - Moderate sedation services, initial 15 minutes</div>
                <div className="text-sm text-gray-600">Check if moderate sedation was provided</div>
              </div>
            </label>

            {includeSedation && (
              <div className="ml-8 p-4 bg-indigo-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional 15-minute increments (99153)
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Select number of additional 15-minute periods beyond the initial 15 minutes (maximum 4 units)
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSedationUnits(Math.max(0, sedationUnits - 1))}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
                      disabled={sedationUnits === 0}
                    >
                      −
                    </button>
                    <div className="flex-grow text-center">
                      <div className="text-2xl font-bold text-indigo-900">{sedationUnits}</div>
                      <div className="text-sm text-gray-600">
                        {sedationUnits === 0 ? 'No additional time' : `${sedationUnits} × 15 min = ${sedationUnits * 15} minutes`}
                      </div>
                    </div>
                    <button
                      onClick={() => setSedationUnits(Math.min(4, sedationUnits + 1))}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                      disabled={sedationUnits === 4}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Sedation Time:</span>
                    <span className="text-lg font-bold text-indigo-900">{15 + (sedationUnits * 15)} minutes</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    99152 (15 min) {sedationUnits > 0 && `+ 99153 × ${sedationUnits} (${sedationUnits * 15} min)`}
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* CPT Code Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <List size={22} className="text-blue-500" />
              Select CPT Codes
            </h2>
            <button
              onClick={() => setShowModifierGuide(!showModifierGuide)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-800 transition-colors"
            >
              <Info size={16} />
              Coronary Modifiers
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search codes by number or keyword (e.g., 92928, stent, IVUS)..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                Showing results for "{searchQuery}"
              </p>
            )}
          </div>

          {/* Favorites Section */}
          {getFavoriteCodes.length > 0 && !searchQuery && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-current" />
                Favorites
              </h3>
              <div className="grid gap-2">
                {getFavoriteCodes.map((cpt) => {
                  const isSelected = isCodeSelected(cpt.code);
                  return (
                    <div
                      key={`fav-${cpt.code}`}
                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-900">{cpt.code}</span>
                          <span className="text-gray-600 ml-2 text-sm">{cpt.summary}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                        className="p-1 hover:bg-amber-100 rounded"
                      >
                        <Star size={18} className="text-amber-500 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifier Guide */}
          {showModifierGuide && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-blue-900">Coronary Artery Modifier Guide</h3>
                <button onClick={() => setShowModifierGuide(false)}>
                  <X size={18} className="text-blue-700 hover:text-blue-900" />
                </button>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Use these modifiers when reporting PCI base codes for Medicare billing:
              </p>
              <div className="space-y-2">
                {coronaryModifiers.map((mod) => (
                  <div key={mod.modifier} className="bg-white p-3 rounded border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="font-bold text-blue-900 min-w-[40px]">{mod.modifier}</div>
                      <div className="flex-grow">
                        <div className="font-semibold text-gray-800">{mod.artery}</div>
                        <div className="text-sm text-gray-600">Branches: {mod.branches}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-3">
                <strong>Note:</strong> Branches are included in base codes - use add-on codes only when specified
              </p>
            </div>
          )}

          {/* No Results Message */}
          {searchQuery &&
            Object.keys(filterCodes(cptCategories, searchQuery)).length === 0 &&
            Object.keys(filterCodes(echoCategories, searchQuery)).length === 0 &&
            Object.keys(filterCodes(epCategories, searchQuery)).length === 0 &&
            customCodes.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p>No codes found matching "{searchQuery}"</p>
              <p className="text-sm mt-1">Try searching by code number or description</p>
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(searchQuery ? filterCodes(cptCategories, searchQuery) : cptCategories).map(([category, codes]) => {
              // Special handling for PCI category with vessel submenus
              if (category === 'PCI') {
                return (
                  <div key={category} className="border border-red-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <span className="font-semibold text-red-900 text-left">PCI</span>
                      </div>
                      {expandedCategories[category] ? <ChevronDown size={20} className="text-red-700" /> : <ChevronRight size={20} className="text-red-700" />}
                    </button>
                    
                    {expandedCategories[category] && (
                      <div className="p-4 space-y-3">
                        {/* First Vessel Submenu */}
                        <div className="border border-indigo-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => togglePCIVessel('first')}
                            className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-indigo-800 text-left">First Vessel</span>
                              {selectedCodes.filter(c => ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)).length > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => ['92920','92924','92928','92930','92933','92937','92941','92943','92945'].includes(c.code)).length}
                                </span>
                              )}
                            </div>
                            {expandedPCIVessels['first'] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                          {expandedPCIVessels['first'] && (
                            <div className="p-3 space-y-2">
                              {codes.map((cpt) => {
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `PCI-first-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                            {cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            {/* Favorite Star */}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                              title={isFavorite(cpt.code) ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">{cpt.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="ml-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                                        <div className="flex items-center justify-between mb-3">
                                          <h4 className="font-semibold text-blue-900 text-sm">Select Vessel/Modifier</h4>
                                          {codeVessels[cpt.code] && <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">{codeVessels[cpt.code]}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {['LAD (LD)', 'LCx (LC)', 'RCA (RC)', 'Left Main (LM)', 'Ramus (RI)'].map((vessel) => (
                                            <label key={vessel} className={`flex items-center gap-2 p-2 border-2 rounded cursor-pointer ${codeVessels[cpt.code] === vessel ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
                                              <input type="radio" name={`vessel-first-${cpt.code}`} checked={codeVessels[cpt.code] === vessel} onChange={() => setVesselForCode(cpt.code, vessel)} className="w-4 h-4" />
                                              <span className="text-sm">{vessel}</span>
                                            </label>
                                          ))}
                                        </div>
                                        {!codeVessels[cpt.code] && <div className="mt-3 text-xs text-red-600 font-semibold">⚠️ Vessel required</div>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Second Vessel Submenu */}
                        <div className="border border-purple-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => togglePCIVessel('second')}
                            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-purple-800 text-left">Second Vessel</span>
                              {selectedCodesVessel2.length > 0 && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">{selectedCodesVessel2.length}</span>
                              )}
                            </div>
                            {expandedPCIVessels['second'] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                          {expandedPCIVessels['second'] && (
                            <div className="p-3 space-y-2">
                              {codes.map((cpt) => {
                                const isSelected = selectedCodesVessel2.some(c => c.code === cpt.code);
                                const codeKey = `PCI-second-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCodeV2(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-purple-900">{cpt.code}</span>
                                            {cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-purple-200 text-purple-700' : 'hover:bg-gray-200 text-gray-500 hover:text-purple-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            {/* Favorite Star */}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                              title={isFavorite(cpt.code) ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-purple-300">{cpt.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="ml-8 p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                                        <div className="flex items-center justify-between mb-3">
                                          <h4 className="font-semibold text-purple-900 text-sm">Select Vessel/Modifier</h4>
                                          {codeVesselsV2[cpt.code] && <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">{codeVesselsV2[cpt.code]}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {['LAD (LD)', 'LCx (LC)', 'RCA (RC)', 'Left Main (LM)', 'Ramus (RI)'].map((vessel) => (
                                            <label key={vessel} className={`flex items-center gap-2 p-2 border-2 rounded cursor-pointer ${codeVesselsV2[cpt.code] === vessel ? 'border-purple-600 bg-purple-100' : 'border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
                                              <input type="radio" name={`vessel-second-${cpt.code}`} checked={codeVesselsV2[cpt.code] === vessel} onChange={() => setVesselForCodeV2(cpt.code, vessel)} className="w-4 h-4" />
                                              <span className="text-sm">{vessel}</span>
                                            </label>
                                          ))}
                                        </div>
                                        {!codeVesselsV2[cpt.code] && <div className="mt-3 text-xs text-red-600 font-semibold">⚠️ Vessel required</div>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Third Vessel Submenu */}
                        <div className="border border-orange-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => togglePCIVessel('third')}
                            className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-orange-800 text-left">Third Vessel</span>
                              {selectedCodesVessel3.length > 0 && (
                                <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full">{selectedCodesVessel3.length}</span>
                              )}
                            </div>
                            {expandedPCIVessels['third'] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                          {expandedPCIVessels['third'] && (
                            <div className="p-3 space-y-2">
                              {codes.map((cpt) => {
                                const isSelected = selectedCodesVessel3.some(c => c.code === cpt.code);
                                const codeKey = `PCI-third-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCodeV3(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-orange-900">{cpt.code}</span>
                                            {cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-orange-200 text-orange-700' : 'hover:bg-gray-200 text-gray-500 hover:text-orange-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            {/* Favorite Star */}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                              title={isFavorite(cpt.code) ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-orange-300">{cpt.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="ml-8 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                                        <div className="flex items-center justify-between mb-3">
                                          <h4 className="font-semibold text-orange-900 text-sm">Select Vessel/Modifier</h4>
                                          {codeVesselsV3[cpt.code] && <span className="px-2 py-1 bg-orange-600 text-white text-xs font-bold rounded">{codeVesselsV3[cpt.code]}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {['LAD (LD)', 'LCx (LC)', 'RCA (RC)', 'Left Main (LM)', 'Ramus (RI)'].map((vessel) => (
                                            <label key={vessel} className={`flex items-center gap-2 p-2 border-2 rounded cursor-pointer ${codeVesselsV3[cpt.code] === vessel ? 'border-orange-600 bg-orange-100' : 'border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
                                              <input type="radio" name={`vessel-third-${cpt.code}`} checked={codeVesselsV3[cpt.code] === vessel} onChange={() => setVesselForCodeV3(cpt.code, vessel)} className="w-4 h-4" />
                                              <span className="text-sm">{vessel}</span>
                                            </label>
                                          ))}
                                        </div>
                                        {!codeVesselsV3[cpt.code] && <div className="mt-3 text-xs text-red-600 font-semibold">⚠️ Vessel required</div>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Skip subcategories - they're rendered inside parent dropdowns
              const peripheralAngiographyCategories = ['Aortoiliac/Abdominal', 'Lower Extremity', 'Upper Extremity', 'Renal', 'Mesenteric', 'Pelvic'];
              const peripheralInterventionCategories = ['Iliac', 'Femoral/Popliteal', 'Tibial/Peroneal', 'Inframalleolar'];
              const venousCategories = ['Venography', 'IVC Filter', 'Venous Stenting', 'Venous Thrombectomy'];
              const miscCategories = ['Thrombolysis', 'Arterial Thrombectomy', 'Retrieval'];
              const endovascularCategories = ['Carotid/Cerebrovascular', 'Carotid Stenting', 'Thoracic Aortography', 'EVAR', 'TEVAR', 'Subclavian/Innominate', 'Renal Intervention', 'Mesenteric Intervention'];

              if (peripheralAngiographyCategories.includes(category) || peripheralInterventionCategories.includes(category) || venousCategories.includes(category) || miscCategories.includes(category) || endovascularCategories.includes(category)) {
                return null;
              }

              // Standard rendering for non-PCI categories
              const colors = categoryColors[category] || defaultCategoryColor;
              return (
              <div key={category} className={`border ${colors.border} rounded-lg overflow-hidden`}>
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center justify-between p-4 ${colors.bg} ${colors.hoverBg} transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 ${colors.dot} rounded-full`}></span>
                    <span className={`font-semibold ${colors.text} text-left`}>{category}</span>
                    {category.includes('NEW 2026') && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">NEW</span>
                    )}
                  </div>
                  {expandedCategories[category] ? <ChevronDown size={20} className={colors.text} /> : <ChevronRight size={20} className={colors.text} />}
                </button>
                
                {expandedCategories[category] && (
                  <div className="p-4">
                    <div className="space-y-2">
                      {codes.map((cpt) => {
                        // Handle section dividers
                        if (cpt.isDivider) {
                          return (
                            <div key={cpt.code} className="py-2 mt-2 first:mt-0">
                              <div className="flex items-center gap-2">
                                <div className="flex-grow h-px bg-gray-300"></div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">{cpt.summary}</span>
                                <div className="flex-grow h-px bg-gray-300"></div>
                              </div>
                            </div>
                          );
                        }

                        const isPCICode = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'].includes(cpt.code);
                        const isImagingCode = ['92978', '92979', '93571', '93572', '0523T', '0524T'].includes(cpt.code);
                        const isDCBCode = ['0913T', '0914T'].includes(cpt.code);
                        const isSelected = isCodeSelected(cpt.code);
                        const codeKey = `${category}-${cpt.code}`;
                        const displayText = cpt.summary || cpt.description;

                        return (
                          <div key={cpt.code} className="space-y-2">
                            <div
                              onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-indigo-500 border-indigo-500'
                                    : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check size={14} className="text-white" />}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                    {/* Favorite Star */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                      className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                      title={isFavorite(cpt.code) ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                    </button>
                                    {cpt.summary && cpt.description !== cpt.summary && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                        className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                        title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                      >
                                        <Maximize2 size={14} />
                                      </button>
                                    )}
                                    {cpt.isNew && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">NEW 2026</span>
                                    )}
                                    {cpt.isAddOn && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-700 mt-1">{displayText}</div>
                                  {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">
                                      {cpt.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Vessel Selection for Imaging Codes */}
                            {isImagingCode && isSelected && (
                              <div className="ml-8 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-green-900 text-sm">Select Vessel for {cpt.code}</h4>
                                  {imagingVessels[cpt.code] && (
                                    <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                                      {imagingVessels[cpt.code]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-green-800 mb-3">Select the vessel where imaging was performed</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {['LAD (LD)', 'LCx (LC)', 'RCA (RC)', 'Left Main (LM)', 'Ramus (RI)'].map((vessel) => (
                                    <label 
                                      key={vessel}
                                      className={`flex items-center gap-2 p-2 border-2 rounded cursor-pointer transition-all ${
                                        imagingVessels[cpt.code] === vessel
                                          ? 'border-green-600 bg-green-100'
                                          : 'border-gray-300 hover:border-green-300'
                                      }`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="radio"
                                        name={`imaging-vessel-${cpt.code}`}
                                        checked={imagingVessels[cpt.code] === vessel}
                                        onChange={() => setImagingVesselForCode(cpt.code, vessel)}
                                        className="w-4 h-4 text-green-600"
                                      />
                                      <span className="text-sm font-medium text-gray-800">{vessel}</span>
                                    </label>
                                  ))}
                                </div>
                                {!imagingVessels[cpt.code] && (
                                  <div className="mt-3 text-xs text-red-600 font-semibold">
                                    ⚠️ Vessel selection required
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Vessel/Lesion Selection for Drug-Coated Balloon Codes */}
                            {isDCBCode && isSelected && (
                              <div className="ml-8 p-4 bg-teal-50 border-l-4 border-teal-500 rounded">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-teal-900 text-sm">Select Target Vessel/Lesion for {cpt.code}</h4>
                                  {dcbVessels[cpt.code] && (
                                    <span className="px-2 py-1 bg-teal-600 text-white text-xs font-bold rounded">
                                      {dcbVessels[cpt.code]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-teal-800 mb-3">Select the vessel where drug-coated balloon was deployed</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {['LAD (LD)', 'LCx (LC)', 'RCA (RC)', 'Left Main (LM)', 'Ramus (RI)'].map((vessel) => (
                                    <label 
                                      key={vessel}
                                      className={`flex items-center gap-2 p-2 border-2 rounded cursor-pointer transition-all ${
                                        dcbVessels[cpt.code] === vessel
                                          ? 'border-teal-600 bg-teal-100'
                                          : 'border-gray-300 hover:border-teal-300'
                                      }`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="radio"
                                        name={`dcb-vessel-${cpt.code}`}
                                        checked={dcbVessels[cpt.code] === vessel}
                                        onChange={() => setDcbVesselForCode(cpt.code, vessel)}
                                        className="w-4 h-4 text-teal-600"
                                      />
                                      <span className="text-sm font-medium text-gray-800">{vessel}</span>
                                    </label>
                                  ))}
                                </div>
                                {!dcbVessels[cpt.code] && (
                                  <div className="mt-3 text-xs text-red-600 font-semibold">
                                    ⚠️ Vessel/lesion selection required
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );})}

            {/* Echo Search Results */}
            {searchQuery && Object.entries(filterCodes(echoCategories, searchQuery)).map(([category, codes]) => (
              <div key={`search-echo-${category}`} className="border border-sky-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-sky-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-sky-500 rounded-full"></span>
                    <span className="font-semibold text-sky-900">Echocardiography - {category}</span>
                  </div>
                  <div className="space-y-2">
                    {codes.map((cpt) => {
                      const isSelected = isCodeSelected(cpt.code);
                      const codeKey = `search-echo-${category}-${cpt.code}`;
                      return (
                        <div
                          key={codeKey}
                          onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-sky-500 bg-sky-100' : 'border-gray-200 hover:border-sky-300 bg-white'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sky-900">{cpt.code}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                  className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                >
                                  <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                </button>
                                {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                {cpt.rvu && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">RVU: {cpt.rvu}</span>}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* EP Search Results */}
            {searchQuery && Object.entries(filterCodes(epCategories, searchQuery)).map(([category, codes]) => (
              <div key={`search-ep-${category}`} className="border border-violet-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-violet-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-violet-500 rounded-full"></span>
                    <span className="font-semibold text-violet-900">Electrophysiology - {category}</span>
                  </div>
                  <div className="space-y-2">
                    {codes.map((cpt) => {
                      const isSelected = isCodeSelected(cpt.code);
                      const codeKey = `search-ep-${category}-${cpt.code}`;
                      return (
                        <div
                          key={codeKey}
                          onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-violet-500 bg-violet-100' : 'border-gray-200 hover:border-violet-300 bg-white'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-violet-900">{cpt.code}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                  className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                >
                                  <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                </button>
                                {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                {cpt.rvu && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">RVU: {cpt.rvu}</span>}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Custom Codes Search Results */}
            {searchQuery && customCodes.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-gray-500 rounded-full"></span>
                    <span className="font-semibold text-gray-900">Custom Codes</span>
                  </div>
                  <div className="space-y-2">
                    {customCodes.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase())).map((customCode) => {
                      const isSelected = isCodeSelected(customCode.code);
                      const codeKey = `search-custom-${customCode.code}`;
                      return (
                        <div
                          key={codeKey}
                          onClick={() => toggleCode(customCode.code, customCode.description, customCode.description)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-gray-500 bg-gray-100' : 'border-gray-200 hover:border-gray-400 bg-white'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-gray-500 border-gray-500' : 'border-gray-300'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{customCode.code}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(customCode.code); }}
                                  className={`p-1 rounded transition-all favorite-star ${isFavorite(customCode.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                >
                                  <Star size={14} className={isFavorite(customCode.code) ? 'fill-current' : ''} />
                                </button>
                                {customCode.rvu && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">RVU: {customCode.rvu}</span>}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">{customCode.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Peripheral Vascular Angiography Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-sky-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Peripheral Vascular Angiography')}
                  className="w-full flex items-center justify-between p-4 bg-sky-50 hover:bg-sky-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-sky-600 rounded-full"></span>
                    <span className="font-semibold text-sky-900 text-left">Peripheral Vascular Angiography</span>
                  </div>
                  {expandedCategories['Peripheral Vascular Angiography'] ? <ChevronDown size={20} className="text-sky-700" /> : <ChevronRight size={20} className="text-sky-700" />}
                </button>

                {expandedCategories['Peripheral Vascular Angiography'] && (
                  <div className="p-4 space-y-3">
                    {/* Aortoiliac/Abdominal Submenu */}
                    {['Aortoiliac/Abdominal', 'Lower Extremity', 'Upper Extremity', 'Renal', 'Mesenteric', 'Pelvic'].map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = cptCategories[subcat] || [];
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`peripheral-angio-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code && !sc.isDivider)).length > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code && !sc.isDivider)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`peripheral-angio-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`peripheral-angio-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                if (cpt.isDivider) {
                                  return (
                                    <div key={cpt.code} className="py-2 mt-2 first:mt-0">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-grow h-px bg-gray-300"></div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">{cpt.summary}</span>
                                        <div className="flex-grow h-px bg-gray-300"></div>
                                      </div>
                                    </div>
                                  );
                                }
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `peripheral-angio-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Peripheral Intervention Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-teal-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Peripheral Intervention')}
                  className="w-full flex items-center justify-between p-4 bg-teal-50 hover:bg-teal-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-teal-600 rounded-full"></span>
                    <span className="font-semibold text-teal-900 text-left">Peripheral Intervention</span>
                  </div>
                  {expandedCategories['Peripheral Intervention'] ? <ChevronDown size={20} className="text-teal-700" /> : <ChevronRight size={20} className="text-teal-700" />}
                </button>

                {expandedCategories['Peripheral Intervention'] && (
                  <div className="p-4 space-y-3">
                    {['Iliac', 'Femoral/Popliteal', 'Tibial/Peroneal', 'Inframalleolar'].map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = cptCategories[subcat] || [];
                      const isInframalleolar = subcat === 'Inframalleolar';
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`peripheral-int-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {isInframalleolar && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">NEW 2026</span>}
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`peripheral-int-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`peripheral-int-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `peripheral-int-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isNew && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">NEW 2026</span>}
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Venous Interventions Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-indigo-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Venous Interventions')}
                  className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                    <span className="font-semibold text-indigo-900 text-left">Venous Interventions</span>
                  </div>
                  {expandedCategories['Venous Interventions'] ? <ChevronDown size={20} className="text-indigo-700" /> : <ChevronRight size={20} className="text-indigo-700" />}
                </button>

                {expandedCategories['Venous Interventions'] && (
                  <div className="p-4 space-y-3">
                    {['Venography', 'IVC Filter', 'Venous Stenting', 'Venous Thrombectomy'].map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = cptCategories[subcat] || [];
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`venous-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`venous-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`venous-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `venous-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Miscellaneous Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Miscellaneous')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-gray-600 rounded-full"></span>
                    <span className="font-semibold text-gray-900 text-left">Miscellaneous</span>
                  </div>
                  {expandedCategories['Miscellaneous'] ? <ChevronDown size={20} className="text-gray-700" /> : <ChevronRight size={20} className="text-gray-700" />}
                </button>

                {expandedCategories['Miscellaneous'] && (
                  <div className="p-4 space-y-3">
                    {['Thrombolysis', 'Arterial Thrombectomy', 'Retrieval'].map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = cptCategories[subcat] || [];
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`misc-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length > 0 && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`misc-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`misc-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `misc-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Endovascular Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-rose-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Endovascular')}
                  className="w-full flex items-center justify-between p-4 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-rose-600 rounded-full"></span>
                    <span className="font-semibold text-rose-900 text-left">Endovascular</span>
                  </div>
                  {expandedCategories['Endovascular'] ? <ChevronDown size={20} className="text-rose-700" /> : <ChevronRight size={20} className="text-rose-700" />}
                </button>

                {expandedCategories['Endovascular'] && (
                  <div className="p-4 space-y-3">
                    {['Carotid/Cerebrovascular', 'Carotid Stenting', 'Thoracic Aortography', 'EVAR', 'TEVAR', 'Subclavian/Innominate', 'Renal Intervention', 'Mesenteric Intervention'].map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = cptCategories[subcat] || [];
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`endovascular-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code && !sc.isDivider)).length > 0 && (
                                <span className="px-2 py-0.5 bg-rose-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code && !sc.isDivider)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`endovascular-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`endovascular-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                if (cpt.isDivider) {
                                  return (
                                    <div key={cpt.code} className="py-2 mt-2 first:mt-0">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-grow h-px bg-gray-300"></div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">{cpt.summary}</span>
                                        <div className="flex-grow h-px bg-gray-300"></div>
                                      </div>
                                    </div>
                                  );
                                }
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `endovascular-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-indigo-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-gray-200 text-gray-500 hover:text-indigo-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-indigo-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Echocardiography Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-sky-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Echocardiography')}
                  className="w-full flex items-center justify-between p-4 bg-sky-50 hover:bg-sky-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-sky-600 rounded-full"></span>
                    <span className="font-semibold text-sky-900 text-left">Echocardiography</span>
                  </div>
                  {expandedCategories['Echocardiography'] ? <ChevronDown size={20} className="text-sky-700" /> : <ChevronRight size={20} className="text-sky-700" />}
                </button>

                {expandedCategories['Echocardiography'] && (
                  <div className="p-4 space-y-3">
                    {Object.keys(echoCategories).map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = echoCategories[subcat] || [];
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`echo-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length > 0 && (
                                <span className="px-2 py-0.5 bg-sky-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`echo-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`echo-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `echo-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-sky-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sky-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-sky-200 text-sky-700' : 'hover:bg-gray-200 text-gray-500 hover:text-sky-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                            {cpt.rvu && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">RVU: {cpt.rvu}</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-sky-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Electrophysiology Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-violet-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Electrophysiology')}
                  className="w-full flex items-center justify-between p-4 bg-violet-50 hover:bg-violet-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-violet-600 rounded-full"></span>
                    <span className="font-semibold text-violet-900 text-left">Electrophysiology</span>
                  </div>
                  {expandedCategories['Electrophysiology'] ? <ChevronDown size={20} className="text-violet-700" /> : <ChevronRight size={20} className="text-violet-700" />}
                </button>

                {expandedCategories['Electrophysiology'] && (
                  <div className="p-4 space-y-3">
                    {Object.keys(epCategories).map((subcat) => {
                      const subColors = categoryColors[subcat] || defaultCategoryColor;
                      const subCodes = epCategories[subcat] || [];
                      return (
                        <div key={subcat} className={`border ${subColors.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => toggleCategory(`ep-${subcat}`)}
                            className={`w-full flex items-center justify-between p-3 ${subColors.bg} ${subColors.hoverBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 ${subColors.dot} rounded-full`}></span>
                              <span className={`font-semibold ${subColors.text} text-left`}>{subcat}</span>
                              {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length > 0 && (
                                <span className="px-2 py-0.5 bg-violet-600 text-white text-xs rounded-full">
                                  {selectedCodes.filter(c => subCodes.some(sc => sc.code === c.code)).length}
                                </span>
                              )}
                            </div>
                            {expandedCategories[`ep-${subcat}`] ? <ChevronDown size={18} className={subColors.text} /> : <ChevronRight size={18} className={subColors.text} />}
                          </button>
                          {expandedCategories[`ep-${subcat}`] && (
                            <div className="p-3 space-y-2">
                              {subCodes.map((cpt) => {
                                const isSelected = isCodeSelected(cpt.code);
                                const codeKey = `ep-${subcat}-${cpt.code}`;
                                return (
                                  <div key={codeKey} className="space-y-2">
                                    <div
                                      onClick={() => toggleCode(cpt.code, cpt.description, cpt.summary)}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-grow text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-violet-900">{cpt.code}</span>
                                            {cpt.summary && cpt.description !== cpt.summary && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleDescription(codeKey); }}
                                                className={`p-1 rounded transition-colors ${expandedDescriptions[codeKey] ? 'bg-violet-200 text-violet-700' : 'hover:bg-gray-200 text-gray-500 hover:text-violet-600'}`}
                                                title={expandedDescriptions[codeKey] ? 'Hide full description' : 'Show full description'}
                                              >
                                                <Maximize2 size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleFavorite(cpt.code); }}
                                              className={`p-1 rounded transition-all favorite-star ${isFavorite(cpt.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                            >
                                              <Star size={14} className={isFavorite(cpt.code) ? 'fill-current' : ''} />
                                            </button>
                                            {cpt.isAddOn && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">ADD-ON</span>}
                                            {cpt.rvu && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">RVU: {cpt.rvu}</span>}
                                          </div>
                                          <div className="text-sm text-gray-700 mt-1">{cpt.summary || cpt.description}</div>
                                          {cpt.summary && cpt.description !== cpt.summary && expandedDescriptions[codeKey] && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 border-l-2 border-violet-300">
                                              {cpt.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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

            {/* Other (Custom Codes) Section */}
            {!searchQuery && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Other')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                    <span className="font-semibold text-gray-900 text-left">Other (Custom Codes)</span>
                    {customCodes.length > 0 && (
                      <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full">
                        {customCodes.length}
                      </span>
                    )}
                  </div>
                  {expandedCategories['Other'] ? <ChevronDown size={20} className="text-gray-700" /> : <ChevronRight size={20} className="text-gray-700" />}
                </button>

                {expandedCategories['Other'] && (
                  <div className="p-4 space-y-3">
                    {/* Add Custom Code Button */}
                    <button
                      onClick={() => {
                        setEditingCustomCode(null);
                        setNewCustomCode('');
                        setNewCustomDescription('');
                        setNewCustomRVU('');
                        setShowAddCustomCode(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Plus size={18} />
                      <span className="font-medium">Add Custom CPT Code</span>
                    </button>

                    {/* Custom Codes List */}
                    {customCodes.map((customCode) => {
                      const isSelected = isCodeSelected(customCode.code);
                      const codeKey = `custom-${customCode.code}`;
                      return (
                        <div key={codeKey} className="space-y-2">
                          <div
                            onClick={() => toggleCode(customCode.code, customCode.description, customCode.description)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-gray-500 bg-gray-100' : 'border-gray-200 hover:border-gray-400'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-gray-500 border-gray-500' : 'border-gray-300'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>
                              <div className="flex-grow text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">{customCode.code}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditCustomCode(customCode); }}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomCode(customCode); }}
                                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(customCode.code); }}
                                    className={`p-1 rounded transition-all favorite-star ${isFavorite(customCode.code) ? 'active' : 'text-gray-400 hover:text-amber-400'}`}
                                  >
                                    <Star size={14} className={isFavorite(customCode.code) ? 'fill-current' : ''} />
                                  </button>
                                  {customCode.rvu && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">RVU: {customCode.rvu}</span>}
                                </div>
                                <div className="text-sm text-gray-700 mt-1">{customCode.description}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {customCodes.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No custom codes yet. Add codes not in the standard library.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Custom Code Modal */}
        {showAddCustomCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCustomCode ? 'Edit Custom Code' : 'Add Custom CPT Code'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddCustomCode(false);
                    setEditingCustomCode(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPT Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomCode}
                    onChange={(e) => setNewCustomCode(e.target.value.toUpperCase())}
                    placeholder="e.g., 12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    maxLength={6}
                    disabled={!!editingCustomCode}
                  />
                  <p className="mt-1 text-xs text-gray-500">5-digit code or 4 digits + letter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newCustomDescription}
                    onChange={(e) => setNewCustomDescription(e.target.value)}
                    placeholder="Enter code description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RVU (optional)
                  </label>
                  <input
                    type="number"
                    value={newCustomRVU}
                    onChange={(e) => setNewCustomRVU(e.target.value)}
                    placeholder="e.g., 2.50"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 px-4 py-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddCustomCode(false);
                    setEditingCustomCode(null);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomCode}
                  disabled={!newCustomCode.trim() || !newCustomDescription.trim()}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCustomCode ? 'Update' : 'Add Code'}
                </button>
              </div>
            </div>
          </div>
        )}


        </>)}

        {/* === REVIEW TAB === */}
        {bottomTab === 'review' && (<>
        {/* Billing Rules Engine - Real-time Validation */}
        {ruleViolations.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle size={24} className={hasBlockingErrors ? 'text-red-500' : 'text-amber-500'} />
              Billing Rules Validation
              {hasBlockingErrors && (
                <span className="text-sm font-normal text-red-600">(Errors must be resolved)</span>
              )}
            </h2>

            <div className="space-y-3">
              {ruleViolations.map((violation) => {
                const rule = getRule(violation.ruleId);
                const isOverridden = overriddenRules.includes(violation.ruleId);

                return (
                  <div
                    key={violation.ruleId}
                    className={`p-4 border-l-4 rounded-lg transition-all ${
                      violation.severity === 'error'
                        ? 'rule-error border-l-red-500'
                        : violation.severity === 'warning'
                        ? 'rule-warning border-l-amber-500'
                        : 'rule-suggestion border-l-blue-500'
                    } ${isOverridden ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                            violation.severity === 'error'
                              ? 'bg-red-100 text-red-700'
                              : violation.severity === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {violation.severity}
                          </span>
                          <span className="font-semibold text-gray-800">
                            {rule?.name || violation.ruleId}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{violation.message}</p>
                        {violation.affectedCodes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {violation.affectedCodes.map(code => (
                              <span key={code} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                        {violation.suggestion && (
                          <p className="text-sm text-green-700 flex items-center gap-1">
                            <Check size={14} />
                            {violation.suggestion}
                          </p>
                        )}
                        {/* Fix Options */}
                        {violation.fixOptions && violation.fixOptions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500 self-center mr-1">Quick Fix:</span>
                            {violation.fixOptions.map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => applyRuleFix(option.codesToRemove, option.codeToAdd)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  violation.severity === 'error'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : violation.severity === 'warning'
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Learn More */}
                        {rule?.learnMoreContent && (
                          <button
                            onClick={() => setShowRuleDetails(showRuleDetails === violation.ruleId ? null : violation.ruleId)}
                            className="mt-2 text-sm text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <BookOpen size={14} />
                            {showRuleDetails === violation.ruleId ? 'Hide Details' : 'Learn More'}
                          </button>
                        )}
                        {showRuleDetails === violation.ruleId && rule?.learnMoreContent && (
                          <div className="mt-2 p-3 bg-indigo-50 rounded text-sm text-indigo-800">
                            {rule.learnMoreContent}
                          </div>
                        )}
                      </div>
                      {/* Override checkbox for warnings/suggestions */}
                      {violation.canOverride && violation.severity !== 'error' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isOverridden}
                            onChange={() => toggleRuleOverride(violation.ruleId)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-xs text-gray-600">Override</span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!hasBlockingErrors && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check size={20} className="inline-block text-green-600 mr-2" />
                <span className="text-green-700 font-medium">
                  All blocking errors resolved. Warnings reviewed.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Selected Codes Summary */}
        {(selectedCodes.length > 0 || selectedCodesVessel2.length > 0 || selectedCodesVessel3.length > 0) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Selected Codes Summary ({selectedCodes.length + selectedCodesVessel2.length + selectedCodesVessel3.length})
            </h2>
            
            {/* Primary Codes */}
            {selectedCodes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-indigo-700 mb-2">Primary Procedure Codes</h3>
                <div className="space-y-2">
                  {selectedCodes.map((cpt) => {
                    const isPCICode = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945'].includes(cpt.code);
                    const isDCBCode = ['0913T', '0914T'].includes(cpt.code);
                    const isImagingCode = ['92978', '92979', '93571', '93572', '0523T', '0524T'].includes(cpt.code);
                    const vessel = codeVessels[cpt.code];
                    const dcbVessel = dcbVessels[cpt.code];
                    const imgVessel = imagingVessels[cpt.code];

                    return (
                      <div key={cpt.code} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                        <div className="font-semibold text-indigo-900 min-w-[60px]">{cpt.code}</div>
                        <div className="flex-grow">
                          <div className="text-sm text-gray-700">{cpt.description}</div>
                          {isPCICode && vessel && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs font-semibold text-blue-700">Vessel:</span>
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                                {vessel}
                              </span>
                            </div>
                          )}
                          {isPCICode && !vessel && (
                            <div className="mt-1 text-xs text-red-600 font-semibold">
                              ⚠️ Vessel/modifier not selected
                            </div>
                          )}
                          {isDCBCode && dcbVessel && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs font-semibold text-teal-700">Target Vessel:</span>
                              <span className="px-2 py-0.5 bg-teal-600 text-white text-xs font-bold rounded">
                                {dcbVessel}
                              </span>
                            </div>
                          )}
                          {isDCBCode && !dcbVessel && (
                            <div className="mt-1 text-xs text-red-600 font-semibold">
                              ⚠️ Target vessel not selected
                            </div>
                          )}
                          {isImagingCode && imgVessel && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs font-semibold text-green-700">Vessel:</span>
                              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
                                {imgVessel}
                              </span>
                            </div>
                          )}
                          {isImagingCode && !imgVessel && (
                            <div className="mt-1 text-xs text-red-600 font-semibold">
                              ⚠️ Vessel not selected
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Vessel #1 Codes */}
            {selectedCodesVessel2.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-orange-700 mb-2">Additional Vessel #1 (Second Vessel)</h3>
                <div className="space-y-2">
                  {selectedCodesVessel2.map((cpt) => {
                    const vessel = codeVesselsV2[cpt.code];
                    
                    return (
                      <div key={`sum-add1-${cpt.code}`} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <div className="font-semibold text-orange-900 min-w-[60px]">{cpt.code}</div>
                        <div className="flex-grow">
                          <div className="text-sm text-gray-700">{cpt.description}</div>
                          {vessel && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs font-semibold text-orange-700">Vessel:</span>
                              <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded">
                                {vessel}
                              </span>
                            </div>
                          )}
                          {!vessel && (
                            <div className="mt-1 text-xs text-red-600 font-semibold">
                              ⚠️ Vessel/modifier not selected
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Vessel #2 Codes */}
            {selectedCodesVessel3.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-700 mb-2">Additional Vessel #2 (Third Vessel)</h3>
                <div className="space-y-2">
                  {selectedCodesVessel3.map((cpt) => {
                    const vessel = codeVesselsV3[cpt.code];
                    
                    return (
                      <div key={`sum-add2-${cpt.code}`} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="font-semibold text-purple-900 min-w-[60px]">{cpt.code}</div>
                        <div className="flex-grow">
                          <div className="text-sm text-gray-700">{cpt.description}</div>
                          {vessel && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs font-semibold text-purple-700">Vessel:</span>
                              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                                {vessel}
                              </span>
                            </div>
                          )}
                          {!vessel && (
                            <div className="mt-1 text-xs text-red-600 font-semibold">
                              ⚠️ Vessel/modifier not selected
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Analysis Section */}
        {(selectedCodes.length > 0 || selectedCodesVessel2.length > 0 || selectedCodesVessel3.length > 0) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>📋 Coding Feedback & Validation</span>
            </h2>
            
            {(() => {
              const feedback = generateFeedbackAnalysis();
              
              return (
                <div className="space-y-4">
                  {/* Errors */}
                  {feedback.errors.length > 0 && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <h3 className="font-semibold text-red-800 mb-2">❌ Errors - Must Fix Before Submitting</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.errors.map((error, idx) => (
                          <li key={idx} className="text-sm text-red-700">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Invalid Combinations */}
                  {feedback.invalidCombos.length > 0 && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Invalid Code Combinations</h3>
                      <div className="space-y-3">
                        {feedback.invalidCombos.map((combo, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="font-semibold text-yellow-900">{combo.codes}</div>
                            <div className="text-yellow-700 mt-1">Issue: {combo.issue}</div>
                            <div className="text-yellow-700 mt-1">Action: {combo.action}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {feedback.warnings.length > 0 && (
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Warnings - Review Carefully</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-blue-700">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Valid Codes to Submit */}
                  {feedback.validCodes.length > 0 && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                      <h3 className="font-semibold text-green-800 mb-2">✅ Codes to Submit</h3>
                      <div className="flex flex-wrap gap-2">
                        {feedback.validCodes.map((code, idx) => (
                          <span key={idx} className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {feedback.recommendations.length > 0 && (
                    <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                      <h3 className="font-semibold text-purple-800 mb-2">💡 Recommendations</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-purple-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.errors.length === 0 && feedback.invalidCombos.length === 0 && (
                    <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
                      <div className="text-2xl mb-2">✅</div>
                      <div className="font-semibold text-green-800">All codes validated successfully!</div>
                      <div className="text-sm text-green-700 mt-1">Ready to submit</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* CCI Edit Warnings */}
        {cciViolations.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-amber-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>CCI Edit Warnings ({cciViolations.length})</span>
            </h2>
            <div className="space-y-3">
              {cciViolations.map((v, i) => (
                <div key={i} className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                    <span className="px-2 py-0.5 bg-amber-200 rounded text-xs font-bold">{v.column1Code}</span>
                    <span className="text-amber-600">bundles</span>
                    <span className="px-2 py-0.5 bg-amber-200 rounded text-xs font-bold">{v.column2Code}</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">{v.description}</p>
                  {v.modifierException && (
                    <p className="text-xs text-amber-600 mt-1">Modifier exception: May be billed separately with appropriate modifier</p>
                  )}
                </div>
              ))}
              <p className="text-xs text-amber-600 mt-2">
                CCI warnings do not block submission. Review and apply modifiers if appropriate.
              </p>
            </div>
          </div>
        )}

        {/* RVU and Reimbursement Analysis - Updates dynamically as codes are added/removed */}
        {(selectedCodes.length > 0 || selectedCodesVessel2.length > 0 || selectedCodesVessel3.length > 0 || includeSedation) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>💰 Physician Work RVU & Reimbursement</span>
              <span className="text-sm font-normal text-gray-500">
                ({selectedCodes.length + selectedCodesVessel2.length + selectedCodesVessel3.length} procedure{selectedCodes.length + selectedCodesVessel2.length + selectedCodesVessel3.length !== 1 ? 's' : ''} selected)
              </span>
            </h2>
            
            {(() => {
              const rvuCalc = calculateRVUAndReimbursement();
              // Calculate physician-only payment (approximately 58% of total for work component)
              const physicianPayment = (parseFloat(rvuCalc.totalWorkRVU) * 36.04).toFixed(2);
              const hasUnknownCodes = rvuCalc.breakdown.some(item => item.noData);
              
              return (
                <div className="space-y-4">
                  {/* Summary Cards - Physician Only */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <div className="text-sm text-blue-700 font-semibold">Physician Work RVUs</div>
                      <div className="text-3xl font-bold text-blue-900 mt-1">{rvuCalc.totalWorkRVU}</div>
                      <div className="text-xs text-blue-600 mt-1">Professional component only</div>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="text-sm text-green-700 font-semibold">Est. Physician Payment</div>
                      <div className="text-3xl font-bold text-green-900 mt-1">${physicianPayment}</div>
                      <div className="text-xs text-green-600 mt-1">2026 Medicare (CF $36.04)</div>
                    </div>
                  </div>

                  {/* Breakdown Table - Physician Only */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">Physician Work RVU Breakdown</h3>
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                        <span>RVU</span>
                        <span>Est $</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {rvuCalc.breakdown.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500 text-sm italic">
                          Select procedure codes to see RVU breakdown
                        </div>
                      ) : (
                        rvuCalc.breakdown.map((item, idx) => (
                          <div key={idx} className={`px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 ${item.noData ? 'bg-yellow-50' : ''}`}>
                            <div className="flex items-baseline gap-2 min-w-0 flex-1">
                              <span className="font-mono font-semibold text-gray-800 flex-shrink-0">{item.code}</span>
                              {item.description && (
                                <span className="text-sm text-gray-500 truncate">{item.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm flex-shrink-0">
                              {item.noData ? (
                                <div className="text-yellow-600 text-xs">RVU data pending</div>
                              ) : (
                                <>
                                  <div className="text-blue-700 whitespace-nowrap">
                                    <span className="font-semibold">{item.workRVU.toFixed(2)}</span>
                                  </div>
                                  <div className="text-green-700 font-bold whitespace-nowrap">
                                    ${(item.workRVU * 36.04).toFixed(0)}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Warning for codes without RVU data */}
                  {hasUnknownCodes && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>Note:</strong> Some codes do not have RVU data in the system. 
                      Please verify reimbursement values with the current CMS fee schedule.
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <strong>Note:</strong> Values shown represent physician work RVUs and professional component payment only (2026 CF = $36.04). 
                    Facility fees are billed separately by the hospital. Actual payment varies by geographic location (GPCI adjustments). 
                    Commercial payer rates typically 150-250% of Medicare.
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Submit Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{editingChargeId ? 'Update Charge' : 'Submit Charges'}</h2>

          {showChargeSubmitted && submittedChargeInfo ? (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="flex flex-col items-center gap-3 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={32} className="text-green-600" />
                </div>
                <span className="text-lg font-semibold text-green-800">{editingChargeId ? 'Charge Updated Successfully' : 'Charge Submitted Successfully'}</span>
              </div>

              {/* Pro Mode Summary */}
              {isProMode && (
                <>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Codes submitted</span>
                      <span className="font-medium text-gray-900">{submittedChargeInfo.codeCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total RVU</span>
                      <span className="font-medium text-gray-900">{submittedChargeInfo.totalRVU.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                      <span className="text-gray-600">Est. Medicare Payment</span>
                      <span className="font-semibold text-green-700">${submittedChargeInfo.estimatedPayment.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Charge is available for review in the Admin Portal.
                  </p>
                </>
              )}

              {/* Individual Mode: Clipboard copy + Report preview */}
              {!isProMode && (
                <>
                  <button
                    onClick={async () => {
                      const report = generateEmailBody();
                      try {
                        await navigator.clipboard.writeText(report);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2500);
                      } catch {
                        // Fallback for older browsers
                        const textarea = document.createElement('textarea');
                        textarea.value = report;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2500);
                      }
                    }}
                    className={`w-full py-3 px-4 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      copySuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <Check size={18} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Copy Report to Clipboard
                      </>
                    )}
                  </button>
                  <textarea
                    readOnly
                    value={generateEmailBody()}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-gray-50 text-gray-800 resize-y"
                  />
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowChargeSubmitted(false);
                    setEditingChargeId(null);
                    setEditingChargeDate(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowChargeSubmitted(false);
                    setSubmittedChargeInfo(null);
                    setEditingChargeId(null);
                    setEditingChargeDate(null);
                    setSelectedCodes([]);
                    setSelectedCodesVessel2([]);
                    setSelectedCodesVessel3([]);
                    setCodeVessels({});
                    setCodeVesselsV2({});
                    setCodeVesselsV3({});
                    setPatientName('');
                    setPatientDob('');
                    setPatientDobDisplay('');
                    setMatchedPatient(null);
                    setShowSuggestions(false);
                    setPatientSuggestions([]);
                    setProcedureDateOption('today');
                    setProcedureDateText(new Date().toISOString().split('T')[0]);
                    setSelectedLocation('');
                    setIncludeSedation(false);
                    setSedationUnits(0);
                    setSelectedCardiacIndication('');
                    setSelectedPeripheralIndication('');
                    setSelectedStructuralIndication('');
                    setIndicationSearch('');
                    setCopySuccess(false);
                    setPhiBypassOnce(false);
                  }}
                  className="flex-1 py-2.5 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg transition-colors"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                id="submit-charges-btn"
                onClick={handleSubmitCharges}
                className={`w-full font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  editingChargeId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Check size={20} />
                {editingChargeId ? 'Update Charge' : 'Submit Charges'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                {editingChargeId
                  ? 'This will update the existing charge. Status will reset to pending if previously entered.'
                  : isProMode
                    ? 'Charges will be saved and available for review in Admin Portal.'
                    : 'Charges will be saved locally. Use "Copy Report to Clipboard" to email to your billing office.'}
              </p>
            </div>
          )}
        </div>

        </>)}

        {/* Footer with HIPAA notice */}
        <div className="text-center text-sm text-gray-500 pb-4">
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>PHI Caution:</strong> This application processes protected health information (PHI).
              All data is encrypted at rest and in transit. Do not share patient information
              outside of authorized clinical and billing workflows.
            </p>
          </div>
          <p>CPT® codes © American Medical Association. All rights reserved.</p>
          <p className="mt-1">CathCPT uses 2026 CPT codes</p>
          <p className="mt-1 text-xs">Last Updated: February 2026 - v2.4</p>
          <p className="mt-4 text-lg font-bold" style={{ color: '#7C3AED' }}>A product of Lumen Innovations</p>
        </div>
      </div>

      {/* Code Group Settings Modal */}
      <CodeGroupSettings
        isOpen={showCodeGroupSettings}
        onClose={() => setShowCodeGroupSettings(false)}
        onSettingsChanged={() => {
          // Settings are saved to storage - they will take effect on next app load
          // No action needed here - stay on the settings screen
        }}
      />
    </div>
  );
});

export default CardiologyCPTApp;