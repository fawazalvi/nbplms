import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  Calendar,
  Plus,
  Play,
  Pause,
  Lock,
  RefreshCw,
  CheckCircle2,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Search,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  FileText,
  Building2,
  ShieldAlert,
  Layers,
  Sparkles
} from 'lucide-react';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';

export const AppraisalCyclesPage: React.FC = () => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('Annual Appraisal Cycle 2027');
  const [newCircular, setNewCircular] = useState('NBP/HR/2027/001');
  const [message, setMessage] = useState<string | null>(null);

  // Cycle Employee Roster Modal State
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterEmployees, setRosterEmployees] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterGroupFilter, setRosterGroupFilter] = useState('All Groups');
  const [rosterGradeFilter, setRosterGradeFilter] = useState('All Grades');
  const [groups, setGroups] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  // Cycle Employee Batch Upload Modal State
  const [showCycleUploadModal, setShowCycleUploadModal] = useState(false);
  const [cycleUploadText, setCycleUploadText] = useState('');
  const [cycleParsedRows, setCycleParsedRows] = useState<any[]>([]);
  const [uploadingCycleStaff, setUploadingCycleStaff] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enroll Staff Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollMode, setEnrollMode] = useState<'single' | 'group' | 'all'>('single');
  const [enrollSapId, setEnrollSapId] = useState('');
  const [enrollTargetGroup, setEnrollTargetGroup] = useState('Consumer Banking Group');
  const [overrideGrade, setOverrideGrade] = useState('');
  const [overrideGroup, setOverrideGroup] = useState('');
  const [overrideDesignation, setOverrideDesignation] = useState('');
  const [overrideLocation, setOverrideLocation] = useState('');
  const [overrideIsMrt, setOverrideIsMrt] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Edit Cycle Snapshot Modal State
  const [showEditSnapshotModal, setShowEditSnapshotModal] = useState(false);
  const [editingSnapshotItem, setEditingSnapshotItem] = useState<any | null>(null);
  const [editSnapshotGrade, setEditSnapshotGrade] = useState('OG I');
  const [editSnapshotGroup, setEditSnapshotGroup] = useState('Consumer Banking Group');
  const [editSnapshotDesignation, setEditSnapshotDesignation] = useState('');
  const [editSnapshotLocation, setEditSnapshotLocation] = useState('');
  const [editSnapshotDivision, setEditSnapshotDivision] = useState('');
  const [editSnapshotWing, setEditSnapshotWing] = useState('');
  const [editSnapshotBranch, setEditSnapshotBranch] = useState('');
  const [editSnapshotFirstSap, setEditSnapshotFirstSap] = useState('');
  const [editSnapshotSecondSap, setEditSnapshotSecondSap] = useState('');
  const [editSnapshotIsMrt, setEditSnapshotIsMrt] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  const loadCycles = async () => {
    setLoading(true);
    try {
      const data = await api.getCycles();
      setCycles(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await api.getReportingGroups();
      setGroups(data || []);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadGrades = async () => {
    try {
      const data = await api.getGradeMappings();
      setGrades(data || []);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCycles();
    loadGroups();
    loadGrades();
  }, []);

  const loadRoster = async (cycleId: string) => {
    setLoadingRoster(true);
    try {
      const data = await api.getCycleEmployees(cycleId, {
        group: rosterGroupFilter,
        grade: rosterGradeFilter,
        search: rosterSearch
      });
      setRosterEmployees(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingRoster(false);
    }
  };

  const getGradeDisplay = (val: string) => {
    if (!val) return '-';
    const g = grades.find(x => x.esgCode === val || x.gradeCode === val || x.gradeName === val);
    if (g) return `${g.esgCode ? `${g.esgCode} (${g.gradeCode})` : g.gradeName}`;
    return val;
  };

  const getGroupDisplay = (val: string) => {
    if (!val) return '-';
    const grp = groups.find(x => x.rpsaCode === val || x.groupCode === val || x.groupName === val);
    if (grp) return `${grp.rpsaCode ? `${grp.rpsaCode} • ` : ''}${grp.groupName}`;
    return val;
  };

  const handleOpenRoster = async (cycle: any) => {
    setSelectedCycle(cycle);
    setShowRosterModal(true);
    setRosterSearch('');
    setRosterGroupFilter('All Groups');
    setRosterGradeFilter('All Grades');
    await loadRoster(cycle.id);
  };

  const handleOpenCycleUpload = (cycle: any) => {
    setSelectedCycle(cycle);
    setCycleUploadText('');
    setCycleParsedRows([]);
    setShowCycleUploadModal(true);
  };

  const handleCreate = async () => {
    try {
      await api.createCycle({
        title: newTitle,
        circularReference: newCircular,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        acknowledgementDeadline: new Date(new Date().setMonth(new Date().getMonth() + 11)),
        multipleActiveCyclesAllowed: true
      });
      setMessage('Cycle created successfully. You can now upload and enroll staff into this cycle.');
      setShowCreateModal(false);
      await loadCycles();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpen = async (id: string) => {
    await api.openCycle(id, 'PMW_ADMIN');
    setMessage('Cycle activated.');
    await loadCycles();
  };

  const handleSuspend = async (id: string) => {
    await api.suspendCycle(id, 'PMW_ADMIN');
    setMessage('Cycle suspended.');
    await loadCycles();
  };

  const handleClose = async (id: string) => {
    await api.closeCycle(id, 'PMW_ADMIN');
    setMessage('Cycle closed.');
    await loadCycles();
  };

  // CSV Parsing for Cycle Staff Upload with strict ESG & RPSA code validation
  const parseCsvText = (text: string) => {
    setCycleUploadText(text);
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setCycleParsedRows([]);
      return;
    }

    const formatEsgCode = (raw: string) => {
      if (!raw) return '';
      const digits = raw.replace(/\D/g, '');
      if (digits) return digits.padStart(2, '0');
      return raw.trim();
    };

    const formatRpsaCode = (raw: string) => {
      if (!raw) return '';
      const digits = raw.replace(/\D/g, '');
      if (digits) return digits.padStart(4, '0');
      return raw.trim();
    };

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('sap') || firstLine.includes('name') || firstLine.includes('esg') || firstLine.includes('grade');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows = dataLines.map((line, idx) => {
      const cols = line.includes('\t')
        ? line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''))
        : line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

      const rawEsg = cols[2] || '';
      const formattedEsg = formatEsgCode(rawEsg);
      const matchedGrade = grades.find(g => 
        (g.esgCode && g.esgCode === formattedEsg) || 
        g.gradeCode?.toLowerCase() === rawEsg.toLowerCase() ||
        g.gradeName?.toLowerCase() === rawEsg.toLowerCase()
      );

      const rawRpsa = cols[5] || '';
      const formattedRpsa = formatRpsaCode(rawRpsa);
      const matchedGroup = groups.find(rg => 
        (rg.rpsaCode && rg.rpsaCode === formattedRpsa) || 
        rg.groupCode?.toLowerCase() === rawRpsa.toLowerCase() ||
        rg.groupName?.toLowerCase() === rawRpsa.toLowerCase()
      );

      const isMrt = (cols[11] || '').toLowerCase() === 'true' || (cols[11] || '').toLowerCase() === 'yes' || (cols[11] || '') === '1';
      const isEsgValid = !!matchedGrade;
      const isRpsaValid = !!matchedGroup;

      return {
        id: `row-${idx + 1}`,
        sapId: cols[0] || '',
        fullName: cols[1] || '',
        esgCode: matchedGrade?.esgCode || formattedEsg,
        grade: matchedGrade ? matchedGrade.gradeName : rawEsg,
        isEsgValid,
        designation: cols[3] || 'Operations Officer',
        location: cols[4] || 'Karachi Head Office',
        rpsaCode: matchedGroup?.rpsaCode || formattedRpsa,
        reportingGroup: matchedGroup ? matchedGroup.groupName : rawRpsa,
        isRpsaValid,
        division: cols[6] || 'Retail Banking Division',
        wingDepartment: cols[7] || 'Branch Operations Wing',
        regionBranch: cols[8] || 'Karachi Main Branch',
        firstAppraiserSapId: cols[9] || '',
        secondAppraiserSapId: cols[10] || '',
        isMrtOrMrc: isMrt,
        isValid: Boolean(cols[0] && cols[1] && isEsgValid && isRpsaValid)
      };
    });

    setCycleParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const header = "SapId,FullName,ESG,Designation,Location,RPSA,Division,WingDepartment,RegionBranch,FirstAppraiserSapId,SecondAppraiserSapId,IsMrtOrMrc\n";
    const sample1 = "84920,Fawaz Ahmed,06,Assistant Vice President,Karachi Head Office,0001,Corporate Banking,Relationship Management,Karachi Main,10004,10003,false\n";
    const sample2 = "91204,Zahid Hussain,07,Operations Officer,Karachi,0001,Operations Division,Commercial Branch,Karachi Central,84920,10004,false\n";
    const sample3 = "76210,Usman Farooq,06,Chief Market Risk Analyst,Head Office Karachi,0003,Risk Assessment Division,Risk Assessment,Head Office,10003,10002,true\n";
    const sample4 = "95101,Tariq Jameel,01,President & CEO,Head Office,0001,Executive,Executive Office,Head Office,10001,10001,false\n";

    const blob = new Blob([header + sample1 + sample2 + sample3 + sample4], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NBP_Cycle_Staff_Import_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCommitCycleUpload = async () => {
    if (!selectedCycle || cycleParsedRows.length === 0) return;
    setUploadingCycleStaff(true);
    try {
      const payload = cycleParsedRows.map(r => ({
        sapId: r.sapId,
        fullName: r.fullName,
        esgCode: r.esgCode,
        grade: r.grade,
        designation: r.designation,
        location: r.location,
        rpsaCode: r.rpsaCode,
        reportingGroup: r.reportingGroup,
        division: r.division,
        wingDepartment: r.wingDepartment,
        regionBranch: r.regionBranch,
        firstAppraiserSapId: r.firstAppraiserSapId || null,
        secondAppraiserSapId: r.secondAppraiserSapId || null,
        isMrtOrMrc: r.isMrtOrMrc
      }));

      const res = await api.importEmployees(payload, selectedCycle.id, 'PMW_ADMIN');
      setMessage(`Successfully uploaded and enrolled ${res.successfulImports} staff members into '${selectedCycle.title}'!`);
      setShowCycleUploadModal(false);
      await loadCycles();
      if (showRosterModal) {
        await loadRoster(selectedCycle.id);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to upload staff into cycle.');
    } finally {
      setUploadingCycleStaff(false);
    }
  };

  // Handle Enrollment Modal
  const handleOpenEnrollModal = () => {
    setEnrollMode('single');
    setEnrollSapId('');
    setEnrollTargetGroup(groups.length > 0 ? groups[0].groupName : 'Consumer Banking Group');
    setOverrideGrade('');
    setOverrideGroup('');
    setOverrideDesignation('');
    setOverrideLocation('');
    setOverrideIsMrt(false);
    setShowEnrollModal(true);
  };

  const handleCommitEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle) return;
    setEnrolling(true);
    try {
      let payload: any = {
        actorUserId: 'PMW_ADMIN'
      };

      if (enrollMode === 'all') {
        payload.enrollAllActive = true;
      } else if (enrollMode === 'group') {
        payload.targetGroup = enrollTargetGroup;
      } else {
        if (!enrollSapId) {
          alert('Please select an employee to enroll.');
          setEnrolling(false);
          return;
        }
        payload.sapId = enrollSapId;
        if (overrideGrade) payload.overrideGrade = overrideGrade;
        if (overrideGroup) payload.overrideReportingGroup = overrideGroup;
        if (overrideDesignation) payload.overrideDesignation = overrideDesignation;
        if (overrideLocation) payload.overrideLocation = overrideLocation;
        payload.overrideIsMrtOrMrc = overrideIsMrt;
      }

      const res = await api.enrollCycleEmployees(selectedCycle.id, payload);
      setMessage(res.message);
      setShowEnrollModal(false);
      await loadRoster(selectedCycle.id);
      await loadCycles();
    } catch (e: any) {
      alert(e.message || 'Failed to enroll staff into cycle.');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle Snapshot Edit
  const handleOpenEditSnapshot = (item: any) => {
    setEditingSnapshotItem(item);
    setEditSnapshotGrade(item.snapshotGrade || '');
    setEditSnapshotGroup(item.snapshotReportingGroup || '');
    setEditSnapshotDesignation(item.snapshotDesignation || '');
    setEditSnapshotLocation(item.snapshotLocation || '');
    setEditSnapshotIsMrt(item.snapshotIsMrtOrMrc || false);
    setEditSnapshotFirstSap(item.firstAppraiserSapId || '');
    setEditSnapshotSecondSap(item.secondAppraiserSapId || '');
    setShowEditSnapshotModal(true);
  };

  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle || !editingSnapshotItem) return;
    setSavingSnapshot(true);
    try {
      await api.updateCycleEmployeeSnapshot(selectedCycle.id, editingSnapshotItem.employeeCycleId, {
        snapshotGrade: editSnapshotGrade,
        snapshotReportingGroup: editSnapshotGroup,
        snapshotDesignation: editSnapshotDesignation,
        snapshotLocation: editSnapshotLocation,
        snapshotIsMrtOrMrc: editSnapshotIsMrt,
        firstAppraiserSapId: editSnapshotFirstSap || null,
        secondAppraiserSapId: editSnapshotSecondSap || null,
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(`Cycle historical snapshot updated for ${editingSnapshotItem.fullName}.`);
      setShowEditSnapshotModal(false);
      await loadRoster(selectedCycle.id);
    } catch (e: any) {
      alert(e.message || 'Failed to update cycle snapshot.');
    } finally {
      setSavingSnapshot(false);
    }
  };

  // Handle Remove Employee from Cycle
  const handleRemoveFromCycle = async (item: any) => {
    if (!selectedCycle) return;
    if (!confirm(`Are you sure you want to un-enroll '${item.fullName}' (SAP ID: ${item.sapId}) from '${selectedCycle.title}'?`)) {
      return;
    }
    try {
      await api.removeCycleEmployee(selectedCycle.id, item.employeeCycleId, 'PMW_ADMIN');
      setMessage(`Un-enrolled ${item.fullName} from cycle.`);
      await loadRoster(selectedCycle.id);
      await loadCycles();
    } catch (e: any) {
      alert(e.message || 'Failed to remove employee from cycle.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="h-4 w-4" />
            <span>Cycle Control & Cycle-Specific Staff Upload</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">Database Driven</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Appraisal Cycles & Staff Rosters</h1>
          <p className="text-slate-300 text-xs mt-1">
            Create an appraisal cycle first, then upload and manage the staff roster with historical grade & group snapshots for each cycle.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadCycles} title="Refresh Cycles">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="gold" size="sm" onClick={() => setShowCreateModal(true)} className="font-bold">
            <Plus className="h-4 w-4 mr-1" />
            1. Create New Cycle
          </Button>
        </div>
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

      {/* Cycles Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">Appraisal Cycles & Batch Upload Centers</CardTitle>
          <CardDescription className="text-xs">
            Step 1: Create Cycle $\rightarrow$ Step 2: Upload Staff Sheet for that cycle $\rightarrow$ Step 3: Manage Cycle Rosters & Snapshots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading cycles from database...</div>
          ) : cycles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No cycles found. Click <strong>"1. Create New Cycle"</strong> to initialize an appraisal cycle first!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Cycle Title & Circular</th>
                    <th className="p-3">Period / Dates</th>
                    <th className="p-3">Ack Deadline</th>
                    <th className="p-3">Cycle Staff Actions</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cycles.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{c.title}</div>
                        <div className="font-mono text-slate-500 text-[11px] mt-0.5">{c.circularReference}</div>
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="p-3 font-bold text-amber-800">
                        {new Date(c.acknowledgementDeadline).toLocaleDateString()}
                      </td>
                      <td className="p-3 space-x-1.5">
                        <Button
                          variant="nbp"
                          size="sm"
                          onClick={() => handleOpenCycleUpload(c)}
                          className="h-8 text-xs font-bold shadow-xs bg-emerald-800 hover:bg-emerald-900 text-white"
                          title="Upload Employee CSV/Excel sheet for this cycle"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          <span>Upload Staff Sheet</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoster(c)}
                          className="h-8 text-xs font-bold border-slate-300 text-slate-800 hover:bg-slate-50 shadow-xs"
                          title="View and manage enrolled employees for this cycle"
                        >
                          <Users className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                          <span>{c.enrolledCount ?? 0} Enrolled</span>
                        </Button>
                      </td>
                      <td className="p-3">
                        <Badge variant={c.status === 101 || c.statusName === 'CycleActive' ? 'nbp' : c.status === 102 || c.statusName === 'CycleSuspended' ? 'danger' : c.status === 103 || c.statusName === 'CycleClosed' ? 'secondary' : 'default'} className="text-[10px] font-bold">
                          {c.statusName || (c.status === 101 ? 'Active' : c.status === 102 ? 'Suspended' : c.status === 103 ? 'Closed' : 'Draft')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleOpen(c.id)} title="Activate Cycle" className="h-8 w-8 p-0">
                          <Play className="h-3.5 w-3.5 text-emerald-700" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSuspend(c.id)} title="Suspend Cycle" className="h-8 w-8 p-0">
                          <Pause className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleClose(c.id)} title="Close Cycle" className="h-8 w-8 p-0">
                          <Lock className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cycle Employee Batch Upload Modal */}
      {showCycleUploadModal && selectedCycle && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Upload className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Upload Employee Sheet for {selectedCycle.title}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Circular: {selectedCycle.circularReference} • Enrolls staff with frozen historical grade & group attributes
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCycleUploadModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div>
                  <span className="font-bold text-emerald-950 block text-xs">Standardized NBP Employee CSV/Excel Format (RPSA & ESG Enforced)</span>
                  <p className="text-[11px] text-emerald-800">
                    Columns: SAP ID, Full Name, ESG Code (2-Digit), Designation, Location, RPSA Code (4-Digit), Division, Wing, Branch, 1st Appraiser SAP, 2nd Appraiser SAP, MRT Flag. Free text for Grade & Group is strictly disallowed.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0 font-bold border-emerald-700/40 text-emerald-900 hover:bg-emerald-100">
                  <Download className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                  Download Sample CSV
                </Button>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-700/40 bg-slate-50 hover:bg-emerald-50/40 transition-colors p-6 rounded-2xl text-center cursor-pointer"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                />
                <FileSpreadsheet className="h-8 w-8 text-emerald-700 mx-auto mb-2" />
                <span className="font-bold text-slate-800 text-sm block">Click to select CSV file from your computer</span>
                <span className="text-slate-500 text-xs">or paste CSV/TSV plain text below</span>
              </div>

              {/* Textarea for manual paste */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Or Paste CSV/Tab-Separated Text Data (SapId,FullName,ESG,Designation,Location,RPSA,...):</label>
                <textarea
                  value={cycleUploadText}
                  onChange={(e) => parseCsvText(e.target.value)}
                  placeholder="84920,Fawaz Ahmed,06,Assistant Vice President,Karachi Head Office,0001,Corporate Banking,Relationship Management,Karachi Main,10004,10003,false"
                  rows={4}
                  className="w-full p-2.5 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Parsed Preview Table */}
              {cycleParsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      Parsed Employee Rows ({cycleParsedRows.length} total • {cycleParsedRows.filter(r => r.isValid).length} valid)
                    </span>
                    {cycleParsedRows.some(r => !r.isValid) && (
                      <Badge variant="danger" className="text-[10px]">Contains rows with invalid ESG or RPSA code(s)</Badge>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">SAP ID</th>
                          <th className="p-2">Full Name</th>
                          <th className="p-2">ESG (Grade)</th>
                          <th className="p-2">RPSA (Group)</th>
                          <th className="p-2">1st / 2nd Appraisers</th>
                          <th className="p-2">Assigned Form</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cycleParsedRows.map((r, i) => (
                          <tr key={i} className={r.isValid ? "hover:bg-slate-50" : "bg-rose-50"}>
                            <td className="p-2 font-mono font-bold">{r.sapId || <span className="text-rose-600">Missing</span>}</td>
                            <td className="p-2 font-medium">{r.fullName || <span className="text-rose-600">Missing</span>}</td>
                            <td className="p-2">
                              {r.isEsgValid ? (
                                <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {r.esgCode} ({r.grade})
                                </span>
                              ) : (
                                <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded">
                                  Invalid ESG: {r.esgCode || 'Missing'}
                                </span>
                              )}
                              {r.isMrtOrMrc && <Badge variant="danger" className="ml-1 text-[9px]">MRT</Badge>}
                            </td>
                            <td className="p-2">
                              {r.isRpsaValid ? (
                                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {r.rpsaCode} ({r.reportingGroup})
                                </span>
                              ) : (
                                <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded">
                                  Invalid RPSA: {r.rpsaCode || 'Missing'}
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-[11px]">
                              {r.firstAppraiserSapId && <span>1st: {r.firstAppraiserSapId}</span>}
                              {r.secondAppraiserSapId && <span className="ml-1">2nd: {r.secondAppraiserSapId}</span>}
                            </td>
                            <td className="p-2">
                              <Badge variant="nbp" className="text-[10px]">
                                {r.isMrtOrMrc ? '5-P Risk BSC' : ['01', '02', '03', '04', '05'].includes(r.esgCode) || ['VP', 'SVP', 'EVP', 'SEVP', 'PRESIDENT', 'CEO'].includes((r.grade || '').toUpperCase()) ? '4-P BSC' : 'KPI (70/30)'}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              {r.isValid ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Valid</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Invalid</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowCycleUploadModal(false)}>Cancel</Button>
              <Button
                variant="nbp"
                size="sm"
                onClick={handleCommitCycleUpload}
                disabled={uploadingCycleStaff || cycleParsedRows.length === 0}
                className="font-bold bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                {uploadingCycleStaff ? 'Uploading & Enrolling...' : `Upload & Enroll into ${selectedCycle.title}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cycle Employee Roster Modal */}
      {showRosterModal && selectedCycle && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {selectedCycle.title} — Enrolled Staff Roster
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Circular: {selectedCycle.circularReference} • Independent Historical Grade & Group Snapshots
                  </p>
                </div>
              </div>
              <button onClick={() => setShowRosterModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Roster Actions & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="nbp"
                    size="sm"
                    onClick={() => {
                      setShowRosterModal(false);
                      handleOpenCycleUpload(selectedCycle);
                    }}
                    className="font-bold bg-emerald-800 text-white"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Upload Staff Sheet
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenEnrollModal} className="font-bold border-slate-300">
                    <UserPlus className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                    Enroll Single / Group
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => loadRoster(selectedCycle.id)} title="Refresh Roster">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingRoster ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Search roster..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadRoster(selectedCycle.id)}
                      className="h-8 pl-8 text-xs w-44"
                    />
                  </div>

                  <select
                    value={rosterGroupFilter}
                    onChange={(e) => {
                      setRosterGroupFilter(e.target.value);
                    }}
                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="All Groups">All Groups</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.groupName}>{g.groupName}</option>
                    ))}
                    {groups.length === 0 && (
                      <>
                        <option value="Commercial Banking Group">Commercial Banking Group</option>
                        <option value="Consumer Banking Group">Consumer Banking Group</option>
                        <option value="Risk Management Group">Risk Management Group</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Roster Table */}
              <div className="max-h-[50vh] overflow-y-auto border border-slate-200 rounded-xl">
                {loadingRoster ? (
                  <div className="p-8 text-center text-slate-500 font-medium">Loading cycle roster...</div>
                ) : rosterEmployees.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border-dashed">
                    No employees currently enrolled in this cycle. Click <strong>"Upload Staff Sheet"</strong> or <strong>"Enroll Single / Group"</strong> to populate this cycle!
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">SAP ID</th>
                        <th className="p-3">Staff Name</th>
                        <th className="p-3">Cycle Snapshot Grade</th>
                        <th className="p-3">Cycle Snapshot Group</th>
                        <th className="p-3">Assigned Form Type</th>
                        <th className="p-3">1st / 2nd Appraisers</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rosterEmployees.map((emp) => (
                        <tr key={emp.employeeCycleId} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{emp.sapId}</td>
                          <td className="p-3 font-semibold text-slate-900">{emp.fullName}</td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1">
                              <Badge variant="secondary" className="font-bold">{getGradeDisplay(emp.snapshotGrade)}</Badge>
                              {emp.snapshotIsMrtOrMrc && <Badge variant="danger" className="text-[9px]">MRT</Badge>}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{emp.snapshotDesignation}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            <div>{getGroupDisplay(emp.snapshotReportingGroup)}</div>
                            <div className="text-[10px] text-slate-400">{emp.snapshotLocation}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="nbp" className="text-[10px] font-bold">
                              {emp.assignedFormType === 'KpiForm' ? 'KPI Form (70/30)' : emp.assignedFormType === 'BalancedScorecard' ? '4-P BSC' : '5-P Risk BSC'}
                            </Badge>
                          </td>
                          <td className="p-3 text-[11px]">
                            {emp.firstAppraiserSapId && <div>1st: <span className="font-mono text-emerald-800 font-semibold">{emp.firstAppraiserSapId}</span></div>}
                            {emp.secondAppraiserSapId && <div>2nd: <span className="font-mono text-slate-700 font-semibold">{emp.secondAppraiserSapId}</span></div>}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {emp.currentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenEditSnapshot(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                                title="Edit Cycle Historical Snapshot"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveFromCycle(emp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Remove from this Cycle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <span className="text-slate-500 text-xs">Total Staff in Cycle: <strong>{rosterEmployees.length}</strong></span>
              <Button variant="outline" size="sm" onClick={() => setShowRosterModal(false)}>
                Close Roster
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Staff Modal */}
      {showEnrollModal && selectedCycle && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <UserPlus className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Enroll Staff into {selectedCycle.title}</h3>
                  <p className="text-[11px] text-slate-300">Creates frozen snapshot of grade and group at enrollment time</p>
                </div>
              </div>
              <button onClick={() => setShowEnrollModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCommitEnroll}>
              <div className="p-6 space-y-4 text-xs">
                {/* Enrollment Scope Mode */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Enrollment Scope</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrollMode('single')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        enrollMode === 'single'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Single Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollMode('group')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        enrollMode === 'group'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      By Group
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollMode('all')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        enrollMode === 'all'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      All Active Staff
                    </button>
                  </div>
                </div>

                {enrollMode === 'single' && (
                  <div className="space-y-3">
                    <SapIdAutocomplete
                      label="Select Employee to Enroll *"
                      value={enrollSapId}
                      onChange={(sapId) => setEnrollSapId(sapId)}
                      placeholder="Search by SAP ID or Name..."
                      required
                    />

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px]">Optional Cycle Snapshot Overrides (Leave empty to use Master Data):</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600">Cycle Grade Override</label>
                          <select
                            value={overrideGrade}
                            onChange={(e) => setOverrideGrade(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="">Default (From Master)</option>
                            <option value="OG III">OG III</option>
                            <option value="OG II">OG II</option>
                            <option value="OG I">OG I</option>
                            <option value="AVP">AVP</option>
                            <option value="VP">VP</option>
                            <option value="SVP">SVP</option>
                            <option value="EVP">EVP</option>
                            <option value="SEVP">SEVP</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600">Cycle Group Override</label>
                          <select
                            value={overrideGroup}
                            onChange={(e) => setOverrideGroup(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="">Default (From Master)</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.groupName}>{g.groupName}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center space-x-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={overrideIsMrt}
                          onChange={(e) => setOverrideIsMrt(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-700 h-3.5 w-3.5"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Flag as Material Risk Taker (MRT/MRC) for this cycle</span>
                      </label>
                    </div>
                  </div>
                )}

                {enrollMode === 'group' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Target Reporting Group *</label>
                    <select
                      value={enrollTargetGroup}
                      onChange={(e) => setEnrollTargetGroup(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.groupName}>{g.groupName}</option>
                      ))}
                      {groups.length === 0 && (
                        <>
                          <option value="Commercial Banking Group">Commercial Banking Group</option>
                          <option value="Consumer Banking Group">Consumer Banking Group</option>
                          <option value="Risk Management Group">Risk Management Group</option>
                        </>
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      All active employees belonging to this group will be enrolled with their current master attributes snapshotted.
                    </p>
                  </div>
                )}

                {enrollMode === 'all' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-900 text-xs">Bank-wide Enrollment</span>
                    <p className="text-[11px] text-emerald-800">
                      Enrolls all active bank employees into <strong>{selectedCycle.title}</strong> who are not yet enrolled. Historical snapshots will be captured automatically.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowEnrollModal(false)}>Cancel</Button>
                <Button variant="nbp" size="sm" type="submit" disabled={enrolling} className="font-bold">
                  {enrolling ? 'Enrolling...' : 'Confirm & Enroll'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cycle Snapshot Modal */}
      {showEditSnapshotModal && editingSnapshotItem && selectedCycle && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Edit2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Edit Cycle Historical Snapshot</h3>
                  <p className="text-[11px] text-slate-300">
                    {editingSnapshotItem.fullName} (SAP ID: {editingSnapshotItem.sapId}) in {selectedCycle.title}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditSnapshotModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshot}>
              <div className="p-6 space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                  <strong>Historical Isolation Note:</strong> Modifying these snapshot attributes applies <em>only</em> to this specific appraisal cycle ({selectedCycle.title}) and does not alter the employee's master record.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Snapshot Grade (ESG) *</label>
                    <select
                      value={editSnapshotGrade}
                      onChange={(e) => setEditSnapshotGrade(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      {grades.map(g => (
                        <option key={g.id} value={g.esgCode || g.gradeCode}>
                          {g.esgCode ? `${g.esgCode} - ` : ''}{g.gradeName} ({g.gradeCode})
                        </option>
                      ))}
                      {grades.length === 0 && (
                        <>
                          <option value="09">09 - OG III</option>
                          <option value="08">08 - OG II</option>
                          <option value="07">07 - OG I</option>
                          <option value="06">06 - AVP</option>
                          <option value="05">05 - VP</option>
                          <option value="04">04 - SVP</option>
                          <option value="03">03 - EVP</option>
                          <option value="02">02 - SEVP</option>
                          <option value="01">01 - President/CEO</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Snapshot Reporting Group (RPSA) *</label>
                    <select
                      value={editSnapshotGroup}
                      onChange={(e) => setEditSnapshotGroup(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.rpsaCode || g.groupCode}>
                          {g.rpsaCode ? `${g.rpsaCode} - ` : ''}{g.groupName} ({g.groupCode})
                        </option>
                      ))}
                      {groups.length === 0 && (
                        <>
                          <option value="0001">0001 - Commercial Banking Group</option>
                          <option value="0002">0002 - Consumer Banking Group</option>
                          <option value="0003">0003 - Risk Management Group</option>
                          <option value="0004">0004 - Treasury & Global Markets</option>
                          <option value="0005">0005 - Information Technology Group</option>
                          <option value="0006">0006 - Operations Group</option>
                          <option value="0007">0007 - HR Management Group</option>
                          <option value="0008">0008 - Compliance Group</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Snapshot Designation</label>
                  <Input
                    value={editSnapshotDesignation}
                    onChange={(e) => setEditSnapshotDesignation(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">1st Appraiser SAP ID</label>
                    <Input
                      value={editSnapshotFirstSap}
                      onChange={(e) => setEditSnapshotFirstSap(e.target.value)}
                      placeholder="e.g. 10004"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">2nd Appraiser SAP ID</label>
                    <Input
                      value={editSnapshotSecondSap}
                      onChange={(e) => setEditSnapshotSecondSap(e.target.value)}
                      placeholder="e.g. 10003"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={editSnapshotIsMrt}
                    onChange={(e) => setEditSnapshotIsMrt(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs">Material Risk Taker / Controller (MRT/MRC)</span>
                    <p className="text-[10px] text-slate-500">Auto-assigns 5-Perspective Risk-Adjusted BSC</p>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowEditSnapshotModal(false)}>Cancel</Button>
                <Button variant="nbp" size="sm" type="submit" disabled={savingSnapshot} className="font-bold">
                  {savingSnapshot ? 'Saving Snapshot...' : 'Save Cycle Snapshot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Cycle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Step 1: Create Annual Appraisal Cycle</CardTitle>
              <CardDescription className="text-xs">
                Creates a new cycle. After creation, you can upload and enroll the staff roster for this cycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Cycle Title</label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div>
                <label className="font-bold text-slate-700">Circular Reference Number</label>
                <Input value={newCircular} onChange={(e) => setNewCircular(e.target.value)} />
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2 rounded-b-xl">
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleCreate} className="font-bold">Save & Create Cycle</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
