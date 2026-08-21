import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Users, Search, RefreshCw, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, X, FileText, UserCheck, ShieldCheck } from 'lucide-react';

export const EmployeeDataPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');

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

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.getEmployees({
        group: selectedGroup,
        grade: selectedGrade,
        search: searchTerm
      });
      setEmployees(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [selectedGroup, selectedGrade]);

  // Sample CSV Template Generator for Staff Import
  const handleDownloadSampleCsv = () => {
    const csvContent = "SapId,FullName,Grade,Designation,Location,ReportingGroup,Division,WingDepartment,RegionBranch,FirstAppraiserSapId,SecondAppraiserSapId,IsMrtOrMrc\n" +
      "95101,Muhammad Rashid,OG III,Operations Officer,Lahore,Consumer Banking Group,Retail,Branch Operations,Lahore Main,84920,10004,false\n" +
      "95102,Saima Imran,OG II,Relationship Manager,Karachi,Commercial Banking Group,Commercial,Commercial Branch,Karachi Central,84920,10004,false\n" +
      "95103,Kamran Akmal,VP,Regional Head,Islamabad,Commercial Banking Group,Corporate,Regional Office,Islamabad,10002,10001,false\n" +
      "95104,Ali Hassan,AVP,Senior Risk Controller,Karachi,Risk Management Group,Credit Risk,Risk Assessment,Head Office,10003,10002,true";

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

  // CSV Text Parser for Staff Import
  const parseCsv = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;

      const sapId = cols[0] || '';
      const fullName = cols[1] || '';
      const grade = cols[2] || '';
      const designation = cols[3] || 'Officer';
      const location = cols[4] || 'Head Office';
      const reportingGroup = cols[5] || 'General Banking';
      const division = cols[6] || 'Operations';
      const wingDepartment = cols[7] || 'General';
      const regionBranch = cols[8] || 'Karachi Main';
      const firstAppraiserSapId = cols[9] || '';
      const secondAppraiserSapId = cols[10] || '';
      const isMrtOrMrc = cols[11]?.toLowerCase() === 'true';

      let formType = "KPI Form (70/30)";
      if (isMrtOrMrc) {
        formType = "Risk-Adjusted BSC (5-Perspective)";
      } else if (["VP", "SVP", "EVP", "SEVP", "PRESIDENT", "CEO", "PRESIDENT/CEO"].includes(grade.toUpperCase())) {
        formType = "Balanced Scorecard (4-Perspective)";
      }

      rows.push({
        sapId,
        fullName,
        grade,
        designation,
        location,
        reportingGroup,
        division,
        wingDepartment,
        regionBranch,
        firstAppraiserSapId,
        secondAppraiserSapId,
        isMrtOrMrc,
        formType
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
        grade: r.grade,
        designation: r.designation,
        location: r.location,
        reportingGroup: r.reportingGroup,
        division: r.division,
        wingDepartment: r.wingDepartment,
        regionBranch: r.regionBranch,
        firstAppraiserSapId: r.firstAppraiserSapId || null,
        secondAppraiserSapId: r.secondAppraiserSapId || null,
        isMrtOrMrc: r.isMrtOrMrc
      }));

      const res = await api.importEmployees(payload);
      setImportMessage(`Successfully imported ${res.successfulImports ?? parsedRows.length} staff records into database!`);
      setShowImportModal(false);
      setParsedRows([]);
      setCsvText('');
      await loadEmployees();
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>SAP ID Master Data & Form Mapping</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">Database Driven</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Employee Directory & Data Import</h1>
          <p className="text-slate-300 text-xs mt-1">
            Browse SAP staff records, appraiser assignments, and administrative appraiser/supervisor overrides.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadEmployees}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Directory
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20 border-white/20"
            onClick={() => {
              setParsedAppraiserRows([]);
              setBulkAppraiserText('');
              setShowBulkAppraiserModal(true);
            }}
          >
            <UserCheck className="h-4 w-4 mr-1 text-emerald-400" />
            Bulk Appraiser Override
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setImportMessage(null);
              setShowImportModal(true);
            }}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload Staff CSV
          </Button>
        </div>
      </div>

      {importMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{importMessage}</span>
          </div>
          <button onClick={() => setImportMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search by Name or SAP ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Group:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
              >
                <option value="All Groups">All Reporting Groups</option>
                <option value="Commercial Banking Group">Commercial Banking Group</option>
                <option value="Consumer Banking Group">Consumer Banking Group</option>
                <option value="Risk Management Group">Risk Management Group</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Grade:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
              >
                <option value="All Grades">All Grades</option>
                <option value="OG III">OG III</option>
                <option value="OG II">OG II</option>
                <option value="OG I">OG I</option>
                <option value="AVP">AVP</option>
                <option value="VP">VP</option>
                <option value="SVP">SVP</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Employee Master Directory</CardTitle>
          <CardDescription className="text-xs">Database-driven staff records from Microsoft SQL Server ({employees.length} records)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading employee records from DB...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No staff records found in database. Click <strong>"Upload Staff CSV"</strong> or <strong>"Database Tools ➔ Seed Sample NBP Data"</strong>!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">SAP ID</th>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Reporting Group</th>
                    <th className="p-3">Region / Branch</th>
                    <th className="p-3">Assigned Form Type</th>
                    <th className="p-3">MRT/MRC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{emp.sapId}</td>
                      <td className="p-3 font-bold text-slate-900">{emp.fullName}</td>
                      <td className="p-3"><Badge variant="secondary">{emp.grade}</Badge></td>
                      <td className="p-3 text-slate-700">{emp.designation}</td>
                      <td className="p-3 text-slate-700">{emp.reportingGroup}</td>
                      <td className="p-3 text-slate-500">{emp.regionBranch}</td>
                      <td className="p-3">
                        <Badge variant="nbp" className="text-[10px]">{emp.formTypeAssigned}</Badge>
                      </td>
                      <td className="p-3">
                        {emp.isMrtOrMrc ? (
                          <Badge variant="danger" className="text-[10px]">MRT/MRC</Badge>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                <p className="text-slate-500 text-[11px] mt-1">Supports SAP ID, Name, Grade, Designation, Appraiser SAP IDs, & MRT/MRC flags</p>
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
                <label className="font-bold text-slate-700 block mb-1">Or Paste CSV Data Directly:</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCsv(e.target.value);
                  }}
                  placeholder="SapId,FullName,Grade,Designation,Location,ReportingGroup,Division,WingDepartment,RegionBranch,FirstAppraiserSapId,SecondAppraiserSapId,IsMrtOrMrc"
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* Validation Summary & Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Validation Preview ({parsedRows.length} Rows Parsed):</span>
                    <Badge variant="nbp">{parsedRows.length} Valid Staff Records</Badge>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 font-bold uppercase text-slate-600 sticky top-0">
                        <tr>
                          <th className="p-2">SAP ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Grade</th>
                          <th className="p-2">Assigned Form Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold">{r.sapId}</td>
                            <td className="p-2 font-semibold">{r.fullName}</td>
                            <td className="p-2">{r.grade}</td>
                            <td className="p-2 text-emerald-700 font-bold">{r.formType}</td>
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
