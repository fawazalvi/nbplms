import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Users, FileCheck2, RefreshCw, ChevronRight, UserCheck, CheckCircle2, XCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';

export const TeamReviewInboxPage: React.FC = () => {
  const [currentAppraiserSapId, setCurrentAppraiserSapId] = useState('10004');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appraisals' | 'confirmations'>('appraisals');
  const [message, setMessage] = useState<string | null>(null);

  // Confirm Mapping Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [editFirstSap, setEditFirstSap] = useState('');
  const [editSecondSap, setEditSecondSap] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Reject Mapping Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadReviews = async (sapId = currentAppraiserSapId) => {
    setLoading(true);
    try {
      const data = await api.getTeamReviews(sapId || '10004');
      setReviews(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(currentAppraiserSapId);
  }, [currentAppraiserSapId]);

  const pendingConfirmations = reviews.filter(r => r.appraiserValidationStatus === 'PendingConfirmation');

  const handleOpenConfirm = (review: any) => {
    setSelectedReview(review);
    setEditFirstSap(review.pendingFirstAppraiserSapId || review.firstAppraiserSapId || '10004');
    setEditSecondSap(review.pendingSecondAppraiserSapId || review.secondAppraiserSapId || '10003');
    setShowConfirmModal(true);
  };

  const handleConfirmMapping = async () => {
    if (!selectedReview) return;
    setConfirming(true);
    try {
      const res = await api.confirmAppraiserMapping(selectedReview.id, {
        firstAppraiserSapId: editFirstSap,
        secondAppraiserSapId: editSecondSap,
        actorSapId: '10004'
      });
      setMessage(res.message);
      setShowConfirmModal(false);
      await loadReviews();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenReject = (review: any) => {
    setSelectedReview(review);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectMapping = async () => {
    if (!selectedReview || !rejectionReason.trim()) return;
    setRejecting(true);
    try {
      const res = await api.rejectAppraiserMapping(selectedReview.id, {
        rejectionReason: rejectionReason.trim(),
        actorSapId: '10004'
      });
      setMessage(res.message);
      setShowRejectModal(false);
      await loadReviews();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Appraiser Evaluation Workspace</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">First & Second Appraiser</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Team Appraisal Reviews Inbox</h1>
          <p className="text-slate-300 text-xs mt-1">
            Review submitted employee self-assessments, confirm reporting lines, and evaluate objectives.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2 bg-white/10 p-1.5 rounded-xl border border-white/20 text-xs">
            <span className="text-slate-300 font-bold">Appraiser Context:</span>
            <select
              value={currentAppraiserSapId}
              onChange={(e) => setCurrentAppraiserSapId(e.target.value)}
              className="bg-slate-800 text-emerald-300 font-mono font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none border border-slate-700"
            >
              <option value="10004">10004 — Tariq Mahmood (VP)</option>
              <option value="10003">10003 — Rashid Khan (SVP)</option>
              <option value="10002">10002 — Khalid Farooq (SEVP)</option>
              <option value="84920">84920 — Fawaz Ahmed (AVP)</option>
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={() => loadReviews(currentAppraiserSapId)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Team List
          </Button>
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

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('appraisals')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'appraisals' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Team Appraisal Evaluation ({reviews.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('confirmations')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors relative ${
            activeTab === 'confirmations' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Appraiser & Supervisor Confirmations ({pendingConfirmations.length})</span>
          {pendingConfirmations.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'appraisals' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Direct Reports & Assigned Appraisals</CardTitle>
            <CardDescription className="text-xs">Database-driven appraisal forms awaiting your evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading team review records...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">SAP ID</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Grade</th>
                      <th className="p-3">Reporting Group</th>
                      <th className="p-3">Assigned Form Type</th>
                      <th className="p-3">Line Validation</th>
                      <th className="p-3">Current Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviews.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{r.sapId}</td>
                        <td className="p-3 font-bold text-slate-900">{r.employeeName}</td>
                        <td className="p-3"><Badge variant="secondary">{r.grade}</Badge></td>
                        <td className="p-3 text-slate-700">{r.group}</td>
                        <td className="p-3"><Badge variant="nbp" className="text-[10px]">{r.formType}</Badge></td>
                        <td className="p-3">
                          <Badge
                            variant={r.appraiserValidationStatus === 'Validated' ? 'success' : r.appraiserValidationStatus === 'PendingConfirmation' ? 'warning' : 'danger'}
                            className="text-[10px]"
                          >
                            {r.appraiserValidationStatus || 'Validated'}
                          </Badge>
                        </td>
                        <td className="p-3"><Badge variant="warning">{r.currentStatus}</Badge></td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm">
                            Evaluate Appraisal
                            <ChevronRight className="ml-1 h-3.5 w-3.5 text-emerald-700" />
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Appraiser & Supervisor Line Confirmations</CardTitle>
            <CardDescription className="text-xs">
              Confirm or update reporting line details requested by your direct report employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingConfirmations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                <p className="font-bold text-slate-800">All Reporting Lines Confirmed & Validated</p>
                <p>There are no pending appraiser or supervisor update requests awaiting your confirmation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingConfirmations.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">{r.sapId}</Badge>
                        <h4 className="font-bold text-slate-900 text-sm">{r.employeeName}</h4>
                        <Badge variant="secondary">{r.grade}</Badge>
                      </div>
                      <div className="mt-2 text-xs space-y-0.5 text-slate-600">
                        <p>Requested 1st Appraiser SAP ID: <strong className="text-slate-900 font-mono">{r.pendingFirstAppraiserSapId || r.firstAppraiserSapId}</strong></p>
                        <p>Requested 2nd Appraiser / Supervisor SAP ID: <strong className="text-slate-900 font-mono">{r.pendingSecondAppraiserSapId || r.secondAppraiserSapId}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenReject(r)} className="text-xs border-red-200 text-red-700 hover:bg-red-50">
                        <XCircle className="h-4 w-4 mr-1 text-red-600" />
                        Reject Mapping
                      </Button>
                      <Button variant="nbp" size="sm" onClick={() => handleOpenConfirm(r)} className="text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirm & Validate Line
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Mapping Modal */}
      {showConfirmModal && selectedReview && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Confirm & Validate Reporting Line</h3>
                  <p className="text-[11px] text-slate-300">Confirm or modify details for {selectedReview.employeeName}</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                You can confirm the reporting line requested by <strong>{selectedReview.employeeName}</strong> or update the Supervisor SAP ID if required before validating.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">First Appraiser SAP ID</label>
                  <Input value={editFirstSap} onChange={(e) => setEditFirstSap(e.target.value)} />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Second Appraiser / Supervisor SAP ID</label>
                  <Input value={editSecondSap} onChange={(e) => setEditSecondSap(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleConfirmMapping} disabled={confirming}>
                {confirming ? 'Validating...' : 'Confirm & Validate Reporting Line'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Mapping Modal */}
      {showRejectModal && selectedReview && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-red-700/40 p-2 flex items-center justify-center border border-red-500/30">
                  <XCircle className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Reject Reporting Line Request</h3>
                  <p className="text-[11px] text-slate-300">Mandatory Rejection Comment for {selectedReview.employeeName}</p>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <label className="font-bold text-slate-700 block">Rejection Reason (Mandatory)</label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter mandatory reason for rejecting reporting line request..."
                className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                The employee will receive this rejection message and must re-enter correct SAP IDs.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleRejectMapping} disabled={!rejectionReason.trim() || rejecting}>
                {rejecting ? 'Rejecting...' : 'Reject Mapping & Notify Employee'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
