import React from 'react';
import { ArrowLeft, Lightbulb } from 'lucide-react';

interface UpdatesScreenProps {
  onClose: () => void;
}

export const UpdatesScreen: React.FC<UpdatesScreenProps> = ({ onClose }) => {
  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <Lightbulb size={22} className="text-yellow-500" />
          <h1 className="text-lg font-semibold text-gray-900">What's New in 2026</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-semibold text-green-800 mb-2">New Drug-Coated Balloon (DCB) Codes</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li><strong>0913T</strong> - DCB single vessel (standalone) - includes IVUS/OCT</li>
            <li><strong>0914T</strong> - DCB add-on for separate lesion - includes IVUS/OCT</li>
          </ul>
          <p className="text-xs text-green-600 mt-2 italic">Note: IVUS/OCT is bundled into DCB codes - do not bill separately</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">New Inframalleolar (Foot) Codes</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li><strong>37296</strong> - Inframalleolar, straightforward lesion, PTA</li>
            <li><strong>37297</strong> - Inframalleolar, complex lesion, PTA</li>
            <li><strong>37298</strong> - Inframalleolar, additional vessel, straightforward (add-on)</li>
            <li><strong>37299</strong> - Inframalleolar, additional vessel, complex (add-on)</li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-semibold text-purple-800 mb-2">Peripheral Vascular Code Restructure</h3>
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

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="font-semibold text-orange-800 mb-2">Billing Reminders</h3>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• DCB codes include imaging - no separate 92978/92979</li>
            <li>• New peripheral codes are comprehensive - no separate imaging</li>
            <li>• CTO codes 92943/92945 remain mutually exclusive</li>
            <li>• Always verify vessel modifiers for multi-vessel PCI</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
