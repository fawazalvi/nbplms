import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatAppraisalStatus } from '@/lib/formatters';
import {
  GitBranch, ChevronRight, AlertCircle, Search, RefreshCw, Send,
  ArrowRight, Clock, CheckCircle2, XCircle, Shield, Users, Filter, X,
  Mail, Bell, ToggleLeft, ToggleRight, History, AlertTriangle
} from 'lucide-react';
import { SetWorkflowStageModal } from '@/components/admin/SetWorkflowStageModal';

// ─── Workflow Status Pipeline Definition ───
const PIPELINE_STAGES = [
  { status: 'ObjectiveDraft', code: 1, label: 'Objective Draft', short: 'Draft', color: 'bg-slate-500', phase: 'objectives' },
  { status: 'ObjectiveSubmitted', code: 2, label: 'Objectives Submitted', short: 'Submitted', color: 'bg-blue-500', phase: 'objectives' },
  { status: 'ObjectiveReturned', code: 3, label: 'Objectives Returned', short: 'Returned', color: 'bg-rose-500', phase: 'objectives' },
  { status: 'ObjectiveApproved', code: 4, label: 'Objectives Approved', short: 'Approved', color: 'bg-emerald-500', phase: 'objectives' },
  { status: 'AnnualReviewSelfAssessment', code: 5, label: 'Self-Assessment', short: 'Self-Assess', color: 'bg-violet-500', phase: 'review' },
  { status: 'FirstAppraiserAssessment', code: 6, label: '1st Appraiser Assessment', short: '1st Appraiser', color: 'bg-emerald-600', phase: 'review' },
  { status: 'CoAppraiserReview', code: 8, label: 'Co-Appraiser Review', short: 'Co-Appraiser', color: 'bg-teal-500', phase: 'review' },
  { status: 'SecondAppraiserReview', code: 7, label: '2nd Appraiser Review', short: '2nd Appraiser', color: 'bg-amber-600', phase: 'review' },
  { status: 'GroupPerformanceManagerReview', code: 9, label: 'GPM Review', short: 'GPM', color: 'bg-indigo-600', phase: 'review' },
  { status: 'PmwFinalization', code: 10, label: 'PMW Finalization', short: 'PMW Final', color: 'bg-purple-600', phase: 'finalization' },
  { status: 'Published', code: 11, label: 'Published', short: 'Published', color: 'bg-green-600', phase: 'finalization' },
  { status: 'EmployeeAgreed', code: 12, label: 'Employee Agreed', short: 'Agreed', color: 'bg-green-700', phase: 'acknowledgement' },
  { status: 'EmployeeDisagreed', code: 13, label: 'Employee Disagreed', short: 'Disagreed', color: 'bg-rose-600', phase: 'acknowledgement' },
  { status: 'DisagreementGpmReview', code: 14, label: 'Disagreement GPM Review', short: 'Dis. GPM', color: 'bg-orange-600', phase: 'disagreement' },
  { status: 'DisagreementPmwReview', code: 15, label: 'Disagreement PMW Review', short: 'Dis. PMW', color: 'bg-red-600', phase: 'disagreement' },
  { status: 'DisagreementResolved', code: 16, label: 'Disagreement Resolved', short: 'Resolved', color: 'bg-green-800', phase: 'disagreement' },
  { status: 'AdministrativelyCompleted', code: 17, label: 'Admin Completed', short: 'Admin Comp.', color: 'bg-gray-600', phase: 'acknowledgement' },
];

// ─── Transition Matrix Data ───
const TRANSITION_MATRIX = [
  { from: 'ObjectiveDraft', action: 'Submit Objectives', to: 'ObjectiveSubmitted', roles: 'Employee', conditions: 'Weightage = 100%', comments: 'No', reversible: 'Yes (Withdraw)', override: 'PMW Force', phase: 'objectives', notifyRoles: ['Employee', 'FirstAppraiser'] },
  { from: 'ObjectiveSubmitted', action: 'Return Objectives', to: 'ObjectiveReturned', roles: 'First Appraiser', conditions: 'None', comments: 'Yes', reversible: 'No', override: 'PMW Force', phase: 'objectives', notifyRoles: ['Employee', 'FirstAppraiser'] },
  { from: 'ObjectiveReturned', action: 'Re-Submit Objectives', to: 'ObjectiveSubmitted', roles: 'Employee', conditions: 'Weightage = 100%', comments: 'No', reversible: 'Yes (Withdraw)', override: 'PMW Force', phase: 'objectives', notifyRoles: ['Employee', 'FirstAppraiser'] },
  { from: 'ObjectiveSubmitted', action: 'Approve Objectives', to: 'ObjectiveApproved', roles: 'First Appraiser', conditions: 'None', comments: 'No', reversible: 'Yes (Revoke)', override: 'PMW Force', phase: 'objectives', notifyRoles: ['Employee', 'FirstAppraiser'] },
  { from: 'ObjectiveApproved', action: 'Initiate Annual Review', to: 'AnnualReviewSelfAssessment', roles: 'System / PMW', conditions: 'Date condition', comments: 'No', reversible: 'No', override: 'PMW Force', phase: 'review', notifyRoles: ['Employee'] },
  { from: 'AnnualReviewSelfAssessment', action: 'Submit Self-Assessment', to: 'FirstAppraiserAssessment', roles: 'Employee', conditions: 'Ratings provided', comments: 'No', reversible: 'Yes (Withdraw)', override: 'PMW Force', phase: 'review', notifyRoles: ['Employee', 'FirstAppraiser', 'CoAppraiser'] },
  { from: 'FirstAppraiserAssessment', action: 'Route to Co-Appraiser', to: 'CoAppraiserReview', roles: 'First Appraiser', conditions: 'Co-Appraiser assigned', comments: 'No', reversible: 'No', override: 'PMW Force', phase: 'review', notifyRoles: ['Employee', 'FirstAppraiser', 'CoAppraiser'] },
  { from: 'CoAppraiserReview', action: 'Submit CA Feedback', to: 'FirstAppraiserAssessment', roles: 'Co-Appraiser', conditions: 'Feedback provided', comments: 'No', reversible: 'No', override: 'PMW Bypass', phase: 'review', notifyRoles: ['FirstAppraiser', 'CoAppraiser'] },
  { from: 'FirstAppraiserAssessment', action: 'Submit FA Assessment', to: 'SecondAppraiserReview', roles: 'First Appraiser', conditions: 'All ratings complete', comments: 'No', reversible: 'Yes (Return)', override: 'PMW Force', phase: 'review', notifyRoles: ['Employee', 'FirstAppraiser', 'SecondAppraiser'] },
  { from: 'SecondAppraiserReview', action: 'Return to FA', to: 'FirstAppraiserAssessment', roles: 'Second Appraiser', conditions: 'None', comments: 'Yes', reversible: 'No', override: 'PMW Force', phase: 'review', notifyRoles: ['Employee', 'FirstAppraiser', 'SecondAppraiser'] },
  { from: 'SecondAppraiserReview', action: 'Countersign', to: 'GroupPerformanceManagerReview', roles: 'Second Appraiser', conditions: 'None', comments: 'No', reversible: 'Yes (Return)', override: 'PMW Force', phase: 'review', notifyRoles: ['Employee', 'SecondAppraiser', 'GroupPerformanceManager'] },
  { from: 'GroupPerformanceManagerReview', action: 'Approve', to: 'PmwFinalization', roles: 'GPM', conditions: 'Bell curve met', comments: 'No', reversible: 'Yes (Return)', override: 'PMW Force', phase: 'finalization', notifyRoles: ['Employee', 'GroupPerformanceManager', 'PmwAdmin'] },
  { from: 'GroupPerformanceManagerReview', action: 'Return to SA', to: 'SecondAppraiserReview', roles: 'GPM', conditions: 'None', comments: 'Yes', reversible: 'No', override: 'PMW Force', phase: 'finalization', notifyRoles: ['Employee', 'SecondAppraiser'] },
  { from: 'PmwFinalization', action: 'Publish Results', to: 'Published', roles: 'PMW Admin', conditions: 'Cycle closed', comments: 'No', reversible: 'No', override: 'N/A', phase: 'finalization', notifyRoles: ['Employee', 'FirstAppraiser', 'SecondAppraiser'] },
  { from: 'Published', action: 'Agree', to: 'EmployeeAgreed', roles: 'Employee', conditions: 'None', comments: 'No', reversible: 'No', override: 'N/A', phase: 'acknowledgement', notifyRoles: ['Employee', 'FirstAppraiser', 'SecondAppraiser', 'GroupPerformanceManager'] },
  { from: 'Published', action: 'Disagree', to: 'EmployeeDisagreed', roles: 'Employee', conditions: 'None', comments: 'Yes (Mandatory)', reversible: 'No', override: 'N/A', phase: 'acknowledgement', notifyRoles: ['Employee', 'GroupPerformanceManager', 'PmwAdmin'] },
  { from: 'Published', action: 'Admin Complete', to: 'AdministrativelyCompleted', roles: 'GPM / PMW', conditions: 'Deadline passed', comments: 'Yes', reversible: 'No', override: 'N/A', phase: 'acknowledgement', notifyRoles: ['Employee'] },
  { from: 'EmployeeDisagreed', action: 'GPM Review', to: 'DisagreementGpmReview', roles: 'System', conditions: 'None', comments: 'No', reversible: 'No', override: 'N/A', phase: 'disagreement', notifyRoles: ['Employee', 'GroupPerformanceManager'] },
  { from: 'DisagreementGpmReview', action: 'Escalate', to: 'DisagreementPmwReview', roles: 'GPM', conditions: 'None', comments: 'Yes', reversible: 'No', override: 'PMW Force', phase: 'disagreement', notifyRoles: ['PmwAdmin'] },
  { from: 'DisagreementGpmReview', action: 'Resolve', to: 'DisagreementResolved', roles: 'GPM', conditions: 'Agreement reached', comments: 'Yes', reversible: 'No', override: 'PMW Force', phase: 'disagreement', notifyRoles: ['Employee', 'PmwAdmin'] },
  { from: 'DisagreementPmwReview', action: 'Resolve', to: 'DisagreementResolved', roles: 'PMW', conditions: 'Agreement reached', comments: 'Yes', reversible: 'No', override: 'N/A', phase: 'disagreement', notifyRoles: ['Employee', 'GroupPerformanceManager'] },
];

const PHASE_COLORS: Record<string, string> = {
  objectives: 'border-l-blue-500 bg-blue-50/30',
  review: 'border-l-emerald-500 bg-emerald-50/30',
  finalization: 'border-l-purple-500 bg-purple-50/30',
  acknowledgement: 'border-l-amber-500 bg-amber-50/30',
  disagreement: 'border-l-rose-500 bg-rose-50/30',
};

const ALL_STATUSES = PIPELINE_STAGES.map(s => s.status);

export const WorkflowManagementPage: React.FC<{ userRole?: string }> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'matrix' | 'tracker' | 'audit' | 'notifications'>('pipeline');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Notification Configuration State
  // Key = "from->to", Value = { enabled: boolean, roles: string[] }
  const [notificationConfig, setNotificationConfig] = useState<Record<string, { enabled: boolean; roles: string[] }>>(() => {
    const initial: Record<string, { enabled: boolean; roles: string[] }> = {};
    TRANSITION_MATRIX.forEach(t => {
      const key = `${t.from}->${t.to}`;
      initial[key] = { enabled: true, roles: [...t.notifyRoles] };
    });
    return initial;
  });

  // Force Transition Modal
  const [showForceModal, setShowForceModal] = useState(false);
  const [forceTarget, setForceTarget] = useState<any>(null);
  const [forceStatus, setForceStatus] = useState('');
  const [forceJustification, setForceJustification] = useState('');
  const [forcing, setForcing] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [testingNotification, setTestingNotification] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkflowDashboard(selectedCycleId || undefined);
      setDashboardData(data);
    } catch (e: any) {
      console.error('Failed to load workflow dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    try {
      const events = await api.getWorkflowAudit(statusFilter || undefined);
      setAuditEvents(events);
    } catch (e: any) {
      console.error('Failed to load workflow audit:', e);
    }
  };

  const loadNotifications = async () => {
    try {
      const configs = await api.getWorkflowNotifications();
      if (configs && configs.length > 0) {
        setNotificationConfig(prev => {
          const next = { ...prev };
          configs.forEach((c: any) => {
            if (next[c.transitionKey]) {
              next[c.transitionKey].enabled = c.isEnabled;
              next[c.transitionKey].roles = c.notifyRoles ? c.notifyRoles.split(',') : [];
            }
          });
          return next;
        });
      }
    } catch (e: any) {
      console.error('Failed to load workflow notifications:', e);
    }
  };

  const loadNotificationLogs = async () => {
    try {
      const logs = await api.getWorkflowNotificationLogs(50);
      setNotificationLogs(logs || []);
    } catch (e: any) {
      console.error('Failed to load workflow notification logs:', e);
    }
  };

  const handleTestNotification = async (transitionKey: string) => {
    const defaultEmail = dashboardData?.employeeCycles?.[0]?.employeeEmail || "admin@nbp.com.pk";
    const recipient = prompt(`Enter test recipient email address for '${transitionKey}':`, defaultEmail);
    if (!recipient || !recipient.trim()) return;

    setTestingNotification(transitionKey);
    try {
      const res = await api.testWorkflowNotification({
        transitionKey,
        recipientEmail: recipient.trim(),
        recipientName: "System Administrator"
      });
      alert(res.message || "Test email dispatched successfully!");
      await loadNotificationLogs();
    } catch (e: any) {
      alert(`Test notification failed: ${e.message || String(e)}`);
    } finally {
      setTestingNotification(null);
    }
  };

  useEffect(() => { loadDashboard(); loadNotifications(); }, [selectedCycleId]);
  useEffect(() => { 
    if (activeTab === 'audit') loadAudit(); 
    if (activeTab === 'notifications') loadNotificationLogs();
  }, [activeTab, statusFilter]);

  const getCountForStatus = (status: string) => {
    if (!dashboardData?.statusCounts) return 0;
    const found = dashboardData.statusCounts.find((s: any) => s.status === status);
    return found?.count || 0;
  };

  const getEmployeesAtStatus = (status: string) => {
    if (!dashboardData?.employeeCycles) return [];
    return dashboardData.employeeCycles.filter((ec: any) => ec.currentStatus === status);
  };

  const filteredEmployees = (dashboardData?.employeeCycles || []).filter((ec: any) => {
    const matchesSearch = !searchTerm || 
      ec.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ec.sapId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || ec.currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredMatrix = TRANSITION_MATRIX.filter(t => {
    if (!matrixSearch) return true;
    const q = matrixSearch.toLowerCase();
    return t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q) || 
           t.action.toLowerCase().includes(q) || t.roles.toLowerCase().includes(q);
  });

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const payload = Object.entries(notificationConfig).map(([key, config]) => ({
        transitionKey: key,
        isEnabled: config.enabled,
        notifyRoles: config.roles.join(',')
      }));
      const res = await api.saveWorkflowNotifications(payload);
      setMessage(res.message || 'Notification configuration saved.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceTransition = async () => {
    if (!forceTarget || !forceStatus || !forceJustification.trim()) return;
    setForcing(true);
    try {
      const res = await api.forceTransition(forceTarget.id, {
        targetStatus: forceStatus,
        justification: forceJustification.trim(),
        actorSapId: 'admin'
      });
      setMessage(res.message);
      setShowForceModal(false);
      setForceTarget(null);
      setForceStatus('');
      setForceJustification('');
      await loadDashboard();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setForcing(false);
    }
  };

  const tabs = [
    { id: 'pipeline' as const, label: 'Workflow Pipeline', icon: GitBranch },
    { id: 'matrix' as const, label: 'Transition Matrix', icon: ArrowRight },
    { id: 'tracker' as const, label: 'Employee Tracker', icon: Users },
    { id: 'audit' as const, label: 'Audit Trail', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-md">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <span>Workflow Engine Console</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 ml-13">Monitor, inspect, and manage all appraisal workflow transitions across the organization.</p>
        </div>
        <div className="flex items-center space-x-2">
          {dashboardData?.cycles && dashboardData.cycles.length > 0 && (
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Cycles</option>
              {dashboardData.cycles.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={loadDashboard} className="text-xs font-bold">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={async () => {
            if (confirm("DEVELOPMENT ONLY: Are you sure you want to wipe appraisal data and reset the system to baseline state?")) {
              setLoading(true);
              try {
                try {
                  const res = await api.resetAppraisals(true);
                  alert(res.message || "Appraisal system wiped and reset successfully.");
                } catch (err: any) {
                  // Fallback to full clean & reseed if custom endpoint isn't loaded
                  const seedRes = await api.seedDb('PmwSuperAdmin');
                  alert(seedRes.message || "Database successfully cleaned and re-seeded with fresh baseline appraisal data.");
                }
                await loadDashboard();
              } catch(e: any) { 
                alert(e.message || "Failed to reset system."); 
              } finally {
                setLoading(false);
              }
            }
          }} className="text-xs font-bold bg-red-600 hover:bg-red-700">
            <Shield className="h-3.5 w-3.5 mr-1.5" /> Wipe & Reset System
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2"><CheckCircle2 className="h-4 w-4" /><span>{message}</span></div>
          <button onClick={() => setMessage('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.id === 'pipeline' && dashboardData && (
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold ml-1">{dashboardData.totalCount}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB 1: WORKFLOW PIPELINE ═══════════════ */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-[10px] font-bold text-blue-500 uppercase">Objectives Phase</span>
              <div className="text-lg font-black text-blue-900 mt-0.5">
                {['ObjectiveDraft','ObjectiveSubmitted','ObjectiveReturned','ObjectiveApproved'].reduce((s, st) => s + getCountForStatus(st), 0)}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Annual Review Phase</span>
              <div className="text-lg font-black text-emerald-900 mt-0.5">
                {['AnnualReviewSelfAssessment','FirstAppraiserAssessment','SecondAppraiserReview','CoAppraiserReview','GroupPerformanceManagerReview'].reduce((s, st) => s + getCountForStatus(st), 0)}
              </div>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
              <span className="text-[10px] font-bold text-purple-500 uppercase">Finalization Phase</span>
              <div className="text-lg font-black text-purple-900 mt-0.5">
                {['PmwFinalization','Published'].reduce((s, st) => s + getCountForStatus(st), 0)}
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-[10px] font-bold text-amber-500 uppercase">Acknowledged / Closed</span>
              <div className="text-lg font-black text-amber-900 mt-0.5">
                {['EmployeeAgreed','EmployeeDisagreed','AdministrativelyCompleted','DisagreementResolved'].reduce((s, st) => s + getCountForStatus(st), 0)}
              </div>
            </div>
          </div>

          {/* Pipeline Stage Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Appraisal Workflow Pipeline</CardTitle>
              <CardDescription className="text-xs">Click any stage to see employees currently at that step</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {PIPELINE_STAGES.map((stage, idx) => {
                const count = getCountForStatus(stage.status);
                const isExpanded = expandedStage === stage.status;
                const employees = isExpanded ? getEmployeesAtStatus(stage.status) : [];
                const maxCount = Math.max(...PIPELINE_STAGES.map(s => getCountForStatus(s.status)), 1);
                const barWidth = Math.max(4, (count / maxCount) * 100);
                
                return (
                  <div key={stage.status}>
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : stage.status)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${
                        isExpanded ? 'bg-slate-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex items-center space-x-2 w-48 shrink-0">
                          <div className={`h-3 w-3 rounded-full ${stage.color} shrink-0`} />
                          <span className="text-xs font-bold text-slate-800 truncate">{stage.label}</span>
                        </div>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Badge className={`${count > 0 ? stage.color + ' text-white' : 'bg-slate-100 text-slate-400'} font-black text-xs min-w-[2.5rem] justify-center`}>
                          {count}
                        </Badge>
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && employees.length > 0 && (
                      <div className="ml-6 mt-2 mb-3 space-y-1.5 border-l-2 border-indigo-200 pl-4">
                        {employees.map((emp: any) => (
                          <div key={emp.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{emp.employeeName}</span>
                              <span className="text-slate-400 font-mono text-[10px]">SAP: {emp.sapId}</span>
                              <span className="text-slate-500">{emp.grade}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] font-bold h-6 px-2"
                              onClick={(e) => { e.stopPropagation(); setForceTarget(emp); setShowForceModal(true); }}
                            >
                              Force Transition
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && employees.length === 0 && (
                      <div className="ml-6 mt-2 mb-3 p-3 text-xs text-slate-400 italic border-l-2 border-slate-100 pl-4">
                        No employees currently at this stage.
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ TAB 2: TRANSITION MATRIX ═══════════════ */}
      {activeTab === 'matrix' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Workflow Transition Matrix</CardTitle>
                <CardDescription className="text-xs">Complete reference of all valid status transitions, permitted roles, and conditions</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search transitions..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-2.5 text-left font-bold text-slate-600 uppercase tracking-wider">From Status</th>
                    <th className="p-2.5 text-left font-bold text-slate-600 uppercase tracking-wider">Action</th>
                    <th className="p-2.5 text-left font-bold text-slate-600 uppercase tracking-wider">To Status</th>
                    <th className="p-2.5 text-left font-bold text-slate-600 uppercase tracking-wider">Permitted Roles</th>
                    <th className="p-2.5 text-left font-bold text-slate-600 uppercase tracking-wider">Conditions</th>
                    <th className="p-2.5 text-center font-bold text-slate-600 uppercase tracking-wider">Comments</th>
                    <th className="p-2.5 text-center font-bold text-slate-600 uppercase tracking-wider">Reversible</th>
                    <th className="p-2.5 text-center font-bold text-slate-600 uppercase tracking-wider">Admin Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMatrix.map((t, idx) => (
                    <tr key={idx} className={`border-l-4 ${PHASE_COLORS[t.phase] || ''} hover:bg-slate-50/80 transition-colors`}>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px] font-bold bg-white">{formatAppraisalStatus(t.from)}</Badge>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center space-x-1">
                        <ArrowRight className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span>{t.action}</span>
                      </td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px] font-bold bg-white">{formatAppraisalStatus(t.to)}</Badge>
                      </td>
                      <td className="p-2.5">
                        <span className="text-indigo-700 font-bold">{t.roles}</span>
                      </td>
                      <td className="p-2.5 text-slate-600">{t.conditions}</td>
                      <td className="p-2.5 text-center">
                        {t.comments.includes('Yes') ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px]">Required</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {t.reversible.startsWith('Yes') ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {t.override !== 'N/A' ? (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[9px]">{t.override}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB 3: EMPLOYEE WORKFLOW TRACKER ═══════════════ */}
      {activeTab === 'tracker' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Employee Workflow Tracker</CardTitle>
                <CardDescription className="text-xs">Track and manage individual appraisal workflow positions</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search name or SAP ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium h-9"
                >
                  <option value="">All Statuses</option>
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{formatAppraisalStatus(s)}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-2.5 text-left">Employee</th>
                    <th className="p-2.5 text-left">SAP ID</th>
                    <th className="p-2.5 text-left">Grade</th>
                    <th className="p-2.5 text-left">Form</th>
                    <th className="p-2.5 text-left">Current Status</th>
                    <th className="p-2.5 text-left">1st Appraiser</th>
                    <th className="p-2.5 text-left">2nd Appraiser</th>
                    <th className="p-2.5 text-left">Last Updated</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEmployees.map((ec: any) => {
                    const stage = PIPELINE_STAGES.find(s => s.status === ec.currentStatus);
                    return (
                      <tr key={ec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900">{ec.employeeName}</td>
                        <td className="p-2.5 font-mono text-slate-600">{ec.sapId}</td>
                        <td className="p-2.5 text-slate-600">{ec.grade}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{ec.formType}</Badge></td>
                        <td className="p-2.5">
                          <Badge className={`${stage?.color || 'bg-slate-500'} text-white text-[10px] font-bold`}>
                            {formatAppraisalStatus(ec.currentStatus)}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-slate-600">{ec.firstAppraiserName || ec.firstAppraiserSapId || '—'}</td>
                        <td className="p-2.5 text-slate-600">{ec.secondAppraiserName || ec.secondAppraiserSapId || '—'}</td>
                        <td className="p-2.5 text-slate-500">{ec.updatedAt ? new Date(ec.updatedAt).toLocaleDateString() : '—'}</td>
                        <td className="p-2.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] font-bold h-7 px-2.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                            onClick={() => { setForceTarget(ec); setShowForceModal(true); }}
                          >
                            <Send className="h-3 w-3 mr-1" /> Force Transition
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-slate-400">No employee cycles found matching your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 font-medium">
              Showing {filteredEmployees.length} of {dashboardData?.totalCount || 0} total employee cycles
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB 4: AUDIT TRAIL ═══════════════ */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Workflow Audit Trail</CardTitle>
                <CardDescription className="text-xs">Complete log of all workflow transition events and administrative overrides</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium h-9"
                >
                  <option value="">All Transitions</option>
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{formatAppraisalStatus(s)}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={loadAudit} className="text-xs font-bold h-9">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reload
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditEvents.length > 0 ? auditEvents.map((evt: any) => {
                const isForce = evt.eventType?.includes('ADMIN_FORCE');
                return (
                  <div key={evt.id} className={`flex items-start space-x-3 p-3 rounded-xl border ${isForce ? 'bg-purple-50/50 border-purple-200' : 'bg-white border-slate-100'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isForce ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                      {isForce ? <Shield className="h-4 w-4 text-white" /> : <ArrowRight className="h-4 w-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900">{evt.actorUserId}</span>
                        <Badge variant="outline" className="text-[9px] font-bold">{evt.actorRole}</Badge>
                        <span className="text-slate-400">•</span>
                        <Badge className="bg-slate-200 text-slate-700 text-[9px]">{formatAppraisalStatus(evt.preStatus)}</Badge>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <Badge className="bg-indigo-100 text-indigo-800 text-[9px]">{formatAppraisalStatus(evt.postStatus)}</Badge>
                        {isForce && <Badge className="bg-purple-100 text-purple-800 text-[9px] font-bold">Admin Override</Badge>}
                      </div>
                      {evt.justificationComments && (
                        <p className="text-[11px] text-slate-600 mt-1 italic">"{evt.justificationComments}"</p>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(evt.timestamp).toLocaleString()}</span>
                        <span className="text-slate-300">•</span>
                        <span>Entity: {evt.targetEntityId?.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-12 text-center text-slate-400 text-sm">
                  {loading ? 'Loading audit events...' : 'No workflow transition events found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB 5: NOTIFICATIONS CONFIGURATION ═══════════════ */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-indigo-600" />
                  <span>Workflow Email Notifications</span>
                </CardTitle>
                <CardDescription className="text-xs">Configure which workflow transitions trigger email notifications and select the recipient roles.</CardDescription>
              </div>
              <Button size="sm" onClick={handleSaveNotifications} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs">
                <CheckCircle2 className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-pulse' : ''}`} /> Save Configuration
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {TRANSITION_MATRIX.map((t, idx) => {
                const key = `${t.from}->${t.to}`;
                const config = notificationConfig[key];
                if (!config) return null;

                const availableRoles = ['Employee', 'FirstAppraiser', 'SecondAppraiser', 'CoAppraiser', 'GroupPerformanceManager', 'PmwAdmin'];

                return (
                  <div key={idx} className="p-4 border rounded-xl bg-white shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-slate-50">{formatAppraisalStatus(t.from)}</Badge>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <Badge variant="outline" className="bg-slate-50">{formatAppraisalStatus(t.to)}</Badge>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="font-bold text-indigo-700">{t.action}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={testingNotification === key}
                          onClick={() => handleTestNotification(key)}
                          className="h-7 text-[10px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Send className={`h-3 w-3 mr-1 ${testingNotification === key ? 'animate-spin' : ''}`} />
                          <span>Test Email</span>
                        </Button>
                        <button
                          onClick={() => {
                            setNotificationConfig(prev => ({
                              ...prev,
                              [key]: { ...prev[key], enabled: !prev[key].enabled }
                            }));
                          }}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                            config.enabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {config.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          <span>{config.enabled ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </div>
                    </div>

                    <div className={`space-y-2 transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notify Roles:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableRoles.map(role => {
                          const isSelected = config.roles.includes(role);
                          return (
                            <button
                              key={role}
                              onClick={() => {
                                setNotificationConfig(prev => {
                                  const r = prev[key].roles;
                                  const newRoles = isSelected ? r.filter(x => x !== role) : [...r, role];
                                  return { ...prev, [key]: { ...prev[key], roles: newRoles } };
                                });
                              }}
                              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors border ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <Mail className="h-3 w-3" />
                              <span>{role.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══════════════ LIVE NOTIFICATION AUDIT / DELIVERY LOGS ═══════════════ */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <History className="h-4 w-4 text-indigo-600" />
                    <span>Recent Workflow Notification Delivery Logs</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Live delivery records with SMTP transmission results and recipient audit trail</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadNotificationLogs} className="text-xs font-bold h-8">
                  <RefreshCw className="h-3 w-3 mr-1.5" /> Refresh Logs
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden bg-slate-50/50">
                {notificationLogs.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {notificationLogs.map((log: any) => {
                      const isSuccess = log.eventType === 'NOTIFICATION_DISPATCHED';
                      return (
                        <div key={log.id} className="p-3 bg-white flex items-start justify-between gap-3 text-xs">
                          <div className="flex items-start space-x-3">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <Badge className={`text-[9px] font-bold ${
                                  isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isSuccess ? 'DELIVERED' : 'FAILED'}
                                </Badge>
                                <span className="font-semibold text-slate-800">{log.actionDescription}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-2">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span>Actor: {log.actorUserId}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No workflow notification events recorded yet. Trigger a workflow transition or click "Test Email" on any rule above.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ SET WORKFLOW STAGE MODAL (PMW ADMIN OVERRIDE) ═══════════════ */}
      <SetWorkflowStageModal
        isOpen={showForceModal}
        onClose={() => {
          setShowForceModal(false);
          setForceTarget(null);
        }}
        onSuccess={() => {
          loadDashboard();
        }}
        target={
          forceTarget
            ? {
                employeeCycleId: forceTarget.id || forceTarget.employeeCycleId,
                sapId: forceTarget.sapId,
                fullName: forceTarget.employeeName || forceTarget.fullName,
                grade: forceTarget.grade,
                currentStatus: forceTarget.currentStatus,
                formType: forceTarget.formType
              }
            : null
        }
        cycleId={selectedCycleId || undefined}
      />
    </div>
  );
};
