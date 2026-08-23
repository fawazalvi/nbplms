import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Building2,
  GraduationCap,
  Layers,
  Camera,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  UserCheck,
  PieChart,
  Download,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Check,
  Lock,
  Unlock
} from 'lucide-react';
import { api } from '@/lib/api';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';

interface CycleSnapshotManagerPageProps {
  userRole?: string;
  selectedCycleId?: string | null;
  onSelectCycle?: (cycleId: string) => void;
  onNavigate?: (tab: string) => void;
}

export const CycleSnapshotManagerPage: React.FC<CycleSnapshotManagerPageProps> = ({
  userRole = 'PmwAdmin',
  selectedCycleId,
  onSelectCycle,
  onNavigate
}) => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'org-snapshot' | 'staff-snapshot' | 'roster' | 'groups' | 'grades'>('org-snapshot');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Snapshot Data State
  const [snapshotSummary, setSnapshotSummary] = useState<any>(null);
  const [snapshotGroups, setSnapshotGroups] = useState<any[]>([]);
  const [snapshotGrades, setSnapshotGrades] = useState<any[]>([]);
  const [cycleEmployees, setCycleEmployees] = useState<any[]>([]);
  const [masterGroups, setMasterGroups] = useState<any[]>([]);
  const [masterGrades, setMasterGrades] = useState<any[]>([]);

  // Org Snapshot Selective State
  const [selectedOrgGroupCodes, setSelectedOrgGroupCodes] = useState<string[]>([]);
  const [selectedOrgEsgCodes, setSelectedOrgEsgCodes] = useState<string[]>([]);
  const [orgGroupSearch, setOrgGroupSearch] = useState('');
  const [orgGradeSearch, setOrgGradeSearch] = useState('');
  const [orgSubView, setOrgSubView] = useState<'all' | 'groups' | 'grades'>('all');

  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [selectedFormTypeFilter, setSelectedFormTypeFilter] = useState('ALL');

  // Multi-Select Roster State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Modals State
  const [showBulkUnassignModal, setShowBulkUnassignModal] = useState(false);
  const [unassignScope, setUnassignScope] = useState<'selected' | 'filter'>('selected');

  const [showBulkFormTypeModal, setShowBulkFormTypeModal] = useState(false);
  const [targetFormType, setTargetFormType] = useState('KPI_FORM');

  const [showBulkAppraiserModal, setShowBulkAppraiserModal] = useState(false);
  const [bulkFirstAppraiserSapId, setBulkFirstAppraiserSapId] = useState('');
  const [bulkSecondAppraiserSapId, setBulkSecondAppraiserSapId] = useState('');

  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmpCycle, setEditingEmpCycle] = useState<any>(null);

  // Group & Grade CRUD Modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ rpsaCode: '', groupCode: '', groupName: '', headOfGroupSapId: '' });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupEditForm, setGroupEditForm] = useState<any>({});

  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [newGradeForm, setNewGradeForm] = useState({ esgCode: '', gradeCode: '', gradeName: '', hierarchyOrder: 1, defaultFormType: 'KPI_FORM' });
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [gradeEditForm, setGradeEditForm] = useState<any>({});

  // Sync Wizard Selected Groups State (for Staff Snapshot)
  const [selectedSyncGroupCodes, setSelectedSyncGroupCodes] = useState<string[]>([]);

  // Single Staff Enrollment Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    sapId: '',
    grade: '04',
    reportingGroup: '0001',
    designation: '',
    formType: 'KPI_FORM',
    firstAppraiserSapId: '',
    secondAppraiserSapId: ''
  });

  // Load Cycles
  const loadCycles = async () => {
    try {
      const data = await api.getCycles();
      setCycles(data || []);
      if (selectedCycleId && data.some((c: any) => c.id === selectedCycleId)) {
        setActiveCycleId(selectedCycleId);
      } else if (data && data.length > 0) {
        const active = data.find((c: any) => c.status === 101 || c.statusName === 'CycleActive');
        setActiveCycleId(active ? active.id : data[0].id);
      }
    } catch (e) {
      console.error('Failed to load cycles', e);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId && selectedCycleId !== activeCycleId) {
      setActiveCycleId(selectedCycleId);
    }
  }, [selectedCycleId]);

  // Load All Cycle Snapshot Data
  const loadCycleData = async (cycleId: string) => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const [summary, groups, grades, employees, mGroups, mGrades] = await Promise.all([
        api.getCycleSnapshotSummary(cycleId).catch(() => null),
        api.getCycleSnapshotGroups(cycleId).catch(() => []),
        api.getCycleSnapshotGrades(cycleId).catch(() => []),
        api.getCycleEmployees(cycleId).catch(() => []),
        api.getReportingGroups().catch(() => []),
        api.getGradeMappings().catch(() => [])
      ]);
      // Defensive UI deduplication by RPSA and ESG codes
      const uniqueMGroups = (mGroups || []).filter((g: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => (t.rpsaCode && t.rpsaCode === g.rpsaCode) || (t.groupCode && t.groupCode === g.groupCode))
      );

      const uniqueMGrades = (mGrades || []).filter((g: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => (t.esgCode && t.esgCode === g.esgCode) || (t.gradeCode && t.gradeCode === g.gradeCode))
      );

      const uniqueSnapGroups = (groups || []).filter((g: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => (t.rpsaCode && t.rpsaCode === g.rpsaCode) || (t.groupCode && t.groupCode === g.groupCode))
      );

      const uniqueSnapGrades = (grades || []).filter((g: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => (t.esgCode && t.esgCode === g.esgCode) || (t.gradeCode && t.gradeCode === g.gradeCode))
      );

      setSnapshotSummary(summary);
      setSnapshotGroups(uniqueSnapGroups);
      setSnapshotGrades(uniqueSnapGrades);
      setCycleEmployees(employees || []);
      setMasterGroups(uniqueMGroups);
      setMasterGrades(uniqueMGrades);
      setSelectedEmployeeIds([]);
      
      // Default Org selections to all available master records
      if (uniqueMGroups.length > 0) {
        setSelectedOrgGroupCodes(uniqueMGroups.map((g: any) => g.rpsaCode || g.groupCode));
        setSelectedSyncGroupCodes(uniqueMGroups.map((g: any) => g.rpsaCode || g.groupCode));
      }
      if (uniqueMGrades.length > 0) {
        setSelectedOrgEsgCodes(uniqueMGrades.map((g: any) => g.esgCode || g.gradeNumericCode || g.gradeCode));
      }
    } catch (e) {
      console.error('Failed to load cycle snapshot data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCycleId) {
      loadCycleData(activeCycleId);
    }
  }, [activeCycleId]);

  // Selective Org Hierarchy Snapshot Operations
  const handleSnapshotAllOrg = async () => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleSelectiveOrg(activeCycleId, {
        snapshotAllGroups: true,
        snapshotAllGrades: true,
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(res.message || 'Complete Master Groups and ESG Grades hierarchy successfully snapshotted into this cycle!');
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to snapshot entire organizational hierarchy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnapshotSelectedOrgGroups = async () => {
    if (!activeCycleId || selectedOrgGroupCodes.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleSelectiveOrg(activeCycleId, {
        rpsaCodes: selectedOrgGroupCodes,
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(res.message || `Successfully snapshotted ${selectedOrgGroupCodes.length} Reporting Groups into this cycle!`);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to snapshot selected groups.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnapshotSelectedOrgGrades = async () => {
    if (!activeCycleId || selectedOrgEsgCodes.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleSelectiveOrg(activeCycleId, {
        esgCodes: selectedOrgEsgCodes,
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(res.message || `Successfully snapshotted ${selectedOrgEsgCodes.length} ESG Grades into this cycle!`);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to snapshot selected grades.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnapshotSingleOrgGroup = async (group: any) => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const code = group.rpsaCode || group.groupCode;
      const res = await api.snapshotCycleSelectiveOrg(activeCycleId, {
        rpsaCodes: [code],
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(res.message || `Group '${group.groupName}' snapshotted into cycle!`);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to snapshot group.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnapshotSingleOrgGrade = async (grade: any) => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const code = grade.esgCode || grade.gradeNumericCode || grade.gradeCode;
      const res = await api.snapshotCycleSelectiveOrg(activeCycleId, {
        esgCodes: [code],
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(res.message || `Grade '${grade.gradeName}' (${grade.gradeCode}) snapshotted into cycle!`);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to snapshot grade.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCycleChange = (id: string) => {
    setActiveCycleId(id);
    if (onSelectCycle) onSelectCycle(id);
  };

  // Filtered Employees List
  const filteredEmployees = cycleEmployees.filter((ec) => {
    const emp = ec.employee || {};
    const rpsa = ec.snapshotReportingGroup || emp.reportingGroup || '';
    const esg = ec.snapshotGrade || emp.grade || '';
    const formType = (ec.assignedFormType || '').toString();

    if (selectedGroupFilter !== 'ALL' && rpsa !== selectedGroupFilter) return false;
    if (selectedGradeFilter !== 'ALL' && esg !== selectedGradeFilter) return false;
    if (selectedFormTypeFilter !== 'ALL' && formType !== selectedFormTypeFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const sap = (emp.sapId || '').toLowerCase();
      const name = (emp.fullName || '').toLowerCase();
      const desig = (ec.snapshotDesignation || emp.designation || '').toLowerCase();
      const branch = (ec.snapshotRegionBranch || emp.regionBranch || '').toLowerCase();
      if (!sap.includes(q) && !name.includes(q) && !desig.includes(q) && !branch.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Multi-Select Handlers
  const isAllFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployeeIds.includes(e.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredEmployees.map(e => e.id));
      setSelectedEmployeeIds(selectedEmployeeIds.filter(id => !filteredIds.has(id)));
    } else {
      const newSelected = new Set([...selectedEmployeeIds, ...filteredEmployees.map(e => e.id)]);
      setSelectedEmployeeIds(Array.from(newSelected));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter(i => i !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  // Bulk Unassign Operation
  const handleBulkUnassign = async () => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const payload = unassignScope === 'selected'
        ? { employeeCycleIds: selectedEmployeeIds }
        : {
            rpsaCode: selectedGroupFilter === 'ALL' ? undefined : selectedGroupFilter,
            esgCode: selectedGradeFilter === 'ALL' ? undefined : selectedGradeFilter,
            formType: selectedFormTypeFilter === 'ALL' ? undefined : selectedFormTypeFilter,
            searchTerm: searchTerm || undefined
          };

      const res = await api.bulkUnassignCycleEmployees(activeCycleId, payload);
      setMessage(res.message || `Successfully unassigned ${res.unassignedCount} staff from cycle.`);
      setShowBulkUnassignModal(false);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to bulk unassign employees.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Form Override Operation
  const handleBulkFormTypeOverride = async () => {
    if (!activeCycleId || selectedEmployeeIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.bulkOverrideCycleFormType(activeCycleId, {
        employeeCycleIds: selectedEmployeeIds,
        formType: targetFormType
      });
      setMessage(res.message || `Updated form type for ${res.updatedCount} employees.`);
      setShowBulkFormTypeModal(false);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to update form types in bulk.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Appraiser Assignment Operation
  const handleBulkAssignAppraisers = async () => {
    if (!activeCycleId || selectedEmployeeIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.bulkAssignCycleAppraisers(activeCycleId, {
        employeeCycleIds: selectedEmployeeIds,
        firstAppraiserSapId: bulkFirstAppraiserSapId || undefined,
        secondAppraiserSapId: bulkSecondAppraiserSapId || undefined
      });
      setMessage(res.message || `Assigned appraisers for ${res.updatedCount} employees.`);
      setShowBulkAppraiserModal(false);
      setBulkFirstAppraiserSapId('');
      setBulkSecondAppraiserSapId('');
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to bulk assign appraisers.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Multi-Group Snapshot Operation
  const handleSyncMultiGroups = async () => {
    if (!activeCycleId || selectedSyncGroupCodes.length === 0) {
      alert('Please select at least one reporting group.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleMultiGroupEmployees(activeCycleId, {
        rpsaCodes: selectedSyncGroupCodes
      });
      setMessage(res.message || 'Multi-group snapshot synchronization completed successfully.');
      await loadCycleData(activeCycleId);
      setActiveTab('roster');
    } catch (e: any) {
      alert(e.message || 'Failed to execute multi-group snapshot.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Single Group Staff Snapshot Operation
  const handleSnapshotIndividualStaffGroup = async (group: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeCycleId) return;
    const code = group.rpsaCode || group.groupCode;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleMultiGroupEmployees(activeCycleId, {
        rpsaCodes: [code]
      });
      setMessage(res.message || `Staff Snapshot for '${group.groupName}' completed successfully.`);
      await loadCycleData(activeCycleId);
      setActiveTab('roster');
    } catch (err: any) {
      alert(err.message || `Failed to snapshot staff for ${group.groupName}.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Hierarchy (Groups & Grades) from Master
  const handleSyncHierarchy = async () => {
    if (!activeCycleId) return;
    setActionLoading(true);
    try {
      const res = await api.snapshotCycleOrg(activeCycleId);
      setMessage(res.message || 'Organizational hierarchy frozen into cycle.');
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to sync organizational hierarchy.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Single Employee Snapshot Edit
  const handleSaveEmployeeSnapshot = async () => {
    if (!activeCycleId || !editingEmpCycle) return;
    setActionLoading(true);
    try {
      await api.updateCycleEmployeeSnapshot(activeCycleId, editingEmpCycle.id, {
        snapshotGrade: editingEmpCycle.snapshotGrade,
        snapshotReportingGroup: editingEmpCycle.snapshotReportingGroup,
        snapshotDesignation: editingEmpCycle.snapshotDesignation,
        snapshotLocation: editingEmpCycle.snapshotLocation,
        snapshotRegionBranch: editingEmpCycle.snapshotRegionBranch,
        snapshotIsMrtOrMrc: editingEmpCycle.snapshotIsMrtOrMrc,
        firstAppraiserSapId: editingEmpCycle.firstAppraiserSapId,
        secondAppraiserSapId: editingEmpCycle.secondAppraiserSapId
      });
      setMessage('Employee snapshot updated successfully.');
      setShowEditEmployeeModal(false);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to update employee snapshot.');
    } finally {
      setActionLoading(false);
    }
  };

  // Unlock Single Employee Reporting Line (PMW Admin Action)
  const handleUnlockSingle = async (employeeCycleId: string) => {
    setActionLoading(true);
    try {
      const res = await api.unlockAppraiserLine(employeeCycleId, 'admin');
      setMessage(res.message || 'Reporting line unlocked successfully. Employee is now permitted to submit a new appraiser line request.');
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to unlock reporting line.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Unlock Reporting Lines for Selected Employees
  const handleBulkUnlock = async () => {
    if (selectedEmployeeIds.length === 0) return;
    if (!confirm(`Unlock reporting lines for ${selectedEmployeeIds.length} selected employee(s)? This allows them to re-request appraisers.`)) return;
    setActionLoading(true);
    try {
      await Promise.all(selectedEmployeeIds.map(id => api.unlockAppraiserLine(id, 'admin').catch(() => null)));
      setMessage(`Successfully unlocked reporting lines for ${selectedEmployeeIds.length} employee(s).`);
      setSelectedEmployeeIds([]);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to bulk unlock reporting lines.');
    } finally {
      setActionLoading(false);
    }
  };

  // Snapshot Group Actions
  const handleCreateGroup = async () => {
    if (!activeCycleId || !newGroupForm.groupName || !newGroupForm.groupCode) {
      alert('Group Code and Group Name are required.');
      return;
    }
    setActionLoading(true);
    try {
      await api.createCycleSnapshotGroup(activeCycleId, newGroupForm);
      setNewGroupForm({ rpsaCode: '', groupCode: '', groupName: '', headOfGroupSapId: '' });
      setShowAddGroupModal(false);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to create snapshot group.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSnapshotGroup = async (groupId: string) => {
    try {
      await api.updateCycleSnapshotGroup(activeCycleId, groupId, groupEditForm);
      setEditingGroupId(null);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to update snapshot group.');
    }
  };

  const handleDeleteSnapshotGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to remove this snapshot group from this cycle?')) return;
    try {
      await api.deleteCycleSnapshotGroup(activeCycleId, groupId);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to delete snapshot group.');
    }
  };

  // Snapshot Grade Actions
  const handleCreateGrade = async () => {
    if (!activeCycleId || !newGradeForm.gradeName || !newGradeForm.gradeCode) {
      alert('Grade Code and Grade Name are required.');
      return;
    }
    setActionLoading(true);
    try {
      await api.createCycleSnapshotGrade(activeCycleId, newGradeForm);
      setNewGradeForm({ esgCode: '', gradeCode: '', gradeName: '', hierarchyOrder: 1, defaultFormType: 'KPI_FORM' });
      setShowAddGradeModal(false);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to create snapshot grade.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSnapshotGrade = async (gradeId: string) => {
    try {
      await api.updateCycleSnapshotGrade(activeCycleId, gradeId, gradeEditForm);
      setEditingGradeId(null);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to update snapshot grade.');
    }
  };

  const handleDeleteSnapshotGrade = async (gradeId: string) => {
    if (!confirm('Are you sure you want to remove this snapshot grade from this cycle?')) return;
    try {
      await api.deleteCycleSnapshotGrade(activeCycleId, gradeId);
      await loadCycleData(activeCycleId);
    } catch (e: any) {
      alert(e.message || 'Failed to delete snapshot grade.');
    }
  };

  // Export Selected or Filtered to CSV
  const handleExportCsv = () => {
    const listToExport = selectedEmployeeIds.length > 0
      ? cycleEmployees.filter(e => selectedEmployeeIds.includes(e.id))
      : filteredEmployees;

    if (listToExport.length === 0) {
      alert('No records to export.');
      return;
    }

    const headers = ['SAP ID', 'Full Name', 'ESG Grade', 'RPSA Group', 'Designation', 'Form Type', 'First Appraiser SAP', 'Second Appraiser SAP', 'Status'];
    const csvRows = [headers.join(',')];

    for (const ec of listToExport) {
      const emp = ec.employee || {};
      const row = [
        `"${emp.sapId || ''}"`,
        `"${emp.fullName || ''}"`,
        `"${ec.snapshotGrade || emp.grade || ''}"`,
        `"${ec.snapshotReportingGroup || emp.reportingGroup || ''}"`,
        `"${ec.snapshotDesignation || emp.designation || ''}"`,
        `"${ec.assignedFormType || ''}"`,
        `"${ec.firstAppraiser?.sapId || ''}"`,
        `"${ec.secondAppraiser?.sapId || ''}"`,
        `"${ec.currentStatus || ''}"`
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Cycle_${currentCycle?.title || 'Snapshot'}_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentCycle = cycles.find((c) => c.id === activeCycleId);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Active Cycle Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 rounded-2xl shadow-xl border border-emerald-800/40 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <Layers className="h-6 w-6 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              PMW Appraisal Cycle Snapshot & Roster Center
            </span>
            <span>•</span>
            <Badge variant="nbp" className="text-white bg-emerald-700 font-bold">
              Cycle Isolated
            </Badge>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
            {currentCycle?.title || 'Cycle Snapshot & Roster Workspace'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 font-medium">
            <span>Circular: <strong className="font-mono text-emerald-300">{currentCycle?.circularReference || 'NBP/HR/2026/001'}</strong></span>
            <span>•</span>
            <span>Enrolled Staff: <strong className="text-white font-bold">{cycleEmployees.length}</strong></span>
            <span>•</span>
            <span>Frozen Groups: <strong className="text-white font-bold">{snapshotGroups.length}</strong></span>
            <span>•</span>
            <span>Frozen Grades: <strong className="text-white font-bold">{snapshotGrades.length}</strong></span>
          </div>
        </div>

        {/* Cycle Switcher & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700/80">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Active Cycle
            </label>
            <select
              value={activeCycleId}
              onChange={(e) => handleCycleChange(e.target.value)}
              className="w-full sm:w-64 h-9 px-3 bg-slate-950 border border-emerald-500/40 text-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.title} ({c.statusName || (c.status === 101 ? 'Active' : 'Draft')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end space-x-1.5 pt-3 sm:pt-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => activeCycleId && loadCycleData(activeCycleId)}
              className="h-9 px-3 bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
              title="Refresh Cycle Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {onNavigate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('cycle-control')}
                className="h-9 text-xs font-bold border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                Control Center
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('org-snapshot')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'org-snapshot'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Org Hierarchy Snapshot & Diff</span>
        </button>

        <button
          onClick={() => setActiveTab('staff-snapshot')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'staff-snapshot'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Staff Enrollment Snapshot</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'roster'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Roster & Multi-Select ({filteredEmployees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'groups'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Cycle Groups ({snapshotGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grades')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'grades'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Cycle Grades ({snapshotGrades.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF ROSTER & MULTI-SELECT MANAGEMENT */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filters Ribbon */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Search Staff</label>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="SAP ID, Name, Designation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Reporting Group (RPSA)</label>
                  <select
                    value={selectedGroupFilter}
                    onChange={(e) => setSelectedGroupFilter(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold"
                  >
                    <option value="ALL">All Reporting Groups</option>
                    {snapshotGroups.map((g) => (
                      <option key={g.rpsaCode} value={g.rpsaCode}>
                        {g.rpsaCode} – {g.groupName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Grade (ESG)</label>
                  <select
                    value={selectedGradeFilter}
                    onChange={(e) => setSelectedGradeFilter(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold"
                  >
                    <option value="ALL">All Grades</option>
                    {snapshotGrades.map((g) => (
                      <option key={g.esgCode} value={g.esgCode}>
                        {g.esgCode} – {g.gradeName} ({g.gradeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Form Type</label>
                  <select
                    value={selectedFormTypeFilter}
                    onChange={(e) => setSelectedFormTypeFilter(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold"
                  >
                    <option value="ALL">All Form Types</option>
                    <option value="KPI_FORM">KPI Form (70/30)</option>
                    <option value="BALANCED_SCORECARD">Balanced Scorecard (4-P)</option>
                    <option value="RISK_ADJUSTED_BSC">Risk BSC (5-P)</option>
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGroupFilter('ALL');
                      setSelectedGradeFilter('ALL');
                      setSelectedFormTypeFilter('ALL');
                    }}
                    className="h-8 text-xs font-bold w-full"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations Sticky Ribbon */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-xl shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300 hover:text-white"
              >
                {isAllFilteredSelected ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
                <span>{isAllFilteredSelected ? 'Deselect All' : 'Select All Visible'}</span>
              </button>

              <Badge variant="nbp" className="bg-emerald-800 text-white font-bold text-xs">
                {selectedEmployeeIds.length} Selected
              </Badge>

              {selectedEmployeeIds.length > 0 && (
                <button
                  onClick={() => setSelectedEmployeeIds([])}
                  className="text-xs text-slate-300 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Bulk Actions Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setUnassignScope('selected');
                  setShowBulkUnassignModal(true);
                }}
                disabled={selectedEmployeeIds.length === 0}
                className="h-8 text-xs font-bold shadow-xs"
                title="Unassign selected employees from this cycle"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Bulk Unassign ({selectedEmployeeIds.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUnassignScope('filter');
                  setShowBulkUnassignModal(true);
                }}
                className="h-8 text-xs font-bold bg-white/10 text-rose-300 hover:bg-white/20 border-rose-500/40 shadow-xs"
                title="Unassign all employees matching current filter criteria"
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                Unassign by Filter ({filteredEmployees.length})
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkFormTypeModal(true)}
                disabled={selectedEmployeeIds.length === 0}
                className="h-8 text-xs font-bold bg-sky-800 hover:bg-sky-900 text-white shadow-xs"
              >
                <PieChart className="h-3.5 w-3.5 mr-1" />
                Change Form Type
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkAppraiserModal(true)}
                disabled={selectedEmployeeIds.length === 0}
                className="h-8 text-xs font-bold bg-indigo-800 hover:bg-indigo-900 text-white shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Assign Appraisers
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUnlock}
                disabled={selectedEmployeeIds.length === 0}
                className="h-8 text-xs font-bold bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border-amber-500/40"
                title="Unlock reporting lines for selected employees to allow them to re-request"
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
                Bulk Unlock Lines ({selectedEmployeeIds.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 text-xs font-bold bg-white/10 text-white hover:bg-white/20 border-white/20"
                title="Export selected or filtered roster to CSV"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Roster Data Table */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button onClick={handleToggleSelectAll}>
                        {isAllFilteredSelected ? <CheckSquare className="h-4 w-4 text-emerald-800" /> : <Square className="h-4 w-4 text-slate-400" />}
                      </button>
                    </th>
                    <th className="p-3">SAP ID</th>
                    <th className="p-3">Staff Name & Designation</th>
                    <th className="p-3">Grade (ESG)</th>
                    <th className="p-3">Group (RPSA)</th>
                    <th className="p-3">Assigned Form</th>
                    <th className="p-3">First Appraiser</th>
                    <th className="p-3">Second Appraiser</th>
                    <th className="p-3">Line Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((ec) => {
                    const emp = ec.employee || {};
                    const isSelected = selectedEmployeeIds.includes(ec.id);
                    const gradeCode = ec.snapshotGrade || emp.grade;
                    const groupCode = ec.snapshotReportingGroup || emp.reportingGroup;
                    const isKpi = (ec.assignedFormType || '').toString().includes('KPI');
                    const isRisk = (ec.assignedFormType || '').toString().includes('RISK') || ec.snapshotIsMrtOrMrc;
                    const valStatus = ec.appraiserValidationStatus;

                    return (
                      <tr
                        key={ec.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/80 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button onClick={() => handleToggleSelectOne(ec.id)}>
                            {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-800" /> : <Square className="h-4 w-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-900">{emp.sapId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="text-[11px] text-slate-500">{ec.snapshotDesignation || emp.designation || 'Officer'}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-800">{gradeCode}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold">
                            {groupCode}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={isRisk ? 'danger' : isKpi ? 'default' : 'nbp'}
                            className="text-[10px] font-bold"
                          >
                            {isRisk ? '5-P Risk BSC' : isKpi ? 'KPI (70/30)' : 'Balanced Scorecard'}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {ec.firstAppraiser?.fullName ? (
                            <span>{ec.firstAppraiser.fullName} ({ec.firstAppraiser.sapId})</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {ec.secondAppraiser?.fullName ? (
                            <span>{ec.secondAppraiser.fullName} ({ec.secondAppraiser.sapId})</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {valStatus === 'Validated' ? (
                            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
                              <Lock className="h-3 w-3 text-emerald-700" />
                              <span>Confirmed & Locked</span>
                            </Badge>
                          ) : valStatus === 'PendingConfirmation' ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
                              <AlertTriangle className="h-3 w-3 text-amber-700" />
                              <span>Pending Review</span>
                            </Badge>
                          ) : valStatus === 'UnlockedForRevision' ? (
                            <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
                              <Unlock className="h-3 w-3 text-sky-700" />
                              <span>Unlocked (Draft)</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 text-[10px]">
                              Open
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {(valStatus === 'Validated' || valStatus === 'PendingConfirmation') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlockSingle(ec.id)}
                              className="h-7 px-2 text-[10px] text-amber-800 hover:bg-amber-50 border-amber-300 font-bold"
                              title="Unlock reporting line to allow employee to re-request appraisers"
                            >
                              <Unlock className="h-3 w-3 mr-1 text-amber-700" /> Unlock Line
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEmpCycle({
                                id: ec.id,
                                sapId: emp.sapId,
                                fullName: emp.fullName,
                                snapshotGrade: ec.snapshotGrade || emp.grade,
                                snapshotReportingGroup: ec.snapshotReportingGroup || emp.reportingGroup,
                                snapshotDesignation: ec.snapshotDesignation || emp.designation,
                                snapshotLocation: ec.snapshotLocation || emp.location,
                                snapshotRegionBranch: ec.snapshotRegionBranch || emp.regionBranch,
                                snapshotIsMrtOrMrc: ec.snapshotIsMrtOrMrc ?? emp.isMrtOrMrc ?? false,
                                firstAppraiserSapId: ec.firstAppraiser?.sapId || '',
                                secondAppraiserSapId: ec.secondAppraiser?.sapId || ''
                              });
                              setShowEditEmployeeModal(true);
                            }}
                            className="h-7 px-2 text-[10px] text-emerald-800 hover:bg-emerald-50 border-slate-300"
                            title="Edit snapshot attributes for this cycle"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (!confirm(`Unassign '${emp.fullName}' from this cycle?`)) return;
                              await api.removeCycleEmployee(activeCycleId, ec.id);
                              await loadCycleData(activeCycleId);
                            }}
                            className="h-7 px-2 text-[10px]"
                            title="Unassign employee"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-semibold">
                        No employees found matching the active filters in this cycle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: CYCLE GROUPS SNAPSHOT */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Frozen Reporting Groups for this Cycle</h3>
              <p className="text-xs text-slate-500">
                PMW Admin manages groups specific to <strong>{currentCycle?.title}</strong>. Master tables remain untouched.
              </p>
            </div>
            <Button
              variant="nbp"
              size="sm"
              onClick={() => setShowAddGroupModal(true)}
              className="text-xs font-bold bg-emerald-800 hover:bg-emerald-900"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Snapshot Group
            </Button>
          </div>

          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">RPSA Code</th>
                  <th className="p-3">Group Code</th>
                  <th className="p-3">Group Title</th>
                  <th className="p-3">Head of Group SAP ID</th>
                  <th className="p-3">Enrolled Staff</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshotGroups.map((g) => {
                  const staffCount = cycleEmployees.filter(e => (e.snapshotReportingGroup || e.employee?.reportingGroup) === g.rpsaCode).length;
                  return (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-emerald-800">{g.rpsaCode}</td>
                      <td className="p-3 font-mono font-semibold text-slate-700">{g.groupCode}</td>
                      <td className="p-3">
                        {editingGroupId === g.id ? (
                          <Input
                            value={groupEditForm.groupName}
                            onChange={(e) => setGroupEditForm({ ...groupEditForm, groupName: e.target.value })}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">{g.groupName}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {editingGroupId === g.id ? (
                          <Input
                            value={groupEditForm.headOfGroupSapId || ''}
                            onChange={(e) => setGroupEditForm({ ...groupEditForm, headOfGroupSapId: e.target.value })}
                            className="h-7 text-xs font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-600">{g.headOfGroupSapId || '—'}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="nbp" className="font-bold text-[10px]">
                          {staffCount} Enrolled
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {editingGroupId === g.id ? (
                          <>
                            <Button
                              variant="nbp"
                              size="sm"
                              onClick={() => handleSaveSnapshotGroup(g.id)}
                              className="h-6 px-2 text-[10px]"
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
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingGroupId(g.id);
                                setGroupEditForm({ groupName: g.groupName, headOfGroupSapId: g.headOfGroupSapId });
                              }}
                              className="h-6 px-2 text-[10px] border-slate-300"
                            >
                              <Edit2 className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSnapshotGroup(g.id)}
                              className="h-6 px-2 text-[10px]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 3: CYCLE GRADES SNAPSHOT */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Frozen Grade Hierarchy for this Cycle</h3>
              <p className="text-xs text-slate-500">
                Adjust grade titles and default form type assignments for <strong>{currentCycle?.title}</strong>.
              </p>
            </div>
            <Button
              variant="nbp"
              size="sm"
              onClick={() => setShowAddGradeModal(true)}
              className="text-xs font-bold bg-emerald-800 hover:bg-emerald-900"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Snapshot Grade
            </Button>
          </div>

          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">ESG Code</th>
                  <th className="p-3">Grade Code</th>
                  <th className="p-3">Grade Title</th>
                  <th className="p-3">Rank Order</th>
                  <th className="p-3">Default Form Type</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshotGrades.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-emerald-800">{g.esgCode}</td>
                    <td className="p-3 font-mono font-semibold text-slate-700">{g.gradeCode}</td>
                    <td className="p-3">
                      {editingGradeId === g.id ? (
                        <Input
                          value={gradeEditForm.gradeName}
                          onChange={(e) => setGradeEditForm({ ...gradeEditForm, gradeName: e.target.value })}
                          className="h-7 text-xs"
                        />
                      ) : (
                        <span className="font-bold text-slate-900">{g.gradeName}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-600">{g.hierarchyOrder}</td>
                    <td className="p-3">
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
                        <Badge
                          variant={g.defaultFormType === 'KPI_FORM' ? 'default' : 'nbp'}
                          className="text-[10px] font-bold"
                        >
                          {g.defaultFormType === 'KPI_FORM' ? 'KPI Form (70/30)' : 'Balanced Scorecard (4-P)'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {editingGradeId === g.id ? (
                        <>
                          <Button
                            variant="nbp"
                            size="sm"
                            onClick={() => handleSaveSnapshotGrade(g.id)}
                            className="h-6 px-2 text-[10px]"
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
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingGradeId(g.id);
                              setGradeEditForm({ gradeName: g.gradeName, defaultFormType: g.defaultFormType });
                            }}
                            className="h-6 px-2 text-[10px] border-slate-300"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSnapshotGrade(g.id)}
                            className="h-6 px-2 text-[10px]"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ═══════════════ TAB: ORG HIERARCHY SNAPSHOT & DIFF CENTER ═══════════════ */}
      {activeTab === 'org-snapshot' && (
        <div className="space-y-6">
          {/* Hero Snapshot Calibration Banner */}
          <Card className="border-emerald-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl overflow-hidden relative">
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-mono font-bold">
                      {currentCycle?.circularReference || 'ACTIVE CYCLE'}
                    </Badge>
                    <Badge className="bg-white/10 text-white border-white/20 text-xs">
                      {currentCycle?.title || 'Selected Cycle'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center space-x-2">
                    <Layers className="h-5 w-5 text-emerald-400" />
                    <span>Cycle Organizational Hierarchy Snapshot Center</span>
                  </h3>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Freeze and isolate Master Reporting Groups (RPSA 0001–0008) and Master ESG Grades (01–09) into this appraisal cycle. Once frozen, cycle evaluations run independently from future organizational changes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="nbp"
                    size="default"
                    disabled={actionLoading}
                    onClick={handleSnapshotAllOrg}
                    className="h-10 px-5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg transition-all"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    1-Click Freeze Entire Master Hierarchy
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/10 pt-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Frozen Cycle Groups</div>
                    <div className="text-xl font-black text-white mt-0.5">
                      {snapshotGroups.length} <span className="text-xs font-medium text-slate-400">/ {masterGroups.length} Master</span>
                    </div>
                  </div>
                  <Badge variant={snapshotGroups.length >= masterGroups.length && masterGroups.length > 0 ? 'nbp' : 'warning'} className="text-[10px]">
                    {snapshotGroups.length >= masterGroups.length && masterGroups.length > 0 ? 'Fully Synced' : 'Sync Needed'}
                  </Badge>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Frozen Cycle Grades</div>
                    <div className="text-xl font-black text-white mt-0.5">
                      {snapshotGrades.length} <span className="text-xs font-medium text-slate-400">/ {masterGrades.length} Master</span>
                    </div>
                  </div>
                  <Badge variant={snapshotGrades.length >= masterGrades.length && masterGrades.length > 0 ? 'nbp' : 'warning'} className="text-[10px]">
                    {snapshotGrades.length >= masterGrades.length && masterGrades.length > 0 ? 'Fully Synced' : 'Sync Needed'}
                  </Badge>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Hierarchy Status</div>
                    <div className="text-xs font-bold text-emerald-300 mt-1">
                      {snapshotGroups.length > 0 && snapshotGrades.length > 0
                        ? 'Active in Cycle Sandbox'
                        : 'Uninitialized (Run Snapshot)'}
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-view View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setOrgSubView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  orgSubView === 'all' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Hierarchy ({masterGroups.length + masterGrades.length})
              </button>
              <button
                onClick={() => setOrgSubView('groups')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  orgSubView === 'groups' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Master Groups ({masterGroups.length})
              </button>
              <button
                onClick={() => setOrgSubView('grades')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  orgSubView === 'grades' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Master ESG Grades ({masterGrades.length})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              Cycle: <span className="text-slate-900 font-mono">{currentCycle?.title}</span>
            </div>
          </div>

          {/* SECTION A: MASTER REPORTING GROUPS SNAPSHOT MATRIX */}
          {(orgSubView === 'all' || orgSubView === 'groups') && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-900 flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                      <span>Master Reporting Groups Snapshot Matrix (RPSA 0001–0008)</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Compare Master Database groups with this cycle's frozen groups and snapshot selectively.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrgGroupCodes(masterGroups.map(g => g.rpsaCode || g.groupCode))}
                      className="text-[11px] font-bold h-8"
                    >
                      Select All ({masterGroups.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrgGroupCodes([])}
                      className="text-[11px] font-bold h-8"
                    >
                      Deselect
                    </Button>
                    <Button
                      variant="nbp"
                      size="sm"
                      disabled={actionLoading || selectedOrgGroupCodes.length === 0}
                      onClick={handleSnapshotSelectedOrgGroups}
                      className="text-[11px] font-bold bg-emerald-800 hover:bg-emerald-900 text-white h-8"
                    >
                      <Camera className="h-3.5 w-3.5 mr-1" />
                      Snapshot Selected Groups ({selectedOrgGroupCodes.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={masterGroups.length > 0 && selectedOrgGroupCodes.length === masterGroups.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrgGroupCodes(masterGroups.map(g => g.rpsaCode || g.groupCode));
                              } else {
                                setSelectedOrgGroupCodes([]);
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">RPSA (4-Digit)</th>
                        <th className="p-3">Master Group Code</th>
                        <th className="p-3">Master Group Name</th>
                        <th className="p-3">Master Head of Group</th>
                        <th className="p-3 text-center">Cycle Snapshot Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterGroups.map((g) => {
                        const code = g.rpsaCode ? g.rpsaCode.padStart(4, '0') : (g.groupCode || '0000');
                        const isSelected = selectedOrgGroupCodes.includes(code) || selectedOrgGroupCodes.includes(g.groupCode);
                        const isFrozen = snapshotGroups.some((sg) => sg.rpsaCode === code || sg.groupCode === g.groupCode);
                        return (
                          <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedOrgGroupCodes(selectedOrgGroupCodes.filter(c => c !== code && c !== g.groupCode));
                                  } else {
                                    setSelectedOrgGroupCodes([...selectedOrgGroupCodes, code]);
                                  }
                                }}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                                {code}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary" className="font-mono font-bold text-[10px]">{g.groupCode}</Badge>
                            </td>
                            <td className="p-3 font-bold text-slate-900 text-sm">
                              {g.groupName}
                            </td>
                            <td className="p-3">
                              {g.headOfGroupSapId ? (
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  {g.headOfGroupSapId}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Unassigned in Master</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isFrozen ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                  ✓ Frozen in Cycle
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] font-bold">
                                  ⚠ Not in Cycle
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleSnapshotSingleOrgGroup(g)}
                                className="h-7 text-[11px] font-bold border-slate-300 text-emerald-900 hover:bg-emerald-50"
                              >
                                <Camera className="h-3 w-3 mr-1 text-emerald-700" />
                                {isFrozen ? 'Re-Sync' : 'Snapshot'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION B: MASTER ESG GRADE HIERARCHY SNAPSHOT MATRIX */}
          {(orgSubView === 'all' || orgSubView === 'grades') && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-900 flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4 text-emerald-700" />
                      <span>Master ESG Grade Hierarchy Snapshot Matrix (ESG 01–09)</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      OG III to AVP are mapped to KPI Forms (70/30), while VP to President/CEO are mapped to Balanced Scorecards.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrgEsgCodes(masterGrades.map(g => g.esgCode || g.gradeNumericCode || g.gradeCode))}
                      className="text-[11px] font-bold h-8"
                    >
                      Select All ({masterGrades.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrgEsgCodes([])}
                      className="text-[11px] font-bold h-8"
                    >
                      Deselect
                    </Button>
                    <Button
                      variant="nbp"
                      size="sm"
                      disabled={actionLoading || selectedOrgEsgCodes.length === 0}
                      onClick={handleSnapshotSelectedOrgGrades}
                      className="text-[11px] font-bold bg-emerald-800 hover:bg-emerald-900 text-white h-8"
                    >
                      <Camera className="h-3.5 w-3.5 mr-1" />
                      Snapshot Selected Grades ({selectedOrgEsgCodes.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={masterGrades.length > 0 && selectedOrgEsgCodes.length === masterGrades.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrgEsgCodes(masterGrades.map(g => g.esgCode || g.gradeNumericCode || g.gradeCode));
                              } else {
                                setSelectedOrgEsgCodes([]);
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Rank</th>
                        <th className="p-3">ESG (2-Digit)</th>
                        <th className="p-3">Grade Code</th>
                        <th className="p-3">Grade Display Name</th>
                        <th className="p-3">Assigned Form Type Rule</th>
                        <th className="p-3 text-center">Cycle Snapshot Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterGrades.map((g) => {
                        const esg = g.esgCode ? g.esgCode.padStart(2, '0') : (g.rankOrder ? g.rankOrder.toString().padStart(2, '0') : '00');
                        const isSelected = selectedOrgEsgCodes.includes(esg) || selectedOrgEsgCodes.includes(g.gradeCode);
                        const isFrozen = snapshotGrades.some((sg) => sg.esgCode === esg || sg.gradeCode === g.gradeCode);
                        return (
                          <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedOrgEsgCodes(selectedOrgEsgCodes.filter(c => c !== esg && c !== g.gradeCode));
                                  } else {
                                    setSelectedOrgEsgCodes([...selectedOrgEsgCodes, esg]);
                                  }
                                }}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              #{g.rankOrder}
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                                {esg}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary" className="font-mono font-bold text-[10px]">{g.gradeCode}</Badge>
                            </td>
                            <td className="p-3 font-bold text-slate-900 text-sm">
                              {g.gradeName}
                            </td>
                            <td className="p-3">
                              <Badge variant={g.defaultFormType === 'BALANCED_SCORECARD' ? 'warning' : 'nbp'}>
                                {g.defaultFormType === 'BALANCED_SCORECARD' ? 'Balanced Scorecard (4-P)' : 'KPI Form (70/30)'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              {isFrozen ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                  ✓ Frozen in Cycle
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] font-bold">
                                  ⚠ Not in Cycle
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleSnapshotSingleOrgGrade(g)}
                                className="h-7 text-[11px] font-bold border-slate-300 text-emerald-900 hover:bg-emerald-50"
                              >
                                <Camera className="h-3 w-3 mr-1 text-emerald-700" />
                                {isFrozen ? 'Re-Sync' : 'Snapshot'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: STAFF ENROLLMENT SNAPSHOT WIZARD ═══════════════ */}
      {activeTab === 'staff-snapshot' && (
        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-emerald-800" />
              <CardTitle className="text-base font-bold">
                Staff Enrollment Snapshot Wizard
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Select specific Master Reporting Groups to snapshot active staff into <strong>{currentCycle?.title}</strong>. Repeat snapshots strictly deduplicate by SAP ID without duplicate rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSyncGroupCodes(masterGroups.map(g => g.rpsaCode || g.groupCode))}
                  className="text-xs font-bold"
                >
                  Select All Groups ({masterGroups.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSyncGroupCodes([])}
                  className="text-xs font-bold"
                >
                  Deselect All
                </Button>
                <span className="text-xs text-slate-500 font-bold">
                  {selectedSyncGroupCodes.length} of {masterGroups.length} Groups Selected
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSnapshotAllOrg}
                disabled={actionLoading}
                className="text-xs font-bold border-emerald-500 text-emerald-900 bg-emerald-50 hover:bg-emerald-100"
              >
                <Layers className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                Sync Groups & Grades Hierarchy First
              </Button>
            </div>

            {/* Master Groups Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {masterGroups.map((g) => {
                const code = g.rpsaCode || g.groupCode;
                const isSelected = selectedSyncGroupCodes.includes(code);
                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSyncGroupCodes(selectedSyncGroupCodes.filter(c => c !== code));
                      } else {
                        setSelectedSyncGroupCodes([...selectedSyncGroupCodes, code]);
                      }
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-emerald-900">{code}</span>
                        {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-800" /> : <Square className="h-4 w-4 text-slate-300" />}
                      </div>
                      <div className="font-bold text-xs text-slate-900 mt-1 truncate">{g.groupName}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{g.groupCode}</div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={(e) => handleSnapshotIndividualStaffGroup(g, e)}
                      className="w-full mt-3 h-7 text-[10px] font-bold text-emerald-900 border-emerald-300 bg-white hover:bg-emerald-50 shadow-2xs"
                    >
                      <Camera className="h-3 w-3 mr-1 text-emerald-700" />
                      Snapshot Individual Group now
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
              <div>
                <h4 className="text-xs font-bold text-emerald-300">Ready to execute Staff Snapshot?</h4>
                <p className="text-[11px] text-slate-300">
                  Enrolls all active employees belonging to the selected {selectedSyncGroupCodes.length} groups into {currentCycle?.title}.
                </p>
              </div>
              <Button
                variant="nbp"
                size="sm"
                disabled={actionLoading || selectedSyncGroupCodes.length === 0}
                onClick={handleSyncMultiGroups}
                className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
              >
                <Camera className="h-4 w-4 mr-1.5" />
                Snapshot Selected Groups Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: BULK UNASSIGN CONFIRMATION */}
      {showBulkUnassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <span>Confirm Bulk Unassign from Cycle</span>
              </h3>
              <button onClick={() => setShowBulkUnassignModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                You are about to unassign employees from <strong>{currentCycle?.title}</strong>.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 font-bold space-y-1">
                <div>
                  Target Scope:{' '}
                  {unassignScope === 'selected' ? (
                    <span className="text-rose-700 font-mono font-black">{selectedEmployeeIds.length} Selected Employees</span>
                  ) : (
                    <span className="text-rose-700 font-mono font-black">{filteredEmployees.length} Filtered Employees</span>
                  )}
                </div>
                <div className="text-[11px] font-normal text-rose-800">
                  Note: Master Employee records will NOT be deleted. Only their cycle enrollment and draft objectives will be unlinked.
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkUnassignModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={handleBulkUnassign}
                className="text-xs font-bold bg-rose-700 hover:bg-rose-800"
              >
                Confirm Bulk Unassign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK FORM TYPE OVERRIDE */}
      {showBulkFormTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-sky-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-sky-400" />
                <span>Bulk Override Form Type</span>
              </h3>
              <button onClick={() => setShowBulkFormTypeModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700">
                Select the target appraisal form type to assign to the <strong>{selectedEmployeeIds.length} selected employees</strong> in this cycle:
              </p>
              <select
                value={targetFormType}
                onChange={(e) => setTargetFormType(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold"
              >
                <option value="KPI_FORM">KPI Form (70% Objectives / 30% Traits)</option>
                <option value="BALANCED_SCORECARD">Balanced Scorecard (4 Perspectives)</option>
                <option value="RISK_ADJUSTED_BSC">Risk-Adjusted BSC (5 Perspectives)</option>
              </select>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkFormTypeModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="nbp"
                size="sm"
                disabled={actionLoading}
                onClick={handleBulkFormTypeOverride}
                className="text-xs font-bold bg-sky-800 hover:bg-sky-900 text-white"
              >
                Apply Form Type Override
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK APPRAISER ASSIGNMENT */}
      {showBulkAppraiserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-indigo-400" />
                <span>Bulk Assign Appraisers</span>
              </h3>
              <button onClick={() => setShowBulkAppraiserModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-700">
                Set First and/or Second Appraisers for all <strong>{selectedEmployeeIds.length} selected employees</strong> in this cycle:
              </p>
              <div className="space-y-3">
                <div>
                  <SapIdAutocomplete
                    label="First Appraiser SAP ID"
                    value={bulkFirstAppraiserSapId}
                    onChange={setBulkFirstAppraiserSapId}
                    placeholder="Search First Appraiser..."
                  />
                </div>
                <div>
                  <SapIdAutocomplete
                    label="Second Appraiser SAP ID"
                    value={bulkSecondAppraiserSapId}
                    onChange={setBulkSecondAppraiserSapId}
                    placeholder="Search Second Appraiser..."
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkAppraiserModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="nbp"
                size="sm"
                disabled={actionLoading}
                onClick={handleBulkAssignAppraisers}
                className="text-xs font-bold bg-indigo-800 hover:bg-indigo-900 text-white"
              >
                Apply Appraiser Assignments
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT INDIVIDUAL EMPLOYEE SNAPSHOT */}
      {showEditEmployeeModal && editingEmpCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Edit Cycle Snapshot: {editingEmpCycle.fullName}</h3>
                <span className="text-xs font-mono text-emerald-300">SAP ID: {editingEmpCycle.sapId}</span>
              </div>
              <button onClick={() => setShowEditEmployeeModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Snapshot Grade (ESG)</label>
                  <select
                    value={editingEmpCycle.snapshotGrade}
                    onChange={(e) => setEditingEmpCycle({ ...editingEmpCycle, snapshotGrade: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-slate-900 rounded text-xs font-bold"
                  >
                    {snapshotGrades.map((g) => (
                      <option key={g.esgCode} value={g.esgCode}>{g.esgCode} – {g.gradeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Snapshot Group (RPSA)</label>
                  <select
                    value={editingEmpCycle.snapshotReportingGroup}
                    onChange={(e) => setEditingEmpCycle({ ...editingEmpCycle, snapshotReportingGroup: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-slate-900 rounded text-xs font-bold"
                  >
                    {snapshotGroups.map((g) => (
                      <option key={g.rpsaCode} value={g.rpsaCode}>{g.rpsaCode} – {g.groupName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Snapshot Designation</label>
                <Input
                  value={editingEmpCycle.snapshotDesignation}
                  onChange={(e) => setEditingEmpCycle({ ...editingEmpCycle, snapshotDesignation: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SapIdAutocomplete
                    label="First Appraiser SAP"
                    value={editingEmpCycle.firstAppraiserSapId}
                    onChange={(sap) => setEditingEmpCycle({ ...editingEmpCycle, firstAppraiserSapId: sap })}
                    placeholder="SAP ID"
                  />
                </div>
                <div>
                  <SapIdAutocomplete
                    label="Second Appraiser SAP"
                    value={editingEmpCycle.secondAppraiserSapId}
                    onChange={(sap) => setEditingEmpCycle({ ...editingEmpCycle, secondAppraiserSapId: sap })}
                    placeholder="SAP ID"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editMrt"
                  checked={editingEmpCycle.snapshotIsMrtOrMrc}
                  onChange={(e) => setEditingEmpCycle({ ...editingEmpCycle, snapshotIsMrtOrMrc: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="editMrt" className="text-xs font-bold text-slate-800">
                  Material Risk Taker / Controller (Enforces 5-Perspective Risk BSC)
                </label>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditEmployeeModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="nbp"
                size="sm"
                disabled={actionLoading}
                onClick={handleSaveEmployeeSnapshot}
                className="text-xs font-bold bg-emerald-800 hover:bg-emerald-900"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SNAPSHOT GROUP */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Add Group to Cycle Snapshot</h3>
              <button onClick={() => setShowAddGroupModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">RPSA Code (4-digit e.g. 0009)</label>
                <Input
                  value={newGroupForm.rpsaCode}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, rpsaCode: e.target.value })}
                  placeholder="0009"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Group Code (e.g. IBG)</label>
                <Input
                  value={newGroupForm.groupCode}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, groupCode: e.target.value })}
                  placeholder="IBG"
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Group Name</label>
                <Input
                  value={newGroupForm.groupName}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, groupName: e.target.value })}
                  placeholder="Islamic Banking Group"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <SapIdAutocomplete
                  label="Head of Group SAP ID (Optional)"
                  value={newGroupForm.headOfGroupSapId}
                  onChange={(sap) => setNewGroupForm({ ...newGroupForm, headOfGroupSapId: sap })}
                  placeholder="Search SAP ID..."
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddGroupModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="nbp"
                size="sm"
                disabled={actionLoading}
                onClick={handleCreateGroup}
                className="text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                Create Group Snapshot
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SNAPSHOT GRADE */}
      {showAddGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Add Grade to Cycle Snapshot</h3>
              <button onClick={() => setShowAddGradeModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">ESG Code (e.g. 10)</label>
                  <Input
                    value={newGradeForm.esgCode}
                    onChange={(e) => setNewGradeForm({ ...newGradeForm, esgCode: e.target.value })}
                    placeholder="10"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Grade Code (e.g. CLERK)</label>
                  <Input
                    value={newGradeForm.gradeCode}
                    onChange={(e) => setNewGradeForm({ ...newGradeForm, gradeCode: e.target.value })}
                    placeholder="CLERK"
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Grade Name</label>
                <Input
                  value={newGradeForm.gradeName}
                  onChange={(e) => setNewGradeForm({ ...newGradeForm, gradeName: e.target.value })}
                  placeholder="Clerical Staff"
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Rank Order</label>
                  <Input
                    type="number"
                    value={newGradeForm.hierarchyOrder}
                    onChange={(e) => setNewGradeForm({ ...newGradeForm, hierarchyOrder: parseInt(e.target.value) || 1 })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Form Type</label>
                  <select
                    value={newGradeForm.defaultFormType}
                    onChange={(e) => setNewGradeForm({ ...newGradeForm, defaultFormType: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-slate-900 rounded text-xs font-bold"
                  >
                    <option value="KPI_FORM">KPI Form (70/30)</option>
                    <option value="BALANCED_SCORECARD">Balanced Scorecard (4-P)</option>
                    <option value="RISK_ADJUSTED_BSC">Risk BSC (5-P)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddGradeModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="nbp"
                size="sm"
                disabled={actionLoading}
                onClick={handleCreateGrade}
                className="text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                Create Grade Snapshot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
