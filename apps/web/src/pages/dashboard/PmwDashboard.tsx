import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  PieChart,
  Play,
  Pause,
  Lock,
  Send,
  RefreshCw,
  Calendar,
  FileCheck,
  Activity,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ChevronRight,
  Camera,
  Layers,
  Building2,
  GraduationCap,
  Sparkles,
  Edit2,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';
import { api } from '@/lib/api';

interface PmwDashboardProps {
  userRole?: string;
  selectedCycleId?: string | null;
  onSelectCycle?: (cycleId: string) => void;
  onNavigate?: (tab: string) => void;
}

export const PmwDashboard: React.FC<PmwDashboardProps> = ({
  userRole = 'Employee',
  selectedCycleId,
  onSelectCycle,
  onNavigate
}) => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [cycleStats, setCycleStats] = useState<any>(null);
  const [snapshotSummary, setSnapshotSummary] = useState<any>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Snapshot Management Modals
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [snapshotGroups, setSnapshotGroups] = useState<any[]>([]);
  const [snapshotGrades, setSnapshotGrades] = useState<any[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [groupEditForm, setGroupEditForm] = useState<any>({});
  const [gradeEditForm, setGradeEditForm] = useState<any>({});

  // Load list of all cycles
  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const data = await api.getCycles();
      setCycles(data || []);
      
      // Determine initial cycle
      if (selectedCycleId && data.some((c: any) => c.id === selectedCycleId)) {
        setActiveCycleId(selectedCycleId);
      } else if (data && data.length > 0) {
        const active = data.find((c: any) => c.status === 101 || c.statusName === 'CycleActive');
        setActiveCycleId(active ? active.id : data[0].id);
      }
    } catch (e) {
      console.error('Failed to load appraisal cycles', e);
    } finally {
      setLoadingCycles(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  // Update when selectedCycleId prop changes externally
  useEffect(() => {
    if (selectedCycleId && selectedCycleId !== activeCycleId) {
      setActiveCycleId(selectedCycleId);
    }
  }, [selectedCycleId]);

  // Load specific cycle stats & snapshot summary when activeCycleId changes
  const loadStats = async (cycleId: string) => {
    if (!cycleId) return;
    setLoadingStats(true);
    try {
      const [stats, summary] = await Promise.all([
        api.getCycleStats(cycleId).catch(() => null),
        api.getCycleSnapshotSummary(cycleId).catch(() => null)
      ]);
      setCycleStats(stats);
      setSnapshotSummary(summary);
    } catch (e) {
      console.error(`Failed to load stats for cycle ${cycleId}`, e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeCycleId) {
      loadStats(activeCycleId);
    }
  }, [activeCycleId]);

  const handleCycleChange = (newCycleId: string) => {
    setActiveCycleId(newCycleId);
    if (onSelectCycle) {
      onSelectCycle(newCycleId);
    }
  };

  const handleSnapshotOrg = async () => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleOrg(activeCycleId);
      setMessage(res.message || 'Organizational hierarchy snapshot captured successfully.');
      await loadStats(activeCycleId);
      await loadCycles();
    } catch (e: any) {
      alert(e.message || 'Failed to capture organizational snapshot.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnapshotEmployees = async () => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleEmployees(activeCycleId, {
        rpsaCode: selectedGroupFilter === 'ALL' ? undefined : selectedGroupFilter
      });
      setMessage(res.message || 'Employee snapshot captured successfully.');
      await loadStats(activeCycleId);
      await loadCycles();
    } catch (e: any) {
      alert(e.message || 'Failed to capture employee snapshot.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenGroupsModal = async () => {
    if (!activeCycleId) return;
    try {
      const groups = await api.getCycleSnapshotGroups(activeCycleId);
      setSnapshotGroups(groups || []);
      setShowGroupsModal(true);
    } catch (e: any) {
      alert(e.message || 'Failed to load snapshot groups.');
    }
  };

  const handleSaveSnapshotGroup = async (groupId: string) => {
    try {
      await api.updateCycleSnapshotGroup(activeCycleId, groupId, groupEditForm);
      const groups = await api.getCycleSnapshotGroups(activeCycleId);
      setSnapshotGroups(groups || []);
      setEditingGroupId(null);
      await loadStats(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to update snapshot group.');
    }
  };

  const handleOpenGradesModal = async () => {
    if (!activeCycleId) return;
    try {
      const grades = await api.getCycleSnapshotGrades(activeCycleId);
      setSnapshotGrades(grades || []);
      setShowGradesModal(true);
    } catch (e: any) {
      alert(e.message || 'Failed to load snapshot grades.');
    }
  };

  const handleSaveSnapshotGrade = async (gradeId: string) => {
    try {
      await api.updateCycleSnapshotGrade(activeCycleId, gradeId, gradeEditForm);
      const grades = await api.getCycleSnapshotGrades(activeCycleId);
      setSnapshotGrades(grades || []);
      setEditingGradeId(null);
      await loadStats(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to update snapshot grade.');
    }
  };

  const handleCycleLifecycle = async (action: 'open' | 'suspend' | 'close') => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      if (action === 'open') {
        await api.openCycle(activeCycleId);
        setMessage('Appraisal Cycle activated successfully.');
      } else if (action === 'suspend') {
        await api.suspendCycle(activeCycleId);
        setMessage('Appraisal Cycle suspended.');
      } else if (action === 'close') {
        await api.closeCycle(activeCycleId);
        setMessage('Appraisal Cycle closed cleanly.');
      }
      await loadCycles();
      await loadStats(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Operation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentCycle = cycles.find((c) => c.id === activeCycleId) || cycleStats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* PMW Executive Control Banner with Cycle Selector */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl border border-emerald-900/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <BarChart3 className="h-4 w-4" />
              <span>Appraisal Cycle Control Center & Executive Dashboard</span>
              <span>•</span>
              <Badge variant="nbp" className="text-white bg-emerald-700">Bank-wide Oversight</Badge>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
              {currentCycle?.title || 'Cycle Performance Dashboard'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 font-medium">
              <span>Circular Ref: <strong className="font-mono text-emerald-300">{currentCycle?.circularReference || 'NBP/HR/2026/001'}</strong></span>
              <span>•</span>
              <span>Period: <strong>{currentCycle?.startDate ? new Date(currentCycle.startDate).toLocaleDateString() : '01/01/2026'} – {currentCycle?.endDate ? new Date(currentCycle.endDate).toLocaleDateString() : '31/12/2026'}</strong></span>
              <span>•</span>
              <span>Deadline: <strong className="text-amber-300">{currentCycle?.acknowledgementDeadline ? new Date(currentCycle.acknowledgementDeadline).toLocaleDateString() : '30/11/2026'}</strong></span>
            </div>
          </div>

          {/* Cycle Selector & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 shadow-inner">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Selected Appraisal Cycle
              </label>
              <select
                value={activeCycleId}
                onChange={(e) => handleCycleChange(e.target.value)}
                disabled={loadingCycles}
                className="w-full sm:w-64 h-9 px-3 bg-slate-950 border border-emerald-500/40 text-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white py-1">
                    {c.title} ({c.statusName || (c.status === 101 ? 'Active' : 'Draft')})
                  </option>
                ))}
                {cycles.length === 0 && (
                  <option value="">No Cycles Found</option>
                )}
              </select>
            </div>

            <div className="flex items-end space-x-1.5 pt-4 sm:pt-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  loadCycles();
                  if (activeCycleId) loadStats(activeCycleId);
                }}
                title="Refresh Metrics for Selected Cycle"
                className="h-9 px-3 bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
              >
                <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="nbp"
                size="sm"
                onClick={() => onNavigate && onNavigate('cycles')}
                className="h-9 text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                All Cycles
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Cycle Status Ribbon */}
        {currentCycle && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-semibold">Lifecycle Status:</span>
              <Badge
                variant={
                  currentCycle.status === 101 || currentCycle.statusName === 'CycleActive'
                    ? 'nbp'
                    : currentCycle.status === 102 || currentCycle.statusName === 'CycleSuspended'
                    ? 'danger'
                    : currentCycle.status === 103 || currentCycle.statusName === 'CycleClosed'
                    ? 'secondary'
                    : 'default'
                }
                className="text-xs font-bold px-2.5 py-0.5"
              >
                {currentCycle.statusName || (currentCycle.status === 101 ? 'Active' : currentCycle.status === 102 ? 'Suspended' : currentCycle.status === 103 ? 'Closed' : 'Draft')}
              </Badge>
              <span className="text-xs text-slate-400">
                • Total Enrolled: <strong className="text-white">{cycleStats?.totalEnrolled ?? currentCycle.enrolledCount ?? 0} Staff</strong>
              </span>
            </div>

            {/* Lifecycle Quick Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading || currentCycle.status === 101 || currentCycle.statusName === 'CycleActive'}
                onClick={() => handleCycleLifecycle('open')}
                className="h-8 text-xs font-bold border-emerald-600 text-emerald-400 hover:bg-emerald-950 bg-transparent"
                title="Activate / Open this Cycle"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading || currentCycle.status === 102 || currentCycle.statusName === 'CycleSuspended'}
                onClick={() => handleCycleLifecycle('suspend')}
                className="h-8 text-xs font-bold border-amber-600 text-amber-300 hover:bg-amber-950 bg-transparent"
                title="Suspend this Cycle"
              >
                <Pause className="h-3.5 w-3.5 mr-1" />
                Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading || currentCycle.status === 103 || currentCycle.statusName === 'CycleClosed'}
                onClick={() => handleCycleLifecycle('close')}
                className="h-8 text-xs font-bold border-rose-600 text-rose-300 hover:bg-rose-950 bg-transparent"
                title="Close this Cycle"
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                Close
              </Button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Primary Cycle Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-emerald-700 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Staff Roster</CardDescription>
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 mt-1">
              {loadingStats ? '...' : (cycleStats?.totalEnrolled ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-emerald-700 font-bold">100% Snapshot Frozen</span>
              <button
                onClick={() => onNavigate && onNavigate('cycles')}
                className="text-emerald-800 hover:underline font-bold flex items-center"
              >
                View Roster <ChevronRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-sky-600 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">KPI Forms (70 / 30)</CardDescription>
              <FileCheck className="h-4 w-4 text-sky-600" />
            </div>
            <CardTitle className="text-3xl font-black text-sky-700 mt-1">
              {loadingStats ? '...' : (cycleStats?.formBreakdown?.kpi ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500 mt-1">
              AVP & Below Grades (ESG: 06 – 09)
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-indigo-600 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Balanced Scorecards</CardDescription>
              <PieChart className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-3xl font-black text-indigo-700 mt-1">
              {loadingStats ? '...' : ((cycleStats?.formBreakdown?.bsc ?? 0) + (cycleStats?.formBreakdown?.riskBsc ?? 0)).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500 mt-1">
              VP & Above (ESG: 01 – 05) • <strong>{cycleStats?.formBreakdown?.riskBsc ?? 0} MRT (5-P Risk)</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-600 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disagreement Cases</CardDescription>
              <AlertCircle className="h-4 w-4 text-purple-600" />
            </div>
            <CardTitle className="text-3xl font-black text-purple-700 mt-1">
              {loadingStats ? '...' : (cycleStats?.stageBreakdown?.disagreement ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-500">GPM Review Stage</span>
              <button
                onClick={() => onNavigate && onNavigate('disagreements')}
                className="text-purple-700 hover:underline font-bold flex items-center"
              >
                Inspect Cases <ChevronRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appraisal Cycle Snapshot & Calibration Center */}
      <Card className="border-2 border-emerald-700/40 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 shadow-md">
        <CardHeader className="pb-3 border-b border-emerald-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-emerald-800" />
                <CardTitle className="text-base font-black text-slate-900">
                  Appraisal Cycle Snapshot Center (Organizational & Staff Isolation)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600">
                Capture on-demand snapshots of Reporting Groups (RPSA), Grade hierarchy (ESG), and Staff for <strong>{currentCycle?.title}</strong>. Downstream appraisal activities will strictly use these frozen tables.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={snapshotSummary?.hasOrgSnapshot ? 'nbp' : 'danger'} className="text-xs font-bold py-1 px-3">
                {snapshotSummary?.hasOrgSnapshot ? '✓ Org Hierarchy Frozen' : '⚠ No Org Snapshot Yet'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Organizational Hierarchy Snapshot */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center">
                  <Layers className="h-4 w-4 mr-1 text-emerald-700" />
                  Step 1: Organizational Hierarchy Snapshot
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {snapshotSummary?.groupsCount ?? 0} Groups • {snapshotSummary?.gradesCount ?? 0} Grades
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Freezes active Reporting Groups (RPSA: 0001–0008) and Grade hierarchy (ESG: 01–09). Repeat snapshots automatically deduplicate and update existing snapshot records.
              </p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="nbp"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleSnapshotOrg}
                  className="h-8 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
                >
                  <Camera className="h-3.5 w-3.5 mr-1" />
                  {snapshotSummary?.hasOrgSnapshot ? 'Re-Snapshot Groups & Grades' : 'Capture Org Snapshot'}
                </Button>

                {snapshotSummary?.hasOrgSnapshot && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenGroupsModal}
                      className="h-8 text-xs font-bold border-slate-300 text-slate-800 hover:bg-slate-50"
                      title="Inspect and edit snapshot reporting groups for this cycle"
                    >
                      <Building2 className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                      Manage Groups ({snapshotSummary?.groupsCount ?? 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenGradesModal}
                      className="h-8 text-xs font-bold border-slate-300 text-slate-800 hover:bg-slate-50"
                      title="Inspect and edit snapshot grade hierarchy for this cycle"
                    >
                      <GraduationCap className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                      Manage Grades ({snapshotSummary?.gradesCount ?? 0})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Step 2: Employee Roster Snapshot */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-teal-800 flex items-center">
                  <Users className="h-4 w-4 mr-1 text-teal-700" />
                  Step 2: Employee Roster Snapshot
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {cycleStats?.totalEnrolled ?? 0} Employees Frozen
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Snapshots active bank staff into this cycle. You can snapshot <strong>Bank-wide</strong> or select a <strong>specific Business Group</strong>. Deduplicates cleanly by SAP ID.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Groups (Bank-wide)</option>
                  {snapshotSummary?.groups?.map((g: any) => (
                    <option key={g.rpsaCode} value={g.rpsaCode}>
                      {g.rpsaCode} – {g.groupName}
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleSnapshotEmployees}
                  className="h-8 text-xs font-bold bg-teal-800 hover:bg-teal-900 text-white shadow-xs shrink-0"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {selectedGroupFilter === 'ALL' ? 'Snapshot All Staff' : `Snapshot Group ${selectedGroupFilter}`}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-100/60 rounded-xl text-xs text-emerald-950 flex items-start space-x-2 border border-emerald-200">
            <Sparkles className="h-4 w-4 text-emerald-800 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Role Segregation & Deduplication:</strong> PMW Admin manages cycle snapshot records and executes snapshots. Master Organizational tables are managed exclusively by PMW Super Admin. Taking repeat snapshots or importing employee sheets automatically updates existing records without duplicate rows.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Workflow Stage Progression Tracker */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Cycle Workflow Stage Distribution
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time progress across appraisal stages for <strong>{currentCycle?.title}</strong>
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-bold font-mono">
              Total Forms: {cycleStats?.totalEnrolled ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">1. Objective Draft</span>
              <div className="text-xl font-black text-slate-900">{cycleStats?.stageBreakdown?.objectiveDraft ?? 0}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Staff setting goals</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-amber-700 uppercase block">2. Submitted</span>
              <div className="text-xl font-black text-amber-900">{cycleStats?.stageBreakdown?.objectiveSubmitted ?? 0}</div>
              <div className="text-[10px] text-amber-600 font-semibold">Awaiting Appraiser</div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">3. Approved</span>
              <div className="text-xl font-black text-emerald-900">{cycleStats?.stageBreakdown?.objectiveApproved ?? 0}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">KPIs locked in DB</div>
            </div>

            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-sky-700 uppercase block">4. Annual Review</span>
              <div className="text-xl font-black text-sky-900">{cycleStats?.stageBreakdown?.annualReview ?? 0}</div>
              <div className="text-[10px] text-sky-600 font-semibold">Appraiser evaluation</div>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-teal-700 uppercase block">5. Completed / Agreed</span>
              <div className="text-xl font-black text-teal-900">{cycleStats?.stageBreakdown?.completed ?? 0}</div>
              <div className="text-[10px] text-teal-600 font-semibold">Published & signed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group-Wise Breakdown & Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Group-wise Roster Distribution in this Cycle */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Reporting Group Breakdown in this Cycle
              </CardTitle>
              <CardDescription className="text-xs">
                Enrolled staff count and completion metrics by Business Group
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate && onNavigate('cycles')}
              className="text-xs font-bold border-slate-300 h-8"
            >
              <Users className="h-3.5 w-3.5 mr-1 text-emerald-700" />
              Manage Roster
            </Button>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading group statistics...</div>
            ) : !cycleStats?.groupBreakdown || cycleStats.groupBreakdown.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No staff currently enrolled in this cycle. Click <strong>"Manage Roster"</strong> or <strong>"Upload Staff Sheet"</strong> to enroll employees.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">RPSA Code</th>
                      <th className="p-2.5">Reporting Group Name</th>
                      <th className="p-2.5 text-center">Enrolled Staff</th>
                      <th className="p-2.5 text-center">Draft Stage</th>
                      <th className="p-2.5 text-center">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cycleStats.groupBreakdown.map((grp: any) => (
                      <tr key={grp.groupCode} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-mono font-bold text-emerald-800">{grp.groupCode}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{grp.groupName}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{grp.count}</td>
                        <td className="p-2.5 text-center text-slate-600">{grp.draftCount}</td>
                        <td className="p-2.5 text-center">
                          <Badge variant="nbp" className="text-[10px] font-bold">
                            {grp.completedCount} / {grp.count}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Operations Workspace Cards */}
        <div className="space-y-4">
          <Card
            onClick={() => onNavigate && onNavigate('cycles')}
            className="hover:border-emerald-700/50 cursor-pointer transition-all shadow-xs"
          >
            <CardHeader className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Cycle Staff Roster</CardTitle>
                  <CardDescription className="text-xs">Upload staff & freeze historical snapshots</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            onClick={() => onNavigate && onNavigate('bellcurve')}
            className="hover:border-emerald-700/50 cursor-pointer transition-all shadow-xs"
          >
            <CardHeader className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Bell Curve Calibration</CardTitle>
                  <CardDescription className="text-xs">Prescribed vs actual distribution & exceptions</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            onClick={() => onNavigate && onNavigate('reminders')}
            className="hover:border-emerald-700/50 cursor-pointer transition-all shadow-xs"
          >
            <CardHeader className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Filtered Bulk Reminders</CardTitle>
                  <CardDescription className="text-xs">Send previewed emails filtered by group or stage</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            onClick={() => onNavigate && onNavigate('audit')}
            className="hover:border-emerald-700/50 cursor-pointer transition-all shadow-xs"
          >
            <CardHeader className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Audit & Compliance Logs</CardTitle>
                  <CardDescription className="text-xs">Inspect tamper-evident workflow audit events</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Modal: Manage Snapshot Reporting Groups for this Cycle */}
      {showGroupsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  <span>Cycle Snapshot Reporting Groups ({currentCycle?.title})</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  PMW Admin can adjust group descriptions for this cycle. Master tables remain untouched.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupsModal(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">RPSA</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Group Title</th>
                    <th className="p-2.5">Head SAP ID</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshotGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-emerald-800">{g.rpsaCode}</td>
                      <td className="p-2.5 font-mono font-semibold text-slate-700">{g.groupCode}</td>
                      <td className="p-2.5">
                        {editingGroupId === g.id ? (
                          <Input
                            value={groupEditForm.groupName}
                            onChange={(e) => setGroupEditForm({ ...groupEditForm, groupName: e.target.value })}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{g.groupName}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {editingGroupId === g.id ? (
                          <Input
                            value={groupEditForm.headOfGroupSapId || ''}
                            onChange={(e) => setGroupEditForm({ ...groupEditForm, headOfGroupSapId: e.target.value })}
                            placeholder="SAP ID"
                            className="h-7 text-xs font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-600">{g.headOfGroupSapId || '—'}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        {editingGroupId === g.id ? (
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="nbp"
                              size="sm"
                              onClick={() => handleSaveSnapshotGroup(g.id)}
                              className="h-6 px-2 text-[10px] bg-emerald-800 hover:bg-emerald-900"
                            >
                              <Check className="h-3 w-3 mr-1" /> Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingGroupId(null)}
                              className="h-6 px-2 text-[10px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingGroupId(g.id);
                              setGroupEditForm({ groupName: g.groupName, headOfGroupSapId: g.headOfGroupSapId });
                            }}
                            className="h-6 px-2 text-[10px] text-emerald-800 hover:bg-emerald-50 border-slate-300"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowGroupsModal(false)} className="text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Snapshot Grade Hierarchy for this Cycle */}
      {showGradesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-emerald-400" />
                  <span>Cycle Snapshot Grade Hierarchy ({currentCycle?.title})</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  PMW Admin can adjust grade names and default form type assignments for this cycle.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGradesModal(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">ESG</th>
                    <th className="p-2.5">Grade Code</th>
                    <th className="p-2.5">Grade Title</th>
                    <th className="p-2.5">Default Form Type</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshotGrades.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-emerald-800">{g.esgCode}</td>
                      <td className="p-2.5 font-mono font-semibold text-slate-700">{g.gradeCode}</td>
                      <td className="p-2.5">
                        {editingGradeId === g.id ? (
                          <Input
                            value={gradeEditForm.gradeName}
                            onChange={(e) => setGradeEditForm({ ...gradeEditForm, gradeName: e.target.value })}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{g.gradeName}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {editingGradeId === g.id ? (
                          <select
                            value={gradeEditForm.defaultFormType}
                            onChange={(e) => setGradeEditForm({ ...gradeEditForm, defaultFormType: e.target.value })}
                            className="h-7 px-2 bg-slate-50 border border-slate-300 text-slate-900 rounded text-xs font-bold"
                          >
                            <option value="KPI_FORM">KPI Form (70/30)</option>
                            <option value="BALANCED_SCORECARD">Balanced Scorecard (4-P)</option>
                            <option value="RISK_ADJUSTED_BSC">Risk BSC (5-P)</option>
                          </select>
                        ) : (
                          <Badge variant={g.defaultFormType === 'KPI_FORM' ? 'default' : 'nbp'} className="text-[10px] font-bold">
                            {g.defaultFormType === 'KPI_FORM' ? 'KPI Form (70/30)' : 'Balanced Scorecard (4-P)'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        {editingGradeId === g.id ? (
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="nbp"
                              size="sm"
                              onClick={() => handleSaveSnapshotGrade(g.id)}
                              className="h-6 px-2 text-[10px] bg-emerald-800 hover:bg-emerald-900"
                            >
                              <Check className="h-3 w-3 mr-1" /> Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingGradeId(null)}
                              className="h-6 px-2 text-[10px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingGradeId(g.id);
                              setGradeEditForm({ gradeName: g.gradeName, defaultFormType: g.defaultFormType });
                            }}
                            className="h-6 px-2 text-[10px] text-emerald-800 hover:bg-emerald-50 border-slate-300"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowGradesModal(false)} className="text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
