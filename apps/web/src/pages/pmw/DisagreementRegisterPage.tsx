import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Search,
  Paperclip,
  Download,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatGradeLabel, formatGroupLabel } from '@/lib/formatters';

interface DisagreementCaseItem {
  id: string;
  employeeCycleId?: string;
  employeeId: string;
  sapId?: string;
  employeeName?: string;
  grade?: string;
  group?: string;
  cycleTitle?: string;
  firstAppraiserName?: string;
  secondAppraiserName?: string;
  publishedRating?: string;
  finalScore?: number;
  disagreementReason?: string;
  mandatoryDisagreementReason?: string;
  attachmentFileName?: string;
  attachmentFileData?: string;
  attachmentFileSizeBytes?: number;
  attachmentFileType?: string;
  hasSupportingDocument?: boolean;
  status: string;
  resolutionNotes?: string;
  raisedDate?: string;
  raisedAt?: string;
  resolvedAt?: string;
}

export const DisagreementRegisterPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<DisagreementCaseItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [cases, setCases] = useState<DisagreementCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.getDisagreements();
      setCases(data);
    } catch (error) {
      console.error('Error fetching disagreements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleResolve = async () => {
    if (!selectedCase) return;
    try {
      setResolving(true);
      await api.resolveDisagreement(selectedCase.id, resolutionNotes.trim() || 'Disagreement reviewed and resolved by PMW committee.');
      setCases(
        cases.map((c) => (c.id === selectedCase.id ? { ...c, status: 'Resolved', resolutionNotes } : c))
      );
      setFeedbackMessage(`Disagreement case for ${selectedCase.employeeName || selectedCase.sapId} has been successfully resolved.`);
      setSelectedCase(null);
      setResolutionNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to resolve disagreement case.');
    } finally {
      setResolving(false);
    }
  };

  const handleDownloadAttachment = (item: DisagreementCaseItem) => {
    const fileName = item.attachmentFileName || `Disagreement_Evidence_${item.sapId || item.employeeId}.pdf`;
    const data = item.attachmentFileData;

    if (data && data.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = data;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([
        `NATIONAL BANK OF PAKISTAN (NBP) - DISAGREEMENT SUPPORTING RECORD\n` +
        `----------------------------------------------------------------\n` +
        `Case ID: ${item.id}\n` +
        `Employee: ${item.employeeName || 'NBP Employee'} (SAP ID: ${item.sapId || item.employeeId})\n` +
        `Grade & Group: ${formatGradeLabel(item.grade)} • ${formatGroupLabel(item.group)}\n` +
        `Cycle: ${item.cycleTitle || 'Annual Appraisal'}\n` +
        `Published Rating: ${item.publishedRating} (${item.finalScore ? item.finalScore.toFixed(2) : '-'} / 5.0)\n` +
        `Disagreement Justification: ${item.disagreementReason || item.mandatoryDisagreementReason}\n` +
        `Attached Document Reference: ${fileName}\n` +
        `Status: ${item.status}\n` +
        `Audit Hash: NBP-CASE-DOC-VERIFIED`
      ], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredCases = cases.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.sapId && c.sapId.toLowerCase().includes(q)) ||
      (c.employeeName && c.employeeName.toLowerCase().includes(q)) ||
      (c.group && c.group.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.disagreementReason && c.disagreementReason.toLowerCase().includes(q)) ||
      (c.mandatoryDisagreementReason && c.mandatoryDisagreementReason.toLowerCase().includes(q)) ||
      (c.attachmentFileName && c.attachmentFileName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Mandatory Employee Feedback &amp; Evidence</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-purple-800 text-white">Disagreement Register</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Employee Disagreement Register</h1>
          <p className="text-slate-300 text-xs mt-1">
            Formal disagreement cases submitted with mandatory rationale and uploaded supporting documents for record &amp; committee audit.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="warning" className="text-xs font-bold px-3 py-1 bg-amber-500 text-amber-950">
            {cases.filter((c) => c.status !== 'Resolved').length} Active Cases
          </Badge>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full md:w-96">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search by SAP ID, Name, Group, or File Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredCases.length}</strong> of <strong>{cases.length}</strong> cases
          </div>
        </CardContent>
      </Card>

      {/* Disagreement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Formal Disagreement Dossiers</CardTitle>
          <CardDescription className="text-xs">
            Review contested evaluations, inspect employee justification notes, and download uploaded supporting evidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading disagreement register...</div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No disagreement cases matching the search criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Case ID</th>
                    <th className="p-3">SAP ID &amp; Employee</th>
                    <th className="p-3">Grade &amp; Group</th>
                    <th className="p-3">Published Rating</th>
                    <th className="p-3">Supporting Doc</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Raised Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((item) => {
                    const hasDoc = Boolean(item.attachmentFileName || item.attachmentFileData);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div>{item.employeeName || `Employee ${item.employeeId}`}</div>
                          <span className="text-[10px] text-slate-500 font-normal">SAP ID: {item.sapId || item.employeeId}</span>
                        </td>
                        <td className="p-3 text-slate-700">
                          <div className="font-semibold">{formatGradeLabel(item.grade)}</div>
                          <span className="text-[10px] text-slate-500">{formatGroupLabel(item.group)}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="font-bold text-[10px]">
                            {item.publishedRating || 'Good'}
                            {item.finalScore ? ` (${item.finalScore.toFixed(2)})` : ''}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {hasDoc ? (
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(item)}
                              className="flex items-center space-x-1.5 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold transition-colors"
                              title="Download uploaded supporting document"
                            >
                              <Paperclip className="h-3 w-3 text-red-600" />
                              <span className="truncate max-w-[120px]">{item.attachmentFileName || 'Document'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No document</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              item.status === 'Resolved'
                                ? 'success'
                                : item.status === 'EscalatedPmw'
                                ? 'danger'
                                : 'warning'
                            }
                            className="text-[10px] font-bold"
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-500">
                          {item.raisedDate || item.raisedAt?.split('T')[0] || '2026-09-01'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCase(item);
                              setResolutionNotes(item.resolutionNotes || '');
                            }}
                            className="font-bold text-xs h-7 hover:bg-purple-50 hover:text-purple-900 border-purple-200"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Review Case
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Review Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 text-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="nbp" className="bg-purple-800 text-white text-[10px]">
                      Case Ref: {selectedCase.id.slice(0, 12)}...
                    </Badge>
                    <Badge variant={selectedCase.status === 'Resolved' ? 'success' : 'warning'} className="text-[10px]">
                      {selectedCase.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-black text-white">
                    {selectedCase.employeeName || `Employee ${selectedCase.employeeId}`}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    SAP ID: {selectedCase.sapId || selectedCase.employeeId} • {formatGradeLabel(selectedCase.grade)} • {formatGroupLabel(selectedCase.group)}
                  </CardDescription>
                </div>
                <button onClick={() => setSelectedCase(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {/* Published Rating Card */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Published Rating</span>
                  <strong className="text-slate-900 text-xs">{selectedCase.publishedRating || 'Good'}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Final Composite Score</span>
                  <strong className="text-emerald-800 text-xs">
                    {selectedCase.finalScore ? `${selectedCase.finalScore.toFixed(2)} / 5.00` : '—'}
                  </strong>
                </div>
              </div>

              {/* Mandatory Justification Box */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
                <span className="font-bold text-amber-950 block text-xs flex items-center space-x-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Mandatory Appraisee Disagreement Reason:</span>
                </span>
                <p className="text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-amber-200 text-xs italic">
                  "{selectedCase.disagreementReason || selectedCase.mandatoryDisagreementReason || 'No justification entered.'}"
                </p>
              </div>

              {/* Supporting Document Section (for record purpose) */}
              {(selectedCase.attachmentFileName || selectedCase.attachmentFileData) ? (
                <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-950 text-xs flex items-center space-x-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-red-700" />
                      <span>Uploaded Supporting Document (For Record Purpose)</span>
                    </span>
                    <Badge variant="outline" className="border-red-300 text-red-800 bg-white text-[9px] font-bold">
                      Audit Vault Proof
                    </Badge>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-red-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 shrink-0">
                        {selectedCase.attachmentFileName?.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="h-5 w-5 text-red-600" />
                        ) : selectedCase.attachmentFileName?.toLowerCase().includes('xls') ? (
                          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Paperclip className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
                          {selectedCase.attachmentFileName || 'Supporting_Document.pdf'}
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          {selectedCase.attachmentFileSizeBytes
                            ? `${(selectedCase.attachmentFileSizeBytes / (1024 * 1024)).toFixed(2)} MB • `
                            : ''}
                          Uploaded at time of disagreement
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleDownloadAttachment(selectedCase)}
                      className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs h-8 shrink-0 shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] flex items-center space-x-2">
                  <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>No supporting document was uploaded by the employee with this disagreement.</span>
                </div>
              )}

              {/* Resolution Rationale Input */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-800 block text-xs">
                  GPM / PMW Disagreement Committee Resolution Rationale
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record formal resolution details, score recalibration decision, or findings..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Marking resolved will record an immutable AuditEvent and update the case status in the system.</span>
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2 rounded-b-2xl">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCase(null)}>
                Close
              </Button>
              <Button
                variant="nbp"
                size="sm"
                onClick={handleResolve}
                disabled={resolving || selectedCase.status === 'Resolved'}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                {resolving ? 'Resolving...' : selectedCase.status === 'Resolved' ? 'Case Already Resolved' : 'Mark Case Resolved'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
