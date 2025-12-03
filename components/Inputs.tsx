import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
  icon?: React.ElementType;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, selected, onChange, label, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item: string) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => onChange(options);
  const clearAll = () => onChange([]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <div className="relative group" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-3 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-400 focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[200px] justify-between transition-colors"
      >
        <div className="flex items-center gap-2 truncate max-w-[180px]">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          <span className="truncate">
            {selected.length === 0 
              ? `All ${label}s` 
              : selected.length === options.length 
                ? `All ${label}s`
                : `${selected.length} ${label}${selected.length > 1 ? 's' : ''} Selected`
            }
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 max-h-96 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col">
           {/* Search & Actions */}
           <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
             <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={`Search ${label}s...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500"
                />
             </div>
             <div className="flex gap-2">
               <button onClick={selectAll} className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1 rounded transition-colors">Select All</button>
               <button onClick={clearAll} className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1 rounded transition-colors">Clear</button>
             </div>
           </div>
           
           {/* Options List */}
           <div className="overflow-y-auto p-2 space-y-1 max-h-64">
             {filteredOptions.length > 0 ? (
               filteredOptions.map((option: string) => {
                 const isSelected = selected.includes(option);
                 return (
                   <div 
                     key={option} 
                     onClick={() => toggleOption(option)}
                     className={`
                       flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
                       ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}
                     `}
                   >
                      <div className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{option}</span>
                   </div>
                 )
               })
             ) : (
               <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                 No matches found
               </div>
             )}
           </div>
           
           {/* Footer */}
           <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-center text-slate-500">
              {selected.length} of {options.length} selected
           </div>
        </div>
      )}
    </div>
  );
};