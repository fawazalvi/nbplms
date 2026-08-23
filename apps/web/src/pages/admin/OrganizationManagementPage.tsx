import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Building2, Plus, Trash2, CheckCircle2, RefreshCw, Layers, Upload, Download, FileSpreadsheet, X, FileText, AlertTriangle, Pencil, Users, ToggleLeft, ToggleRight, Search, Hash } from 'lucide-react';

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
  const [groupRpsaCode, setGroupRpsaCode] = useState('');
  const [groupHeadSapId, setGroupHeadSapId] = useState('');
  const [groupIsActive, setGroupIsActive] = useState(true);

  // Grade Form Modal State (used for both create and edit)
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any | null>(null);
  const [gradeCode, setGradeCode] = useState('');
  const [gradeEsgCode, setGradeEsgCode] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [rankOrder, setRankOrder] = useState(1);
  const [defaultFormType, setDefaultFormType] = useState('KPI_FORM');
  const [gradeIsActive, setGradeIsActive] = useState(true);

  // Bulk Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'groups' | 'grades'>('groups');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatRpsa = (val: string) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 4);
    return digits ? digits.padStart(4, '0') : '';
  };

  const formatEsg = (val: string, fallbackRank: number = 1) => {
    if (!val) return fallbackRank.toString().padStart(2, '0');
    const digits = val.replace(/\D/g, '').slice(0, 2);
    return digits ? digits.padStart(2, '0') : fallbackRank.toString().padStart(2, '0');
  };

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
      setGroups(groupsData || []);
      setGrades(gradesData || []);
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
    setGroupRpsaCode('');
    setGroupHeadSapId('');
    setGroupIsActive(true);
    setShowGroupModal(true);
  };

  const openEditGroupModal = (g: any) => {
    setEditingGroup(g);
    setGroupCode(g.groupCode || '');
    setGroupName(g.groupName || '');
    setGroupRpsaCode(g.rpsaCode || '');
    setGroupHeadSapId(g.headOfGroupSapId || '');
    setGroupIsActive(g.isActive !== false);
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupCode || !groupName) return;
    setErrorMessage(null);
    try {
      const formattedRpsa = groupRpsaCode ? formatRpsa(groupRpsaCode) : null;
      if (editingGroup) {
        // Update existing group
        await api.updateReportingGroup(editingGroup.id, {
          groupCode,
          groupName,
          rpsaCode: formattedRpsa,
          headOfGroupSapId: groupHeadSapId || null,
          isActive: groupIsActive,
          actorUserId: 'PMW_ADMIN'
        });
        setMessage(`Reporting Group "${groupName}" (${groupCode}) with RPSA ${formattedRpsa || 'N/A'} updated successfully.`);
      } else {
        // Create new group
        await api.createReportingGroup({
          groupCode,
          groupName,
          rpsaCode: formattedRpsa,
          headOfGroupSapId: groupHeadSapId || null,
          actorUserId: 'PMW_ADMIN'
        });
        setMessage(`Reporting Group "${groupName}" (${groupCode}) with RPSA ${formattedRpsa || 'N/A'} created successfully.`);
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
        rpsaCode: g.rpsaCode || null,
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
  const openCreateGradeModal = () => {
    setEditingGrade(null);
    setGradeCode('');
    setGradeEsgCode('');
    setGradeName('');
    setRankOrder((grades.length || 0) + 1);
    setDefaultFormType('KPI_FORM');
    setGradeIsActive(true);
    setShowGradeModal(true);
  };

  const openEditGradeModal = (g: any) => {
    setEditingGrade(g);
    setGradeCode(g.gradeCode || '');
    setGradeEsgCode(g.esgCode || g.gradeNumericCode || formatEsg('', g.rankOrder || 1));
    setGradeName(g.gradeName || '');
    setRankOrder(g.rankOrder || 1);
    setDefaultFormType(g.defaultFormType || 'KPI_FORM');
    setGradeIsActive(g.isActive !== false);
    setShowGradeModal(true);
  };

  const handleSaveGrade = async () => {
    if (!gradeCode || !gradeName) return;
    setErrorMessage(null);
    try {
      const formattedEsg = formatEsg(gradeEsgCode, Number(rankOrder) || 1);
      if (editingGrade) {
        await api.updateGradeMapping(editingGrade.id, {
          gradeCode,
          esgCode: formattedEsg,
          gradeName,
          rankOrder: Number(rankOrder),
          defaultFormType,
          isActive: gradeIsActive,
          actorUserId: 'PMW_ADMIN'
        });
        setMessage(`Grade Mapping "${gradeName}" (${gradeCode}) [ESG: ${formattedEsg}] updated successfully.`);
      } else {
        await api.createGradeMapping({
          gradeCode,
          esgCode: formattedEsg,
          gradeName,
          rankOrder: Number(rankOrder),
          defaultFormType,
          actorUserId: 'PMW_ADMIN'
        });
        setMessage(`Grade Mapping "${gradeName}" (${gradeCode}) [ESG: ${formattedEsg}] created successfully.`);
      }
      setShowGradeModal(false);
      setEditingGrade(null);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    }
  };

  const handleDeleteGrade = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the grade mapping for "${name}"?`)) return;
    setErrorMessage(null);
    try {
      await api.deleteGradeMapping(id);
      setMessage(`Grade mapping "${name}" deleted.`);
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
      content = "GroupCode,GroupName,RPSA,HeadOfGroupSapId\n" +
        "CBG,Commercial Banking Group,0001,10002\n" +
        "RBG,Consumer Banking Group,0002,10003\n" +
        "RMG,Risk Management Group,0003,10004\n" +
        "TGM,Treasury & Global Markets,0004,10005\n" +
        "ITG,Information Technology Group,0005,10006\n" +
        "OPS,Operations Group,0006,10007\n" +
        "HRG,HR Management Group,0007,10008\n" +
        "CMP,Compliance Group,0008,10009";
      filename = "NBP_Reporting_Groups_Sample_Import.csv";
    } else {
      content = "GradeCode,ESG,GradeName,RankOrder,DefaultFormType\n" +
        "OG_III,01,OG III,1,KPI_FORM\n" +
        "OG_II,02,OG II,2,KPI_FORM\n" +
        "OG_I,03,OG I,3,KPI_FORM\n" +
        "AVP,04,AVP,4,KPI_FORM\n" +
        "VP,05,VP,5,BALANCED_SCORECARD\n" +
        "SVP,06,SVP,6,BALANCED_SCORECARD\n" +
        "EVP,07,EVP,7,BALANCED_SCORECARD\n" +
        "SEVP,08,SEVP,8,BALANCED_SCORECARD\n" +
        "PRESIDENT_CEO,09,President/CEO,9,BALANCED_SCORECARD";
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
        const rawRpsa = cols[2] || '';
        const isNumericRpsa = /^\d+$/.test(rawRpsa.trim()) || cols.length >= 4;
        const formattedRpsa = isNumericRpsa && rawRpsa ? formatRpsa(rawRpsa) : (cols.length >= 4 ? formatRpsa(cols[2]) : '');
        const headSap = cols.length >= 4 ? cols[3] : (isNumericRpsa ? '' : cols[2]);

        rows.push({
          groupCode: cols[0] || '',
          groupName: cols[1] || '',
          rpsaCode: formattedRpsa,
          headOfGroupSapId: headSap || ''
        });
      } else {
        // Grades CSV: GradeCode, ESG (2-Digit), GradeName, RankOrder, DefaultFormType
        if (cols.length >= 5) {
          rows.push({
            gradeCode: cols[0] || '',
            esgCode: formatEsg(cols[1], Number(cols[3]) || 1),
            gradeName: cols[2] || '',
            rankOrder: Number(cols[3]) || 1,
            defaultFormType: cols[4] || 'KPI_FORM'
          });
        } else {
          // 4 columns: check if col[1] is 2-digit ESG code
          const isCol1Numeric = /^\d+$/.test(cols[1].trim());
          if (isCol1Numeric && cols.length >= 4) {
            rows.push({
              gradeCode: cols[0] || '',
              esgCode: formatEsg(cols[1], Number(cols[2]) || 1),
              gradeName: cols[0] || '',
              rankOrder: Number(cols[2]) || 1,
              defaultFormType: cols[3] || 'KPI_FORM'
            });
          } else {
            const rank = Number(cols[2]) || 1;
            rows.push({
              gradeCode: cols[0] || '',
              esgCode: formatEsg('', rank),
              gradeName: cols[1] || '',
              rankOrder: rank,
              defaultFormType: cols[3] || 'KPI_FORM'
            });
          }
        }
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
      (g.rpsaCode || '').toLowerCase().includes(q) ||
      (g.headOfGroupSapId || '').toLowerCase().includes(q)
    );
  });

  const activeGroupCount = groups.filter(g => g.isActive !== false).length;
  const inactiveGroupCount = groups.filter(g => g.isActive === false).length;
  const totalEmployees = groups.reduce((sum, g) => sum + (g.employeeCount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="h-4 w-4" />
            <span>NBP Organizational Architecture</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">Database Driven</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Reporting Groups & Grade Hierarchy</h1>
          <p className="text-slate-300 text-xs mt-1">
            Configure bank reporting groups with 4-digit RPSA codes and manage grade rank hierarchies with form rules.
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by code, group name, or RPSA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredGroups.length} of {groups.length} reporting groups
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Configured Reporting Groups</CardTitle>
                  <CardDescription className="text-xs">
                    Organizational units linked to Group Performance Managers and Appraisal Cycle rosters.
                  </CardDescription>
                </div>
                <Badge variant="nbp" className="text-xs">{groups.length} Total Groups</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading reporting groups from database...</div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery ? 'No reporting groups match your search.' : 'No reporting groups configured.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">RPSA (4-Digit)</th>
                        <th className="p-3">Reporting Group Name</th>
                        <th className="p-3">Head of Group</th>
                        <th className="p-3 text-center">Staff Count</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGroups.map((g) => (
                        <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${g.isActive === false ? 'opacity-60' : ''}`}>
                          <td className="p-3">
                            <Badge variant="secondary" className="font-mono text-[10px] font-bold">{g.groupCode}</Badge>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                              {g.rpsaCode ? g.rpsaCode.padStart(4, '0') : '0000'}
                            </span>
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
            <CardTitle className="text-base font-bold text-slate-900">Grade Hierarchy & Form Assignment Rules</CardTitle>
            <CardDescription className="text-xs">
              System grade progression rules. OG III to AVP are assigned KPI Forms (70/30), while VP to President are assigned Balanced Scorecards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading grade hierarchy...</div>
            ) : grades.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No grade mappings configured.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">ESG (2-Digit)</th>
                      <th className="p-3">Grade Code</th>
                      <th className="p-3">Display Name</th>
                      <th className="p-3">Form Rule Assigned</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map((g) => (
                      <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${g.isActive === false ? 'opacity-60' : ''}`}>
                        <td className="p-3 font-mono font-bold text-slate-900">#{g.rankOrder}</td>
                        <td className="p-3">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                            {formatEsg(g.esgCode || g.gradeNumericCode, g.rankOrder)}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="font-mono font-bold">{g.gradeCode}</Badge>
                        </td>
                        <td className="p-3 font-bold text-slate-900 text-sm">{g.gradeName}</td>
                        <td className="p-3">
                          <Badge variant={g.defaultFormType === 'BALANCED_SCORECARD' ? 'warning' : 'nbp'}>
                            {g.defaultFormType === 'BALANCED_SCORECARD' ? 'Balanced Scorecard (4-P)' : 'KPI Form (70/30)'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Active</Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditGradeModal(g)} title="Edit Grade">
                              <Pencil className="h-4 w-4 text-slate-500 hover:text-emerald-700" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteGrade(g.id, g.gradeName)} title="Delete Grade">
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Group Code *</label>
                  <Input
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    placeholder="CBG"
                    disabled={!!editingGroup}
                    className={editingGroup ? 'bg-slate-100 text-slate-500' : ''}
                  />
                  {editingGroup && <p className="text-[10px] text-slate-400 mt-1">Code is immutable</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">RPSA Code *</label>
                  <Input
                    value={groupRpsaCode}
                    onChange={(e) => setGroupRpsaCode(e.target.value)}
                    onBlur={() => {
                      if (groupRpsaCode) setGroupRpsaCode(formatRpsa(groupRpsaCode));
                    }}
                    placeholder="0001"
                    maxLength={4}
                    className="font-mono font-bold text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">4-digits with zeros</p>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Head SAP ID</label>
                  <Input
                    value={groupHeadSapId}
                    onChange={(e) => setGroupHeadSapId(e.target.value)}
                    placeholder="e.g. 10002"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Group Full Name *</label>
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
                    type="button"
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
              <Button variant="nbp" size="sm" onClick={handleSaveGroup} disabled={!groupCode || !groupName}>
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  {editingGrade ? <Pencil className="h-5 w-5 text-emerald-400" /> : <Layers className="h-5 w-5 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {editingGrade ? 'Edit Grade Mapping' : 'Add Grade Rank Mapping'}
                  </h3>
                  <p className="text-[11px] text-slate-300">Grade Rank & Form Type Assignment with 2-Digit ESG Code</p>
                </div>
              </div>
              <button onClick={() => { setShowGradeModal(false); setEditingGrade(null); }} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Grade Code *</label>
                  <Input
                    value={gradeCode}
                    onChange={(e) => setGradeCode(e.target.value)}
                    placeholder="AVP"
                    disabled={!!editingGrade}
                    className={editingGrade ? 'bg-slate-100 text-slate-500' : ''}
                  />
                  {editingGrade && <p className="text-[10px] text-slate-400 mt-1">Code is immutable</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ESG Code *</label>
                  <Input
                    value={gradeEsgCode}
                    onChange={(e) => setGradeEsgCode(e.target.value)}
                    onBlur={() => {
                      if (gradeEsgCode) setGradeEsgCode(formatEsg(gradeEsgCode, Number(rankOrder) || 1));
                    }}
                    placeholder="04"
                    maxLength={2}
                    className="font-mono font-bold text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">2 digits with zeros</p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Grade Display Name *</label>
                <Input value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Assistant Vice President" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rank Order</label>
                  <Input type="number" value={rankOrder} onChange={(e) => setRankOrder(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Default Form Type</label>
                  <select value={defaultFormType} onChange={(e) => setDefaultFormType(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border rounded-lg font-medium">
                    <option value="KPI_FORM">KPI Form (70/30)</option>
                    <option value="BALANCED_SCORECARD">Balanced Scorecard (4-P)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => { setShowGradeModal(false); setEditingGrade(null); }}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleSaveGrade} disabled={!gradeCode || !gradeName}>
                {editingGrade ? 'Save Changes' : 'Save Grade Rank'}
              </Button>
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
                  <p className="text-[11px] text-slate-300">
                    {importType === 'groups' ? 'CSV Bulk Import with 4-Digit RPSA Codes' : 'CSV Bulk Import with 2-Digit ESG Grade Codes'}
                  </p>
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
                  <span>
                    {importType === 'groups' ? 'Format: GroupCode, GroupName, RPSA (4-Digit), HeadOfGroupSapId' : 'Format: GradeCode, ESG, GradeName, RankOrder, DefaultFormType'}
                  </span>
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
                  Browse Computer
                </Button>
              </div>

              {/* Textarea Paste */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Or Paste CSV Data Below:</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCsv(e.target.value);
                  }}
                  placeholder={importType === 'groups' ? "GroupCode,GroupName,RPSA,HeadOfGroupSapId\nCBG,Commercial Banking Group,0001,10002" : "GradeCode,ESG,GradeName,RankOrder,DefaultFormType\nOG_III,01,OG III,1,KPI_FORM"}
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
                            <th className="p-2">RPSA Code</th>
                            <th className="p-2">Group Name</th>
                            <th className="p-2">Head SAP ID</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="p-2">Rank</th>
                            <th className="p-2">ESG Code</th>
                            <th className="p-2">Grade Code</th>
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
                                <td className="p-2 font-mono font-bold text-emerald-800">
                                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {r.rpsaCode || '0000'}
                                  </span>
                                </td>
                                <td className="p-2 font-semibold">{r.groupName}</td>
                                <td className="p-2 font-mono text-slate-500">{r.headOfGroupSapId || '—'}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-2 font-bold">#{r.rankOrder}</td>
                                <td className="p-2 font-mono font-bold text-emerald-800">
                                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {r.esgCode || formatEsg('', r.rankOrder)}
                                  </span>
                                </td>
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
