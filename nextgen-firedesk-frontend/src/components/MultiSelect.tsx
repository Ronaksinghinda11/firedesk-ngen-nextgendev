import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder, className = "" }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayValue = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? options.find(o => o.value === selected[0])?.label 
      : `${selected.length} selected`;

  return (
    <div className={`relative text-sm ${className}`} ref={ref}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 font-medium hover:bg-gray-50 min-w-[150px] w-full transition-colors shadow-sm"
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto py-1">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer group">
              <input 
                type="checkbox" 
                className="hidden" 
                checked={selected.includes(opt.value)}
                onChange={() => handleToggle(opt.value)}
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.includes(opt.value) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 group-hover:border-orange-500 bg-white'}`}>
                {selected.includes(opt.value) && <Check className="w-3 h-3" />}
              </div>
              <span className="text-gray-700 select-none">{opt.label}</span>
            </label>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-gray-500 italic">No options</div>
          )}
        </div>
      )}
    </div>
  );
}
