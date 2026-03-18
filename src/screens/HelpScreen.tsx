import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { helpItems, sectionLabels, searchHelp, HelpItem } from '../data/helpContent';

interface HelpScreenProps {
  onClose: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['cathlab']));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const searchResults = useMemo(() => {
    return searchQuery.trim() ? searchHelp(searchQuery) : [];
  }, [searchQuery]);

  const sections = useMemo(() => {
    const grouped: Record<string, HelpItem[]> = {};
    for (const item of helpItems) {
      if (!grouped[item.section]) grouped[item.section] = [];
      grouped[item.section].push(item);
    }
    return grouped;
  }, []);

  const renderItem = (item: HelpItem) => {
    const isExpanded = expandedItems.has(item.id);
    return (
      <div key={item.id} className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => toggleItem(item.id)}
          className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-gray-50"
        >
          <div className="mt-0.5 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <span className="text-sm text-gray-800">{item.question}</span>
        </button>
        {isExpanded && (
          <div className="px-10 pb-3">
            <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <HelpCircle size={22} className="text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Help</h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {searchQuery.trim() ? (
          <div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="bg-white">
                <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
                {searchResults.map(renderItem)}
              </div>
            )}
          </div>
        ) : (
          <div>
            {Object.entries(sections).map(([section, items]) => {
              const isSectionExpanded = expandedSections.has(section);
              return (
                <div key={section} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      {sectionLabels[section] || section}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{items.length}</span>
                      {isSectionExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {isSectionExpanded && (
                    <div className="bg-gray-50">{items.map(renderItem)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
