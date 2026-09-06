import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Send,
  Building2,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  Sliders,
  Scale,
  Award,
  UserCheck,
  GitBranch,
  ExternalLink,
  Eye,
  Info,
  Calendar,
  Sparkles,
  FileText,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatGradeLabel } from '@/lib/formatters';

interface GpmOperationsDashboardProps {
  userRole?: string;
  currentUser?: any;
  onNavigate?: (tab: string) => void;
  defaultView?: 'overview' | 'roster' | 'supervisors' | 'bellcurve' | 'disputes';
}

const BELL_CURVE_PRESCRIBED: Record<string, { label: string; targetPct: number; color: string; bg: string; border: string }> = {
  Outstanding: { label: 'Outstanding (Grade 1)', targetPct: 15, color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  VeryGood: { label: 'Very Good (Grade 2)', targetPct: 30, color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-300' },
  Good: { label: 'Good (Grade 3)', targetPct: 40, color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-300' },
  NeedsImprovement: { label: 'Needs Improvement (Grade 4)', targetPct: 10, color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-300' },
  Unsatisfactory: { label: 'Unsatisfactory (Grade 5)', targetPct: 5, color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-300' }
};

export const GpmOperationsDashboard: React.FC<GpmOperationsDashboardProps> = ({
  userRole = 'GroupPerformanceManager',
  currentUser,
  onNavigate,
  defaultView = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'supervisors' | 'bellcurve' | 'disputes'>(defaultView);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [gradeBandFilter, setGradeBandFilter] = useState<string>('all');
  const [selectedAppraiserFilter, setSelectedAppraiserFilter] = useState<string>('all');
  const [copiedSupervisor, setCopiedSupervisor] = useState<string | null>(null);
  const [nudgeSuccessMessage, setNudgeSuccessMessage] = useState<string | null>(null);

  // Email Nudge Modal State
  const [showNudgeModal, setShowNudgeModal] = useState<boolean>(false);
  const [nudgeTargetSup, setNudgeTargetSup] = useState<any>(null);
  const [nudgeModalTab, setNudgeModalTab] = useState<'preview' | 'compose'>('preview');
  const [nudgeSubject, setNudgeSubject] = useState<string>('');
  const [nudgeBody, setNudgeBody] = useState<string>('');
  const [nudgeEmail, setNudgeEmail] = useState<string>('');
  const [sendingNudge, setSendingNudge] = useState<boolean>(false);

  // Bulk Email Nudge Modal State
  const [showBulkNudgeModal, setShowBulkNudgeModal] = useState<boolean>(false);
  const [bulkNudgeSubject, setBulkNudgeSubject] = useState<string>('');
  const [bulkNudgeBody, setBulkNudgeBody] = useState<string>('');
  const [sendingBulkNudge, setSendingBulkNudge] = useState<boolean>(false);
  const [nudgeFeedback, setNudgeFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch live dashboard data from API
  const loadData = async (cycleId?: string, group?: string) => {
    setLoading(true);
    try {
      const res = await api.getWorkflowDashboard(
        cycleId || selectedCycleId || undefined,
        group && group !== 'all' ? group : undefined
      );
      setData(res);
      if (res?.cycles?.length > 0 && !selectedCycleId) {
        setSelectedCycleId(res.cycles[0].id);
      }
    } catch (err) {
      console.error('Failed to load GPM operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize active tab reactively when sidebar navigation changes
  useEffect(() => {
    if (defaultView) {
      setActiveTab(defaultView);
    }
  }, [defaultView]);

  useEffect(() => {
    loadData(selectedCycleId, selectedGroup);
  }, [selectedCycleId, selectedGroup]);

  // Extract cycles and reporting groups
  const cycles = data?.cycles || [];
  const reportingGroups = data?.reportingGroups || [
    { groupCode: '0001', groupName: 'Commercial Banking Group', rpsaCode: '0001' },
    { groupCode: '0002', groupName: 'Consumer / Retail Banking Group', rpsaCode: '0002' },
    { groupCode: '0003', groupName: 'Risk Management Group', rpsaCode: '0003' },
    { groupCode: '0004', groupName: 'Treasury & Global Markets', rpsaCode: '0004' },
    { groupCode: '0005', groupName: 'Information Technology Group', rpsaCode: '0005' },
    { groupCode: '0006', groupName: 'Operations Group', rpsaCode: '0006' },
    { groupCode: '0007', groupName: 'HR Management Group', rpsaCode: '0007' },
    { groupCode: '0008', groupName: 'Compliance Group', rpsaCode: '0008' },
  ];

  // Parse assigned reporting groups from currentUser (if GPM is restricted)
  const assignedGroupCodes = useMemo(() => {
    if (!currentUser?.assignedReportingGroups) return [];
    return currentUser.assignedReportingGroups
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }, [currentUser?.assignedReportingGroups]);

  // Group matching helper across groupCode (CBG), rpsaCode (0001), groupName ("Commercial Banking Group"), or id
  const isGroupMatch = (ecGroup: string, targetGroup: string) => {
    if (!targetGroup || targetGroup === 'all') return true;
    if (!ecGroup) return false;
    if (ecGroup.toLowerCase() === targetGroup.toLowerCase()) return true;

    const matchedRg = reportingGroups.find((rg: any) =>
      rg.groupCode?.toLowerCase() === targetGroup.toLowerCase() ||
      rg.rpsaCode?.toLowerCase() === targetGroup.toLowerCase() ||
      rg.groupName?.toLowerCase() === targetGroup.toLowerCase()
    );

    if (!matchedRg) return false;

    return (
      ecGroup.toLowerCase() === matchedRg.groupCode?.toLowerCase() ||
      ecGroup.toLowerCase() === matchedRg.rpsaCode?.toLowerCase() ||
      ecGroup.toLowerCase() === matchedRg.groupName?.toLowerCase()
    );
  };

  // Allowed reporting groups under this GPM's jurisdiction (or all if none specified)
  const allowedReportingGroups = useMemo(() => {
    if (assignedGroupCodes.length === 0) return reportingGroups;
    return reportingGroups.filter((rg: any) => {
      const matchCode = assignedGroupCodes.some((code: string) => isGroupMatch(rg.groupCode, code) || isGroupMatch(rg.rpsaCode, code));
      const matchName = assignedGroupCodes.some((code: string) => isGroupMatch(rg.groupName, code));
      const matchId = assignedGroupCodes.includes(rg.id);
      return matchCode || matchName || matchId;
    });
  }, [reportingGroups, assignedGroupCodes]);

  // Auto-default selectedGroup to the assigned group when GPM has only 1 assigned group
  useEffect(() => {
    if (assignedGroupCodes.length === 1 && allowedReportingGroups.length === 1) {
      const singleGroup = allowedReportingGroups[0].groupCode || allowedReportingGroups[0].rpsaCode;
      if (selectedGroup !== singleGroup) {
        setSelectedGroup(singleGroup);
      }
    }
  }, [assignedGroupCodes, allowedReportingGroups]);

  const employeeCycles: any[] = data?.employeeCycles || [];

  // Filter cycles based on active filters
  const filteredCycles = useMemo(() => {
    return employeeCycles.filter(ec => {
      // Group filter with multi-alias support (GroupCode, RpsaCode, GroupName)
      if (selectedGroup !== 'all') {
        if (!isGroupMatch(ec.group, selectedGroup)) return false;
      } else if (assignedGroupCodes.length > 0) {
        // If 'all' is selected but GPM is restricted to specific groups
        const matchesAnyAssigned = assignedGroupCodes.some((code: string) => isGroupMatch(ec.group, code));
        if (!matchesAnyAssigned) {
          return false;
        }
      }

      // Search query (Employee name or SAP ID or Supervisor Name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ec.employeeName?.toLowerCase().includes(query);
        const matchesSap = ec.sapId?.toLowerCase().includes(query);
        const matchesFirstApp = ec.firstAppraiserName?.toLowerCase().includes(query);
        const matchesSecondApp = ec.secondAppraiserName?.toLowerCase().includes(query);
        const matchesDept = ec.department?.toLowerCase().includes(query);
        if (!matchesName && !matchesSap && !matchesFirstApp && !matchesSecondApp && !matchesDept) {
          return false;
        }
      }

      // Stage filter - maps friendly keys and raw WorkflowStatus values accurately
      if (stageFilter !== 'all') {
        if (stageFilter === 'target-drafting' || stageFilter === 'ObjectiveDraft') {
          if (!['ObjectiveDraft', 'ObjectiveReturned'].includes(ec.currentStatus)) return false;
        } else if (stageFilter === 'ObjectiveSubmitted' || stageFilter === 'target-submitted') {
          if (ec.currentStatus !== 'ObjectiveSubmitted') return false;
        } else if (stageFilter === 'ObjectiveApproved' || stageFilter === 'target-approved') {
          if (ec.currentStatus !== 'ObjectiveApproved') return false;
        } else if (stageFilter === 'AnnualReviewSelfAssessment' || stageFilter === 'self-assessment') {
          if (ec.currentStatus !== 'AnnualReviewSelfAssessment') return false;
        } else if (stageFilter === 'FirstAppraiserAssessment' || stageFilter === 'first-appraiser') {
          if (ec.currentStatus !== 'FirstAppraiserAssessment') return false;
        } else if (stageFilter === 'CoAppraiserReview' || stageFilter === 'coapp-review') {
          if (ec.currentStatus !== 'CoAppraiserReview') return false;
        } else if (stageFilter === 'SecondAppraiserReview' || stageFilter === 'second-appraiser') {
          if (ec.currentStatus !== 'SecondAppraiserReview') return false;
        } else if (stageFilter === 'GroupPerformanceManagerReview' || stageFilter === 'gpm-review') {
          if (ec.currentStatus !== 'GroupPerformanceManagerReview') return false;
        } else if (stageFilter === 'PmwFinalization' || stageFilter === 'pmw-finalization') {
          if (ec.currentStatus !== 'PmwFinalization') return false;
        } else if (stageFilter === 'Published' || stageFilter === 'published-pending') {
          if (ec.currentStatus !== 'Published') return false;
        } else if (stageFilter === 'EmployeeAgreed' || stageFilter === 'agreed') {
          if (ec.currentStatus !== 'EmployeeAgreed') return false;
        } else if (stageFilter === 'disagreed' || stageFilter === 'EmployeeDisagreed' || stageFilter === 'disputes') {
          if (!['EmployeeDisagreed', 'DisagreementGpmReview', 'DisagreementPmwReview', 'DisagreementResolved'].includes(ec.currentStatus)) return false;
        } else if (stageFilter === 'AdministrativelyCompleted' || stageFilter === 'admin-comp') {
          if (ec.currentStatus !== 'AdministrativelyCompleted') return false;
        } else if (stageFilter === 'target-setting') {
          if (!['ObjectiveDraft', 'ObjectiveSubmitted', 'ObjectiveReturned'].includes(ec.currentStatus)) return false;
        } else if (stageFilter === 'published') {
          if (!['Published', 'EmployeeAgreed', 'EmployeeDisagreed', 'DisagreementGpmReview', 'DisagreementPmwReview', 'DisagreementResolved', 'AdministrativelyCompleted'].includes(ec.currentStatus)) return false;
        } else if (ec.currentStatus !== stageFilter) {
          return false;
        }
      }

      // Outcome filter
      if (outcomeFilter !== 'all') {
        if (outcomeFilter === 'agreed' && ec.currentStatus !== 'EmployeeAgreed') return false;
        if (outcomeFilter === 'disagreed' && ec.currentStatus !== 'EmployeeDisagreed') return false;
        if (outcomeFilter === 'admin_comp' && ec.currentStatus !== 'AdministrativelyCompleted') return false;
        if (outcomeFilter === 'pending_ack' && ec.currentStatus !== 'Published') return false;
      }

      // Grade Band filter
      if (gradeBandFilter !== 'all') {
        const isAvpBelow = ['06', '07', '08', 'OG III', 'OG II', 'OG I', 'AVP'].some(g => (ec.grade || '').includes(g));
        if (gradeBandFilter === 'avp-below' && !isAvpBelow) return false;
        if (gradeBandFilter === 'vp-above' && isAvpBelow) return false;
      }

      // Appraiser filter
      if (selectedAppraiserFilter !== 'all') {
        if (ec.firstAppraiserSapId !== selectedAppraiserFilter && ec.firstAppraiserName !== selectedAppraiserFilter) {
          return false;
        }
      }

      return true;
    });
  }, [employeeCycles, selectedGroup, searchQuery, stageFilter, outcomeFilter, gradeBandFilter, selectedAppraiserFilter]);

  // Aggregate Metrics - Zero double counting, comprehensive 5-phase breakdown
  const metrics = useMemo(() => {
    const total = filteredCycles.length;
    
    // Phase 1: Target Setting & Baseline
    const targetDrafting = filteredCycles.filter(c => ['ObjectiveDraft', 'ObjectiveReturned'].includes(c.currentStatus)).length;
    const targetSubmitted = filteredCycles.filter(c => c.currentStatus === 'ObjectiveSubmitted').length;
    const targetApproved = filteredCycles.filter(c => c.currentStatus === 'ObjectiveApproved').length;
    const targetSettingTotal = targetDrafting + targetSubmitted + targetApproved;

    // Phase 2: Employee Self-Assessment
    const selfAssessment = filteredCycles.filter(c => c.currentStatus === 'AnnualReviewSelfAssessment').length;

    // Phase 3: Supervisory Appraisals & Scoring
    const firstAppReview = filteredCycles.filter(c => c.currentStatus === 'FirstAppraiserAssessment').length;
    const coAppReview = filteredCycles.filter(c => c.currentStatus === 'CoAppraiserReview').length;
    const secondAppReview = filteredCycles.filter(c => c.currentStatus === 'SecondAppraiserReview').length;
    const reviewEvaluationTotal = selfAssessment + firstAppReview + coAppReview + secondAppReview;

    // Phase 4: HRBP Calibration & Central Moderation
    const gpmReview = filteredCycles.filter(c => c.currentStatus === 'GroupPerformanceManagerReview').length;
    const pmwFinalization = filteredCycles.filter(c => c.currentStatus === 'PmwFinalization').length;
    const calibrationTotal = gpmReview + pmwFinalization;

    // Phase 5: Publication, Decisions & Closure
    const publishedPending = filteredCycles.filter(c => c.currentStatus === 'Published').length;
    const agreed = filteredCycles.filter(c => c.currentStatus === 'EmployeeAgreed').length;
    const disagreed = filteredCycles.filter(c => ['EmployeeDisagreed', 'DisagreementGpmReview', 'DisagreementPmwReview', 'DisagreementResolved'].includes(c.currentStatus)).length;
    const adminComp = filteredCycles.filter(c => c.currentStatus === 'AdministrativelyCompleted').length;
    const publicationTotal = publishedPending + agreed + disagreed + adminComp;

    // High-level operational aggregates
    const inProgress = targetDrafting + targetSubmitted + targetApproved + selfAssessment + firstAppReview + coAppReview + secondAppReview + gpmReview + pmwFinalization;
    const completed = agreed + adminComp;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Evaluator & Supervisor Action Bottlenecks
    const supervisorBottlenecks = targetSubmitted + firstAppReview + secondAppReview + coAppReview;

    return {
      total,
      targetDrafting,
      targetSubmitted,
      targetApproved,
      targetSettingTotal,
      selfAssessment,
      firstAppReview,
      coAppReview,
      secondAppReview,
      reviewEvaluationTotal,
      gpmReview,
      pmwFinalization,
      calibrationTotal,
      publishedPending,
      agreed,
      disagreed,
      adminComp,
      publicationTotal,
      inProgress,
      completed,
      completionPct,
      supervisorBottlenecks,
      targetSetting: targetDrafting + targetSubmitted
    };
  }, [filteredCycles]);

  // Supervisors Action List Aggregation
  const supervisorsList = useMemo(() => {
    const map = new Map<string, {
      name: string;
      sapId: string;
      department: string;
      total: number;
      pendingTargetApproval: number;
      pendingEvaluation: number;
      pendingCountersign: number;
      pendingDrafts: number;
      pendingSelfAssess: number;
      completed: number;
      disagreed: number;
      urgentActions: number;
      totalPendingActions: number;
      appraisees: any[];
    }>();

    const getOrCreateSup = (sapId: string | null | undefined, name: string | null | undefined, dept: string | null | undefined) => {
      const key = sapId && sapId !== 'N/A' && sapId !== '-' ? sapId : (name || 'Unassigned');
      if (!map.has(key)) {
        map.set(key, {
          name: name || (sapId ? `Supervisor (${sapId})` : 'Unassigned Supervisor'),
          sapId: sapId || 'N/A',
          department: dept || 'General Banking',
          total: 0,
          pendingTargetApproval: 0,
          pendingEvaluation: 0,
          pendingCountersign: 0,
          pendingDrafts: 0,
          pendingSelfAssess: 0,
          completed: 0,
          disagreed: 0,
          urgentActions: 0,
          totalPendingActions: 0,
          appraisees: []
        });
      }
      return map.get(key)!;
    };

    filteredCycles.forEach(ec => {
      // 1. Direct Line Supervisor (First Appraiser)
      const firstSup = getOrCreateSup(
        ec.firstAppraiserSapId,
        ec.firstAppraiserName,
        ec.department || ec.division || 'General Banking'
      );

      firstSup.total += 1;
      if (!firstSup.appraisees.some(a => a.id === ec.id)) {
        firstSup.appraisees.push(ec);
      }

      if (ec.currentStatus === 'ObjectiveSubmitted') {
        firstSup.pendingTargetApproval += 1;
      } else if (ec.currentStatus === 'FirstAppraiserAssessment') {
        firstSup.pendingEvaluation += 1;
      } else if (ec.currentStatus === 'ObjectiveDraft') {
        firstSup.pendingDrafts += 1;
      } else if (ec.currentStatus === 'AnnualReviewSelfAssessment') {
        firstSup.pendingSelfAssess += 1;
      } else if (ec.currentStatus === 'EmployeeDisagreed') {
        firstSup.disagreed += 1;
      } else if (ec.currentStatus === 'EmployeeAgreed' || ec.currentStatus === 'AdministrativelyCompleted') {
        firstSup.completed += 1;
      }

      // 2. Second Appraiser / Countersigning Officer
      if (ec.secondAppraiserSapId || ec.secondAppraiserName) {
        if (ec.currentStatus === 'SecondAppraiserReview') {
          const secondSup = getOrCreateSup(
            ec.secondAppraiserSapId,
            ec.secondAppraiserName,
            ec.department || ec.division || 'Executive & Divisions'
          );
          secondSup.pendingCountersign += 1;
          if (!secondSup.appraisees.some(a => a.id === ec.id)) {
            secondSup.appraisees.push(ec);
            secondSup.total += 1;
          }
        }
      }
    });

    // Compute derived action totals and sort
    const result = Array.from(map.values()).map(sup => {
      const urgentActions = sup.pendingEvaluation + sup.pendingTargetApproval + sup.pendingCountersign;
      const totalPendingActions = urgentActions + sup.pendingDrafts + sup.pendingSelfAssess + sup.disagreed;
      return {
        ...sup,
        urgentActions,
        totalPendingActions
      };
    });

    return result.sort((a, b) => {
      if (b.urgentActions !== a.urgentActions) return b.urgentActions - a.urgentActions;
      if (b.totalPendingActions !== a.totalPendingActions) return b.totalPendingActions - a.totalPendingActions;
      return b.total - a.total;
    });
  }, [filteredCycles]);

  // Bell Curve Actual Distribution for this Group
  const bellCurveStats = useMemo(() => {
    const evaluatedList = filteredCycles.filter(c => c.finalRating || c.finalScore);
    const totalEvaluated = evaluatedList.length;

    const counts: Record<string, number> = {
      Outstanding: 0,
      VeryGood: 0,
      Good: 0,
      NeedsImprovement: 0,
      Unsatisfactory: 0
    };

    evaluatedList.forEach(c => {
      const rating = c.finalRating;
      if (rating && counts[rating] !== undefined) {
        counts[rating] += 1;
      } else if (c.finalScore) {
        const s = Number(c.finalScore);
        if (s >= 4.5) counts.Outstanding += 1;
        else if (s >= 3.5) counts.VeryGood += 1;
        else if (s >= 2.5) counts.Good += 1;
        else if (s >= 1.5) counts.NeedsImprovement += 1;
        else counts.Unsatisfactory += 1;
      }
    });

    const breakdown = Object.entries(BELL_CURVE_PRESCRIBED).map(([key, config]) => {
      const count = counts[key] || 0;
      const actualPct = totalEvaluated > 0 ? Math.round((count / totalEvaluated) * 100) : 0;
      const variance = actualPct - config.targetPct;
      const isOverQuota = variance > 2;

      return {
        key,
        label: config.label,
        count,
        targetPct: config.targetPct,
        actualPct,
        variance,
        isOverQuota,
        config
      };
    });

    return {
      totalEvaluated,
      breakdown
    };
  }, [filteredCycles]);

  // Export Roster to CSV
  const handleExportCsv = () => {
    if (filteredCycles.length === 0) return;

    const headers = [
      'SAP ID',
      'Employee Name',
      'Grade',
      'Designation',
      'Group',
      'Department',
      '1st Appraiser Name',
      '1st Appraiser SAP',
      '2nd Appraiser Name',
      'Co-Appraiser Name',
      'Current Status',
      'Final Score',
      'Final Rating',
      'Agreement Status',
      'Submitted At',
      'Acknowledged At'
    ];

    const rows = filteredCycles.map(ec => [
      `"${ec.sapId || ''}"`,
      `"${ec.employeeName || ''}"`,
      `"${ec.grade || ''}"`,
      `"${ec.designation || ''}"`,
      `"${ec.group || ''}"`,
      `"${ec.department || ''}"`,
      `"${ec.firstAppraiserName || ''}"`,
      `"${ec.firstAppraiserSapId || ''}"`,
      `"${ec.secondAppraiserName || ''}"`,
      `"${ec.coAppraiserName || ''}"`,
      `"${ec.currentStatus || ''}"`,
      `"${ec.finalScore || ''}"`,
      `"${ec.finalRating || ''}"`,
      `"${ec.currentStatus === 'EmployeeAgreed' ? 'Agreed' : ec.currentStatus === 'EmployeeDisagreed' ? 'Disagreed' : ec.currentStatus === 'AdministrativelyCompleted' ? 'Admin Completed' : 'Pending'}"`,
      `"${ec.submittedAt ? new Date(ec.submittedAt).toLocaleDateString() : ''}"`,
      `"${ec.acknowledgedAt ? new Date(ec.acknowledgedAt).toLocaleDateString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GPM_Appraisal_Report_${selectedGroup}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Email Nudge Modal for single supervisor
  const openNudgeModal = (sup: any) => {
    setNudgeTargetSup(sup);
    setNudgeModalTab('preview');
    const totalPending = sup.pendingEvaluation + sup.pendingTargetApproval + sup.pendingCountersign;
    setNudgeSubject(`Urgent: NBP Performance Appraisal Action Required - Pending Reviews (${totalPending} Pending)`);
    setNudgeEmail(sup.email || `${sup.sapId}@nbp.com.pk`);
    setNudgeBody(
      `Dear Supervisor ${sup.name},\n\nPlease expedite the pending appraisal reviews for your designated team members as summarized in the team digest below. Timely completion is critical to facilitate Group Bell Curve calibration and executive publication.\n\nThank you for your cooperation.`
    );
    setShowNudgeModal(true);
  };

  // Dispatch Email Nudge via API
  const handleSendEmailNudge = async () => {
    if (!nudgeTargetSup) return;
    setSendingNudge(true);
    try {
      const res = await api.nudgeSupervisor({
        supervisorSapId: nudgeTargetSup.sapId,
        supervisorEmail: nudgeEmail,
        supervisorName: nudgeTargetSup.name,
        subject: nudgeSubject,
        messageBody: nudgeBody.replace(/\n/g, '<br/>'),
        actorUserId: currentUser?.username || 'GPM',
        groupCode: selectedGroup !== 'all' ? selectedGroup : undefined
      });
      setNudgeFeedback({ type: 'success', text: res.message || `Email reminder sent to Supervisor ${nudgeTargetSup.name}.` });
      setShowNudgeModal(false);
      setTimeout(() => setNudgeFeedback(null), 5000);
    } catch (err: any) {
      setNudgeFeedback({ type: 'error', text: err.message || 'Failed to dispatch email reminder.' });
    } finally {
      setSendingNudge(false);
    }
  };

  // Open Bulk Email Nudge Modal
  const openBulkNudgeModal = () => {
    const pendingSups = supervisorsList.filter(s => s.totalPendingActions > 0);
    if (pendingSups.length === 0) return;
    setBulkNudgeSubject(`Urgent: NBP Performance Appraisal Action Required - Pending Team Reviews`);
    setBulkNudgeBody(
      `Dear {SupervisorName},\n\nThis is an urgent reminder from the Group HR Business Partner team. You have pending appraisal reviews and team submissions under your direct supervision in the PMS 2.0 portal.\n\nPlease log in at your earliest convenience and complete your pending evaluations and approvals to allow Bell Curve calibration to proceed on schedule.\n\nNational Bank of Pakistan - Group HRBP Operations`
    );
    setShowBulkNudgeModal(true);
  };

  // Dispatch Bulk Email Nudge via API
  const handleSendBulkNudge = async () => {
    const pendingSups = supervisorsList.filter(s => s.totalPendingActions > 0);
    const ids = pendingSups.map(s => s.sapId).filter(id => id && id !== 'N/A');
    if (ids.length === 0) return;
    setSendingBulkNudge(true);
    try {
      const res = await api.nudgeSupervisorsBulk({
        supervisorSapIds: ids,
        subject: bulkNudgeSubject,
        messageBody: bulkNudgeBody.replace(/\n/g, '<br/>'),
        actorUserId: currentUser?.username || 'GPM',
        groupCode: selectedGroup !== 'all' ? selectedGroup : undefined
      });
      setNudgeFeedback({ type: 'success', text: res.message || `Bulk email reminders sent to ${ids.length} supervisors.` });
      setShowBulkNudgeModal(false);
      setTimeout(() => setNudgeFeedback(null), 6000);
    } catch (err: any) {
      setNudgeFeedback({ type: 'error', text: err.message || 'Failed to dispatch bulk email reminders.' });
    } finally {
      setSendingBulkNudge(false);
    }
  };

  // Legacy copy fallback helper
  const handleCopyNudgeSupervisor = (sup: any) => {
    const text = `Urgent Performance Appraisal Reminder: Supervisor ${sup.name} (SAP: ${sup.sapId}), you have ${sup.pendingEvaluation} evaluation(s) and ${sup.pendingTargetApproval} target approval(s) pending under your direct review in the PMS 2.0 portal. Please complete your assessments urgently to enable Group Bell Curve calibration.`;
    navigator.clipboard.writeText(text);
    setCopiedSupervisor(sup.sapId);
    setNudgeSuccessMessage(`Actionable reminder copied for Supervisor ${sup.name}.`);
    setTimeout(() => {
      setCopiedSupervisor(null);
      setNudgeSuccessMessage(null);
    }, 4000);
  };

  const getGroupName = (code: string) => {
    const g = reportingGroups.find((rg: any) => rg.groupCode === code || rg.rpsaCode === code);
    return g ? g.groupName : `Group ${code}`;
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'target-drafting':
      case 'ObjectiveDraft':
        return 'Target Drafting & Revisions';
      case 'ObjectiveSubmitted':
      case 'target-submitted':
        return 'Target Approval Pending (1st Appraiser)';
      case 'ObjectiveReturned':
        return 'Targets Returned by Supervisor';
      case 'ObjectiveApproved':
      case 'target-approved':
        return 'Targets Approved Baseline';
      case 'AnnualReviewSelfAssessment':
      case 'self-assessment':
        return 'Employee Self-Assessment';
      case 'FirstAppraiserAssessment':
      case 'first-appraiser':
        return '1st Appraiser Line Scoring';
      case 'CoAppraiserReview':
      case 'coapp-review':
        return 'Co-Appraiser Review';
      case 'SecondAppraiserReview':
      case 'second-appraiser':
        return '2nd Appraiser Countersign';
      case 'GroupPerformanceManagerReview':
      case 'gpm-review':
        return 'GPM HRBP Calibration';
      case 'PmwFinalization':
      case 'pmw-finalization':
        return 'PMW Central Finalization';
      case 'Published':
      case 'published-pending':
        return 'Published (Awaiting Sign-off)';
      case 'EmployeeAgreed':
      case 'agreed':
        return 'Employee Agreed & Signed';
      case 'disagreed':
      case 'EmployeeDisagreed':
      case 'disputes':
        return 'Disagreement Disputes';
      case 'AdministrativelyCompleted':
      case 'admin-comp':
        return 'Administratively Completed';
      case 'target-setting':
        return 'Targets Formulation & Approval';
      case 'published':
        return 'Published & Outcome Decisions';
      default:
        return stage;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ObjectiveDraft':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-bold">Target Drafting</Badge>;
      case 'ObjectiveSubmitted':
        return <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-bold">Target Approval Pending</Badge>;
      case 'ObjectiveReturned':
        return <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold">Targets Returned</Badge>;
      case 'ObjectiveApproved':
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-medium">Targets Approved</Badge>;
      case 'AnnualReviewSelfAssessment':
        return <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 text-[10px] font-bold">Pending Self-Assessment</Badge>;
      case 'FirstAppraiserAssessment':
        return <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-bold">Pending 1st Appraiser</Badge>;
      case 'SecondAppraiserReview':
        return <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">Pending 2nd Appraiser</Badge>;
      case 'CoAppraiserReview':
        return <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold">Pending Co-Appraiser</Badge>;
      case 'GroupPerformanceManagerReview':
        return <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-bold">Pending GPM Review</Badge>;
      case 'PmwFinalization':
        return <Badge className="bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 text-[10px] font-bold">Pending PMW Sealing</Badge>;
      case 'Published':
        return <Badge className="bg-violet-100 text-violet-900 border-violet-300 text-[10px] font-bold">Published (Awaiting Ack)</Badge>;
      case 'EmployeeAgreed':
        return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold">Agreed &amp; Signed</Badge>;
      case 'EmployeeDisagreed':
        return <Badge className="bg-red-100 text-red-900 border-red-300 text-[10px] font-bold animate-pulse">Disagreement Dispute</Badge>;
      case 'DisagreementGpmReview':
        return <Badge className="bg-orange-100 text-orange-900 border-orange-300 text-[10px] font-bold">Dispute (GPM Review)</Badge>;
      case 'DisagreementPmwReview':
        return <Badge className="bg-red-100 text-red-900 border-red-300 text-[10px] font-bold">Dispute (PMW Escalation)</Badge>;
      case 'DisagreementResolved':
        return <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold">Dispute Resolved</Badge>;
      case 'AdministrativelyCompleted':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-bold">Admin Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] text-slate-600">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Nudge Email Feedback Alert */}
      {nudgeFeedback && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between font-semibold shadow-xs animate-in fade-in ${
          nudgeFeedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
            <span>{nudgeFeedback.text}</span>
          </div>
          <button onClick={() => setNudgeFeedback(null)} className="opacity-60 hover:opacity-100 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Top Header Card - HRBP Branding & Master Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#004d25] text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[11px] font-extrabold uppercase tracking-wide">
                HR Business Partner (GPM) Center
              </Badge>
              <span className="text-xs text-slate-500 font-medium">• Group Operations &amp; Tracking Center</span>
              {assignedGroupCodes.length > 0 ? (
                <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[11px] font-bold">
                  Jurisdiction: {allowedReportingGroups.map((g: any) => g.groupCode || g.groupName).join(', ')}
                </Badge>
              ) : (
                <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[11px] font-bold">
                  Jurisdiction: All Bank Groups (Global)
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Group Performance Appraisal Operations &amp; Review Hub
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              As HR Business Partner, coordinate with Line Managers and Countersigners to get appraisals completed ASAP. Monitor real-time stage hand-offs, resolve bottlenecks, manage employee agreements/disputes, and calibrate group ratings against bank Bell Curve quotas.
            </p>
          </div>

          {/* Master Filters & Export Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reporting Group Jurisdiction Selector */}
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Group Jurisdiction</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:border-emerald-600"
              >
                <option value="all">
                  {assignedGroupCodes.length > 0
                    ? `All Assigned Groups (${allowedReportingGroups.length} Groups)`
                    : 'All Bank Groups (Full Jurisdiction)'}
                </option>
                {allowedReportingGroups.map((rg: any) => (
                  <option key={rg.groupCode || rg.id} value={rg.groupCode || rg.rpsaCode}>
                    {rg.groupName} ({rg.groupCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Cycle Selector */}
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Appraisal Cycle</span>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:border-emerald-600"
              >
                {cycles.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end space-x-1.5 pt-4">
              <Button
                onClick={() => loadData(selectedCycleId, selectedGroup)}
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                title="Refresh live data"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              <Button
                onClick={handleExportCsv}
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                title="Export current view to CSV/Excel"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                <span>Export CSV</span>
              </Button>

              <Button
                onClick={() => window.print()}
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                <span>Print</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Nudge Notification Alert */}
        {nudgeSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{nudgeSuccessMessage}</span>
            </div>
            <button onClick={() => setNudgeSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Executive Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          
          {/* Tile 1: Total Enrolled */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Group Appraisals</span>
            <div className="text-xl font-black text-slate-900">{metrics.total}</div>
            <span className="text-[10px] text-slate-500">Under current scope</span>
          </div>

          {/* Tile 2: Completed & Signed */}
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Completed &amp; Signed</span>
            <div className="text-xl font-black text-emerald-900">{metrics.completed}</div>
            <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700">
              <span className="font-bold">{metrics.completionPct}%</span>
              <span>closure rate</span>
            </div>
          </div>

          {/* Tile 3: Active in Pipeline */}
          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Active In Pipeline</span>
            <div className="text-xl font-black text-blue-900">{metrics.inProgress}</div>
            <span className="text-[10px] text-blue-700">Drafting / Reviews</span>
          </div>

          {/* Tile 4: Supervisor Action Pending */}
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-1">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Supervisor Pending</span>
            <div className="text-xl font-black text-amber-900">{metrics.supervisorBottlenecks}</div>
            <span className="text-[10px] text-amber-800 font-medium">1st/2nd/Co-Appraiser</span>
          </div>

          {/* Tile 5: Formal Disagreements */}
          <div className="bg-red-50/70 p-3 rounded-xl border border-red-200 space-y-1">
            <span className="text-[10px] font-bold text-red-900 uppercase block">Disagreements</span>
            <div className="text-xl font-black text-red-900">{metrics.disagreed}</div>
            <span className="text-[10px] text-red-700 font-bold">Needs GPM review</span>
          </div>

          {/* Tile 6: Bell Curve Quota Compliance */}
          <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 space-y-1">
            <span className="text-[10px] font-bold text-purple-900 uppercase block">Bell Curve Status</span>
            <div className="text-base font-black text-purple-900 truncate">
              {bellCurveStats.totalEvaluated > 0 ? `${bellCurveStats.totalEvaluated} Calibrated` : 'Pending Scoring'}
            </div>
            <span className="text-[10px] text-purple-700 font-medium">Policy monitored</span>
          </div>

        </div>

      </div>

      {/* Main Operations Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Operations Pipeline Funnel</span>
            </button>

            <button
              onClick={() => setActiveTab('supervisors')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'supervisors'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="h-4 w-4 text-amber-300" />
              <span>Supervisor Coordination Matrix</span>
              {metrics.supervisorBottlenecks > 0 && (
                <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full ml-1">
                  {metrics.supervisorBottlenecks}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'roster'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Appraisal Roster &amp; Status Tracker</span>
              <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                {metrics.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bellcurve')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bellcurve'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="h-4 w-4 text-purple-300" />
              <span>Bell Curve Quota Compliance</span>
            </button>

            <button
              onClick={() => setActiveTab('disputes')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'disputes'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span>Agreement &amp; Disagreements</span>
              {metrics.disagreed > 0 && (
                <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full ml-1">
                  {metrics.disagreed}
                </span>
              )}
            </button>

          </div>

          {/* Quick Filter Status Indicator */}
          <div className="text-xs text-slate-500 pr-2">
            Scope: <strong className="text-slate-800">{selectedGroup === 'all' ? 'All Assigned Groups' : getGroupName(selectedGroup)}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPERATIONS PIPELINE FUNNEL (VISUAL BOTTLENECK TRACKER) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Visual Stage Funnel Cards - 5 Official Phases & 14 Lifecycle Stages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 shadow-xs">
            
            {/* Header with Lifecycle Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <Sliders className="h-4 w-4 text-[#004d25]" />
                  <span>End-to-End Appraisal Lifecycle Pipeline</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete tracking across all 5 operational phases and 14 sequential lifecycle states. Click any tile to inspect appraisees in the Roster.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                  100% Policy Aligned
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold">
                  14 Sequential States
                </Badge>
              </div>
            </div>

            {/* High-Level 5-Phase Progression Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>Phase 1: Targets</span>
                  <span className="text-blue-700 font-black">{metrics.targetSettingTotal}</span>
                </div>
                <div className="text-xs font-black text-slate-800">Target Formulation</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.targetSettingTotal / metrics.total) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 block">{metrics.total > 0 ? Math.round((metrics.targetSettingTotal / metrics.total) * 100) : 0}% of group</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>Phase 2: Self-Assess</span>
                  <span className="text-indigo-700 font-black">{metrics.selfAssessment}</span>
                </div>
                <div className="text-xs font-black text-slate-800">Employee Input</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.selfAssessment / metrics.total) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 block">{metrics.total > 0 ? Math.round((metrics.selfAssessment / metrics.total) * 100) : 0}% of group</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>Phase 3: Reviews</span>
                  <span className="text-amber-700 font-black">{metrics.reviewEvaluationTotal}</span>
                </div>
                <div className="text-xs font-black text-slate-800">Supervisory Scoring</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.reviewEvaluationTotal / metrics.total) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 block">{metrics.total > 0 ? Math.round((metrics.reviewEvaluationTotal / metrics.total) * 100) : 0}% of group</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>Phase 4: Calibration</span>
                  <span className="text-purple-700 font-black">{metrics.calibrationTotal}</span>
                </div>
                <div className="text-xs font-black text-slate-800">GPM &amp; PMW Sealing</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.calibrationTotal / metrics.total) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 block">{metrics.total > 0 ? Math.round((metrics.calibrationTotal / metrics.total) * 100) : 0}% of group</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>Phase 5: Closure</span>
                  <span className="text-emerald-700 font-black">{metrics.publicationTotal}</span>
                </div>
                <div className="text-xs font-black text-slate-800">Decisions &amp; Signed</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.publicationTotal / metrics.total) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 block">{metrics.agreed} Signed • {metrics.disagreed} Disputes</span>
              </div>

            </div>

            {/* Individual Stage Tiles Grouped by Phase */}
            <div className="space-y-5">

              {/* PHASE 1 SECTION */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-blue-900">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Phase 1: Target Formulation &amp; Approval Sign-off ({metrics.targetSettingTotal})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Stage 1: Target Drafting & Revisions */}
                  <div 
                    onClick={() => { setStageFilter('target-drafting'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-sky-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 1 • Code 1,3</span>
                      <Badge className={`text-[10px] font-black ${metrics.targetDrafting > 0 ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.targetDrafting}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-sky-900">Target Drafting &amp; Revisions</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Appraisee drafting or revising returned objectives</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-sky-800">Appraisee Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 2: Target Approval Pending */}
                  <div 
                    onClick={() => { setStageFilter('ObjectiveSubmitted'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-blue-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 2 • Code 2</span>
                      <Badge className={`text-[10px] font-black ${metrics.targetSubmitted > 0 ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.targetSubmitted}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-900">Target Approval Pending</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Submitted to Line Manager for sign-off</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-blue-800">1st Appraiser Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 3: Targets Approved & Active */}
                  <div 
                    onClick={() => { setStageFilter('ObjectiveApproved'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-emerald-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 3 • Code 4</span>
                      <Badge className={`text-[10px] font-black ${metrics.targetApproved > 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.targetApproved}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-900">Targets Approved &amp; Active</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Locked baseline for operational performance year</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-emerald-800">Active Baseline</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              </div>

              {/* PHASE 2 & 3 SECTION */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-900">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Phase 2 &amp; 3: Self-Assessment &amp; Supervisory Appraisals ({metrics.selfAssessment + metrics.reviewEvaluationTotal - metrics.selfAssessment})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Stage 4: Self-Assessment */}
                  <div 
                    onClick={() => { setStageFilter('AnnualReviewSelfAssessment'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-indigo-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 4 • Code 5</span>
                      <Badge className={`text-[10px] font-black ${metrics.selfAssessment > 0 ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.selfAssessment}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-900">Employee Self-Assessment</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Achievements submission &amp; self-rating</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-indigo-800">Appraisee Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 5: 1st Appraiser Scoring */}
                  <div 
                    onClick={() => { setStageFilter('FirstAppraiserAssessment'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-amber-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 5 • Code 6</span>
                      <Badge className={`text-[10px] font-black ${metrics.firstAppReview > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.firstAppReview}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-900">1st Appraiser Scoring</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">KPIs, traits &amp; development review</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-amber-800">Line Manager Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 6: Co-Appraiser Review */}
                  <div 
                    onClick={() => { setStageFilter('CoAppraiserReview'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-teal-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 6 • Code 8</span>
                      <Badge className={`text-[10px] font-black ${metrics.coAppReview > 0 ? 'bg-teal-100 text-teal-900 border-teal-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.coAppReview}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-900">Co-Appraiser Review</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Matrix / functional supervisory input</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-teal-800">Co-Appraiser Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 7: 2nd Appraiser Countersign */}
                  <div 
                    onClick={() => { setStageFilter('SecondAppraiserReview'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-orange-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-orange-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 7 • Code 7</span>
                      <Badge className={`text-[10px] font-black ${metrics.secondAppReview > 0 ? 'bg-orange-100 text-orange-900 border-orange-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.secondAppReview}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-orange-900">2nd Appraiser Countersign</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Score calibration &amp; senior countersign</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-orange-800">Divisional Head Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              </div>

              {/* PHASE 4 SECTION */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-purple-900">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>Phase 4: Calibration &amp; Central Governance ({metrics.calibrationTotal})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Stage 8: GPM Review & Calibration */}
                  <div 
                    onClick={() => { setStageFilter('GroupPerformanceManagerReview'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-purple-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 8 • Code 9</span>
                      <Badge className={`text-[10px] font-black ${metrics.gpmReview > 0 ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.gpmReview}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-900">GPM HRBP Calibration</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Group bell curve compliance reconciliation &amp; audit</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-purple-800">GPM / HRBP Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 9: PMW Central Finalization */}
                  <div 
                    onClick={() => { setStageFilter('PmwFinalization'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-fuchsia-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-fuchsia-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 9 • Code 10</span>
                      <Badge className={`text-[10px] font-black ${metrics.pmwFinalization > 0 ? 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.pmwFinalization}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-fuchsia-900">PMW Central Finalization</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Bank-wide moderation &amp; official cycle sealing</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-fuchsia-800">Central PMW Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              </div>

              {/* PHASE 5 SECTION */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-emerald-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Phase 5: Publication, Decisions &amp; Final Closure ({metrics.publicationTotal})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Stage 10: Published Pending Acknowledgment */}
                  <div 
                    onClick={() => { setStageFilter('Published'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-violet-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-violet-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 10 • Code 11</span>
                      <Badge className={`text-[10px] font-black ${metrics.publishedPending > 0 ? 'bg-violet-100 text-violet-900 border-violet-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.publishedPending}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-violet-900">Published (Awaiting Ack)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Scores visible, awaiting appraisee decision</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-violet-800">Appraisee Action</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 11: Employee Agreed & Signed */}
                  <div 
                    onClick={() => { setStageFilter('EmployeeAgreed'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-emerald-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 11 • Code 12</span>
                      <Badge className={`text-[10px] font-black ${metrics.agreed > 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.agreed}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-900">Employee Agreed &amp; Signed</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Formally acknowledged &amp; electronically signed</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-emerald-800">Closed &amp; Agreed</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 12: Disagreements & Formal Disputes */}
                  <div 
                    onClick={() => { setStageFilter('disagreed'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-red-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-red-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 12 • Code 13-16</span>
                      <Badge className={`text-[10px] font-black ${metrics.disagreed > 0 ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.disagreed}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-red-900">Formal Disagreements</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Disputes lodged with mandatory justification</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-red-800">GPM Review Panel</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 13: Administratively Completed */}
                  <div 
                    onClick={() => { setStageFilter('AdministrativelyCompleted'); setActiveTab('roster'); }}
                    className="cursor-pointer bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 13 • Code 17</span>
                      <Badge className={`text-[10px] font-black ${metrics.adminComp > 0 ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                        {metrics.adminComp}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-slate-950">Admin Completed</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Deemed closed under administrative policy</p>
                    </div>
                    <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Admin Closure</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* Quick Action Matrix for HRBP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Action Box 1: Urgent Supervisor Follow-up */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Supervisors with Action Items Pending ({supervisorsList.filter(s => s.totalPendingActions > 0).length})
                  </h3>
                </div>
                <Button
                  onClick={() => setActiveTab('supervisors')}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-bold h-7 px-2"
                >
                  View All Supervisors <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {supervisorsList.filter(s => s.totalPendingActions > 0).slice(0, 6).map((sup, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>{sup.name}</span>
                        {sup.urgentActions > 0 ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Direct Review Pending" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" title="Follow-up Required" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <span className="font-medium text-slate-600">SAP: {sup.sapId}</span>
                        <span className="text-slate-300">•</span>
                        <span className="truncate max-w-[140px] text-slate-600">{sup.department}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600">Team: <strong className="text-slate-700 font-semibold">{sup.total}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap justify-end gap-y-1">
                      {sup.pendingEvaluation > 0 && (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                          {sup.pendingEvaluation} Scoring Due
                        </Badge>
                      )}
                      {sup.pendingTargetApproval > 0 && (
                        <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-bold">
                          {sup.pendingTargetApproval} Target Sign-off
                        </Badge>
                      )}
                      {sup.pendingCountersign > 0 && (
                        <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-bold">
                          {sup.pendingCountersign} Countersign
                        </Badge>
                      )}
                      {sup.pendingDrafts > 0 && sup.urgentActions === 0 && (
                        <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-medium">
                          {sup.pendingDrafts} Target Drafting
                        </Badge>
                      )}
                      {sup.pendingSelfAssess > 0 && sup.urgentActions === 0 && (
                        <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 text-[10px] font-medium">
                          {sup.pendingSelfAssess} Self-Assess
                        </Badge>
                      )}
                      {sup.disagreed > 0 && (
                        <Badge className="bg-red-100 text-red-900 border-red-300 text-[10px] font-bold">
                          {sup.disagreed} Dispute
                        </Badge>
                      )}
                      <Button
                        onClick={() => openNudgeModal(sup)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-bold px-2.5 shadow-2xs"
                        title="Dispatch email reminder to supervisor"
                      >
                        <Mail className="h-3 w-3 mr-1 text-emerald-700" />
                        <span>Email Nudge</span>
                      </Button>
                    </div>
                  </div>
                ))}

                {supervisorsList.filter(s => s.totalPendingActions > 0).length === 0 && (
                  <div className="p-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                    <div className="font-bold text-slate-800 text-xs">All Supervisor Action Items Are Completed</div>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      All appraisals in this jurisdiction have been signed off or are currently closed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Box 2: Bell Curve Distribution Snapshot */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scale className="h-4 w-4 text-purple-700" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Live Bell Curve Distribution Calibration
                  </h3>
                </div>
                <Button
                  onClick={() => setActiveTab('bellcurve')}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-purple-800 hover:text-purple-900 font-bold h-7 px-2"
                >
                  Full Distribution <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <div className="space-y-3">
                {bellCurveStats.breakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{item.label}</span>
                      <span className="text-slate-600 font-medium text-[11px]">
                        {item.count} staff ({item.actualPct}%) • Target: {item.targetPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full ${item.isOverQuota ? 'bg-amber-500' : 'bg-emerald-600'} transition-all`}
                        style={{ width: `${Math.min(item.actualPct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>Evaluated Total: <strong>{bellCurveStats.totalEvaluated} / {metrics.total} Appraisals</strong></span>
                <span className="text-emerald-800 font-bold">Policy Compliant</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPERVISOR & APPRAISER COORDINATION MATRIX (ACTIONABLE HRBP LIST) */}
      {/* ========================================================================= */}
      {activeTab === 'supervisors' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-1.5">
                  <UserCheck className="h-4 w-4 text-[#004d25]" />
                  <span>Supervisor Action &amp; Coordination Roster</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Coordinate directly with Line Managers holding pending reviews. Click "Nudge / Copy Reminder" to dispatch pre-formatted reminders.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-500">Total Supervisors:</span>
                  <Badge className="bg-slate-100 text-slate-900 font-black">{supervisorsList.length}</Badge>
                </div>

                {supervisorsList.some(s => s.totalPendingActions > 0) && (
                  <Button
                    onClick={openBulkNudgeModal}
                    size="sm"
                    className="h-8 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold shadow-xs flex items-center space-x-1"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    <span>Email Nudge All Pending ({supervisorsList.filter(s => s.totalPendingActions > 0).length})</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Table of Supervisors */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Supervisor / Appraiser</th>
                    <th className="py-2.5 px-3">Department / Division</th>
                    <th className="py-2.5 px-3 text-center">Assigned Team</th>
                    <th className="py-2.5 px-3 text-center">Target Approvals</th>
                    <th className="py-2.5 px-3 text-center">Scoring Due</th>
                    <th className="py-2.5 px-3 text-center">Countersign Due</th>
                    <th className="py-2.5 px-3 text-center">Drafting / Self-Assess</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-right">Coordination Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {supervisorsList.map((sup, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <span>{sup.name}</span>
                          {sup.urgentActions > 0 && (
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Direct Review Pending" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">SAP: {sup.sapId}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {sup.department}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {sup.total}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {sup.pendingTargetApproval > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                            {sup.pendingTargetApproval}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {sup.pendingEvaluation > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                            {sup.pendingEvaluation}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {sup.pendingCountersign > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[10px]">
                            {sup.pendingCountersign}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {(sup.pendingDrafts + sup.pendingSelfAssess) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 font-bold text-[10px]">
                            {sup.pendingDrafts + sup.pendingSelfAssess}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-800">
                        {sup.completed}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <Button
                          onClick={() => openNudgeModal(sup)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-bold px-2.5"
                          title="Dispatch direct email reminder to supervisor"
                        >
                          <Mail className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                          <span>Email Nudge</span>
                        </Button>

                        <Button
                          onClick={() => {
                            setSelectedAppraiserFilter(sup.sapId);
                            setActiveTab('roster');
                          }}
                          size="sm"
                          className="h-7 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold"
                        >
                          <span>View Team</span>
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: APPRAISAL ROSTER & STATUS TRACKER (COMPLETE GROUP-WISE TABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Employee, SAP, Dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="all">All Workflow Stages ({metrics.total})</option>
                <option value="target-drafting">Phase 1: Target Drafting &amp; Revisions ({metrics.targetDrafting})</option>
                <option value="ObjectiveSubmitted">Phase 1: Target Approval Pending ({metrics.targetSubmitted})</option>
                <option value="ObjectiveApproved">Phase 1: Targets Approved Baseline ({metrics.targetApproved})</option>
                <option value="AnnualReviewSelfAssessment">Phase 2: Employee Self-Assessment ({metrics.selfAssessment})</option>
                <option value="FirstAppraiserAssessment">Phase 3: 1st Appraiser Line Scoring ({metrics.firstAppReview})</option>
                <option value="CoAppraiserReview">Phase 3: Co-Appraiser Priority ({metrics.coAppReview})</option>
                <option value="SecondAppraiserReview">Phase 3: 2nd Appraiser Countersign ({metrics.secondAppReview})</option>
                <option value="GroupPerformanceManagerReview">Phase 4: GPM HRBP Calibration ({metrics.gpmReview})</option>
                <option value="PmwFinalization">Phase 4: PMW Central Finalization ({metrics.pmwFinalization})</option>
                <option value="Published">Phase 5: Published (Awaiting Ack) ({metrics.publishedPending})</option>
                <option value="EmployeeAgreed">Phase 5: Employee Agreed &amp; Signed ({metrics.agreed})</option>
                <option value="disagreed">Phase 5: Disagreement Disputes ({metrics.disagreed})</option>
                <option value="AdministrativelyCompleted">Phase 5: Admin Completed ({metrics.adminComp})</option>
              </select>

              {/* Outcome Filter */}
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="all">All Outcome Decisions</option>
                <option value="agreed">Agreed &amp; Signed</option>
                <option value="disagreed">Disagreement Dispute Logged</option>
                <option value="pending_ack">Pending Acknowledgment</option>
                <option value="admin_comp">Administratively Completed</option>
              </select>

              {/* Grade Band Filter */}
              <select
                value={gradeBandFilter}
                onChange={(e) => setGradeBandFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="all">All Grade Bands</option>
                <option value="avp-below">AVP &amp; Below (KPI Form 70/30)</option>
                <option value="vp-above">VP &amp; Above (Balanced Scorecard)</option>
              </select>

              {/* Appraiser Filter / Reset */}
              <div className="flex items-center space-x-1.5">
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setStageFilter('all');
                    setOutcomeFilter('all');
                    setGradeBandFilter('all');
                    setSelectedAppraiserFilter('all');
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-slate-600 hover:text-slate-900 border-slate-300 h-8"
                >
                  Reset All Filters
                </Button>
              </div>

            </div>

            {selectedAppraiserFilter !== 'all' && (
              <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <span>Filtered by Supervisor: <strong>{selectedAppraiserFilter}</strong></span>
                <button 
                  onClick={() => setSelectedAppraiserFilter('all')}
                  className="font-bold underline text-[11px]"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {stageFilter !== 'all' && (
              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <div className="flex items-center space-x-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-600" />
                  <span>Filtered by Stage: <strong>{getStageLabel(stageFilter)}</strong> ({filteredCycles.length} records matching)</span>
                </div>
                <button 
                  onClick={() => setStageFilter('all')}
                  className="font-bold underline text-[11px] text-blue-800 hover:text-blue-950"
                >
                  Clear Stage Filter
                </button>
              </div>
            )}
          </div>

          {/* Roster Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Employee / Appraisee</th>
                    <th className="py-2.5 px-3">Grade &amp; Title</th>
                    <th className="py-2.5 px-3">Department / Wing</th>
                    <th className="py-2.5 px-3">Reporting Line Hierarchy</th>
                    <th className="py-2.5 px-3">Current Stage</th>
                    <th className="py-2.5 px-3 text-center">Score / Rating</th>
                    <th className="py-2.5 px-3">Outcome Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredCycles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 italic text-xs">
                        No appraisals found matching the selected filters in this group.
                      </td>
                    </tr>
                  ) : (
                    filteredCycles.map((ec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Employee */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">{ec.employeeName}</div>
                          <div className="text-[10px] text-slate-500 font-medium">SAP: {ec.sapId}</div>
                        </td>

                        {/* Grade & Designation */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-emerald-800 block text-[11px]">
                            {formatGradeLabel(ec.grade)}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                            {ec.designation || 'Staff'}
                          </span>
                        </td>

                        {/* Department / Wing */}
                        <td className="py-3 px-3 text-slate-600">
                          <div className="truncate max-w-[160px] font-medium">{ec.department || 'General Banking'}</div>
                          <div className="text-[10px] text-slate-400">{getGroupName(ec.group)}</div>
                        </td>

                        {/* Reporting Line Hierarchy */}
                        <td className="py-3 px-3 text-[11px] space-y-0.5">
                          <div className="text-slate-700">
                            1st: <strong>{ec.firstAppraiserName || 'Unassigned'}</strong>
                          </div>
                          {ec.coAppraiserName && (
                            <div className="text-teal-800 font-medium">
                              Co-App: <strong>{ec.coAppraiserName}</strong>
                            </div>
                          )}
                          <div className="text-slate-500">
                            2nd: {ec.secondAppraiserName || 'Unassigned'}
                          </div>
                        </td>

                        {/* Current Status Badge */}
                        <td className="py-3 px-3">
                          {getStatusBadge(ec.currentStatus)}
                          <span className="text-[9px] text-slate-400 block font-medium mt-0.5">
                            Stage #{ec.currentStatusCode}
                          </span>
                        </td>

                        {/* Score & Rating */}
                        <td className="py-3 px-3 text-center">
                          {ec.finalScore ? (
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                {Number(ec.finalScore).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800 block">
                                {ec.finalRating || 'Scored'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Outcome Decision */}
                        <td className="py-3 px-3">
                          {ec.currentStatus === 'EmployeeAgreed' ? (
                            <div className="text-emerald-800 font-bold text-xs flex items-center space-x-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Formal Agreement</span>
                            </div>
                          ) : ec.currentStatus === 'EmployeeDisagreed' ? (
                            <div className="space-y-0.5">
                              <div className="text-red-900 font-bold text-xs flex items-center space-x-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                <span>Dispute Logged</span>
                              </div>
                              {ec.disagreementReason && (
                                <p className="text-[10px] text-slate-600 line-clamp-1 italic">
                                  "{ec.disagreementReason}"
                                </p>
                              )}
                            </div>
                          ) : ec.currentStatus === 'AdministrativelyCompleted' ? (
                            <span className="text-slate-700 font-medium text-xs">Admin Closed</span>
                          ) : ec.currentStatus === 'Published' ? (
                            <span className="text-purple-800 font-bold text-xs">Pending Decision</span>
                          ) : (
                            <span className="text-slate-400 text-xs">In Progress</span>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredCycles.length} of {employeeCycles.length} appraisals</span>
              <span>Updated in real time from SQL Server database</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BELL CURVE QUOTA COMPLIANCE & GROUP CALIBRATION */}
      {/* ========================================================================= */}
      {activeTab === 'bellcurve' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-1.5">
                  <Scale className="h-4 w-4 text-purple-700" />
                  <span>Group Bell Curve Quota Compliance Reconciliation</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  National Bank of Pakistan HR policy prescribes mandatory rating percentage quotas across 5 rating bands.
                </p>
              </div>

              {onNavigate && (
                <Button
                  onClick={() => onNavigate('bellcurve')}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-8 shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  <span>Open Full Bell Curve Page</span>
                </Button>
              )}
            </div>

            {/* Quota Comparison Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {bellCurveStats.breakdown.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border ${item.config.border} ${item.config.bg} space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500">Tier {idx + 1}</span>
                    <span className="text-[10px] font-bold text-slate-500">Target: {item.targetPct}%</span>
                  </div>

                  <div>
                    <h4 className={`text-xs font-black ${item.config.color}`}>{item.label.split('(')[0]}</h4>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {item.count} <span className="text-xs text-slate-500 font-normal">({item.actualPct}%)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 text-[11px] flex items-center justify-between">
                    <span className="text-slate-500">Variance:</span>
                    <strong className={`font-bold ${item.variance > 2 ? 'text-amber-800' : item.variance < -2 ? 'text-blue-800' : 'text-emerald-800'}`}>
                      {item.variance > 0 ? `+${item.variance}%` : `${item.variance}%`}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {/* GPM Governance Advice Box */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                <Info className="h-4 w-4 text-purple-700" />
                <span>GPM Calibration Policy Guidance:</span>
              </div>
              <p className="leading-relaxed text-[11px] text-purple-900">
                Total appraisals evaluated in group: <strong>{bellCurveStats.totalEvaluated} / {metrics.total}</strong>. 
                Before official publication, ensure that ratings of "Outstanding" (15%) and "Very Good" (30%) strictly conform to bank limits. If exceptional performance warrants exceeding the prescribed quota, the GPM must submit an audited Bell Curve Exception Request to PMW Super Admin.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AGREEMENT & DISAGREEMENT REGISTER (DISPUTE RESOLUTION HUB) */}
      {/* ========================================================================= */}
      {activeTab === 'disputes' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wide flex items-center space-x-1.5">
                  <FileCheck className="h-4 w-4 text-emerald-800" />
                  <span>Employee Acknowledgement Decisions &amp; Dispute Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track employees who confirmed formal agreement or registered disputes under your reporting group.
                </p>
              </div>

              {onNavigate && (
                <Button
                  onClick={() => onNavigate('disagreements')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  <span>Open Disagreement Register Page</span>
                </Button>
              )}
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Formal Agreements Accepted</span>
                <div className="text-2xl font-black text-emerald-900">{metrics.agreed}</div>
                <span className="text-[10px] text-emerald-700">Sealed with PMS-ACK-VALID</span>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-red-800 uppercase block">Formal Disagreements Logged</span>
                <div className="text-2xl font-black text-red-900">{metrics.disagreed}</div>
                <span className="text-[10px] text-red-700 font-bold">Under GPM / PMW Dispute Review</span>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Awaiting Employee Decision</span>
                <div className="text-2xl font-black text-purple-900">{metrics.publishedPending}</div>
                <span className="text-[10px] text-purple-700">Active calendar deadline window</span>
              </div>
            </div>

            {/* Disputed Appraisals Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Disputed Cases Requiring GPM Fact-Finding &amp; Resolution
              </h4>

              {filteredCycles.filter(c => c.currentStatus === 'EmployeeDisagreed').length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                  No active disagreement disputes currently logged in this group.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCycles.filter(c => c.currentStatus === 'EmployeeDisagreed').map((c, idx) => (
                    <div key={idx} className="p-4 bg-red-50/40 border border-red-200 rounded-xl space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-red-100 pb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{c.employeeName}</span>
                          <span className="text-slate-500 ml-2 font-medium">(SAP: {c.sapId}) • {formatGradeLabel(c.grade)}</span>
                        </div>
                        <Badge className="bg-red-100 text-red-900 border-red-300 text-[10px] font-bold">
                          Status: GPM Dispute Review (Code #14)
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-700 block">Evaluator Line:</span>
                          <span className="text-slate-600">1st: {c.firstAppraiserName} • 2nd: {c.secondAppraiserName}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block">Disputed Score:</span>
                          <span className="text-slate-900 font-bold">{c.finalScore || '4.10'} ({c.finalRating || 'Very Good'})</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-red-200 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Mandatory Employee Justification:</span>
                        <p className="text-xs text-slate-800 italic">
                          "{c.disagreementReason || 'Employee registered formal dispute regarding the evaluation ratings.'}"
                        </p>
                        {c.disagreementAttachmentFileName && (
                          <div className="pt-1 text-[10px] text-emerald-800 font-bold flex items-center space-x-1">
                            <FileText className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Attached Proof: {c.disagreementAttachmentFileName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        {onNavigate && (
                          <Button
                            onClick={() => onNavigate('disagreements')}
                            size="sm"
                            className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs h-7 shadow-xs"
                          >
                            <span>Resolve Dispute in Register</span>
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 1: SINGLE SUPERVISOR EMAIL NUDGE MODAL WITH MINI DASHBOARD DIGEST */}
      {/* ========================================================================= */}
      {showNudgeModal && nudgeTargetSup && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-[#0f2347] to-[#1e3a8a] p-5 text-white flex items-center justify-between border-b-4 border-amber-500">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/30 p-2 flex items-center justify-center border border-blue-400/30">
                  <Mail className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white leading-tight">Dispatch Appraisal Digest &amp; Email Nudge</h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-black">Executive Digest</Badge>
                  </div>
                  <p className="text-[11px] text-slate-300">Direct Supervisor Review Digest sent via NBP Exchange / SMTP</p>
                </div>
              </div>
              <button onClick={() => setShowNudgeModal(false)} className="text-slate-300 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center space-x-2 px-6 pt-4 border-b border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setNudgeModalTab('preview')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  nudgeModalTab === 'preview'
                    ? 'border-blue-900 text-blue-950 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-blue-800" />
                <span>Mini Dashboard &amp; Team Digest Preview</span>
                <Badge className="bg-blue-100 text-blue-900 text-[10px] ml-1">{nudgeTargetSup.appraisees?.length || 0}</Badge>
              </button>
              <button
                type="button"
                onClick={() => setNudgeModalTab('compose')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  nudgeModalTab === 'compose'
                    ? 'border-blue-900 text-blue-950 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-blue-800" />
                <span>Custom HRBP Message Note &amp; Settings</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              
              {/* TAB 1: MINI DASHBOARD & TEAM DIGEST PREVIEW */}
              {nudgeModalTab === 'preview' && (
                <div className="space-y-4">
                  {/* Email Header Visual Preview Banner */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    <div className="bg-[#0f2347] p-4 text-white border-b-4 border-amber-500">
                      <span className="inline-block bg-[#1e3a8a] text-blue-200 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border border-blue-400/40 mb-1.5">
                        National Bank of Pakistan • PMS 2.0
                      </span>
                      <h4 className="text-base font-black text-white leading-tight">
                        Direct Line Supervisor Appraisal Review Digest
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Group Performance Management • HR Business Partner Operations
                      </p>
                    </div>
                  </div>
                  {/* Supervisor Profile Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Designated Supervisor</span>
                      <div className="text-sm font-bold text-slate-900">{nudgeTargetSup.name}</div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        SAP: {nudgeTargetSup.sapId} • {nudgeTargetSup.department} • <span className="text-emerald-800 font-bold">{nudgeEmail}</span>
                      </div>
                    </div>
                    <div className="text-right sm:text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Action Required</span>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-black text-xs">
                        {nudgeTargetSup.pendingEvaluation + nudgeTargetSup.pendingTargetApproval + (nudgeTargetSup.pendingCountersign || 0)} Action Items Pending
                      </Badge>
                    </div>
                  </div>

                  {/* 5-Tile Mini Dashboard */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Supervisor Action Metric Tiles (Embedded in Email)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-lg font-black text-slate-900">{nudgeTargetSup.total}</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Assigned Team</div>
                      </div>
                      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-lg font-black text-amber-900">{nudgeTargetSup.pendingEvaluation}</div>
                        <div className="text-[9px] font-bold text-amber-800 uppercase mt-0.5">Scoring Due</div>
                      </div>
                      <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-lg font-black text-blue-900">{nudgeTargetSup.pendingTargetApproval}</div>
                        <div className="text-[9px] font-bold text-blue-800 uppercase mt-0.5">Targets Due</div>
                      </div>
                      <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-lg font-black text-purple-900">{nudgeTargetSup.pendingCountersign || 0}</div>
                        <div className="text-[9px] font-bold text-purple-800 uppercase mt-0.5">Countersign Due</div>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="text-lg font-black text-emerald-900">{nudgeTargetSup.completed}</div>
                        <div className="text-[9px] font-bold text-emerald-800 uppercase mt-0.5">Completed</div>
                      </div>
                    </div>
                  </div>

                  {/* Appraisee Workflow Matrix Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Direct Appraisees &amp; Review Hierarchy ({nudgeTargetSup.appraisees?.length || 0})
                      </span>
                      <span className="text-[10px] text-slate-400">Includes 1st Appraiser, Co-Appraiser &amp; 2nd Appraiser details</span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="p-2.5">Appraisee Name &amp; SAP</th>
                              <th className="p-2.5">Grade / Desig</th>
                              <th className="p-2.5">Current Workflow Stage</th>
                              <th className="p-2.5">1st Appraiser</th>
                              <th className="p-2.5">Co-Appraiser</th>
                              <th className="p-2.5">2nd Appraiser / Final</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {nudgeTargetSup.appraisees?.map((ec: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900">{ec.employeeName}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">SAP: {ec.sapId}</div>
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {formatGradeLabel(ec.grade)} • {ec.designation}
                                </td>
                                <td className="p-2.5">
                                  {getStatusBadge(ec.currentStatus)}
                                </td>
                                <td className="p-2.5 font-bold text-slate-800">
                                  {ec.firstAppraiserName || '-'}
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {ec.coAppraiserName || '—'}
                                </td>
                                <td className="p-2.5 text-slate-800">
                                  {ec.secondAppraiserName || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Notice Box */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>
                      The supervisor will receive an official branded HTML email containing this interactive mini dashboard, action tiles, appraisee hierarchy, and a direct portal access button.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM HRBP MESSAGE NOTE & SETTINGS */}
              {nudgeModalTab === 'compose' && (
                <div className="space-y-4">
                  {/* Recipient Email */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Supervisor Email Address</label>
                    <input
                      type="email"
                      value={nudgeEmail}
                      onChange={(e) => setNudgeEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                    <span className="text-[10px] text-slate-400">Official Exchange email address configured for this employee.</span>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Subject Line</label>
                    <input
                      type="text"
                      value={nudgeSubject}
                      onChange={(e) => setNudgeSubject(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-semibold"
                    />
                  </div>

                  {/* Custom Note */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Message from HR Business Partner (Appears in Green Notice Box)</label>
                    <textarea
                      rows={6}
                      value={nudgeBody}
                      onChange={(e) => setNudgeBody(e.target.value)}
                      placeholder="Add any specific instructions, deadlines, or committee dates..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 leading-relaxed font-sans"
                    />
                    <span className="text-[10px] text-slate-400">This custom note will be highlighted prominently above the mini dashboard.</span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Recipient: <strong className="text-slate-800">{nudgeTargetSup.name}</strong> ({nudgeEmail})
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="secondary" size="sm" onClick={() => setShowNudgeModal(false)} disabled={sendingNudge}>
                  Cancel
                </Button>
                <Button
                  variant="nbp"
                  size="sm"
                  onClick={handleSendEmailNudge}
                  disabled={sendingNudge}
                  className="font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Send className={`h-3.5 w-3.5 ${sendingNudge ? 'animate-spin' : ''}`} />
                  <span>{sendingNudge ? 'Dispatching Mini Dashboard...' : 'Send Formatted Email Nudge Now'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK SUPERVISOR EMAIL NUDGE MODAL WITH PERSONALIZED DASHBOARDS */}
      {/* ========================================================================= */}
      {showBulkNudgeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-slate-950 via-[#0f2347] to-[#1e3a8a] p-5 text-white flex items-center justify-between border-b-4 border-amber-500">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/30 p-2 flex items-center justify-center border border-blue-400/30">
                  <Mail className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Bulk Appraisal Digest Dispatches</h3>
                  <p className="text-[11px] text-slate-300">Each supervisor receives their personalized executive team mini dashboard</p>
                </div>
              </div>
              <button onClick={() => setShowBulkNudgeModal(false)} className="text-slate-300 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {/* Target Scope Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="font-bold text-emerald-900 flex items-center space-x-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>
                    Ready to Dispatch to {supervisorsList.filter(s => s.totalPendingActions > 0).length} Supervisors with Pending Actions
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Every recipient will receive an official NBP HTML digest containing their specific direct reports, stage breakdown tiles, and supervisory hierarchy.
                </p>
              </div>

              {/* Recipient Roster Preview */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                  Supervisors Receiving Digest ({supervisorsList.filter(s => s.totalPendingActions > 0).length})
                </span>
                <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100 p-1 bg-slate-50/50">
                  {supervisorsList.filter(s => s.totalPendingActions > 0).map((s, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-white rounded-lg mb-1 shadow-2xs">
                      <div>
                        <span className="font-bold text-slate-900">{s.name}</span>
                        <span className="text-slate-500 font-medium ml-2 text-[11px]">(SAP: {s.sapId})</span>
                        <div className="text-[10px] text-slate-500">{s.department} • Team Size: {s.total}</div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1 justify-end">
                        {s.pendingEvaluation > 0 && (
                          <Badge className="bg-amber-100 text-amber-900 text-[9px] font-bold">{s.pendingEvaluation} Scoring</Badge>
                        )}
                        {s.pendingTargetApproval > 0 && (
                          <Badge className="bg-blue-100 text-blue-900 text-[9px] font-bold">{s.pendingTargetApproval} Targets</Badge>
                        )}
                        {s.pendingCountersign > 0 && (
                          <Badge className="bg-purple-100 text-purple-900 text-[9px] font-bold">{s.pendingCountersign} Countersign</Badge>
                        )}
                        {s.pendingDrafts > 0 && s.urgentActions === 0 && (
                          <Badge className="bg-sky-100 text-sky-900 text-[9px] font-bold">{s.pendingDrafts} Drafting</Badge>
                        )}
                        {s.pendingSelfAssess > 0 && s.urgentActions === 0 && (
                          <Badge className="bg-indigo-100 text-indigo-900 text-[9px] font-bold">{s.pendingSelfAssess} Self-Assess</Badge>
                        )}
                        {s.disagreed > 0 && (
                          <Badge className="bg-red-100 text-red-900 text-[9px] font-bold">{s.disagreed} Dispute</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subject Line</label>
                <input
                  type="text"
                  value={bulkNudgeSubject}
                  onChange={(e) => setBulkNudgeSubject(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-semibold"
                />
              </div>

              {/* Message Note */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Message from HR Business Partner (Embedded in Green Notice Box)</label>
                <textarea
                  rows={4}
                  value={bulkNudgeBody}
                  onChange={(e) => setBulkNudgeBody(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowBulkNudgeModal(false)} disabled={sendingBulkNudge}>
                Cancel
              </Button>
              <Button
                variant="nbp"
                size="sm"
                onClick={handleSendBulkNudge}
                disabled={sendingBulkNudge}
                className="font-bold flex items-center space-x-1.5 shadow-xs"
              >
                <Send className={`h-3.5 w-3.5 ${sendingBulkNudge ? 'animate-spin' : ''}`} />
                <span>{sendingBulkNudge ? 'Dispatching Bulk Digests...' : `Dispatch Digests to All (${supervisorsList.filter(s => s.totalPendingActions > 0).length})`}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
