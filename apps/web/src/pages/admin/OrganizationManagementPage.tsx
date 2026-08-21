import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Building2, Plus, Trash2, CheckCircle2, RefreshCw, Layers, Upload, Download, FileSpreadsheet, X, FileText, AlertTriangle, Pencil, Users, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export const OrganizationManagementPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'grades'>('groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Group Form Modal State (used for both create and edit)
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupHeadSapId, setGroupHeadSapId] = useState('');
  const [groupIsActive, setGroupIsActive] = useState(true);

  // Grade Form Modal State
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeCode, setGradeCode] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [rankOrder, setRankOrder] = useState(1);
  const [defaultFormType, setDefaultFormType] = useState('KPI_FORM');

  // Bulk Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'groups' | 'grades'>('groups');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let groupsData: any[];
      try {
        groupsData = await api.getReportingGroupsSummary();
      } catch {
        groupsData = await api.getReportingGroups();
      }
      const gradesData = await api.getGradeMappings();
      setGroups(groupsData);
      setGrades(gradesData);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Group CRUD ──────────────────────────────────────────────────────
  const openCreateGroupModal = () => {
    setEditingGroup(null);
    setGroupCode('');
    setGroupName('');
    setGroupHeadSapId('');
    setGroupIsActive(true);
    setShowGroupModal(true);
  };

  const openEditGroupModal = (g: any) => {
    setEditingGroup(g);
    setGroupCode(g.groupCode || '');
    setGroupName(g.groupName || '');
    setGroupHeadSapId(g.headOfGroupSapId || '');
    setGroupIsActive(g.isActive !== false);
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupCode || !groupName) return;
    setErrorMessage(null);
    try {
      if (editingGroup) {
        // Update existing group
        await api.updateReportingGroup(editingGroup.id, {
          groupCode,
          groupName,
          headOfGroupSapId: groupHeadSapId || null,
          isActive: groupIsActive,
          actorUserId: 'PMW_ADMIN'
        });
        setMessage(`Reporting Group "${groupName}" (${groupCode}) updated successfully.`);
      } else {
        // Create new group
        await api.createReportingGroup({
          groupCode,
          groupName,
          headOfGroupSapId: groupHeadSapId || null,
          actorUserId: 'PMW_ADMIN'
        });
        setMessage(`Reporting Group "${groupName}" (${groupCode}) created successfully.`);
      }
      setShowGroupModal(false);
      setEditingGroup(null);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    }
  };

  const handleToggleGroupStatus = async (g: any) => {
    setErrorMessage(null);
    try {
      await api.updateReportingGroup(g.id, {
        groupCode: g.groupCode,
        groupName: g.groupName,
        headOfGroupSapId: g.headOfGroupSapId,
        isActive: !g.isActive,
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(`Group "${g.groupName}" ${g.isActive ? 'deactivated' : 'activated'} successfully.`);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the reporting group "${name}"? This action cannot be undone.`)) return;
    setErrorMessage(null);
    try {
      await api.deleteReportingGroup(id);
      setMessage(`Reporting Group "${name}" deleted.`);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    }
  };

  // ─── Grade CRUD ──────────────────────────────────────────────────────
  const handleCreateGrade = async () => {
    if (!gradeCode || !gradeName) return;
    setErrorMessage(null);
    try {
      await api.createGradeMapping({ gradeCode, gradeName, rankOrder: Number(rankOrder), defaultFormType, actorUserId: 'PMW_ADMIN' });
      setMessage(`Grade ${gradeName} mapped successfully.`);
      setShowGradeModal(false);
      setGradeCode('');
      setGradeName('');
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    }
  };

  const handleDeleteGrade = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grade mapping?')) return;
    setErrorMessage(null);
    try {
      await api.deleteGradeMapping(id);
      setMessage('Grade mapping deleted.');
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    }
  };

  // ─── CSV Utilities ───────────────────────────────────────────────────
  const handleDownloadSampleCsv = () => {
    let content = "";
    let filename = "";

    if (importType === 'groups') {
      content = "GroupCode,GroupName,HeadOfGroupSapId\n" +
        "CBG,Commercial Banking Group,10002\n" +
        "RBG,Consumer Banking Group,10003\n" +
        "RMG,Risk Management Group,10004\n" +
        "ITG,Information Technology Group,10005";
      filename = "NBP_Reporting_Groups_Sample_Import.csv";
    } else {
      content = "GradeCode,GradeName,RankOrder,DefaultFormType\n" +
        "OG_III,OG III,1,KPI_FORM\n" +
        "OG_II,OG II,2,KPI_FORM\n" +
        "AVP,AVP,4,KPI_FORM\n" +
        "VP,VP,5,BALANCED_SCORECARD";
      filename = "NBP_Grade_Hierarchy_Sample_Import.csv";
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsv = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      if (importType === 'groups') {
        rows.push({
          groupCode: cols[0] || '',
          groupName: cols[1] || '',
          headOfGroupSapId: cols[2] || ''
        });
      } else {
        rows.push({
          gradeCode: cols[0] || '',
          gradeName: cols[1] || '',
          rankOrder: Number(cols[2]) || 1,
          defaultFormType: cols[3] || 'KPI_FORM'
        });
      }
    }
    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleCommitBulkImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setErrorMessage(null);
    try {
      if (importType === 'groups') {
        const res = await api.importReportingGroups(parsedRows);
        setMessage(res.message);
      } else {
        const res = await api.importGradeMappings(parsedRows);
        setMessage(res.message);
      }
      setShowImportModal(false);
      setParsedRows([]);
      setCsvText('');
      await loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    } finally {
      setImporting(false);
    }
  };

  // ─── Filter logic ────────────────────────────────────────────────────
  const filteredGroups = groups.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (g.groupCode || '').toLowerCase().includes(q) ||
      (g.groupName || '').toLowerCase().includes(q) ||
      (g.headOfGroupSapId || '').toLowerCase().includes(q)
    );
  });

  const activeGroupCount = groups.filter(g => g.isActive !== false).length;
  const inactiveGroupCount = groups.filter(g => g.isActive === false).length;
  const totalEmployees = groups.reduce((sum: number, g: any) => sum + (g.employeeCount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Organizational Hierarchy & Form Rules</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-800 text-white">PMW Control</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Reporting Groups & Grade Hierarchy</h1>
          <p className="text-slate-300 text-xs mt-1">
            Manage NBP Bank Divisions, Reporting Groups, Grade Rank Orders, and Default Form Assignments.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

          {activeSubTab === 'groups' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                onClick={() => {
                  setImportType('groups');
                  setParsedRows([]);
                  setCsvText('');
                  setErrorMessage(null);
                  setShowImportModal(true);
                }}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload Groups CSV
              </Button>
              <Button variant="gold" size="sm" onClick={openCreateGroupModal}>
                <Plus className="h-4 w-4 mr-1" />
                Add Group
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                onClick={() => {
                  setImportType('grades');
                  setParsedRows([]);
                  setCsvText('');
                  setErrorMessage(null);
                  setShowImportModal(true);
                }}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload Grades CSV
              </Button>
              <Button variant="gold" size="sm" onClick={() => setShowGradeModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Grade Rank
              </Button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-700 shrink-0" />
              <span>System Exception Occurred (Copyable Text):</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
          </div>
          <pre className="p-3 rounded-lg bg-white border border-red-200 font-mono text-[11px] text-red-900 whitespace-pre-wrap select-all select-text overflow-x-auto cursor-text">
            {errorMessage}
          </pre>
        </div>
      )}

      {/* Sub Tab Switcher */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveSubTab('groups')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeSubTab === 'groups' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>NBP Reporting Groups ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('grades')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeSubTab === 'grades' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Grade Hierarchy & Form Assignment ({grades.length})</span>
        </button>
      </div>

      {/* ═══════════════ GROUPS TAB ═══════════════ */}
      {activeSubTab === 'groups' ? (
        <div className="space-y-4">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Groups</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{groups.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{activeGroupCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Inactive</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{inactiveGroupCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Total Employees</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{totalEmployees}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by group code, name, or head SAP ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 text-sm"
            />
          </div>

          {/* Groups Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Bank Reporting Groups</CardTitle>
              <CardDescription className="text-xs">Database-driven NBP organizational groups — click Edit to manage details</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading reporting groups...</div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery ? 'No groups match your search.' : 'No reporting groups found. Click "Add Group" to create one.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Group Name</th>
                        <th className="p-3">Head of Group (SAP ID)</th>
                        <th className="p-3 text-center">Employees</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGroups.map((g) => (
                        <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${g.isActive === false ? 'opacity-60' : ''}`}>
                          <td className="p-3">
                            <Badge variant="secondary" className="font-mono text-[10px]">{g.groupCode}</Badge>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 text-sm">{g.groupName}</span>
                          </td>
                          <td className="p-3">
                            {g.headOfGroupSapId ? (
                              <span className="font-mono text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">{g.headOfGroupSapId}</span>
                            ) : (
                              <span className="text-slate-400 italic">Not assigned</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Users className="h-3.5 w-3.5 text-blue-500" />
                              <span className="font-bold text-slate-900">{g.employeeCount ?? '—'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleGroupStatus(g)}
                              title={g.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                              className="inline-flex items-center space-x-1 cursor-pointer group"
                            >
                              {g.isActive !== false ? (
                                <>
                                  <ToggleRight className="h-5 w-5 text-emerald-600 group-hover:text-emerald-700" />
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Active</Badge>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                                  <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold">Inactive</Badge>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditGroupModal(g)} title="Edit Group">
                                <Pencil className="h-4 w-4 text-slate-500 hover:text-emerald-700" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(g.id, g.groupName)} title="Delete Group">
                                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                              </Button>
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
        </div>
      ) : (
        /* ═══════════════ GRADES TAB ═══════════════ */
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Grade Hierarchy & Default Form Assignments</CardTitle>
            <CardDescription className="text-xs">Grade rank order and standard form mapping rules</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading grade hierarchy...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Rank Order</th>
                      <th className="p-3">Grade Code</th>
                      <th className="p-3">Grade Name</th>
                      <th className="p-3">Default Form Assignment</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map((gr) => (
                      <tr key={gr.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">#{gr.rankOrder}</td>
                        <td className="p-3 font-mono text-slate-600">{gr.gradeCode}</td>
                        <td className="p-3 font-bold text-slate-900">{gr.gradeName}</td>
                        <td className="p-3">
                          <Badge variant={gr.defaultFormType === 'KPI_FORM' ? 'nbp' : 'warning'}>
                            {gr.defaultFormType === 'KPI_FORM' ? 'KPI Form (70/30)' : 'Balanced Scorecard (4-P)'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGrade(gr.id)} title="Delete Grade">
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
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
      )}

      {/* ═══════════════ CREATE / EDIT GROUP MODAL ═══════════════ */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  {editingGroup ? <Pencil className="h-5 w-5 text-emerald-400" /> : <Building2 className="h-5 w-5 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {editingGroup ? 'Edit Reporting Group' : 'Add NBP Reporting Group'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {editingGroup ? `Editing: ${editingGroup.groupName}` : 'New Organizational Group Setup'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowGroupModal(false); setEditingGroup(null); }} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Group Code</label>
                  <Input
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    placeholder="CBG"
                    disabled={!!editingGroup}
                    className={editingGroup ? 'bg-slate-100 text-slate-500' : ''}
                  />
                  {editingGroup && <p className="text-[10px] text-slate-400 mt-1">Code cannot be changed after creation</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Head of Group (SAP ID)</label>
                  <Input
                    value={groupHeadSapId}
                    onChange={(e) => setGroupHeadSapId(e.target.value)}
                    placeholder="e.g. 10002"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Group Full Name</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Commercial Banking Group"
                />
              </div>

              {editingGroup && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-700">Group Status</p>
                    <p className="text-[11px] text-slate-500">Inactive groups are hidden from appraisal cycle scope</p>
                  </div>
                  <button
                    onClick={() => setGroupIsActive(!groupIsActive)}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    {groupIsActive ? (
                      <>
                        <ToggleRight className="h-6 w-6 text-emerald-600" />
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Active</Badge>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-6 w-6 text-slate-400" />
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold">Inactive</Badge>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => { setShowGroupModal(false); setEditingGroup(null); }}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleSaveGroup}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {editingGroup ? 'Update Group' : 'Save Reporting Group'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Layers className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Add Grade Rank Mapping</h3>
                  <p className="text-[11px] text-slate-300">Grade Rank & Form Type Assignment</p>
                </div>
              </div>
              <button onClick={() => setShowGradeModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Grade Code</label>
                <Input value={gradeCode} onChange={(e) => setGradeCode(e.target.value)} placeholder="AVP" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Grade Display Name</label>
                <Input value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Assistant Vice President" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Rank Order</label>
                  <Input type="number" value={rankOrder} onChange={(e) => setRankOrder(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Default Form Type</label>
                  <select value={defaultFormType} onChange={(e) => setDefaultFormType(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border rounded-lg">
                    <option value="KPI_FORM">KPI Form (70/30)</option>
                    <option value="BALANCED_SCORECARD">Balanced Scorecard (4-P)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowGradeModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleCreateGrade}>Save Grade Rank</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Upload Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Upload Bulk {importType === 'groups' ? 'Reporting Groups' : 'Grade Mappings'} CSV
                  </h3>
                  <p className="text-[11px] text-slate-300">CSV Bulk Import & Data Commit Wizard</p>
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
                  <span>Need the standard CSV import template format?</span>
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
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto text-emerald-700 mb-2" />
                <p className="font-bold text-slate-800 text-sm">Choose or Drop CSV File</p>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 font-bold"
                >
                  Select File From Computer
                </Button>
              </div>

              {/* Or Paste CSV Data Directly */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Or Paste CSV Data Directly:</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCsv(e.target.value);
                  }}
                  placeholder={importType === 'groups' ? "GroupCode,GroupName,HeadOfGroupSapId" : "GradeCode,GradeName,RankOrder,DefaultFormType"}
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* Validation Summary & Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Validation Preview ({parsedRows.length} Rows Parsed):</span>
                    <Badge variant="nbp">{parsedRows.length} Valid Records</Badge>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 font-bold uppercase text-slate-600 sticky top-0">
                        {importType === 'groups' ? (
                          <tr>
                            <th className="p-2">Group Code</th>
                            <th className="p-2">Group Name</th>
                            <th className="p-2">Head SAP ID</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="p-2">Rank</th>
                            <th className="p-2">Code</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Default Form</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {importType === 'groups' ? (
                              <>
                                <td className="p-2 font-mono font-bold">{r.groupCode}</td>
                                <td className="p-2 font-semibold">{r.groupName}</td>
                                <td className="p-2 font-mono text-slate-500">{r.headOfGroupSapId || '—'}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-2 font-bold">#{r.rankOrder}</td>
                                <td className="p-2 font-mono font-bold">{r.gradeCode}</td>
                                <td className="p-2 font-semibold">{r.gradeName}</td>
                                <td className="p-2 text-emerald-700 font-bold">{r.defaultFormType}</td>
                              </>
                            )}
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
                onClick={handleCommitBulkImport}
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
