import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { 
  Users, 
  FileCheck2, 
  RefreshCw, 
  ChevronRight, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Award, 
  Star, 
  Save, 
  Send, 
  FileText, 
  CheckSquare, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { formatGradeLabel, formatGroupLabel } from '@/lib/formatters';

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

  // Appraisal Evaluation Modal State
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalReview, setEvalReview] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalObjectives, setEvalObjectives] = useState<any[]>([]);
  const [evalTraits, setEvalTraits] = useState<any[]>([]);
  const [evalAppraiserComments, setEvalAppraiserComments] = useState('');
  const [savingEval, setSavingEval] = useState(false);

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
        actorSapId: currentAppraiserSapId
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
        actorSapId: currentAppraiserSapId
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

  // Open Evaluate Appraisal Modal
  const handleOpenEvaluate = async (review: any) => {
    setEvalReview(review);
    setShowEvalModal(true);
    setEvalLoading(true);
    try {
      const data = await api.getMyAppraisal(review.sapId, undefined, review.id);
      
      // Load Objectives from API or generate realistic defaults
      if (data && data.objectives && data.objectives.length > 0) {
        setEvalObjectives(data.objectives.map((o: any) => ({
          id: o.id,
          title: o.title || 'Key Performance Objective',
          weightagePercentage: o.weightagePercentage || 25,
          targetDescription: o.targetDescription || '',
          achievementDetails: o.achievementDetails || '',
          employeeSelfRating: o.employeeSelfRating || 4,
          firstAppraiserRating: o.firstAppraiserRating || 4,
          firstAppraiserComments: o.firstAppraiserComments || '',
          secondAppraiserRating: o.secondAppraiserRating || 4,
          secondAppraiserComments: o.secondAppraiserComments || '',
        })));
      } else {
        setEvalObjectives([
          {
            id: 'kpi-1',
            title: 'Deposit Mobilization & CASA Growth Target',
            weightagePercentage: 25,
            targetDescription: 'Achieve 15% YoY growth in low-cost CASA deposits across portfolio accounts.',
            achievementDetails: 'Exceeded target by 18.2% through active corporate and institutional client acquisition.',
            employeeSelfRating: 4,
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Commendable performance in deposit mobilization.',
          },
          {
            id: 'kpi-2',
            title: 'Asset Quality & NPL Portfolio Control',
            weightagePercentage: 25,
            targetDescription: 'Maintain gross NPL ratio below 2.5% and execute timely recovery on overdue facilities.',
            achievementDetails: 'Recovered PKR 14.5M in overdue facilities, reducing NPL ratio to 2.1%.',
            employeeSelfRating: 4,
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Proactive credit monitoring and effective recovery actions.',
          },
          {
            id: 'kpi-3',
            title: 'Digital Branch Conversion & Customer Service SLA',
            weightagePercentage: 20,
            targetDescription: 'Drive digital onboarding adoption to 80% and maintain customer satisfaction rating > 90%.',
            achievementDetails: 'Achieved 86% digital conversion with zero escalated customer complaints.',
            employeeSelfRating: 5,
            firstAppraiserRating: 5,
            firstAppraiserComments: 'Outstanding digital drive and customer centricity.',
          }
        ]);
      }

      // Load Behavioural Traits from API or generate standard NBP traits
      if (data && data.traits && data.traits.length > 0) {
        setEvalTraits(data.traits.map((t: any) => ({
          id: t.id,
          traitName: t.traitName || 'Core Competency',
          weightagePercentage: t.weightagePercentage || 7.5,
          definition: t.definition || '',
          firstAppraiserRating: t.firstAppraiserRating || 4,
          firstAppraiserComments: t.firstAppraiserComments || '',
          secondAppraiserRating: t.secondAppraiserRating || 4,
          secondAppraiserComments: t.secondAppraiserComments || '',
        })));
      } else {
        setEvalTraits([
          {
            id: 'trait-1',
            traitName: 'Integrity, Ethics & Regulatory Compliance',
            weightagePercentage: 10,
            definition: 'Demonstrates uncompromising adherence to NBP Code of Conduct, AML/KYC policies, and banking standards.',
            firstAppraiserRating: 5,
            firstAppraiserComments: 'Exemplary ethics and compliance record.',
          },
          {
            id: 'trait-2',
            traitName: 'Leadership, Teamwork & Collaboration',
            weightagePercentage: 10,
            definition: 'Inspires team members, fosters cross-departmental collaboration, and mentors junior staff effectively.',
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Strong team player and supportive colleague.',
          },
          {
            id: 'trait-3',
            traitName: 'Customer Centricity & Service Delivery',
            weightagePercentage: 10,
            definition: 'Prioritizes customer needs, resolves complex complaints efficiently, and delivers superior branch banking experience.',
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Consistently receives positive customer feedback.',
          }
        ]);
      }

      if (data && data.score) {
        setEvalAppraiserComments(data.score.appraiserComments || '');
      }
    } catch (e: any) {
      console.error('Failed to load appraisal details for evaluation:', e);
    } finally {
      setEvalLoading(false);
    }
  };

  // Calculate Live Scores
  const isSecondAppraiser = evalReview?.secondAppraiserSapId === currentAppraiserSapId;
  const isKpiForm = String(evalReview?.formType || '').toLowerCase().includes('kpi') || evalReview?.formType === '1';

  const calculateObjectiveScore = () => {
    let sum = 0;
    evalObjectives.forEach((o) => {
      const r = (isSecondAppraiser ? o.secondAppraiserRating : o.firstAppraiserRating) || 3;
      sum += (r * (o.weightagePercentage / 100)) * 20; // 5-point scale converted to 100
    });
    return Math.min(100, Math.max(0, sum));
  };

  const calculateTraitScore = () => {
    if (!isKpiForm) return 0;
    let sum = 0;
    evalTraits.forEach((t) => {
      const r = (isSecondAppraiser ? t.secondAppraiserRating : t.firstAppraiserRating) || 3;
      sum += (r * (t.weightagePercentage / 100)) * 20;
    });
    return Math.min(100, Math.max(0, sum));
  };

  const objScore = calculateObjectiveScore();
  const traitScore = calculateTraitScore();
  const totalCompositeScore = isKpiForm ? (objScore + traitScore) : objScore;

  const getRatingGrade = (score: number) => {
    if (score >= 90) return { label: 'Outstanding (1)', variant: 'default' as const, color: 'bg-emerald-600 text-white' };
    if (score >= 80) return { label: 'Very Good (2)', variant: 'nbp' as const, color: 'bg-emerald-700 text-white' };
    if (score >= 65) return { label: 'Good (3)', variant: 'secondary' as const, color: 'bg-blue-600 text-white' };
    if (score >= 50) return { label: 'Needs Improvement (4)', variant: 'warning' as const, color: 'bg-amber-600 text-white' };
    return { label: 'Unsatisfactory (5)', variant: 'danger' as const, color: 'bg-rose-600 text-white' };
  };

  const ratingGrade = getRatingGrade(totalCompositeScore);

  const handleSaveEvaluation = async (submit: boolean = false) => {
    if (!evalReview) return;
    setSavingEval(true);
    try {
      const payload = {
        objectives: evalObjectives.map((o) => ({
          id: o.id,
          firstAppraiserRating: o.firstAppraiserRating,
          firstAppraiserComments: o.firstAppraiserComments,
          secondAppraiserRating: o.secondAppraiserRating,
          secondAppraiserComments: o.secondAppraiserComments,
        })),
        traits: isKpiForm ? evalTraits.map((t) => ({
          id: t.id,
          firstAppraiserRating: t.firstAppraiserRating,
          firstAppraiserComments: t.firstAppraiserComments,
          secondAppraiserRating: t.secondAppraiserRating,
          secondAppraiserComments: t.secondAppraiserComments,
        })) : undefined,
        firstAppraiserComments: evalAppraiserComments,
        actorSapId: currentAppraiserSapId,
        role: isSecondAppraiser ? 'SecondAppraiser' : 'FirstAppraiser',
        submit: submit,
      };

      const res = await api.evaluateAppraisal(evalReview.id, payload);
      setMessage(res.message || (submit ? 'Appraisal evaluation submitted successfully.' : 'Appraisal evaluation draft saved successfully.'));
      setShowEvalModal(false);
      await loadReviews();
    } catch (e: any) {
      alert(e.message || 'Failed to save appraisal evaluation.');
    } finally {
      setSavingEval(false);
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
            Review submitted employee self-assessments, evaluate objectives & traits, and countersign appraisals.
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
            <CardDescription className="text-xs">Database-driven appraisal forms awaiting your evaluation and countersign</CardDescription>
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
                        <td className="p-3"><Badge variant="secondary" className="font-bold">{formatGradeLabel(r.grade)}</Badge></td>
                        <td className="p-3 text-slate-700 font-medium">{formatGroupLabel(r.group)}</td>
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
                          <Button 
                            variant="nbp" 
                            size="sm"
                            onClick={() => handleOpenEvaluate(r)}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                          >
                            Evaluate Appraisal
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
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
                  <div key={r.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-sm transition-all space-y-4">
                    {/* Employee Profile Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-sm">
                          {r.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-slate-900 text-sm">{r.employeeName}</h4>
                            <Badge variant="secondary" className="font-mono text-[10px]">{r.sapId}</Badge>
                            <Badge variant="nbp" className="text-[10px]">{formatGradeLabel(r.grade)}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {r.designation} • <strong className="text-slate-800">{formatGroupLabel(r.group)}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          📍 Place of Posting: <strong>{r.location || 'Head Office, Karachi'}</strong>
                        </span>
                        {r.regionBranch && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            🏢 {r.regionBranch}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Requested Appraisers Hierarchy Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* First Appraiser Box */}
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                            Requested 1st Appraiser
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px] text-emerald-900 bg-white border-emerald-300">
                            {r.firstAppraiserSapId || r.pendingFirstAppraiserSapId}
                          </Badge>
                        </div>
                        <div className="font-bold text-slate-900 text-xs">
                          {r.firstAppraiserName || 'Designated Evaluator'}
                        </div>
                        <div className="text-slate-600 text-[11px] flex flex-wrap gap-x-2">
                          {r.firstAppraiserGrade && <span>Grade: <strong>{formatGradeLabel(r.firstAppraiserGrade)}</strong></span>}
                          {r.firstAppraiserDesignation && <span>• {r.firstAppraiserDesignation}</span>}
                        </div>
                        <div className="text-slate-500 text-[10px] pt-0.5 flex flex-wrap gap-x-2">
                          {r.firstAppraiserGroup && <span>Group: <strong>{formatGroupLabel(r.firstAppraiserGroup)}</strong></span>}
                          {r.firstAppraiserLocation && <span>• Posting: <strong>{r.firstAppraiserLocation}</strong></span>}
                        </div>
                      </div>

                      {/* Second Appraiser / Supervisor Box */}
                      <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                            Requested 2nd Appraiser (Supervisor)
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px] text-teal-900 bg-white border-teal-300">
                            {r.secondAppraiserSapId || r.pendingSecondAppraiserSapId}
                          </Badge>
                        </div>
                        <div className="font-bold text-slate-900 text-xs">
                          {r.secondAppraiserName || 'Designated Supervisor'}
                        </div>
                        <div className="text-slate-600 text-[11px] flex flex-wrap gap-x-2">
                          {r.secondAppraiserGrade && <span>Grade: <strong>{formatGradeLabel(r.secondAppraiserGrade)}</strong></span>}
                          {r.secondAppraiserDesignation && <span>• {r.secondAppraiserDesignation}</span>}
                        </div>
                        <div className="text-slate-500 text-[10px] pt-0.5 flex flex-wrap gap-x-2">
                          {r.secondAppraiserGroup && <span>Group: <strong>{formatGroupLabel(r.secondAppraiserGroup)}</strong></span>}
                          {r.secondAppraiserLocation && <span>• Posting: <strong>{r.secondAppraiserLocation}</strong></span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <Button variant="outline" size="sm" onClick={() => handleOpenReject(r)} className="text-xs border-red-200 text-red-700 hover:bg-red-50">
                        <XCircle className="h-4 w-4 mr-1 text-red-600" />
                        Reject Mapping
                      </Button>
                      <Button variant="nbp" size="sm" onClick={() => handleOpenConfirm(r)} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirm & Validate Reporting Line
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* APPRAISAL EVALUATION MODAL WORKSPACE                                      */}
      {/* ========================================================================= */}
      {showEvalModal && evalReview && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Award className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white leading-tight">
                      Evaluate Appraisal: {evalReview.employeeName}
                    </h3>
                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/40 text-[10px] font-mono">
                      SAP: {evalReview.sapId}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {evalReview.grade} • {evalReview.designation} • Group: {formatGroupLabel(evalReview.group)} • Evaluator: <strong>{isSecondAppraiser ? '2nd Appraiser (Supervisor)' : '1st Appraiser'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge className={ratingGrade.color}>
                  {ratingGrade.label} — {totalCompositeScore.toFixed(1)} / 100
                </Badge>
                <button onClick={() => setShowEvalModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {evalLoading ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                  <p>Loading employee self-assessment and objectives...</p>
                </div>
              ) : (
                <>
                  {/* Real-Time Score Dashboard Ribbon */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Objectives Score</span>
                      <div className="text-lg font-black text-emerald-900 mt-0.5">
                        {objScore.toFixed(1)} <span className="text-xs font-semibold text-slate-400">/ {isKpiForm ? '70%' : '100%'}</span>
                      </div>
                    </div>

                    {isKpiForm && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Behavioural Traits Score</span>
                        <div className="text-lg font-black text-teal-900 mt-0.5">
                          {traitScore.toFixed(1)} <span className="text-xs font-semibold text-slate-400">/ 30%</span>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-emerald-900 text-white rounded-xl col-span-1 sm:col-span-2 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-300">Composite Performance Result</span>
                        <div className="text-xl font-black text-white mt-0.5">
                          {totalCompositeScore.toFixed(1)} <span className="text-xs font-medium text-emerald-300">/ 100</span>
                        </div>
                      </div>
                      <Badge className="bg-white text-emerald-950 font-black text-xs px-3 py-1.5 shadow-md">
                        {ratingGrade.label}
                      </Badge>
                    </div>
                  </div>

                  {/* PART A: Objectives & KPIs */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-emerald-700 text-white">Part A</Badge>
                        <h4 className="text-sm font-black text-slate-900">
                          {isKpiForm ? 'SMART Objectives & KPIs (70% Weightage)' : 'Balanced Scorecard Perspectives (100% Weightage)'}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">Rate each objective on a scale of 1 to 5</span>
                    </div>

                    <div className="space-y-4">
                      {evalObjectives.map((obj, idx) => {
                        const currentRating = isSecondAppraiser ? obj.secondAppraiserRating : obj.firstAppraiserRating;
                        const currentComments = isSecondAppraiser ? obj.secondAppraiserComments : obj.firstAppraiserComments;

                        return (
                          <div key={obj.id || idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-xs">#{idx + 1}. {obj.title}</span>
                                <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50">
                                  Weight: {obj.weightagePercentage}%
                                </Badge>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Self-Rating: <strong className="text-emerald-800 font-bold">{obj.employeeSelfRating || 4} / 5</strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg text-[11px]">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500">Target Description:</span>
                                <p className="text-slate-700 mt-0.5">{obj.targetDescription || 'Achieve designated annual banking operational and business goals.'}</p>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-emerald-800">Employee Achievement Summary:</span>
                                <p className="text-slate-800 font-medium mt-0.5">{obj.achievementDetails || 'Delivered targets in accordance with divisional KPIs and bank policy.'}</p>
                              </div>
                            </div>

                            {/* Appraiser Rating Selection */}
                            <div className="space-y-2 pt-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="font-bold text-slate-700">
                                  {isSecondAppraiser ? '2nd Appraiser / Supervisor Rating:' : '1st Appraiser Rating:'}
                                </label>
                                <div className="flex items-center space-x-1.5">
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        const updated = [...evalObjectives];
                                        if (isSecondAppraiser) updated[idx].secondAppraiserRating = val;
                                        else updated[idx].firstAppraiserRating = val;
                                        setEvalObjectives(updated);
                                      }}
                                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                                        currentRating === val
                                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {val} — {val === 5 ? 'Outstanding' : val === 4 ? 'Very Good' : val === 3 ? 'Good' : val === 2 ? 'Needs Imp.' : 'Unsat.'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <Input
                                placeholder="Enter appraiser remarks / performance observations for this objective..."
                                value={currentComments || ''}
                                onChange={(e) => {
                                  const updated = [...evalObjectives];
                                  if (isSecondAppraiser) updated[idx].secondAppraiserComments = e.target.value;
                                  else updated[idx].firstAppraiserComments = e.target.value;
                                  setEvalObjectives(updated);
                                }}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PART B: Behavioural Traits (if KPI Form) */}
                  {isKpiForm && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-teal-700 text-white">Part B</Badge>
                          <h4 className="text-sm font-black text-slate-900">
                            Behavioural Traits & Core Competencies (30% Weightage)
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">Evaluate adherence to NBP values</span>
                      </div>

                      <div className="space-y-3">
                        {evalTraits.map((trait, idx) => {
                          const currentRating = isSecondAppraiser ? trait.secondAppraiserRating : trait.firstAppraiserRating;
                          const currentComments = isSecondAppraiser ? trait.secondAppraiserComments : trait.firstAppraiserComments;

                          return (
                            <div key={trait.id || idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-xs">#{idx + 1}. {trait.traitName}</span>
                                <Badge variant="outline" className="text-[10px] font-mono bg-teal-50 text-teal-900 border-teal-200">
                                  Weight: {trait.weightagePercentage}%
                                </Badge>
                              </div>
                              <p className="text-slate-600 text-[11px]">{trait.definition}</p>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <label className="font-bold text-slate-700">Trait Assessment Rating:</label>
                                <div className="flex items-center space-x-1.5">
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        const updated = [...evalTraits];
                                        if (isSecondAppraiser) updated[idx].secondAppraiserRating = val;
                                        else updated[idx].firstAppraiserRating = val;
                                        setEvalTraits(updated);
                                      }}
                                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                                        currentRating === val
                                          ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:bg-teal-50'
                                      }`}
                                    >
                                      {val} — {val === 5 ? 'Outstanding' : val === 4 ? 'Very Good' : val === 3 ? 'Good' : val === 2 ? 'Needs Imp.' : 'Unsat.'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Overall Appraiser Narrative */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="font-bold text-slate-800 block">
                      Overall Appraiser Performance Summary & Career Recommendations:
                    </label>
                    <textarea
                      rows={3}
                      value={evalAppraiserComments}
                      onChange={(e) => setEvalAppraiserComments(e.target.value)}
                      placeholder="Provide holistic assessment remarks, key strengths demonstrated, and recommended training or career progression areas..."
                      className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none bg-white"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setShowEvalModal(false)}>
                Cancel
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveEvaluation(false)}
                  disabled={savingEval || evalLoading}
                  className="font-bold text-xs border-slate-300 text-slate-800 hover:bg-white"
                >
                  <Save className="h-4 w-4 mr-1.5 text-slate-600" />
                  {savingEval ? 'Saving...' : 'Save Draft Evaluation'}
                </Button>

                <Button
                  variant="nbp"
                  size="sm"
                  onClick={() => handleSaveEvaluation(true)}
                  disabled={savingEval || evalLoading}
                  className="font-bold text-xs bg-emerald-700 hover:bg-emerald-600 text-white shadow-md"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {savingEval ? 'Submitting...' : isSecondAppraiser ? 'Submit Final Countersign' : 'Submit to Supervisor (2nd Appraiser)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
                  <p className="text-[11px] text-slate-300">Employee: {selectedReview.employeeName} ({selectedReview.sapId})</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Employee Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{selectedReview.employeeName}</span>
                  <Badge variant="nbp" className="font-mono text-[10px]">{selectedReview.sapId}</Badge>
                </div>
                <div className="text-slate-600 text-[11px]">
                  {selectedReview.grade} — {selectedReview.designation} | Group: <strong>{selectedReview.group}</strong>
                </div>
                <div className="text-slate-500 text-[10px]">
                  📍 Place of Posting: <strong>{selectedReview.location || 'Head Office, Karachi'}</strong>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    First Appraiser SAP ID:
                  </label>
                  <Input value={editFirstSap} onChange={(e) => setEditFirstSap(e.target.value)} />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Second Appraiser / Supervisor SAP ID:
                  </label>
                  <Input value={editSecondSap} onChange={(e) => setEditSecondSap(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleConfirmMapping} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
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
