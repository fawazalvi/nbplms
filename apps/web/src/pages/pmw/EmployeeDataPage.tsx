import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  Users,
  Search,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  FileText,
  UserCheck,
  UserPlus,
  Edit2,
  Trash2,
  Building2,
  Award,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';

interface EmployeeDataPageProps {
  userRole?: string;
}

export const EmployeeDataPage: React.FC<EmployeeDataPageProps> = ({ userRole = 'Employee' }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [groups, setGroups] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');

  // Add / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sapId: '',
    fullName: '',
    grade: 'OG I',
    designation: 'Operations Officer',
    location: 'Head Office Karachi',
    reportingGroup: 'Consumer Banking Group',
    division: 'Retail Banking Division',
    wingDepartment: 'Branch Operations Wing',
    regionBranch: 'Karachi Central Branch',
    email: '',
    isMrtOrMrc: false,
    isActive: true,
    firstAppraiserSapId: '',
    secondAppraiserSapId: '',
    createPortalUser: true,
    portalUserRole: 'Employee'
  });
  const [submittingForm, setSubmittingForm] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Staff Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Appraiser Override Modal State
  const [showBulkAppraiserModal, setShowBulkAppraiserModal] = useState(false);
  const [bulkAppraiserText, setBulkAppraiserText] = useState('');
  const [parsedAppraiserRows, setParsedAppraiserRows] = useState<any[]>([]);
  const [savingBulkAppraisers, setSavingBulkAppraisers] = useState(false);

  const loadCycles = async () => {
    try {
      const data = await api.getCycles();
      setCycles(data || []);
      // If there is an active cycle, select it by default
      const active = data?.find((c: any) => c.status === 101 || c.statusName === 'CycleActive');
      if (active && selectedCycleId === 'all') {
        setSelectedCycleId(active.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadGrades = async () => {
    try {
      const gradeData = await api.getGradeMappings();
      setGrades(gradeData || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      if (selectedCycleId && selectedCycleId !== 'all') {
        const cycleData = await api.getCycleEmployees(selectedCycleId, {
          group: selectedGroup,
          grade: selectedGrade,
          search: searchTerm
        });
        const mapped = (cycleData || []).map((ec: any) => ({
          id: ec.employeeId,
          employeeCycleId: ec.employeeCycleId,
          sapId: ec.sapId,
          fullName: ec.fullName,
          email: ec.email,
          grade: ec.snapshotGrade,
          designation: ec.snapshotDesignation,
          reportingGroup: ec.snapshotReportingGroup,
          location: ec.snapshotLocation,
          division: ec.snapshotDivision,
          wingDepartment: ec.snapshotWingDepartment,
          regionBranch: ec.snapshotRegionBranch,
          isMrtOrMrc: ec.snapshotIsMrtOrMrc,
          isActive: true,
          firstAppraiserSapId: ec.firstAppraiserSapId,
          firstAppraiserName: ec.firstAppraiserName,
          secondAppraiserSapId: ec.secondAppraiserSapId,
          secondAppraiserName: ec.secondAppraiserName,
          formTypeAssigned: ec.assignedFormType,
          currentStatus: ec.currentStatus
        }));
        setEmployees(mapped);
      } else {
        const data = await api.getEmployees({
          group: selectedGroup,
          grade: selectedGrade,
          search: searchTerm
        });
        setEmployees(data || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const groupData = await api.getReportingGroups();
      setGroups(groupData || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCycles();
    loadGroups();
    loadGrades();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [selectedCycleId, selectedGroup, selectedGrade]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      sapId: '',
      fullName: '',
      grade: 'OG I',
      designation: 'Operations Officer',
      location: 'Head Office Karachi',
      reportingGroup: groups.length > 0 ? groups[0].groupName : 'Consumer Banking Group',
      division: 'Retail Banking Division',
      wingDepartment: 'Branch Operations Wing',
      regionBranch: 'Karachi Central Branch',
      email: '',
      isMrtOrMrc: false,
      isActive: true,
      firstAppraiserSapId: '',
      secondAppraiserSapId: '',
      createPortalUser: true,
      portalUserRole: 'Employee'
    });
    setShowFormModal(true);
  };

  const handleOpenEditModal = (emp: any) => {
    setIsEditing(true);
    setEditingId(emp.id);
    setFormData({
      sapId: emp.sapId,
      fullName: emp.fullName,
      grade: emp.grade,
      designation: emp.designation,
      location: emp.location,
      reportingGroup: emp.reportingGroup,
      division: emp.division,
      wingDepartment: emp.wingDepartment,
      regionBranch: emp.regionBranch,
      email: emp.email || '',
      isMrtOrMrc: emp.isMrtOrMrc || false,
      isActive: emp.isActive !== false,
      firstAppraiserSapId: emp.firstAppraiserSapId || '',
      secondAppraiserSapId: emp.secondAppraiserSapId || '',
      createPortalUser: false,
      portalUserRole: 'Employee'
    });
    setShowFormModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    try {
      if (isEditing && editingId) {
        await api.updateEmployee(editingId, {
          ...formData,
          actorUserId: 'PMW_ADMIN'
        });
        setImportMessage(`Employee '${formData.fullName}' (SAP ID: ${formData.sapId}) updated successfully.`);
      } else {
        await api.createEmployee({
          ...formData,
          actorUserId: 'PMW_ADMIN'
        });
        setImportMessage(`Employee '${formData.fullName}' (SAP ID: ${formData.sapId}) created successfully.`);
      }
      setShowFormModal(false);
      await loadEmployees();
    } catch (e: any) {
      alert(e.message || 'Failed to save employee.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(employeeToDelete.id, 'PMW_ADMIN');
      setImportMessage(`Employee '${employeeToDelete.fullName}' (SAP ID: ${employeeToDelete.sapId}) removed successfully.`);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      await loadEmployees();
    } catch (e: any) {
      alert(e.message || 'Failed to remove employee.');
    } finally {
      setDeleting(false);
    }
  };

  // Sample CSV Template Generator for Staff Import with strict ESG & RPSA codes
  const handleDownloadSampleCsv = () => {
    const csvContent = "SapId,FullName,ESG,Designation,Location,RPSA,Division,WingDepartment,RegionBranch,FirstAppraiserSapId,SecondAppraiserSapId,IsMrtOrMrc\n" +
      "95101,Muhammad Rashid,09,Operations Officer,Lahore,0002,Retail,Branch Operations,Lahore Main,84920,10004,false\n" +
      "95102,Saima Imran,08,Relationship Manager,Karachi,0001,Commercial,Commercial Branch,Karachi Central,84920,10004,false\n" +
      "95103,Kamran Akmal,05,Regional Head,Islamabad,0001,Corporate,Regional Office,Islamabad,10002,10001,false\n" +
      "95104,Ali Hassan,06,Senior Risk Controller,Karachi,0003,Credit Risk,Risk Assessment,Head Office,10003,10002,true\n" +
      "95105,Tariq Jameel,01,President & CEO,Karachi Head Office,0001,Executive,Executive Office,Head Office,10001,10001,false";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'NBP_Eligible_Staff_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sample CSV for Bulk Appraiser Override
  const handleDownloadAppraiserSampleCsv = () => {
    const csvContent = "EmployeeSapId,FirstAppraiserSapId,SecondAppraiserSapId\n" +
      "84920,10004,10003\n" +
      "91204,84920,10004\n" +
      "88392,10004,10003";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'NBP_Bulk_Appraiser_Override_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // File Picker Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  // CSV Text Parser for Staff Import with strict ESG & RPSA code validation
  const parseCsv = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      setParsedRows([]);
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

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;

      const sapId = cols[0] || '';
      const fullName = cols[1] || '';
      const rawEsg = cols[2] || '';
      const formattedEsg = formatEsgCode(rawEsg);
      const matchedGrade = grades.find(g => 
        (g.esgCode && g.esgCode === formattedEsg) || 
        g.gradeCode?.toLowerCase() === rawEsg.toLowerCase() ||
        g.gradeName?.toLowerCase() === rawEsg.toLowerCase()
      );

      const designation = cols[3] || 'Officer';
      const location = cols[4] || 'Head Office';
      const rawRpsa = cols[5] || '';
      const formattedRpsa = formatRpsaCode(rawRpsa);
      const matchedGroup = groups.find(rg => 
        (rg.rpsaCode && rg.rpsaCode === formattedRpsa) || 
        rg.groupCode?.toLowerCase() === rawRpsa.toLowerCase() ||
        rg.groupName?.toLowerCase() === rawRpsa.toLowerCase()
      );

      const division = cols[6] || 'Operations';
      const wingDepartment = cols[7] || 'General';
      const regionBranch = cols[8] || 'Karachi Main';
      const firstAppraiserSapId = cols[9] || '';
      const secondAppraiserSapId = cols[10] || '';
      const isMrtOrMrc = (cols[11] || '').toLowerCase() === 'true' || (cols[11] || '').toLowerCase() === 'yes' || cols[11] === '1';

      const isEsgValid = !!matchedGrade;
      const isRpsaValid = !!matchedGroup;

      let formType = "KPI Form (70/30)";
      if (isMrtOrMrc) {
        formType = "Risk-Adjusted BSC (5-Perspective)";
      } else if (matchedGrade?.defaultFormType === 'BALANCED_SCORECARD' || ['01', '02', '03', '04', '05'].includes(matchedGrade?.esgCode || formattedEsg)) {
        formType = "Balanced Scorecard (4-Perspective)";
      }

      rows.push({
        sapId,
        fullName,
        esgCode: matchedGrade?.esgCode || formattedEsg,
        grade: matchedGrade ? matchedGrade.gradeName : rawEsg,
        isEsgValid,
        designation,
        location,
        rpsaCode: matchedGroup?.rpsaCode || formattedRpsa,
        reportingGroup: matchedGroup ? matchedGroup.groupName : rawRpsa,
        isRpsaValid,
        division,
        wingDepartment,
        regionBranch,
        firstAppraiserSapId,
        secondAppraiserSapId,
        isMrtOrMrc,
        formType,
        isValid: isEsgValid && isRpsaValid && Boolean(sapId && fullName)
      });
    }

    setParsedRows(rows);
  };

  // Bulk Appraiser CSV Parser
  const parseAppraiserCsv = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      setParsedAppraiserRows([]);
      return;
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      rows.push({
        employeeSapId: cols[0] || '',
        firstAppraiserSapId: cols[1] || '',
        secondAppraiserSapId: cols[2] || ''
      });
    }
    setParsedAppraiserRows(rows);
  };

  // Submit Import to Database
  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setImportMessage(null);

    try {
      const payload = parsedRows.map(r => ({
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

      const targetCycle = selectedCycleId !== 'all' ? selectedCycleId : undefined;
      const res = await api.importEmployees(payload, targetCycle, 'PMW_ADMIN');
      const cycleTitle = cycles.find(c => c.id === targetCycle)?.title;
      setImportMessage(`Successfully imported ${res.successfulImports ?? parsedRows.length} staff records ${cycleTitle ? `into '${cycleTitle}' with frozen historical snapshots` : 'into master directory'}!`);
      setShowImportModal(false);
      setParsedRows([]);
      setCsvText('');
      await loadEmployees();
      await loadCycles();
    } catch (e: any) {
      setImportMessage(`Import error: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Commit Bulk Appraiser Override
  const handleCommitBulkAppraisers = async () => {
    if (parsedAppraiserRows.length === 0) return;
    setSavingBulkAppraisers(true);
    try {
      const res = await api.bulkUpdateAppraisers(parsedAppraiserRows, 'PMW_ADMIN');
      setImportMessage(res.message);
      setShowBulkAppraiserModal(false);
      setParsedAppraiserRows([]);
      setBulkAppraiserText('');
      await loadEmployees();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingBulkAppraisers(false);
    }
  };

  // Stats calculation
  const totalCount = employees.length;
  const kpiCount = employees.filter(e => e.formTypeAssigned?.includes('KPI') || (!e.isMrtOrMrc && ['06', '07', '08', '09', 'OG III', 'OG II', 'OG I', 'AVP'].includes(e.grade))).length;
  const bscCount = employees.filter(e => !e.isMrtOrMrc && ['01', '02', '03', '04', '05', 'VP', 'SVP', 'EVP', 'SEVP', 'President/CEO', 'PRESIDENT'].includes(e.grade)).length;
  const mrtCount = employees.filter(e => e.isMrtOrMrc).length;

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" />
            <span>Cycle-Specific Staff Rosters & Master Data</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">Database Driven</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Employee Directory & Cycle Rosters</h1>
          <p className="text-slate-300 text-xs mt-1">
            Upload staff sheets directly into appraisal cycles, freeze historical snapshots, and manage employee records.
          </p>

          {/* Cycle Scope Selector */}
          <div className="mt-3 flex items-center space-x-2 bg-slate-950/70 p-1.5 px-3 rounded-xl border border-emerald-500/30 w-fit">
            <span className="text-[11px] font-bold text-emerald-400">Target Cycle:</span>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Staff (Master Directory)</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.title} ({c.enrolledCount ?? 0} Enrolled)
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'PmwSuperAdmin' && (
            <Button variant="nbp" size="sm" onClick={handleOpenAddModal} className="font-bold shadow-md">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Employee
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20 border-white/20 font-semibold"
            onClick={() => {
              setParsedAppraiserRows([]);
              setBulkAppraiserText('');
              setShowBulkAppraiserModal(true);
            }}
          >
            <UserCheck className="h-4 w-4 mr-1.5 text-emerald-400" />
            Bulk Appraisers
          </Button>

          {userRole === 'PmwSuperAdmin' && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setImportMessage(null);
                setShowImportModal(true);
              }}
              className="font-semibold"
              title="Bulk upload employee sheet (PMW Super Admin only)"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Import CSV
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={loadEmployees} title="Refresh Directory">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {importMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{importMessage}</span>
          </div>
          <button onClick={() => setImportMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-xl font-black text-slate-900">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">AVP & Below (KPI)</p>
              <h3 className="text-xl font-black text-blue-900">{kpiCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">VP & Above (BSC)</p>
              <h3 className="text-xl font-black text-purple-900">{bscCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">MRT / MRC</p>
              <h3 className="text-xl font-black text-rose-900">{mrtCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search by Name, SAP ID, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Group:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 text-xs"
              >
                <option value="All Groups">All Reporting Groups</option>
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

            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Grade:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 text-xs"
              >
                <option value="All Grades">All Grades</option>
                <option value="OG III">OG III</option>
                <option value="OG II">OG II</option>
                <option value="OG I">OG I</option>
                <option value="AVP">AVP</option>
                <option value="VP">VP</option>
                <option value="SVP">SVP</option>
                <option value="EVP">EVP</option>
                <option value="SEVP">SEVP</option>
                <option value="President/CEO">President/CEO</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Employee Master Directory</CardTitle>
            <CardDescription className="text-xs">Database-driven staff records ({employees.length} employees)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading employee records from DB...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No staff records found matching your filters. Click <strong>"Add Employee"</strong> or <strong>"Import CSV"</strong>!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">SAP ID</th>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Grade & Designation</th>
                    <th className="p-3">Reporting Group & Location</th>
                    <th className="p-3">Appraiser & Supervisor</th>
                    <th className="p-3">Assigned Form Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {emp.sapId}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{emp.email || `${emp.sapId}@nbp.com.pk`}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <Badge variant="secondary" className="font-bold">{getGradeDisplay(emp.grade)}</Badge>
                          {emp.isMrtOrMrc && <Badge variant="danger" className="text-[9px]">MRT/MRC</Badge>}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{emp.designation}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{getGroupDisplay(emp.reportingGroup)}</div>
                        <div className="text-[11px] text-slate-400">{emp.location} • {emp.regionBranch}</div>
                      </td>
                      <td className="p-3">
                        {emp.firstAppraiserSapId ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-slate-700">1st:</span>{' '}
                            <span className="font-mono text-emerald-800">{emp.firstAppraiserSapId}</span>
                            {emp.firstAppraiserName && <span className="text-slate-500"> ({emp.firstAppraiserName.split(' ')[0]})</span>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No 1st Appraiser</span>
                        )}
                        {emp.secondAppraiserSapId && (
                          <div className="text-[11px] text-slate-500">
                            <span className="font-semibold">2nd:</span>{' '}
                            <span className="font-mono text-slate-700">{emp.secondAppraiserSapId}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="nbp" className="text-[10px]">{emp.formTypeAssigned}</Badge>
                      </td>
                      <td className="p-3">
                        {emp.isActive !== false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactive</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEmployeeToDelete(emp);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Remove Employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Employee Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  {isEditing ? <Edit2 className="h-5 w-5 text-emerald-400" /> : <UserPlus className="h-5 w-5 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {isEditing ? 'Edit Employee Details' : 'Add New Employee'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {isEditing ? `Update master record for SAP ID ${formData.sapId}` : 'Register new bank staff into database'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee}>
              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">SAP ID *</label>
                    <Input
                      type="text"
                      required
                      disabled={isEditing}
                      placeholder="e.g. 95101"
                      value={formData.sapId}
                      onChange={(e) => setFormData({ ...formData, sapId: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-slate-700">Full Name *</label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mahmood"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Grade (ESG) *</label>
                    <select
                      required
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                    >
                      {grades.map(g => (
                        <option key={g.id} value={g.esgCode || g.gradeCode}>
                          {g.esgCode ? `${g.esgCode} - ` : ''}{g.gradeName} ({g.gradeCode})
                        </option>
                      ))}
                      {grades.length === 0 && (
                        <>
                          <option value="09">09 - OG III (Officer Grade III)</option>
                          <option value="08">08 - OG II (Officer Grade II)</option>
                          <option value="07">07 - OG I (Officer Grade I)</option>
                          <option value="06">06 - AVP (Assistant Vice President)</option>
                          <option value="05">05 - VP (Vice President)</option>
                          <option value="04">04 - SVP (Senior Vice President)</option>
                          <option value="03">03 - EVP (Executive Vice President)</option>
                          <option value="02">02 - SEVP (Senior Executive Vice President)</option>
                          <option value="01">01 - President / CEO</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-slate-700">Designation *</label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Branch Manager / Operations Officer"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Reporting Group (RPSA) *</label>
                    <select
                      required
                      value={formData.reportingGroup}
                      onChange={(e) => setFormData({ ...formData, reportingGroup: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.rpsaCode || g.groupCode}>
                          {g.rpsaCode ? `${g.rpsaCode} - ` : ''}{g.groupName} ({g.groupCode})
                        </option>
                      ))}
                      {groups.length === 0 && (
                        <>
                          <option value="0001">0001 - Commercial Banking Group (CBG)</option>
                          <option value="0002">0002 - Consumer Banking Group (RBG)</option>
                          <option value="0003">0003 - Risk Management Group (RMG)</option>
                          <option value="0004">0004 - Treasury & Global Markets (TGM)</option>
                          <option value="0005">0005 - Information Technology Group (ITG)</option>
                          <option value="0006">0006 - Operations Group (OPS)</option>
                          <option value="0007">0007 - HR Management Group (HRG)</option>
                          <option value="0008">0008 - Compliance Group (CMP)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Official Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. employee@nbp.com.pk"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Division</label>
                    <Input
                      type="text"
                      placeholder="e.g. Retail Banking"
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Wing / Department</label>
                    <Input
                      type="text"
                      placeholder="e.g. Operations Wing"
                      value={formData.wingDepartment}
                      onChange={(e) => setFormData({ ...formData, wingDepartment: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Location / City</label>
                    <Input
                      type="text"
                      placeholder="e.g. Karachi / Lahore"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Appraiser & Supervisor Selection */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="font-bold text-slate-900 block text-xs">Assigned Appraisers (Reporting Hierarchy)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SapIdAutocomplete
                      label="1st Appraiser (Immediate Supervisor)"
                      placeholder="Type SAP ID or Name..."
                      value={formData.firstAppraiserSapId}
                      onChange={(sapId) => setFormData({ ...formData, firstAppraiserSapId: sapId })}
                    />
                    <SapIdAutocomplete
                      label="2nd Appraiser / Countersigning Officer"
                      placeholder="Type SAP ID or Name..."
                      value={formData.secondAppraiserSapId}
                      onChange={(sapId) => setFormData({ ...formData, secondAppraiserSapId: sapId })}
                    />
                  </div>
                </div>

                {/* Policy Flags */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isMrtOrMrc}
                      onChange={(e) => setFormData({ ...formData, isMrtOrMrc: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Material Risk Taker / Controller (MRT/MRC)</span>
                      <p className="text-[10px] text-slate-500">Assigns 5-Perspective Risk-Adjusted Balanced Scorecard</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 h-4 w-4"
                    />
                    <span className="font-bold text-slate-800 text-xs">Active Employee Status</span>
                  </label>
                </div>

                {!isEditing && (
                  <label className="flex items-center space-x-2 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <input
                      type="checkbox"
                      checked={formData.createPortalUser}
                      onChange={(e) => setFormData({ ...formData, createPortalUser: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Auto-create Portal Login Account</span>
                      <p className="text-[10px] text-slate-500">Username: SAP ID • Default Temporary Password: <code className="font-mono text-emerald-800">Nbp@12345!</code></p>
                    </div>
                  </label>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowFormModal(false)}>
                  Cancel
                </Button>
                <Button variant="nbp" size="sm" type="submit" disabled={submittingForm} className="font-bold">
                  {submittingForm ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-rose-200">
            <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-rose-700/40 p-2 flex items-center justify-center border border-rose-500/30">
                  <Trash2 className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Remove Employee</h3>
                  <p className="text-[11px] text-rose-200">Permanent Database Deletion</p>
                </div>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-700">
                Are you sure you want to permanently delete the employee record for:
              </p>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 font-medium text-rose-950 space-y-1">
                <div className="font-bold text-sm">{employeeToDelete.fullName}</div>
                <div className="text-xs font-mono">SAP ID: {employeeToDelete.sapId} • Grade: {employeeToDelete.grade}</div>
                <div className="text-[11px] text-rose-800">{employeeToDelete.reportingGroup}</div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This action will unlink any direct reports assigned to this employee, remove associated draft cycle records, and log an audited removal event.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="font-bold"
              >
                {deleting ? 'Removing...' : 'Confirm Remove Employee'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Appraiser Override Modal */}
      {showBulkAppraiserModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">PMW & GPM Bulk Appraiser Override</h3>
                  <p className="text-[11px] text-slate-300">Pre-Validate Appraiser & Supervisor Mappings</p>
                </div>
              </div>
              <button onClick={() => setShowBulkAppraiserModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-900 font-semibold">Bulk Appraiser Override Template CSV</span>
                <Button variant="outline" size="sm" onClick={handleDownloadAppraiserSampleCsv} className="h-8 text-xs font-bold border-emerald-300">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download Sample CSV
                </Button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paste CSV (EmployeeSapId, FirstAppraiserSapId, SecondAppraiserSapId):</label>
                <textarea
                  rows={5}
                  value={bulkAppraiserText}
                  onChange={(e) => {
                    setBulkAppraiserText(e.target.value);
                    parseAppraiserCsv(e.target.value);
                  }}
                  placeholder="EmployeeSapId,FirstAppraiserSapId,SecondAppraiserSapId&#10;84920,10004,10003&#10;91204,84920,10004"
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {parsedAppraiserRows.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border flex items-center justify-between font-bold">
                  <span>Parsed Mappings: {parsedAppraiserRows.length} Rows</span>
                  <Badge variant="nbp">Pre-Validated Status</Badge>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowBulkAppraiserModal(false)}>Cancel</Button>
              <Button
                variant="nbp"
                size="sm"
                onClick={handleCommitBulkAppraisers}
                disabled={parsedAppraiserRows.length === 0 || savingBulkAppraisers}
              >
                {savingBulkAppraisers ? 'Updating...' : `Pre-Validate & Save ${parsedAppraiserRows.length} Mappings`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSV / XLSX Upload Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Upload Eligible Staff File</h3>
                  <p className="text-[11px] text-slate-300">CSV/XLSX Bulk SAP Data Import & Validation</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center space-x-2 text-emerald-900 font-semibold">
                  <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Need the standard NBP import template format?</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadSampleCsv} className="h-8 text-xs font-bold border-emerald-300">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download Sample CSV
                </Button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-6 text-center bg-slate-50 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.xlsx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto text-emerald-700 mb-2" />
                <p className="font-bold text-slate-800 text-sm">Choose or Drop CSV / XLSX Staff File</p>
                <p className="text-slate-500 text-[11px] mt-1">Required: Grade via 2-digit ESG Code (e.g. 09, 06, 01) & Group via 4-digit RPSA Code (e.g. 0001, 0002). Free text is disallowed.</p>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 font-bold"
                >
                  Select File From Computer
                </Button>
              </div>

              {/* Or Direct CSV Input */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Or Paste CSV Data Directly (SapId,FullName,ESG,Designation,Location,RPSA,...):</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCsv(e.target.value);
                  }}
                  placeholder="SapId,FullName,ESG,Designation,Location,RPSA,Division,WingDepartment,RegionBranch,FirstAppraiserSapId,SecondAppraiserSapId,IsMrtOrMrc&#10;95101,Muhammad Rashid,09,Operations Officer,Lahore,0002,Retail,Branch Operations,Lahore Main,84920,10004,false"
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* Validation Summary & Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Validation Preview ({parsedRows.length} Rows Parsed):</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="nbp">{parsedRows.filter(r => r.isValid).length} Valid Records</Badge>
                      {parsedRows.some(r => !r.isValid) && (
                        <Badge variant="danger">{parsedRows.filter(r => !r.isValid).length} Invalid Code(s)</Badge>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 font-bold uppercase text-slate-600 sticky top-0">
                        <tr>
                          <th className="p-2">SAP ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">ESG (Grade)</th>
                          <th className="p-2">RPSA (Group)</th>
                          <th className="p-2">Form Engine</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className={`hover:bg-slate-50 ${!r.isValid ? 'bg-red-50/50' : ''}`}>
                            <td className="p-2 font-mono font-bold">{r.sapId}</td>
                            <td className="p-2 font-semibold">{r.fullName}</td>
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
                            <td className="p-2 text-emerald-700 font-bold">{r.formType}</td>
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

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button
                variant="nbp"
                size="sm"
                onClick={handleCommitImport}
                disabled={parsedRows.length === 0 || importing}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {importing ? 'Importing...' : `Confirm & Commit (${parsedRows.length} Records) to DB`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
