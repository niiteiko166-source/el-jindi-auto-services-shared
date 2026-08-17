import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { PriceListItem } from '../types';
import { db } from '../services/db';

interface PriceListSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: PriceListItem) => void;
  excludeIds?: string[];
}

export const PriceListSearchModal: React.FC<PriceListSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  excludeIds = []
}) => {
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const list = db.getPriceList().filter(item => !excludeIds.includes(item.id));
      setPriceList(list);
      setSearchQuery('');
      setSelectedIndex(-1);
      setShowDropdown(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, excludeIds]);

  // Filter results based on search query
  const filteredResults = searchQuery.trim()
    ? priceList.filter(item => {
        const query = searchQuery.trim().toLowerCase();
        const searchableText = [
          item.serviceOrPart,
          item.description,
          item.make,
          item.model,
          item.category
        ].join(' ').toLowerCase();

        return searchableText.includes(query);
      })
    : priceList.slice(0, 15); // Show first 15 items when no query

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
          handleSelectItem(filteredResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  const handleSelectItem = (item: PriceListItem) => {
    onSelectItem(item);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Add Service from Price List</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-blue-500/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Search Input */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(-1);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search by service name, category, make, model... (type to filter, ↓↑ to navigate, Enter to select)"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {filteredResults.length} service{filteredResults.length !== 1 ? 's' : ''} found
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {/* Results Dropdown */}
          {showDropdown && (
            <div className="max-h-96 overflow-y-auto">
              {filteredResults.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">
                    {searchQuery
                      ? 'No services match your search. Try different keywords or add manually.'
                      : 'Start typing to search the price list'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredResults.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full px-6 py-3.5 text-left transition-colors border-l-4 ${
                          isSelected
                            ? 'bg-blue-50 border-l-blue-600'
                            : 'hover:bg-slate-50 border-l-transparent hover:border-l-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {item.serviceOrPart}
                              </h4>
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded whitespace-nowrap">
                                  {item.make} {item.model}
                                </span>
                                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded whitespace-nowrap">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                            <p className="text-[12px] text-slate-600 truncate">
                              {item.description}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-slate-900">
                              GH₵ {item.price.toFixed(2)}
                            </div>
                            {item.estimatedHours && (
                              <div className="text-[11px] text-slate-500">
                                {item.estimatedHours}h
                              </div>
                            )}
                            <Plus
                              className={`w-4 h-4 mt-1 ${
                                isSelected
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              💡 Tip: Use keyboard arrows ↑↓ and Enter to select quickly
            </p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
