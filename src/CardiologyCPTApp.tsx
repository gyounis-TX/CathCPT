// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Check, Settings, X, Save, Info, AlertCircle, DollarSign, Maximize2, Shield, Search, Star, FileText, History, Clock, Download, Trash2, Copy, BookOpen, Lightbulb, List, Sparkles } from 'lucide-react';
import { CaseTemplate, SavedCase, RuleViolation, PHIMatch } from './types';
import { builtInTemplates, createCustomTemplate } from './data/templates';
import { runBillingRules, createBillingContext, getRule } from './data/billingRules';
import { cptCategories } from './data/cptCategories';
import { scanFieldsForPHI, scrubPHI, getPHISummary } from './services/phiScanner';

// Category color mapping for visual distinction
const categoryColors: Record<string, { dot: string; bg: string; text: string; border: string; hoverBg: string }> = {
  'Diagnostic Cardiac': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100' },
  'PCI': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  'PCI Add-on Procedures': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
  'Intravascular Imaging & Physiology': { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', hoverBg: 'hover:bg-cyan-100' },
  'Structural Heart Interventions': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100' },
  'TAVR': { dot: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', hoverBg: 'hover:bg-pink-100' },
  // Peripheral Vascular Angiography submenus
  'Peripheral Vascular Angiography': { dot: 'bg-slate-600', bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-300', hoverBg: 'hover:bg-slate-100' },
  'Aortoiliac/Abdominal': { dot: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-200', hoverBg: 'hover:bg-slate-100' },
  'Lower Extremity': { dot: 'bg-stone-500', bg: 'bg-stone-50', text: 'text-stone-900', border: 'border-stone-200', hoverBg: 'hover:bg-stone-100' },
  'Upper Extremity': { dot: 'bg-zinc-500', bg: 'bg-zinc-50', text: 'text-zinc-900', border: 'border-zinc-200', hoverBg: 'hover:bg-zinc-100' },
  'Renal': { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100' },
  'Mesenteric': { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', hoverBg: 'hover:bg-orange-100' },
  'Pelvic': { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-100' },
  // Peripheral Intervention submenus
  'Peripheral Intervention': { dot: 'bg-teal-600', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-300', hoverBg: 'hover:bg-teal-100' },
  'Iliac': { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200', hoverBg: 'hover:bg-teal-100' },
  'Femoral/Popliteal': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', hoverBg: 'hover:bg-green-100' },
  'Tibial/Peroneal': { dot: 'bg-lime-500', bg: 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-200', hoverBg: 'hover:bg-lime-100' },
  'Inframalleolar': { dot: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-100' },
  'IVC Filter Procedures': { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100' },
  'Adjunctive Procedures': { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100' },
  'MCS': { dot: 'bg-red-600', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
};

// Default colors for categories not in mapping
const defaultCategoryColor = { dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-200', hoverBg: 'hover:bg-gray-100' };

const CardiologyCPTApp = () => {
  const [caseId, setCaseId] = useState('');
  const [procedureDateOption, setProcedureDateOption] = useState('');
  const [procedureDateText, setProcedureDateText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [includeSedation, setIncludeSedation] = useState(false);
  const [sedationUnits, setSedationUnits] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
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
  const [expandedIndicationSections, setExpandedIndicationSections] = useState({ cardiac: false, peripheral: false, structural: false });
  const [expandedSedation, setExpandedSedation] = useState(false);

  // === NEW FEATURE STATE ===
  // Feature 1: Code Search
  const [searchQuery, setSearchQuery] = useState('');

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

  // Feature 6: PHI Scrubbing
  const [phiMatches, setPhiMatches] = useState<PHIMatch[]>([]);
  const [showPHIWarning, setShowPHIWarning] = useState(false);
  const [phiAutoScrub, setPhiAutoScrub] = useState(false);
  const [phiBypassOnce, setPhiBypassOnce] = useState(false);
  const [pendingReportGeneration, setPendingReportGeneration] = useState(false);

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

        // Load PHI settings
        const phiResult = await window.storage.get('cathcpt_phi_settings');
        if (phiResult?.value) {
          const phiSettings = JSON.parse(phiResult.value);
          setPhiAutoScrub(phiSettings.autoScrub || false);
        }
      } catch (error) {
        // If storage fails, use defaults
        console.log('Loading settings from storage failed, using defaults');
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

  // PHI scanning on case ID changes
  useEffect(() => {
    if (caseId) {
      const matches = scanFieldsForPHI({ caseId });
      setPhiMatches(matches);
    } else {
      setPhiMatches([]);
    }
  }, [caseId]);

  // Handle pending report generation after PHI bypass
  useEffect(() => {
    if (pendingReportGeneration && phiBypassOnce) {
      setPendingReportGeneration(false);
      // Small delay to ensure state is updated before triggering
      setTimeout(() => {
        const btn = document.getElementById('generate-report-btn');
        if (btn) btn.click();
      }, 50);
    }
  }, [pendingReportGeneration, phiBypassOnce]);

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
    Object.values(cptCategories).forEach(codes => {
      codes.forEach(code => {
        if (favorites.includes(code.code)) {
          allCodes.push(code);
        }
      });
    });
    return allCodes;
  }, [favorites]);

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
      caseId: caseId,
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
  }, [caseId, selectedLocation, selectedCodes, selectedCodesVessel2, selectedCodesVessel3, codeVessels, codeVesselsV2, codeVesselsV3, selectedCardiacIndication, selectedPeripheralIndication, selectedStructuralIndication, caseHistory]);

  const loadFromHistory = useCallback((savedCase: SavedCase) => {
    setCaseId(savedCase.caseId);
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

  // Feature 6: PHI Scrubbing
  const handlePHIScrub = useCallback(() => {
    if (phiMatches.length > 0) {
      const scrubbed = scrubPHI(caseId);
      setCaseId(scrubbed);
      setPhiMatches([]);
      setShowPHIWarning(false);
    }
  }, [caseId, phiMatches]);

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
    '33989': { rvus: 8.34, payment: 300.70 }
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

    // IVC Filter Procedures
    '37191': { workRVU: 4.00, totalRVU: 10.00, fee: 360 },
    '37192': { workRVU: 5.00, totalRVU: 12.50, fee: 450 },
    '37193': { workRVU: 6.50, totalRVU: 16.00, fee: 576 },

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
    '33995': { workRVU: 13.00, totalRVU: 31.00, fee: 1023 },
    '33997': { workRVU: 15.00, totalRVU: 36.00, fee: 1188 }
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

  const toggleCode = (code, description) => {
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
        return [...prev, { code, description }];
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
  const toggleCodeV2 = (code, description) => {
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
        return [...prev, { code, description }];
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
  const toggleCodeV3 = (code, description) => {
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
        return [...prev, { code, description }];
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
      console.error('Failed to save settings:', error);
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

  const generateEmailBody = () => {
    const bundlingAnalysis = analyzeBundlingRules();
    
    // Combine all codes from all sections
    const allCodes = [...selectedCodes, ...selectedCodesVessel2, ...selectedCodesVessel3];
    
    // Check if any PCI codes are selected (need this to determine if -59 modifier is needed)
    const pciCodeList = ['92920', '92924', '92928', '92930', '92933', '92937', '92941', '92943', '92945', '0913T', '0914T'];
    const hasPCI = allCodes.some(c => pciCodeList.includes(c.code));
    
    // Diagnostic cardiac catheterization codes that need -59 modifier when PCI is also performed
    const diagnosticCathCodes = ['93454', '93455', '93456', '93457', '93458', '93459', '93460', '93461'];
    
    const codesText = allCodes.map(c => {
      const isPCICode = pciCodeList.includes(c.code);
      const isDiagnosticCath = diagnosticCathCodes.includes(c.code);
      const vessel = codeVessels[c.code] || codeVesselsV2[c.code] || codeVesselsV3[c.code];
      
      if (isPCICode && vessel) {
        // Extract just the modifier (e.g., "LD" from "LAD (LD)")
        const modifier = vessel.match(/\(([^)]+)\)/)?.[1] || '';
        return `${c.code}-${modifier} - ${c.description} [${vessel}]`;
      }
      
      // Add -59 modifier to diagnostic cath codes when PCI is also being performed
      if (isDiagnosticCath && hasPCI) {
        return `${c.code}-59 - ${c.description} [Modifier -59: Distinct procedural service - required when billing diagnostic cath with PCI same session]`;
      }
      
      return `${c.code} - ${c.description}`;
    }).join('\n');
    
    let sedationText = '';
    if (includeSedation) {
      sedationText = '\n\nModerate Sedation:\n99152 - Moderate sedation services, initial 15 minutes (x1)';
      if (sedationUnits > 0) {
        sedationText += `\n99153 - Each additional 15 minutes (x${sedationUnits})`;
      }
    }
    
    // Remove the old vesselsText section as it's now per-code
    let vesselsText = '';
    
    // Collect all selected indications
    const indications = [];
    
    if (selectedCardiacIndication) {
      if (selectedCardiacIndication === 'other') {
        indications.push(`Cardiac: Other - ${otherCardiacIndication}`);
      } else {
        const indication = cardiacIndications.find(ind => ind.code === selectedCardiacIndication);
        indications.push(`Cardiac: ${indication.code} - ${indication.description}`);
      }
    }
    
    if (selectedPeripheralIndication) {
      if (selectedPeripheralIndication === 'other') {
        indications.push(`Peripheral: Other - ${otherPeripheralIndication}`);
      } else {
        const indication = peripheralIndications.find(ind => ind.code === selectedPeripheralIndication);
        indications.push(`Peripheral: ${indication.code} - ${indication.description}`);
      }
    }
    
    if (selectedStructuralIndication) {
      if (selectedStructuralIndication === 'other') {
        indications.push(`Structural: Other - ${otherStructuralIndication}`);
      } else {
        const indication = structuralIndications.find(ind => ind.code === selectedStructuralIndication);
        indications.push(`Structural: ${indication.code} - ${indication.description}`);
      }
    }
    
    // Billing guidance section
    let billingGuidance = '\n\n' + '='.repeat(60) + '\nBILLING GUIDANCE & NCCI COMPLIANCE\n' + '='.repeat(60);
    
    // Billable codes
    if (bundlingAnalysis.billable.length > 0) {
      billingGuidance += '\n\nCODES TO BILL:\n';
      bundlingAnalysis.billable.forEach(item => {
        billingGuidance += `\n${item.code} - ${item.reason}`;
      });
    }
    
    // Bundled codes
    if (bundlingAnalysis.bundled.length > 0) {
      billingGuidance += '\n\nCODES NOT SEPARATELY BILLABLE (Bundled):\n';
      bundlingAnalysis.bundled.forEach(item => {
        billingGuidance += `\n${item.code} - ${item.reason}`;
      });
    }
    
    // Warnings and special considerations
    if (bundlingAnalysis.warnings.length > 0) {
      billingGuidance += '\n\n⚠️ IMPORTANT BILLING CONSIDERATIONS:\n';
      bundlingAnalysis.warnings.forEach((warning, index) => {
        billingGuidance += `\n\n${index + 1}. ${warning.type}:\n${warning.message}`;
        if (warning.criteria && warning.criteria.length > 0) {
          warning.criteria.forEach(criterion => {
            billingGuidance += `\n   • ${criterion}`;
          });
        }
      });
    }
    
    billingGuidance += '\n\n' + '='.repeat(60);
    billingGuidance += '\nNOTE: Always verify with current NCCI edits and payer-specific policies.';
    billingGuidance += '\nDocument medical necessity for all separately billed services.';
    billingGuidance += '\n' + '='.repeat(60);
    
    // Get procedure date display text
    const getProcedureDateDisplay = () => {
      switch (procedureDateOption) {
        case 'today': return 'Today';
        case 'this_week': return 'This Week';
        case 'this_month': return 'This Month';
        case 'other': return procedureDateText || 'Not specified';
        default: return 'Not specified';
      }
    };
    
    return `${'*'.repeat(60)}
CONFIDENTIAL - For coding reference only
Do not forward. Delete after billing complete.
Contains limited dataset - not full PHI.
${'*'.repeat(60)}

Physician: ${cardiologistName}

Case Information:
Case ID: ${caseId}
Procedure Timeframe: ${getProcedureDateDisplay()}
Location: ${selectedLocation}
${indications.length > 0 ? `
${'='.repeat(60)}
PROCEDURE INDICATION(S) / ICD-10:
${'='.repeat(60)}
${indications.join('\n')}
` : ''}
CPT Codes Performed (2026):
${codesText}${sedationText}

Total Procedures: ${allCodes.length}${includeSedation ? ` + Moderate Sedation (${15 + (sedationUnits * 15)} minutes)` : ''}${billingGuidance}

${'*'.repeat(60)}
Generated by CathCPT - Coding Reference Tool
This document does not contain Protected Health Information (PHI)
${'*'.repeat(60)}`;
  };

  const handleGenerateReport = async () => {
    // Validate required fields
    if (!caseId) {
      alert('Please enter a Case ID or MRN (last 4 digits)');
      return;
    }

    if (!procedureDateOption) {
      alert('Please select a procedure timeframe');
      return;
    }

    if (procedureDateOption === 'other' && !procedureDateText) {
      alert('Please enter a procedure timeframe description');
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
      alert('Please resolve all billing rule errors before generating the report.');
      return;
    }

    // Check for PHI if auto-scrub is enabled
    if (phiMatches.length > 0 && !phiBypassOnce) {
      if (phiAutoScrub) {
        handlePHIScrub();
      } else {
        // Show PHI warning modal and block report generation
        setShowPHIWarning(true);
        return; // Stop here - user must take action in modal
      }
    }
    // Reset bypass flag after use
    if (phiBypassOnce) {
      setPhiBypassOnce(false);
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

    // Save to history
    await saveToHistory();

    // Show the success message with the report
    setShowSuccessMessage(true);
  };
  
  // Copy report to clipboard function
  const copyReportToClipboard = async () => {
    const reportText = generateEmailBody();
    try {
      await navigator.clipboard.writeText(reportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      // Fallback: select the textarea content
      const textarea = document.getElementById('report-textarea');
      if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile
        try {
          document.execCommand('copy');
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        } catch (e) {
          alert('Please manually select and copy the text from the report box.');
        }
      }
    }
  };
  
  const [copySuccess, setCopySuccess] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* CathCPT App Icon - Matching uploaded design */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="bgGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4A84B"/>
                    <stop offset="50%" stopColor="#C49A3D"/>
                    <stop offset="100%" stopColor="#9A7830"/>
                  </linearGradient>
                  <linearGradient id="textGold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F5E6B0"/>
                    <stop offset="25%" stopColor="#E8D48A"/>
                    <stop offset="50%" stopColor="#D4B254"/>
                    <stop offset="75%" stopColor="#B8922E"/>
                    <stop offset="100%" stopColor="#8B6914"/>
                  </linearGradient>
                </defs>
                {/* Background */}
                <rect width="100" height="100" rx="18" fill="url(#bgGold)"/>
                {/* Anatomical Heart */}
                <g transform="translate(28, 5) scale(0.52)">
                  <path d="M42,22 C52,8 82,12 82,42 C82,68 42,92 42,92 C42,92 2,68 2,42 C2,12 32,8 42,22" fill="#8B1538"/>
                  <path d="M32,18 C26,4 42,0 42,0 C42,0 58,4 52,18" fill="#7A1230"/>
                  <path d="M56,14 C64,6 74,8 78,14" stroke="#7A1230" strokeWidth="7" fill="none" strokeLinecap="round"/>
                  <path d="M28,14 C20,6 10,8 6,14" stroke="#7A1230" strokeWidth="7" fill="none" strokeLinecap="round"/>
                  <path d="M42,28 C38,48 34,68 30,85" stroke="#A82040" strokeWidth="2" fill="none" opacity="0.5"/>
                  <path d="M42,28 C46,48 50,68 54,85" stroke="#A82040" strokeWidth="2" fill="none" opacity="0.5"/>
                  <path d="M22,42 C28,58 26,75 24,85" stroke="#A82040" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <path d="M62,42 C56,58 58,75 60,85" stroke="#A82040" strokeWidth="1.5" fill="none" opacity="0.4"/>
                </g>
                {/* CPT Text */}
                <text x="50" y="64" fontSize="34" fontWeight="900" fill="url(#textGold)" textAnchor="middle" fontFamily="Arial Black, sans-serif" style={{textShadow: '1px 2px 2px rgba(90,64,16,0.4)'}}>CPT</text>
                {/* CathCPT label */}
                <text x="50" y="90" fontSize="14" fontWeight="bold" fill="#6B4423" textAnchor="middle" fontFamily="Arial, sans-serif">CathCPT</text>
              </svg>
            </div>
            
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-amber-700 mb-1">CathCPT</h1>
              <p className="text-sm sm:text-base text-gray-600">Interventional Cardiology Code Manager - 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* History Button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors relative"
              title="Case History"
            >
              <History size={24} className="text-blue-700" />
              {caseHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {caseHistory.length > 9 ? '9+' : caseHistory.length}
                </span>
              )}
            </button>
            {/* 2026 Updates Button */}
            <button
              onClick={() => setShow2026Updates(true)}
              className="p-3 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
              title="What's New in 2026"
            >
              <Lightbulb size={24} className="text-yellow-700" />
            </button>
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
            >
              <Settings size={24} className="text-indigo-700" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
              <button onClick={() => setShowSettings(false)}>
                <X size={24} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Physician Name
                </label>
                <input
                  type="text"
                  value={cardiologistName}
                  onChange={(e) => setCardiologistName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800"
                  placeholder="Dr. John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cath Lab Locations
                </label>
                <div className="space-y-2 mb-3">
                  {cathLocations.map((location, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="flex-grow text-gray-700">{location}</span>
                      <button
                        onClick={() => removeLocation(location)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800"
                    placeholder="Add new location"
                  />
                  <button
                    onClick={addLocation}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* PHI Settings */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PHI Protection Settings
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={phiAutoScrub}
                    onChange={async (e) => {
                      setPhiAutoScrub(e.target.checked);
                      await window.storage.set('cathcpt_phi_settings', JSON.stringify({ autoScrub: e.target.checked }));
                    }}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <div>
                    <div className="font-semibold text-gray-800">Auto-scrub PHI</div>
                    <div className="text-sm text-gray-600">Automatically remove detected PHI before generating reports</div>
                  </div>
                </label>
              </div>

              <button
                onClick={saveSettings}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={20} />
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* PHI Warning Modal */}
        {showPHIWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-4 bg-red-600">
                <div className="flex items-center gap-3">
                  <Shield size={32} className="text-white" />
                  <div>
                    <h2 className="text-xl font-bold text-white">PHI Detected</h2>
                    <p className="text-red-100 text-sm">Protected Health Information found</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-700 mb-4">
                  The following potential PHI was detected in your case information:
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <ul className="space-y-2">
                    {phiMatches.map((match, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          match.severity === 'high'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {match.severity.toUpperCase()}
                        </span>
                        <span className="text-gray-700">
                          {match.pattern}: <code className="bg-gray-100 px-1 rounded">{match.value}</code>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  HIPAA requires that PHI be removed before sharing billing documents. Choose an action below:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handlePHIScrub();
                      setShowPHIWarning(false);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Shield size={20} />
                    Scrub PHI & Generate Report
                  </button>
                  <button
                    onClick={() => setShowPHIWarning(false)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Go Back & Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowPHIWarning(false);
                      setPhiBypassOnce(true);
                      setPendingReportGeneration(true);
                    }}
                    className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    Proceed Anyway (Not Recommended)
                  </button>
                </div>
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

          {/* HIPAA Privacy Notice */}
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-800 mb-1">HIPAA Privacy Notice</h3>
                <p className="text-sm text-yellow-800">
                  Do <strong>NOT</strong> enter patient names or full dates of birth. Use internal
                  case IDs only. This tool is for coding assistance only and does
                  not store Protected Health Information (PHI).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Case ID or MRN (last 4 digits only) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  maxLength={50}
                  style={phiMatches.length > 0 ? { border: '3px solid #EF4444', borderRadius: '8px' } : {}}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800 ${
                    phiMatches.length > 0 ? '' : 'border-gray-300'
                  }`}
                  placeholder="e.g., CASE-1234"
                />
                {phiMatches.length > 0 && (
                  <button
                    onClick={handlePHIScrub}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '4px 8px', backgroundColor: '#EF4444', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: 'none' }}
                  >
                    Scrub PHI
                  </button>
                )}
              </div>
              {/* PHI Warning */}
              {phiMatches.length > 0 && (
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#FEE2E2', border: '2px solid #EF4444', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#991B1B', margin: 0 }}>⚠️ Potential PHI Detected!</p>
                      <ul style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px', paddingLeft: '16px' }}>
                        {phiMatches.map((match, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            <span style={{ backgroundColor: '#FECACA', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              {match.pattern}
                            </span>: "{match.value}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">For internal reference only - do not enter full MRN</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedure Timeframe *
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'other', label: 'Other' }
                ].map((option) => (
                  <label 
                    key={option.value}
                    className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      procedureDateOption === option.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="procedureDate"
                      value={option.value}
                      checked={procedureDateOption === option.value}
                      onChange={(e) => {
                        setProcedureDateOption(e.target.value);
                        if (e.target.value !== 'other') {
                          setProcedureDateText('');
                        }
                      }}
                      className="sr-only"
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
              {procedureDateOption === 'other' && (
                <input
                  type="text"
                  value={procedureDateText}
                  onChange={(e) => setProcedureDateText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Last Tuesday, 2 weeks ago, Q4 2025"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">Use relative dates only - do not enter specific dates</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedure Location *
              </label>
              <div className="space-y-2">
                {cathLocations.map((location, index) => (
                  <label key={index} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-gray-50 transition-all">
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
                ))}
                {cathLocations.length === 0 && (
                  <p className="text-gray-500 text-sm italic">No locations configured. Please add locations in Settings.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Procedure Indication Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={22} className="text-amber-500" />
            Procedure Indications (ICD-10)
          </h2>
          <p className="text-sm text-gray-600 mb-4">Select one indication from each applicable category</p>
          
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

          {/* Peripheral Vascular Indications */}
          <div className="mb-6">
            <button
              onClick={() => setExpandedIndicationSections(prev => ({ ...prev, peripheral: !prev.peripheral }))}
              className="w-full text-lg font-semibold text-green-900 mb-3 flex items-center gap-2 hover:bg-green-50 p-2 rounded-lg transition-colors"
            >
              {expandedIndicationSections.peripheral ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Peripheral Vascular Indications
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

          {/* Structural Heart Indications */}
          <div>
            <button
              onClick={() => setExpandedIndicationSections(prev => ({ ...prev, structural: !prev.structural }))}
              className="w-full text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2 hover:bg-purple-50 p-2 rounded-lg transition-colors"
            >
              {expandedIndicationSections.structural ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              Structural Heart Indications
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
                      onClick={() => toggleCode(cpt.code, cpt.description)}
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
          {searchQuery && Object.keys(filterCodes(cptCategories, searchQuery)).length === 0 && (
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
                                      onClick={() => toggleCode(cpt.code, cpt.description)}
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
                                      onClick={() => toggleCodeV2(cpt.code, cpt.description)}
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
                                      onClick={() => toggleCodeV3(cpt.code, cpt.description)}
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

              // Skip peripheral subcategories - they're rendered inside parent dropdowns
              const peripheralAngiographyCategories = ['Aortoiliac/Abdominal', 'Lower Extremity', 'Upper Extremity', 'Renal', 'Mesenteric', 'Pelvic'];
              const peripheralInterventionCategories = ['Iliac', 'Femoral/Popliteal', 'Tibial/Peroneal', 'Inframalleolar'];

              if (peripheralAngiographyCategories.includes(category) || peripheralInterventionCategories.includes(category)) {
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
                              onClick={() => toggleCode(cpt.code, cpt.description)}
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

            {/* Peripheral Vascular Angiography Parent Dropdown */}
            {!searchQuery && (
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('Peripheral Vascular Angiography')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-600 rounded-full"></span>
                    <span className="font-semibold text-slate-900 text-left">Peripheral Vascular Angiography</span>
                  </div>
                  {expandedCategories['Peripheral Vascular Angiography'] ? <ChevronDown size={20} className="text-slate-700" /> : <ChevronRight size={20} className="text-slate-700" />}
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
                                      onClick={() => toggleCode(cpt.code, cpt.description)}
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
                                      onClick={() => toggleCode(cpt.code, cpt.description)}
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
          </div>
        </div>


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
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800">Physician Work RVU Breakdown</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {rvuCalc.breakdown.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500 text-sm italic">
                          Select procedure codes to see RVU breakdown
                        </div>
                      ) : (
                        rvuCalc.breakdown.map((item, idx) => (
                          <div key={idx} className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 ${item.noData ? 'bg-yellow-50' : ''}`}>
                            <div>
                              <div className="font-semibold text-gray-800">{item.code}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500">{item.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              {item.noData ? (
                                <div className="text-yellow-600 text-xs">RVU data pending</div>
                              ) : (
                                <>
                                  <div className="text-blue-700">
                                    Work RVU: <span className="font-semibold">{item.workRVU.toFixed(2)}</span>
                                  </div>
                                  <div className="text-green-700 font-bold">
                                    ${(item.workRVU * 36.04).toFixed(2)}
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Generate Coding Report</h2>
          
          {showSuccessMessage ? (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg">
                <Check size={20} className="text-green-600" />
                <span className="font-semibold text-green-800">Report Generated Successfully!</span>
              </div>
              
              {/* Security Warning */}
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-800 mb-1">⚠️ SECURE EMAIL ONLY</h3>
                    <p className="text-sm text-red-700">
                      If sharing this report electronically, use your organization's <strong>secure/encrypted email system only</strong>. 
                      Do not send via personal email or unencrypted channels.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-2">To use this report:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the <strong>"Copy Report"</strong> button below</li>
                  <li>Paste into your billing system or secure document</li>
                  <li>If emailing, use your organization's secure email only</li>
                  <li>Delete the report after billing is complete</li>
                </ol>
              </div>
              
              {/* Copy Button */}
              <button
                onClick={copyReportToClipboard}
                className={`w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  copySuccess 
                    ? 'bg-green-600 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copySuccess ? (
                  <>
                    <Check size={20} />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    📋 Copy Report to Clipboard
                  </>
                )}
              </button>
              
              {/* Report Preview */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Report Preview (click inside to select all):
                </label>
                <textarea
                  id="report-textarea"
                  readOnly
                  value={generateEmailBody()}
                  className="w-full h-72 p-3 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500"
                  onClick={(e) => {
                    e.target.select();
                    e.target.setSelectionRange(0, 99999);
                  }}
                />
              </div>
              
              {/* Close / New Report Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowSuccessMessage(false);
                    setSelectedCodes([]);
                    setSelectedCodesVessel2([]);
                    setSelectedCodesVessel3([]);
                    setCodeVessels({});
                    setCodeVesselsV2({});
                    setCodeVesselsV3({});
                    setCaseId('');
                    setProcedureDateOption('');
                    setProcedureDateText('');
                    setSelectedLocation('');
                    setIncludeSedation(false);
                    setSedationUnits(0);
                    setSelectedCardiacIndication('');
                    setSelectedPeripheralIndication('');
                    setSelectedStructuralIndication('');
                  }}
                  className="flex-1 py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg transition-colors"
                >
                  Start New Report
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Security reminder before generating */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="flex items-center gap-2">
                  <Shield size={18} className="text-yellow-600" />
                  <span>This tool generates a limited dataset report for coding purposes only.</span>
                </p>
              </div>
              
              <button
                id="generate-report-btn"
                onClick={handleGenerateReport}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={20} />
                Generate Coding Report
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                Report will be displayed for copying. No data is transmitted or stored.
              </p>
            </div>
          )}
        </div>

        {/* Footer with HIPAA notice */}
        <div className="text-center text-sm text-gray-500 pb-4">
          <div className="mb-3 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Privacy Notice:</strong> CathCPT is a coding assistance tool only.
              No Protected Health Information (PHI) is stored or transmitted.
              Users are responsible for HIPAA compliance when sharing generated reports.
            </p>
          </div>
          <p>CPT® codes © American Medical Association. All rights reserved.</p>
          <p className="mt-1">CathCPT uses 2026 CPT codes</p>
          <p className="mt-1 text-xs">Last Updated: February 2026 - v2.0</p>
          <p className="mt-4 text-lg font-bold" style={{ color: '#7C3AED' }}>A product of Lumen Innovations</p>
        </div>
      </div>
    </div>
  );
};

export default CardiologyCPTApp;