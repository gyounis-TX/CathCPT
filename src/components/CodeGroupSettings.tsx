import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Check, Lock, RotateCcw } from 'lucide-react';
import {
  CodeGroupSettings as CodeGroupSettingsType,
  getCodeGroupSettings,
  saveCodeGroupSettings,
  applyPreset,
  resetToDefaults,
  settingDescriptions,
  SpecialtyPreset,
  defaultCodeGroupSettings
} from '../services/codeGroupSettings';

interface CodeGroupSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged: () => void;
}

const presetOptions: { value: SpecialtyPreset; label: string; description: string }[] = [
  { value: 'all', label: 'All Categories', description: 'Show all code categories' },
  { value: 'interventional', label: 'Interventional Cardiology', description: 'PCI, Peripheral, Structural (no EP)' },
  { value: 'electrophysiology', label: 'Electrophysiology', description: 'EP, Devices, Ablation (no PCI/Peripheral)' },
  { value: 'general', label: 'General Cardiology', description: 'Diagnostic, Echo (no procedures)' },
  { value: 'custom', label: 'Custom', description: 'Your custom selection' }
];

export const CodeGroupSettings: React.FC<CodeGroupSettingsProps> = ({
  isOpen,
  onClose,
  onSettingsChanged
}) => {
  const [settings, setSettings] = useState<CodeGroupSettingsType>(defaultCodeGroupSettings);
  const [selectedPreset, setSelectedPreset] = useState<SpecialtyPreset>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    const loaded = await getCodeGroupSettings();
    setSettings(loaded);
    detectPreset(loaded);
    setIsLoading(false);
  };

  const detectPreset = (s: CodeGroupSettingsType) => {
    // Check if matches any preset
    const allEnabled = Object.entries(s).every(([key, value]) => key === 'other' || value === true);
    if (allEnabled) {
      setSelectedPreset('all');
      return;
    }

    // Check interventional pattern
    if (s.pci && s.peripheralIntervention && !s.electrophysiology) {
      setSelectedPreset('interventional');
      return;
    }

    // Check EP pattern
    if (s.electrophysiology && !s.pci && !s.peripheralIntervention) {
      setSelectedPreset('electrophysiology');
      return;
    }

    // Check general pattern
    if (s.diagnosticCardiac && s.echocardiography && !s.pci && !s.electrophysiology) {
      setSelectedPreset('general');
      return;
    }

    setSelectedPreset('custom');
  };

  const handlePresetChange = async (preset: SpecialtyPreset) => {
    if (preset === 'custom') {
      setSelectedPreset('custom');
      setShowPresetDropdown(false);
      return;
    }

    const newSettings = await applyPreset(preset);
    setSettings(newSettings);
    setSelectedPreset(preset);
    setShowPresetDropdown(false);
    onSettingsChanged();
  };

  const handleToggle = async (key: keyof Omit<CodeGroupSettingsType, 'other'>) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await saveCodeGroupSettings(newSettings);
    setSelectedPreset('custom');
    onSettingsChanged();
  };

  const handleReset = async () => {
    const newSettings = await resetToDefaults();
    setSettings(newSettings);
    setSelectedPreset('all');
    onSettingsChanged();
  };

  if (!isOpen) return null;

  const settingGroups = [
    {
      title: 'Cath Lab Categories',
      settings: [
        { key: 'diagnosticCardiac' as const, label: 'Diagnostic Cardiac' },
        { key: 'pci' as const, label: 'PCI' },
        { key: 'pciAddOn' as const, label: 'PCI Add-on Procedures' },
        { key: 'intravascularImaging' as const, label: 'Intravascular Imaging & Physiology' },
        { key: 'structuralHeart' as const, label: 'Structural Heart' },
        { key: 'tavr' as const, label: 'TAVR' },
        { key: 'adjunctive' as const, label: 'Adjunctive Procedures' },
        { key: 'mcs' as const, label: 'MCS (Impella, ECMO, IABP)' }
      ]
    },
    {
      title: 'Peripheral Categories',
      settings: [
        { key: 'peripheralAngiography' as const, label: 'Peripheral Vascular Angiography' },
        { key: 'peripheralIntervention' as const, label: 'Peripheral Vascular Intervention' },
        { key: 'venousInterventions' as const, label: 'Venous Interventions' },
        { key: 'endovascular' as const, label: 'Endovascular (EVAR, TEVAR)' }
      ]
    },
    {
      title: 'Imaging',
      settings: [
        { key: 'echocardiography' as const, label: 'Echocardiography' }
      ]
    },
    {
      title: 'Electrophysiology',
      settings: [
        { key: 'electrophysiology' as const, label: 'Electrophysiology' }
      ]
    },
    {
      title: 'Miscellaneous',
      settings: [
        { key: 'miscellaneous' as const, label: 'Miscellaneous' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[480px] sm:rounded-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Code Categories</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Info Banner */}
            <p className="text-sm text-gray-600">
              Select which categories appear on the main screen. Hidden categories won't appear in search results.
            </p>

            {/* Preset Selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apply Preset
              </label>
              <button
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-left"
              >
                <span className="text-gray-900">
                  {presetOptions.find(p => p.value === selectedPreset)?.label}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {showPresetDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {presetOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handlePresetChange(option.value)}
                      className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                        selectedPreset === option.value ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedPreset === option.value
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedPreset === option.value && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Groups */}
            {settingGroups.map(group => (
              <div key={group.title}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{group.title}</h3>
                <div className="space-y-1">
                  {group.settings.map(setting => (
                    <label
                      key={setting.key}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <span className="text-sm text-gray-900">{setting.label}</span>
                      <button
                        type="button"
                        onClick={() => handleToggle(setting.key)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          settings[setting.key] ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings[setting.key] ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Other (always enabled) */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Other</h3>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">Other (Custom Codes)</span>
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-xs text-gray-500">Always enabled</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeGroupSettings;
