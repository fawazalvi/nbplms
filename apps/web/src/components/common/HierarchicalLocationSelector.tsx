import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building,
  MapPin,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Globe,
  Folder,
  FolderOpen,
  CornerDownRight,
  X,
  RefreshCw,
  Compass
} from 'lucide-react';
import { api, LocationItem } from '@/lib/api';

interface HierarchicalLocationSelectorProps {
  value?: string | null; // Selected PSACode (e.g. "2304")
  onChange: (psaCode: string, location: LocationItem) => void;
  disabled?: boolean;
  className?: string;
}

export const HierarchicalLocationSelector: React.FC<HierarchicalLocationSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Filter states inside modal
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['7000', '8000', '5000', '6000']));
  const [pendingSelection, setPendingSelection] = useState<string | null>(value ?? null);

  // Load locations on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getLocations();
        if (isMounted) {
          setLocations(data);
        }
      } catch (err) {
        console.error('Failed to load locations for selector', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update pending selection when prop changes
  useEffect(() => {
    setPendingSelection(value ?? null);
  }, [value]);

  // Index locations by PSA
  const locationByPsa = useMemo(() => {
    const map = new Map<string, LocationItem>();
    for (const loc of locations) {
      map.set(loc.psaCode, loc);
    }
    return map;
  }, [locations]);

  // Group locations by parent
  const childrenMap = useMemo(() => {
    const map = new Map<string, LocationItem[]>();
    for (const loc of locations) {
      const parentKey = loc.parentPSACode ?? 'ROOT';
      const arr = map.get(parentKey) ?? [];
      arr.push(loc);
      map.set(parentKey, arr);
    }
    return map;
  }, [locations]);

  // Current selected location item
  const selectedLocation = useMemo(() => {
    if (!value) return null;
    return locationByPsa.get(value) || null;
  }, [value, locationByPsa]);

  // Pending selected location item
  const pendingLocation = useMemo(() => {
    if (!pendingSelection) return null;
    return locationByPsa.get(pendingSelection) || null;
  }, [pendingSelection, locationByPsa]);

  // Compute breadcrumbs for an item from its PSAPath
  const getBreadcrumbs = (loc: LocationItem | null) => {
    if (!loc || !loc.psaPath) return [];
    const parts = loc.psaPath.split('/').filter(Boolean);
    return parts.map(p => {
      const node = locationByPsa.get(p);
      return {
        psaCode: p,
        name: node?.name ?? p,
        depthLevel: node?.depthLevel ?? 0
      };
    });
  };

  // Search matching nodes
  const searchMatchingPsas = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const term = searchQuery.toLowerCase().trim();
    const matches = new Set<string>();

    for (const loc of locations) {
      const isMatch =
        loc.psaCode.toLowerCase().includes(term) ||
        loc.name.toLowerCase().includes(term) ||
        (loc.city && loc.city.toLowerCase().includes(term)) ||
        (loc.paCode && loc.paCode.toLowerCase().includes(term));

      if (isMatch) {
        matches.add(loc.psaCode);
        if (loc.psaPath) {
          const parts = loc.psaPath.split('/').filter(Boolean);
          for (const p of parts) {
            matches.add(p);
          }
        }
      }
    }
    return matches;
  }, [locations, searchQuery]);

  // Auto-expand on search
  useEffect(() => {
    if (searchMatchingPsas && searchMatchingPsas.size > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        for (const id of searchMatchingPsas) {
          next.add(id);
        }
        return next;
      });
    }
  }, [searchMatchingPsas]);

  // Expand / collapse single node
  const toggleExpand = (psa: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(psa)) next.delete(psa);
      else next.add(psa);
      return next;
    });
  };

  const handleConfirm = () => {
    if (pendingLocation) {
      onChange(pendingLocation.psaCode, pendingLocation);
    }
    setIsOpen(false);
  };

  // Roots to display
  const displayRoots = useMemo(() => {
    let roots = childrenMap.get('ROOT') ?? [];
    if (selectedSegment !== 'ALL') {
      roots = roots.filter(r => r.psaCode === selectedSegment);
    }
    return roots;
  }, [childrenMap, selectedSegment]);

  const selectedBreadcrumbs = useMemo(() => getBreadcrumbs(selectedLocation), [selectedLocation, locationByPsa]);
  const pendingBreadcrumbs = useMemo(() => getBreadcrumbs(pendingLocation), [pendingLocation, locationByPsa]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: LocationItem, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.psaCode);
    const isPending = pendingSelection === node.psaCode;
    const children = childrenMap.get(node.psaCode) ?? [];
    const hasChildren = children.length > 0;

    if (searchMatchingPsas && !searchMatchingPsas.has(node.psaCode)) {
      return null;
    }

    return (
      <div key={node.psaCode} className="select-none">
        <div
          onClick={() => setPendingSelection(node.psaCode)}
          className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors text-xs group ${
            isPending
              ? 'bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-500/40'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 16 + 8)}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.psaCode, e)}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          {node.depthLevel === 0 ? (
            <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          ) : node.depthLevel === 1 ? (
            isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : node.depthLevel === 3 ? (
            <CornerDownRight className="w-3 h-3 text-amber-600 shrink-0" />
          ) : (
            <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}

          <span className="font-mono text-[11px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {node.psaCode}
          </span>

          <span className="truncate flex-1 text-slate-800">{node.name}</span>

          {node.city && (
            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
              {node.city}
            </span>
          )}

          {hasChildren ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 shrink-0">
              {children.length}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-sky-50 text-sky-700 shrink-0">
              Branch
            </span>
          )}

          {isPending && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 ml-4">
            {children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Collapsed Display Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <MapPin className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0 flex-1">
            {selectedLocation ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {selectedLocation.name}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-white border-slate-300">
                    PSA: {selectedLocation.psaCode}
                  </Badge>
                  {selectedLocation.category && (
                    <Badge variant="outline" className="text-[10px] bg-slate-100 border-slate-200">
                      {selectedLocation.category}
                    </Badge>
                  )}
                </div>

                {/* Breadcrumbs Lineage */}
                {selectedBreadcrumbs.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 overflow-x-auto whitespace-nowrap">
                    {selectedBreadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={crumb.psaCode}>
                        {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                        <span className={idx === selectedBreadcrumbs.length - 1 ? 'font-semibold text-emerald-800' : 'text-slate-600'}>
                          {crumb.name}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-700">No Location Assigned</p>
                <p className="text-[11px] text-slate-400">Click to browse and link your official branch/office</p>
              </div>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={() => {
            setPendingSelection(value ?? null);
            setIsOpen(true);
          }}
          className="h-8 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 shrink-0 gap-1.5"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading Units...
            </>
          ) : selectedLocation ? (
            <>
              <MapPin className="w-3.5 h-3.5" />
              Change Location
            </>
          ) : (
            <>
              <MapPin className="w-3.5 h-3.5" />
              Select Location
            </>
          )}
        </Button>
      </div>

      {/* Modal Picker */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Select Organizational Location Unit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse or search across 1,615 SAP HR Personnel Sub-Area (PSACode) units
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search by branch code, name, city, PACode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 text-xs bg-slate-50 border-slate-200 h-9"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Segment Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'ALL', label: 'All Segments' },
                  { id: '7000', label: '7000 Conventional' },
                  { id: '8000', label: '8000 Head Office' },
                  { id: '5000', label: '5000 Islamic' },
                  { id: '6000', label: '6000 Corporate' },
                  { id: '9999', label: '9999 Overseas' }
                ].map(seg => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setSelectedSegment(seg.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedSegment === seg.id
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tree Container */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Loading location hierarchy...</span>
                </div>
              ) : displayRoots.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No matching locations found for current search.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {displayRoots.map(root => renderTreeNode(root, 0))}
                </div>
              )}
            </div>

            {/* Modal Footer with Selection Preview */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <div className="min-w-0">
                {pendingLocation ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        [{pendingLocation.psaCode}] {pendingLocation.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Level {pendingLocation.depthLevel}
                      </span>
                    </div>
                    {pendingBreadcrumbs.length > 0 && (
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {pendingBreadcrumbs.map(b => b.name).join(' > ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Select a branch or office node from above</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!pendingLocation}
                  onClick={handleConfirm}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  Confirm Selection
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HierarchicalLocationSelector;
