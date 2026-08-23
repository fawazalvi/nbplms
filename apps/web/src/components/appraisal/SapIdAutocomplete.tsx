import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatGradeLabel, formatGroupLabel } from '@/lib/formatters';

interface EmployeeSuggestion {
  sapId: string;
  fullName: string;
  grade: string;
  designation: string;
  reportingGroup: string;
}

interface SapIdAutocompleteProps {
  label: string;
  value: string;
  onChange: (sapId: string) => void;
  onEmployeeSelected?: (employee: EmployeeSuggestion | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SapIdAutocomplete: React.FC<SapIdAutocompleteProps> = ({
  label,
  value,
  onChange,
  onEmployeeSelected,
  placeholder = 'Type SAP ID or name...',
  disabled = false,
  required = false,
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<EmployeeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSuggestion | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value && value !== query && !selectedEmployee) {
      setQuery(value);
      searchAndAutoSelect(value);
    }
  }, [value]);

  const searchAndAutoSelect = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return;
    try {
      const results = await api.getEmployees({ search: searchTerm });
      if (results.length > 0) {
        const exact = results.find((e: any) => e.sapId === searchTerm);
        if (exact) {
          setSelectedEmployee(exact);
          onEmployeeSelected?.(exact);
        }
      }
    } catch { /* ignore */ }
  };

  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const results = await api.getEmployees({ search: searchTerm });
      // Limit to 10 suggestions for performance
      const limited = (results || []).slice(0, 10);
      setSuggestions(limited);
      setShowDropdown(limited.length > 0);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedEmployee(null);
    onEmployeeSelected?.(null);

    // Debounce API calls - 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);

    // If cleared, reset
    if (!val) {
      onChange('');
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = (emp: EmployeeSuggestion) => {
    setQuery(emp.sapId);
    setSelectedEmployee(emp);
    onChange(emp.sapId);
    onEmployeeSelected?.(emp);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedEmployee(null);
    onChange('');
    onEmployeeSelected?.(null);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="font-bold text-slate-700 block mb-1 text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input with search icon */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query && suggestions.length > 0) setShowDropdown(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full px-3 py-2 pl-9 pr-8 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition disabled:bg-slate-100 disabled:text-slate-500 font-medium"
        />
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        {loading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-600 animate-spin" />
        )}
        {!loading && query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selected Employee Preview */}
      {selectedEmployee && (
        <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
              {selectedEmployee.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-xs truncate block">{selectedEmployee.fullName}</span>
              <div className="flex items-center space-x-1.5 flex-wrap">
                <Badge className="bg-slate-200 text-slate-700 text-[9px] font-mono px-1.5 py-0">{selectedEmployee.sapId}</Badge>
                <span className="text-[10px] text-slate-500">{formatGradeLabel(selectedEmployee.grade)} • {selectedEmployee.designation}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute z-[200] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((emp) => (
            <button
              key={emp.sapId}
              onClick={() => handleSelect(emp)}
              className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 transition-colors flex items-center space-x-3 border-b border-slate-100 last:border-b-0"
            >
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-xs">{emp.fullName}</span>
                  <Badge className="bg-blue-100 text-blue-700 text-[9px] font-mono px-1.5 py-0">{emp.sapId}</Badge>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {formatGradeLabel(emp.grade)} • {emp.designation} • {formatGroupLabel(emp.reportingGroup)}
                </p>
              </div>
            </button>
          ))}
          {suggestions.length === 0 && !loading && (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              No employees found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
