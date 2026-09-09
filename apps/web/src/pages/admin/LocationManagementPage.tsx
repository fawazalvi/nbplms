import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building,
  MapPin,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Pencil,
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle2,
  Globe,
  Layers,
  Folder,
  FolderOpen,
  CornerDownRight,
  ShieldCheck,
  X,
  Compass
} from 'lucide-react';
import {
  api,
  LocationItem,
  LocationSummary,
  LocationDetail,
  CreateLocationPayload,
  UpdateLocationPayload
} from '@/lib/api';

interface LocationManagementPageProps {
  userRole?: string;
}

export const LocationManagementPage: React.FC<LocationManagementPageProps> = ({ userRole = 'PmwSuperAdmin' }) => {
  // Data states
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [summary, setSummary] = useState<LocationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Selection & Details
  const [selectedPsa, setSelectedPsa] = useState<string | null>('7000');
  const [selectedDetail, setSelectedDetail] = useState<LocationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Filters & Tree State
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['7000', '8000', '5000', '6000']));
  const [rosterTab, setRosterTab] = useState<'direct' | 'subtree'>('direct');
  const [rosterSearch, setRosterSearch] = useState<string>('');

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isReparentOpen, setIsReparentOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Form states
  const [addForm, setAddForm] = useState<CreateLocationPayload>({
    psaCode: '',
    name: '',
    parentPSACode: '',
    paCode: '',
    category: '',
    city: '',
    country: 'PK',
    latitude: null,
    longitude: null
  });

  const [editForm, setEditForm] = useState<UpdateLocationPayload>({
    name: '',
    paCode: '',
    category: '',
    city: '',
    country: 'PK',
    latitude: null,
    longitude: null
  });

  const [reparentTarget, setReparentTarget] = useState<string>('');
  const [reparentParentSearch, setReparentParentSearch] = useState<string>('');
  const [reparentValidationError, setReparentValidationError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Fetch node detail when selectedPsa changes
  useEffect(() => {
    if (!selectedPsa) return;
    loadNodeDetail(selectedPsa);
  }, [selectedPsa]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [sumRes, locsRes] = await Promise.all([
        api.getLocationSummary(),
        api.getLocations()
      ]);
      setSummary(sumRes);
      setLocations(locsRes);

      // Default selection
      if (!selectedPsa && locsRes.length > 0) {
        const root = locsRes.find(l => l.psaCode === '7000') || locsRes[0];
        setSelectedPsa(root.psaCode);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load organizational locations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNodeDetail = async (psa: string) => {
    try {
      setDetailLoading(true);
      const detail = await api.getLocationByPsa(psa);
      setSelectedDetail(detail);
    } catch (err: any) {
      setErrorMessage(`Failed to fetch details for location ${psa}: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

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

  // Index locations by PSA
  const locationByPsa = useMemo(() => {
    const map = new Map<string, LocationItem>();
    for (const loc of locations) {
      map.set(loc.psaCode, loc);
    }
    return map;
  }, [locations]);

  // Search match check
  const searchMatchingPsas = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const term = searchQuery.toLowerCase().trim();
    const matches = new Set<string>();

    for (const loc of locations) {
      const isMatch =
        loc.psaCode.toLowerCase().includes(term) ||
        loc.name.toLowerCase().includes(term) ||
        (loc.city && loc.city.toLowerCase().includes(term)) ||
        (loc.paCode && loc.paCode.toLowerCase().includes(term)) ||
        (loc.category && loc.category.toLowerCase().includes(term));

      if (isMatch) {
        matches.add(loc.psaCode);
        // Add ancestors to auto-expand
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

  // Auto expand nodes on search
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

  // Toggle node expand/collapse
  const toggleExpand = (psa: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(psa)) {
        next.delete(psa);
      } else {
        next.add(psa);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allParentKeys = new Set<string>();
    for (const loc of locations) {
      if (loc.childCount > 0) {
        allParentKeys.add(loc.psaCode);
      }
    }
    setExpandedNodes(allParentKeys);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['7000', '8000', '5000', '6000']));
  };

  // Helper to determine depth styling
  const getLevelBadge = (level: number) => {
    switch (level) {
      case 0:
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100 font-medium text-xs">Level 0: Segment</Badge>;
      case 1:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-medium text-xs">Level 1: Region / Group</Badge>;
      case 2:
        return <Badge className="bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 font-medium text-xs">Level 2: Branch / Unit</Badge>;
      case 3:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 font-medium text-xs">Level 3: Sub-Branch</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Level {level}</Badge>;
    }
  };

  // Filter root segments for tree display
  const displayRoots = useMemo(() => {
    let roots = childrenMap.get('ROOT') ?? [];
    if (selectedSegment !== 'ALL') {
      roots = roots.filter(r => r.psaCode === selectedSegment);
    }
    return roots;
  }, [childrenMap, selectedSegment]);

  // Subtree descendants for roster
  const selectedSubtree = useMemo(() => {
    if (!selectedPsa) return [];
    const sel = locationByPsa.get(selectedPsa);
    if (!sel) return [];

    const prefix = sel.psaPath;
    let list = locations.filter(l => l.psaPath.startsWith(prefix) && l.psaCode !== selectedPsa);

    if (rosterSearch.trim()) {
      const term = rosterSearch.toLowerCase().trim();
      list = list.filter(l =>
        l.psaCode.toLowerCase().includes(term) ||
        l.name.toLowerCase().includes(term) ||
        (l.city && l.city.toLowerCase().includes(term)) ||
        (l.paCode && l.paCode.toLowerCase().includes(term))
      );
    }
    return list;
  }, [locations, selectedPsa, locationByPsa, rosterSearch]);

  const selectedDirectChildren = useMemo(() => {
    if (!selectedPsa) return [];
    let list = childrenMap.get(selectedPsa) ?? [];
    if (rosterSearch.trim()) {
      const term = rosterSearch.toLowerCase().trim();
      list = list.filter(l =>
        l.psaCode.toLowerCase().includes(term) ||
        l.name.toLowerCase().includes(term) ||
        (l.city && l.city.toLowerCase().includes(term)) ||
        (l.paCode && l.paCode.toLowerCase().includes(term))
      );
    }
    return list;
  }, [childrenMap, selectedPsa, rosterSearch]);

  // CRUD Actions
  const handleOpenAdd = (defaultParentPsa?: string) => {
    const parentCode = defaultParentPsa ?? selectedPsa ?? '';
    const parentObj = parentCode ? locationByPsa.get(parentCode) : null;
    setAddForm({
      psaCode: '',
      name: '',
      parentPSACode: parentCode,
      paCode: parentObj?.paCode ?? '',
      category: 'Category III',
      city: parentObj?.city ?? '',
      country: 'PK',
      latitude: null,
      longitude: null
    });
    setErrorMessage(null);
    setIsAddOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.psaCode || !addForm.name) {
      setErrorMessage('PSA Code and Location Name are required.');
      return;
    }
    if (addForm.psaCode.trim().length !== 4) {
      setErrorMessage('PSA Code must be exactly 4 characters (e.g. 7001, 2304).');
      return;
    }

    try {
      setSavingAction(true);
      setErrorMessage(null);
      await api.createLocation(addForm);
      setSuccessMessage(`Location unit '${addForm.name}' (${addForm.psaCode}) successfully created.`);
      setIsAddOpen(false);
      await loadData();
      setSelectedPsa(addForm.psaCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create location.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenEdit = () => {
    if (!selectedDetail) return;
    const loc = selectedDetail.location;
    setEditForm({
      name: loc.name,
      paCode: loc.paCode ?? '',
      category: loc.category ?? '',
      city: loc.city ?? '',
      country: loc.country ?? 'PK',
      latitude: loc.latitude,
      longitude: loc.longitude
    });
    setErrorMessage(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPsa) return;

    try {
      setSavingAction(true);
      setErrorMessage(null);
      await api.updateLocation(selectedPsa, editForm);
      setSuccessMessage(`Location '${editForm.name}' details updated successfully.`);
      setIsEditOpen(false);
      await loadData();
      await loadNodeDetail(selectedPsa);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update location.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenReparent = () => {
    if (!selectedDetail) return;
    setReparentTarget(selectedDetail.location.parentPSACode ?? '');
    setReparentParentSearch('');
    setReparentValidationError(null);
    setIsReparentOpen(true);
  };

  const handleReparentTargetSelect = (targetPsa: string) => {
    if (!selectedPsa) return;

    // Check direct self-reference
    if (targetPsa === selectedPsa) {
      setReparentValidationError('Cannot select the node itself as its parent.');
      return;
    }

    // Check circular reference: target parent cannot be inside the moving node's subtree
    const movingLoc = locationByPsa.get(selectedPsa);
    const targetLoc = locationByPsa.get(targetPsa);

    if (movingLoc && targetLoc) {
      if (targetLoc.psaPath.includes(`/${selectedPsa}/`)) {
        setReparentValidationError(
          `Circular Reference Guard: Location '${targetLoc.name}' (${targetLoc.psaCode}) is currently a descendant of '${movingLoc.name}'. Reparenting would create an infinite loop.`
        );
        return;
      }
    }

    setReparentValidationError(null);
    setReparentTarget(targetPsa);
  };

  const handleSaveReparent = async () => {
    if (!selectedPsa || reparentValidationError) return;

    try {
      setSavingAction(true);
      setErrorMessage(null);
      await api.reparentLocation(selectedPsa, {
        newParentPSACode: reparentTarget || null
      });
      setSuccessMessage(`Location '${selectedDetail?.location.name}' moved successfully. Hierarchy lineage updated.`);
      setIsReparentOpen(false);
      await loadData();
      await loadNodeDetail(selectedPsa);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reparent location.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedPsa) return;

    try {
      setSavingAction(true);
      setErrorMessage(null);
      await api.deleteLocation(selectedPsa);
      setSuccessMessage(`Location unit '${selectedDetail?.location.name}' deleted successfully.`);
      setIsDeleteOpen(false);
      const parentPsa = selectedDetail?.location.parentPSACode ?? '7000';
      setSelectedPsa(parentPsa);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete location.');
    } finally {
      setSavingAction(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (locations.length === 0) return;
    const headers = ['PSACode', 'ParentPSACode', 'Name', 'PACode', 'Category', 'City', 'Country', 'DepthLevel', 'PSAPath', 'Latitude', 'Longitude'];
    const rows = locations.map(l => [
      `"${l.psaCode}"`,
      `"${l.parentPSACode ?? ''}"`,
      `"${(l.name ?? '').replace(/"/g, '""')}"`,
      `"${l.paCode ?? ''}"`,
      `"${l.category ?? ''}"`,
      `"${(l.city ?? '').replace(/"/g, '""')}"`,
      `"${l.country ?? ''}"`,
      l.depthLevel,
      `"${l.psaPath}"`,
      l.latitude ?? '',
      l.longitude ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NBP_Location_Hierarchy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: LocationItem, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.psaCode);
    const isSelected = selectedPsa === node.psaCode;
    const children = childrenMap.get(node.psaCode) ?? [];
    const hasChildren = children.length > 0;

    // Filter check: If search query active and this node isn't in matching set, hide
    if (searchMatchingPsas && !searchMatchingPsas.has(node.psaCode)) {
      return null;
    }

    // Depth filter check
    if (selectedLevel !== 'ALL' && node.depthLevel > selectedLevel) {
      return null;
    }

    return (
      <div key={node.psaCode} className="select-none">
        <div
          onClick={() => setSelectedPsa(node.psaCode)}
          className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-sm group ${
            isSelected
              ? 'bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-500/30'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 18 + 8)}px` }}
        >
          {/* Chevron expander */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(node.psaCode, e)}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          {/* Node Icon by Depth */}
          {node.depthLevel === 0 ? (
            <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
          ) : node.depthLevel === 1 ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-emerald-600 shrink-0" />
            )
          ) : (
            <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}

          {/* PSA Code Tag */}
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {node.psaCode}
          </span>

          {/* Node Name */}
          <span className="truncate flex-1 text-slate-800">{node.name}</span>

          {/* Children count badge */}
          {hasChildren && (
            <span className="text-[11px] font-normal px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
              {children.length}
            </span>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 ml-4">
            {children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-emerald-900/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-200 text-xs font-semibold uppercase tracking-wider border border-emerald-400/30">
                Master Data Governance
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm">
                SAP HR Personnel Sub-Area
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <MapPin className="w-8 h-8 text-emerald-300" />
              Hierarchical Location Management
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-3xl">
              Centralized administrative hub for managing National Bank of Pakistan's 1,615 organizational units,
              hierarchical reporting lines, materialized lineages (<code>PSAPath</code>), branch categorization, and geospatial coordinates.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => { setRefreshing(true); loadData(); }}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Tree
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            {userRole === 'PmwSuperAdmin' && (
              <Button
                onClick={() => handleOpenAdd()}
                className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold text-xs shadow-sm gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-800" />
                Add Location Unit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units</span>
              <Building className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{summary?.totalLocations.toLocaleString() ?? '1,615'}</span>
            </div>
            <span className="text-[11px] text-slate-500">All Enterprise Locations</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Root Segments</span>
              <Globe className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-900">{summary?.level0Count ?? '6'}</span>
            </div>
            <span className="text-[11px] text-indigo-600/80">Depth Level 0</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Regions / Groups</span>
              <Folder className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">{summary?.level1Count ?? '79'}</span>
            </div>
            <span className="text-[11px] text-emerald-600/80">Depth Level 1</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Branches & Units</span>
              <Building className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-900">{summary?.level2Count.toLocaleString() ?? '1,523'}</span>
            </div>
            <span className="text-[11px] text-sky-600/80">Depth Level 2</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Sub-Branches</span>
              <CornerDownRight className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900">{summary?.level3Count ?? '7'}</span>
            </div>
            <span className="text-[11px] text-amber-600/80">Depth Level 3</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Geo-Tagged</span>
              <Compass className="w-4 h-4 text-teal-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-teal-900">{summary?.geoTaggedCount.toLocaleString() ?? '1,483'}</span>
            </div>
            <span className="text-[11px] text-teal-600/80">With GPS Coordinates</span>
          </CardContent>
        </Card>
      </div>

      {/* Root Segment Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedSegment('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            selectedSegment === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>All Segments</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-700/50 text-slate-200">
            {summary?.totalLocations ?? 1615}
          </span>
        </button>

        {summary?.segments.map(seg => (
          <button
            key={seg.psaCode}
            onClick={() => setSelectedSegment(seg.psaCode)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedSegment === seg.psaCode
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="font-mono font-semibold">[{seg.psaCode}]</span>
            <span>{seg.name}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              selectedSegment === seg.psaCode ? 'bg-emerald-950/50 text-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {seg.totalCount}
            </span>
          </button>
        ))}
      </div>

      {/* Split Pane: Left Tree Navigator & Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Tree View */}
        <Card className="lg:col-span-5 bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col h-[780px]">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Hierarchy Tree
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {locations.length} total units • Select a node to inspect
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAll}
                  className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAll}
                  className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
                >
                  Collapse All
                </Button>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search by PSA code, name, city, PACode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 text-xs bg-white h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Depth Level Filter */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs text-slate-600">
              <span className="text-[11px] text-slate-400 mr-1">Depth:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 0, label: 'L0: Roots' },
                { id: 1, label: 'L1: Regions' },
                { id: 2, label: 'L2: Branches' },
                { id: 3, label: 'L3: Sub' }
              ].map(lvl => (
                <button
                  key={String(lvl.id)}
                  onClick={() => setSelectedLevel(lvl.id as any)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedLevel === lvl.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <span>Building location hierarchy tree...</span>
              </div>
            ) : displayRoots.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching locations found for selected segment or filter.
              </div>
            ) : (
              <div className="space-y-0.5">
                {displayRoots.map(root => renderTreeNode(root, 0))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Node Details, Actions & Subtree Roster */}
        <div className="lg:col-span-7 space-y-6">
          {detailLoading ? (
            <Card className="bg-white border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center h-80 gap-3 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Fetching location details and descendants...</span>
            </Card>
          ) : !selectedDetail ? (
            <Card className="bg-white border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
              Please select a location from the hierarchy tree on the left to view details and manage child units.
            </Card>
          ) : (
            <>
              {/* Breadcrumbs Navigation */}
              <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto text-xs text-slate-600">
                <span className="text-slate-400 text-[11px] uppercase font-semibold mr-1">Hierarchy Trail:</span>
                {selectedDetail.breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.psaCode}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <button
                      onClick={() => setSelectedPsa(crumb.psaCode)}
                      className={`hover:underline flex items-center gap-1 whitespace-nowrap ${
                        crumb.psaCode === selectedPsa ? 'font-bold text-emerald-800' : 'text-slate-600'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-slate-400">[{crumb.psaCode}]</span>
                      <span>{crumb.name}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Node Identity Card */}
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900">{selectedDetail.location.name}</h2>
                          {getLevelBadge(selectedDetail.location.depthLevel)}
                          {selectedDetail.location.category && (
                            <Badge variant="outline" className="text-xs bg-slate-50">
                              {selectedDetail.location.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                          <span>PSA: <strong className="text-slate-800">{selectedDetail.location.psaCode}</strong></span>
                          <span>•</span>
                          <span>PA Code: <strong className="text-slate-800">{selectedDetail.location.paCode || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>City: <strong className="text-slate-800">{selectedDetail.location.city || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {userRole === 'PmwSuperAdmin' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAdd(selectedDetail.location.psaCode)}
                          className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Child
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenEdit}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenReparent}
                          className="h-8 text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Move / Reparent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsDeleteOpen(true)}
                          className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block">Immediate Parent:</span>
                      {selectedDetail.parent ? (
                        <button
                          onClick={() => setSelectedPsa(selectedDetail.parent!.psaCode)}
                          className="font-semibold text-emerald-800 hover:underline mt-0.5 text-left truncate block"
                        >
                          [{selectedDetail.parent.psaCode}] {selectedDetail.parent.name}
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-700 mt-0.5 block">Root Segment (No Parent)</span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block">Direct Child Units:</span>
                      <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                        {selectedDetail.children.length} {selectedDetail.children.length === 1 ? 'branch' : 'branches'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block">Country / Territory:</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {selectedDetail.location.country === 'PK' ? 'Pakistan (PK)' : selectedDetail.location.country || 'N/A'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block">GPS Coordinates:</span>
                      {selectedDetail.location.latitude && selectedDetail.location.longitude ? (
                        <a
                          href={`https://maps.google.com/?q=${selectedDetail.location.latitude},${selectedDetail.location.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-teal-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Compass className="w-3 h-3 text-teal-600" />
                          <span>{selectedDetail.location.latitude.toFixed(4)}, {selectedDetail.location.longitude.toFixed(4)}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 mt-0.5 block italic">No coordinates set</span>
                      )}
                    </div>
                  </div>

                  {/* Materialized PSAPath Bar */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-slate-600 font-medium shrink-0">Materialized Path (PSAPath):</span>
                      <code className="font-mono text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300 font-semibold truncate">
                        {selectedDetail.location.psaPath}
                      </code>
                    </div>
                    <span className="text-[11px] text-emerald-700 shrink-0 font-medium">
                      Trigger-Maintained $O(1)$ Lineage
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Descendant / Subtree Roster Table */}
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
                      <button
                        onClick={() => setRosterTab('direct')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          rosterTab === 'direct'
                            ? 'bg-white text-slate-900 shadow-sm font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Direct Children ({selectedDetail.children.length})
                      </button>
                      <button
                        onClick={() => setRosterTab('subtree')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          rosterTab === 'subtree'
                            ? 'bg-white text-slate-900 shadow-sm font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Full Subtree Descendants ({selectedSubtree.length})
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Filter branch list..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="pl-8 text-xs bg-white h-8"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">PSA Code</th>
                          <th className="py-2.5 px-3">Location Name</th>
                          <th className="py-2.5 px-3">PA Code</th>
                          <th className="py-2.5 px-3">Level</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">City</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(rosterTab === 'direct' ? selectedDirectChildren : selectedSubtree).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              {rosterTab === 'direct'
                                ? 'This location has no direct child units.'
                                : 'No descendants found under this branch node.'}
                            </td>
                          </tr>
                        ) : (
                          (rosterTab === 'direct' ? selectedDirectChildren : selectedSubtree).map(item => (
                            <tr key={item.psaCode} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                                {item.psaCode}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  onClick={() => setSelectedPsa(item.psaCode)}
                                  className="font-medium text-slate-900 hover:text-emerald-700 hover:underline text-left block"
                                >
                                  {item.name}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {item.paCode || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  item.depthLevel === 1 ? 'bg-emerald-50 text-emerald-700' :
                                  item.depthLevel === 2 ? 'bg-sky-50 text-sky-700' :
                                  'bg-amber-50 text-amber-700'
                                }`}>
                                  L{item.depthLevel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {item.category || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {item.city || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPsa(item.psaCode)}
                                  className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 font-medium px-2"
                                >
                                  Inspect →
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD LOCATION UNIT */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Add New Location Unit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a new organizational branch, region, or administrative office
                </p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">PSA Code (PK) *</label>
                  <Input
                    placeholder="e.g. 2305"
                    maxLength={4}
                    value={addForm.psaCode}
                    onChange={(e) => setAddForm({ ...addForm, psaCode: e.target.value })}
                    className="font-mono text-xs"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Exact 4-digit unique key</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">PA Code</label>
                  <Input
                    placeholder="e.g. 0001"
                    maxLength={4}
                    value={addForm.paCode ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, paCode: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Territory admin code</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Location Name *</label>
                <Input
                  placeholder="e.g. Blue Area Branch, Islamabad"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Parent Location (ParentPSACode)</label>
                <select
                  value={addForm.parentPSACode ?? ''}
                  onChange={(e) => setAddForm({ ...addForm, parentPSACode: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No Parent (Root Segment - Level 0)</option>
                  {locations
                    .filter(l => l.depthLevel < 3)
                    .map(l => (
                      <option key={l.psaCode} value={l.psaCode}>
                        [{l.psaCode}] {l.name} (Depth L{l.depthLevel})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Branch Category</label>
                  <Input
                    placeholder="e.g. Category I, Category II"
                    value={addForm.category ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">City</label>
                  <Input
                    placeholder="e.g. Islamabad"
                    value={addForm.city ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 33.7294"
                    value={addForm.latitude ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 73.0931"
                    value={addForm.longitude ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingAction}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  {savingAction ? 'Creating...' : 'Create Location'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT LOCATION DETAILS */}
      {isEditOpen && selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-emerald-600" />
                  Edit Location Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updating metadata for [{selectedDetail.location.psaCode}] {selectedDetail.location.name}
                </p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Location Name *</label>
                <Input
                  value={editForm.name ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">PA Code</label>
                  <Input
                    maxLength={4}
                    value={editForm.paCode ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, paCode: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Branch Category</label>
                  <Input
                    value={editForm.category ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">City</label>
                  <Input
                    value={editForm.city ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Country</label>
                  <Input
                    value={editForm.country ?? 'PK'}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={editForm.latitude ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={editForm.longitude ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingAction}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  {savingAction ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REPARENT / MOVE LOCATION */}
      {isReparentOpen && selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                  Move / Reparent Location Unit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Change organizational parent with circular reference prevention
                </p>
              </div>
              <button onClick={() => setIsReparentOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Current Moving Node */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Moving Node</span>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-xs">
                    {selectedDetail.location.psaCode}
                  </span>
                  <span>{selectedDetail.location.name}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Current Parent: <strong>{selectedDetail.parent ? `[${selectedDetail.parent.psaCode}] ${selectedDetail.parent.name}` : 'Root (Level 0)'}</strong>
                </div>
              </div>

              {/* Circular Reference Guard Alert */}
              {reparentValidationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{reparentValidationError}</span>
                </div>
              )}

              {/* Target Parent Selector */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Select New Parent Node:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Search candidate parent..."
                    value={reparentParentSearch}
                    onChange={(e) => setReparentParentSearch(e.target.value)}
                    className="pl-8 text-xs bg-white h-8"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                  <div
                    onClick={() => handleReparentTargetSelect('')}
                    className={`p-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      reparentTarget === '' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span>✦ Make Operational Root Segment (Depth Level 0)</span>
                    {reparentTarget === '' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>

                  {locations
                    .filter(l => {
                      if (l.psaCode === selectedDetail.location.psaCode) return false;
                      if (!reparentParentSearch.trim()) return l.depthLevel <= 2;
                      const q = reparentParentSearch.toLowerCase();
                      return l.psaCode.toLowerCase().includes(q) || l.name.toLowerCase().includes(q);
                    })
                    .slice(0, 50)
                    .map(cand => {
                      const isDescendant = cand.psaPath.includes(`/${selectedDetail.location.psaCode}/`);
                      const isSelected = reparentTarget === cand.psaCode;

                      return (
                        <div
                          key={cand.psaCode}
                          onClick={() => !isDescendant && handleReparentTargetSelect(cand.psaCode)}
                          className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                            isDescendant
                              ? 'opacity-40 bg-slate-100 cursor-not-allowed text-slate-400'
                              : isSelected
                              ? 'bg-emerald-50 text-emerald-900 font-semibold cursor-pointer'
                              : 'hover:bg-slate-50 cursor-pointer text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                              {cand.psaCode}
                            </span>
                            <span className="truncate">{cand.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">L{cand.depthLevel}</span>
                          </div>
                          {isDescendant ? (
                            <span className="text-[10px] text-red-500 font-semibold uppercase">Descendant</span>
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                <strong>Automatic Lineage Propagation:</strong> Reparenting this unit will automatically trigger
                a cascading database update recalculating <code>PSAPath</code> and <code>DepthLevel</code> across all nested sub-branches.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReparentOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveReparent}
                  disabled={savingAction || !!reparentValidationError}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold"
                >
                  {savingAction ? 'Moving...' : 'Confirm Move'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {isDeleteOpen && selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-red-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base">Delete Location Unit</h3>
              </div>
              <button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {selectedDetail.children.length > 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-1">
                  <strong>Cannot Delete Branch Unit:</strong>
                  <p>
                    Location '[{selectedDetail.location.psaCode}] {selectedDetail.location.name}' currently has{' '}
                    <strong>{selectedDetail.children.length} direct child units</strong>. You must reparent or delete all child
                    branches before this node can be removed.
                  </p>
                </div>
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to delete location unit{' '}
                  <strong className="text-slate-900">
                    [{selectedDetail.location.psaCode}] {selectedDetail.location.name}
                  </strong>
                  ? This action is permanent and will be logged in the system compliance audit trail.
                </p>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                {selectedDetail.children.length === 0 && (
                  <Button
                    size="sm"
                    onClick={handleDeleteLocation}
                    disabled={savingAction}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                  >
                    {savingAction ? 'Deleting...' : 'Delete Permanently'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationManagementPage;
