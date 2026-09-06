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
  Eye,
  Edit3,
  Check,
  Clock, 
  AlertTriangle,
  Mail,
  Printer,
  Lock,
  Briefcase,
  DollarSign,
  Users as UsersIcon,
  Cog,
  GraduationCap,
  ShieldAlert,
  Target,
  Layers,
  Sparkles,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { formatGradeLabel, formatGroupLabel, formatAppraisalStatus } from '@/lib/formatters';
import { AppraisalPrintableReport } from '@/components/appraisal/AppraisalPrintableReport';

interface TeamReviewInboxPageProps {
  currentUser?: any;
  userRole?: string;
}

export const TeamReviewInboxPage: React.FC<TeamReviewInboxPageProps> = ({ currentUser, userRole }) => {
  const [currentAppraiserSapId, setCurrentAppraiserSapId] = useState(currentUser?.sapId || '10004');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'confirmations' | 'pending' | 'completed'>('confirmations');
  const [isModalReadOnly, setIsModalReadOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Score Delta & Upgrade/Downgrade Helper
  const getRatingDeltaInfo = (currentVal: number, baselineVal: number, baselineLabel: string) => {
    if (!currentVal || !baselineVal) return null;
    const diff = currentVal - baselineVal;
    if (diff > 0) {
      return {
        type: 'upgraded',
        diff,
        label: `▲ Upgraded (+${diff}) vs ${baselineLabel} (${baselineVal} ➔ ${currentVal})`,
        badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black',
        icon: 'up'
      };
    } else if (diff < 0) {
      return {
        type: 'downgraded',
        diff,
        label: `▼ Downgraded (${diff}) vs ${baselineLabel} (${baselineVal} ➔ ${currentVal})`,
        badgeClass: 'bg-rose-100 text-rose-950 border-rose-300 font-black',
        icon: 'down'
      };
    } else {
      return {
        type: 'maintained',
        diff: 0,
        label: `● Maintained (= ${currentVal}) vs ${baselineLabel}`,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
        icon: 'same'
      };
    }
  };

    // Confirm Mapping Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [editFirstSap, setEditFirstSap] = useState('');
  const [editSecondSap, setEditSecondSap] = useState('');
  const [editCoSap, setEditCoSap] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Reject Mapping Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalReview, setEvalReview] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalObjectives, setEvalObjectives] = useState<any[]>([]);
  const [evalTraits, setEvalTraits] = useState<any[]>([]);
  const [evalDevReview, setEvalDevReview] = useState<any>(null);
  const [evalAppraiserComments, setEvalAppraiserComments] = useState('');
  const [savingEval, setSavingEval] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Bulk Review Selection State
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const getRoleForUser = (r: any, sapId: string, role?: string) => {
    const sap = (sapId || '').trim().toLowerCase();
    const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                 (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap) ||
                 (role === 'CoAppraiser');
    const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                  (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
    const is2nd = (r.secondAppraiserSapId && r.secondAppraiserSapId.toLowerCase() === sap) ||
                  (r.pendingSecondAppraiserSapId && r.pendingSecondAppraiserSapId.toLowerCase() === sap);

    if (isCo) return 'CoAppraiser';
    if (is1st) return 'FirstAppraiser';
    if (is2nd) return 'SecondAppraiser';
    return 'FirstAppraiser'; // fallback for admin
  };

  const isReviewCompletedForUser = (r: any, sapId: string, role?: string): boolean => {
    const sap = (sapId || '').trim().toLowerCase();
    const st = (r.currentStatus || '').toString();
    const statusCode = parseInt(st, 10);

    const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                 (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap) ||
                 (role === 'CoAppraiser');

    const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                  (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);

    const is2nd = (r.secondAppraiserSapId && r.secondAppraiserSapId.toLowerCase() === sap) ||
                  (r.pendingSecondAppraiserSapId && r.pendingSecondAppraiserSapId.toLowerCase() === sap);

    // If published, agreed, disagreed, or administratively completed, it's completed for everyone
    if (['11', '12', '13', '14', '15', '16', '17', 'Published', 'EmployeeAgreed', 'EmployeeDisagreed', 'AdministrativelyCompleted', 'DisagreementResolved'].includes(st)) {
      return true;
    }

    if (isCo) {
      // Co-Appraiser has completed their step once status moves beyond CoAppraiserReview (8)
      return ['6', '7', '9', '10', 'FirstAppraiserAssessment', 'SecondAppraiserReview', 'GroupPerformanceManagerReview', 'PmwFinalization'].includes(st);
    }

    if (is1st) {
      // 1st Appraiser has completed their step once status moves beyond FirstAppraiserAssessment (6)
      return ['7', '9', '10', 'SecondAppraiserReview', 'GroupPerformanceManagerReview', 'PmwFinalization'].includes(st);
    }

    if (is2nd) {
      // 2nd Appraiser has completed their step once status moves beyond SecondAppraiserReview (7)
      return ['9', '10', 'GroupPerformanceManagerReview', 'PmwFinalization'].includes(st);
    }

    if (!isNaN(statusCode)) {
      return statusCode >= 11;
    }
    return false;
  };

  const getScoreLabel = (score?: number | null) => {
    if (!score || score <= 0) return 'Pending';
    if (score >= 5) return 'Outstanding';
    if (score >= 4) return 'Very Good';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  const isEligibleForSecondAppraiserReview = (r: any) => {
    const isSecond = r.secondAppraiserSapId === currentAppraiserSapId;
    const status = (r.currentStatus || '').toString();
    return isSecond || status.includes('SecondAppraiser') || status === '7';
  };

  const handleToggleSelectReview = (id: string) => {
    setSelectedReviewIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllReviews = () => {
    const eligible = reviews.filter(r => isEligibleForSecondAppraiserReview(r));
    if (selectedReviewIds.length === eligible.length && eligible.length > 0) {
      setSelectedReviewIds([]);
    } else {
      setSelectedReviewIds(eligible.map(r => r.id));
    }
  };

  const handleBulkAcceptSecondAppraiser = async () => {
    if (selectedReviewIds.length === 0) return;
    if (!confirm(`Are you sure you want to bulk accept 1st Appraiser ratings and countersign ${selectedReviewIds.length} appraisal form(s)?`)) return;

    setBulkSubmitting(true);
    try {
      const res = await api.bulkAcceptSecondAppraiser(selectedReviewIds, currentAppraiserSapId);
      setMessage(res.message || `Successfully countersigned ${selectedReviewIds.length} appraisals.`);
      setSelectedReviewIds([]);
      await loadReviews(currentAppraiserSapId);
    } catch (e: any) {
      alert(e.message || 'Failed to perform bulk countersign.');
    } finally {
      setBulkSubmitting(false);
    }
  };

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

  const isFirstOrSecondAppraiserFor = (r: any) => {
    if (typeof r.canConfirmLine === 'boolean') return r.canConfirmLine;
    const sap = (currentAppraiserSapId || '').trim().toLowerCase();
    const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                  (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
    const is2nd = (r.secondAppraiserSapId && r.secondAppraiserSapId.toLowerCase() === sap) ||
                  (r.pendingSecondAppraiserSapId && r.pendingSecondAppraiserSapId.toLowerCase() === sap);
    return is1st || is2nd;
  };

  // Only First Appraisers or 2nd Appraisers (Supervisors) can view & act on Line Confirmations
  const pendingConfirmations = reviews.filter(r => 
    r.appraiserValidationStatus === 'PendingConfirmation' && isFirstOrSecondAppraiserFor(r)
  );

  const handleOpenConfirm = (review: any) => {
    setSelectedReview(review);
    setEditFirstSap(review.pendingFirstAppraiserSapId || review.firstAppraiserSapId || '10004');
    setEditSecondSap(review.pendingSecondAppraiserSapId || review.secondAppraiserSapId || '10003');
    setEditCoSap(review.pendingCoAppraiserSapId || review.coAppraiserSapId || '');
    setShowConfirmModal(true);
  };

  const handleConfirmMapping = async () => {
    if (!selectedReview) return;
    setConfirming(true);
    try {
      const res = await api.confirmAppraiserMapping(selectedReview.id, {
        firstAppraiserSapId: editFirstSap,
        secondAppraiserSapId: editSecondSap,
        coAppraiserSapId: editCoSap ? editCoSap.trim() : null,
        actorSapId: currentAppraiserSapId
      });
      setMessage(res.message);
      setShowConfirmModal(false);
      await loadReviews(currentAppraiserSapId);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleDirectConfirm = async (review: any) => {
    setConfirming(true);
    try {
      const res = await api.confirmAppraiserMapping(review.id, {
        firstAppraiserSapId: review.pendingFirstAppraiserSapId || review.firstAppraiserSapId,
        secondAppraiserSapId: review.pendingSecondAppraiserSapId || review.secondAppraiserSapId,
        coAppraiserSapId: review.pendingCoAppraiserSapId || review.coAppraiserSapId || null,
        actorSapId: currentAppraiserSapId
      });
      setMessage(res.message);
      await loadReviews(currentAppraiserSapId);
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
      await loadReviews(currentAppraiserSapId);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRejecting(false);
    }
  };

  // Open Evaluate Appraisal Modal
  const handleOpenEvaluate = async (review: any, readOnly = false) => {
    setIsModalReadOnly(readOnly);
    setEvalReview(review);
    setShowEvalModal(true);
    setEvalLoading(true);
    try {
      const data = await api.getMyAppraisal(review.sapId, undefined, review.id);
      
      const empCycle = data?.employeeCycle || {};
      const hasCo = Boolean(
        empCycle.coAppraiserSapId || 
        empCycle.pendingCoAppraiserSapId || 
        empCycle.coAppraiser?.sapId ||
        review.coAppraiserSapId || 
        review.pendingCoAppraiserSapId || 
        review.coAppraiser?.sapId
      );

      // Merge enriched employeeCycle info into evalReview
      setEvalReview((prev: any) => ({
        ...prev,
        ...empCycle,
        coAppraiserSapId: empCycle.coAppraiserSapId || empCycle.coAppraiser?.sapId || prev.coAppraiserSapId,
        coAppraiserName: empCycle.coAppraiser?.fullName || prev.coAppraiserName,
        firstAppraiserSapId: empCycle.firstAppraiserSapId || empCycle.firstAppraiser?.sapId || prev.firstAppraiserSapId,
        firstAppraiserName: empCycle.firstAppraiser?.fullName || prev.firstAppraiserName,
        secondAppraiserSapId: empCycle.secondAppraiserSapId || empCycle.secondAppraiser?.sapId || prev.secondAppraiserSapId,
        secondAppraiserName: empCycle.secondAppraiser?.fullName || prev.secondAppraiserName,
      }));

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
          coAppraiserRating: hasCo ? (o.coAppraiserRating || null) : null,
          coAppraiserComments: hasCo ? (o.coAppraiserComments || '') : '',
          secondAppraiserRating: o.secondAppraiserRating || 4,
          secondAppraiserComments: o.secondAppraiserComments || '',
          requiresCoAppraiserReview: hasCo && Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser),
          isFlaggedForCoAppraiser: hasCo && Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser),
          perspective: o.perspective?.name || null
        })));
      } else {
        const mockObjectives = [
          {
            id: 1,
            title: 'Deposit Mobilization & CASA Growth Target',
            weightagePercentage: isKpiForm ? 35 : 25,
            targetDescription: 'Increase core CASA deposit mix by 15% and acquire 50 new NTB SME relationships.',
            achievementDetails: 'Achieved 18% CASA growth (PKR 1.2B) and onboarded 62 NTB relationships.',
            employeeSelfRating: 5,
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Outstanding deposit growth but NTB activation took longer than expected.',
            secondAppraiserRating: 4,
            secondAppraiserComments: '',
            perspective: 'Financial Perspective'
          },
          {
            id: 2,
            title: 'NPL Reduction & Portfolio Quality',
            weightagePercentage: isKpiForm ? 20 : 25,
            targetDescription: 'Maintain infection ratio below 3% and ensure 100% CAD compliance.',
            achievementDetails: 'Infection ratio contained at 2.8%. Zero critical CAD audit observations.',
            employeeSelfRating: 4,
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Good portfolio management.',
            secondAppraiserRating: 4,
            secondAppraiserComments: '',
            perspective: 'Customer Perspective'
          },
          {
            id: 3,
            title: 'Digital Banking Adoption',
            weightagePercentage: isKpiForm ? 15 : 25,
            targetDescription: 'Migrate 40% of branch OTC transactions to NBP Digital/ADC channels.',
            achievementDetails: 'OTC transactions reduced by 35%. Missed target slightly due to rural demographic.',
            employeeSelfRating: 3,
            firstAppraiserRating: 3,
            firstAppraiserComments: 'Needs more aggressive digital push in Q4.',
            secondAppraiserRating: 3,
            secondAppraiserComments: '',
            perspective: 'Internal Process Perspective'
          }
        ];

        if (!isKpiForm) {
          mockObjectives.push({
            id: 4,
            title: 'Team Development & Training',
            weightagePercentage: 25,
            targetDescription: 'Ensure 100% staff complete mandatory AML/KYC and mandatory training.',
            achievementDetails: 'All staff completed training ahead of deadline.',
            employeeSelfRating: 5,
            firstAppraiserRating: 5,
            firstAppraiserComments: 'Excellent team management.',
            secondAppraiserRating: 5,
            secondAppraiserComments: '',
            perspective: 'Learning & Growth Perspective'
          });
        }
        
        setEvalObjectives(mockObjectives);
      }

      // Load Behavioural Traits from API or generate standard NBP traits
      if (data && data.traits && data.traits.length > 0) {
        setEvalTraits(data.traits.map((t: any) => ({
          id: t.id,
          traitName: t.traitName || 'Core Competency',
          weightagePercentage: t.weightagePercentage || 10,
          definition: t.definition || '',
          firstAppraiserRating: t.firstAppraiserRating || 4,
          firstAppraiserComments: t.firstAppraiserComments || '',
          secondAppraiserRating: t.secondAppraiserRating || 4,
          secondAppraiserComments: t.secondAppraiserComments || '',
        })));
      } else {
        setEvalTraits([
          {
            id: 1,
            traitName: 'Integrity, Ethics & Regulatory Compliance',
            weightagePercentage: 10,
            definition: 'Demonstrates uncompromising adherence to NBP Code of Conduct, AML/KYC policies, and banking standards.',
            firstAppraiserRating: 5,
            firstAppraiserComments: 'Exemplary ethics and compliance record.',
          },
          {
            id: 2,
            traitName: 'Leadership, Teamwork & Collaboration',
            weightagePercentage: 10,
            definition: 'Inspires team members, fosters cross-departmental collaboration, and mentors junior staff effectively.',
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Strong team player and supportive colleague.',
          },
          {
            id: 3,
            traitName: 'Customer Centricity & Service Delivery',
            weightagePercentage: 10,
            definition: 'Prioritizes customer needs, resolves complex complaints efficiently, and delivers superior branch banking experience.',
            firstAppraiserRating: 4,
            firstAppraiserComments: 'Consistently receives positive customer feedback.',
          }
        ]);
      }

      if (data && data.score) {
        const rawComm = data.score.appraiserComments || data.score.encryptedAppraiserComments || '';
        const cleanComm = rawComm === '[Encrypted Record]' || rawComm.startsWith('ey') || (rawComm.length > 60 && !rawComm.includes(' ')) ? '' : rawComm;
        setEvalAppraiserComments(cleanComm);
      } else {
        setEvalAppraiserComments('');
      }

      // Load Development Review
      if (data && data.developmentReview) {
        setEvalDevReview(data.developmentReview);
      } else {
        setEvalDevReview({
          keyStrengths: 'Strong analytical skills and customer relationship management.',
          developmentAreas: 'Needs improvement in digital banking product knowledge.',
          trainingActionPlan: 'Enroll in advanced digital banking certification program.',
          supervisorComments: ''
        });
      }
    } catch (e: any) {
      console.error('Failed to load appraisal details for evaluation:', e);
    } finally {
      setEvalLoading(false);
    }
  };

  // Form Type and Classification
  const formTypeStr = String(evalReview?.formType || 'KpiForm');
  const isKpiForm = formTypeStr.toLowerCase().includes('kpi') || formTypeStr === '1';
  const isRiskAdjusted = formTypeStr.toLowerCase().includes('risk') || formTypeStr === '3';
  const isBscForm = !isKpiForm;

  const isCoAppraiser = Boolean(
    (evalReview?.coAppraiserSapId && evalReview.coAppraiserSapId.trim().toLowerCase() === (currentAppraiserSapId || '').trim().toLowerCase()) ||
    (evalReview?.pendingCoAppraiserSapId && evalReview.pendingCoAppraiserSapId.trim().toLowerCase() === (currentAppraiserSapId || '').trim().toLowerCase()) ||
    (evalReview?.coAppraiser?.sapId && evalReview.coAppraiser.sapId.trim().toLowerCase() === (currentAppraiserSapId || '').trim().toLowerCase()) ||
    userRole === 'CoAppraiser'
  );
  const isSecondAppraiser = Boolean(
    (evalReview?.secondAppraiserSapId && evalReview.secondAppraiserSapId.trim().toLowerCase() === (currentAppraiserSapId || '').trim().toLowerCase()) ||
    (evalReview?.pendingSecondAppraiserSapId && evalReview.pendingSecondAppraiserSapId.trim().toLowerCase() === (currentAppraiserSapId || '').trim().toLowerCase()) ||
    (evalReview?.secondAppraiser?.sapId && evalReview.secondAppraiser.sapId.trim().toLowerCase() === (currentAppraiserSapId || '').trim().toLowerCase())
  );
  const isFirstAppraiser = !isSecondAppraiser && !isCoAppraiser;

  const hasCoAppraiser = Boolean(
    evalReview?.coAppraiserSapId || 
    evalReview?.pendingCoAppraiserSapId || 
    evalReview?.coAppraiser?.sapId
  );

  const getPerspectiveKey = (obj: any): string => {
    const pName = String(obj.perspective?.name || obj.perspective || obj.category || obj.perspectiveName || obj.title || '').toLowerCase();
    if (pName.includes('fin') || pName.includes('revenue') || pName.includes('deposit')) return 'financial';
    if (pName.includes('cust') || pName.includes('client') || pName.includes('market')) return 'customer';
    if (pName.includes('proc') || pName.includes('control') || pName.includes('audit') || pName.includes('internal')) return 'process';
    if (pName.includes('learn') || pName.includes('growth') || pName.includes('talent') || pName.includes('train')) return 'learning';
    if (pName.includes('risk') || pName.includes('raroc') || pName.includes('sbp') || pName.includes('prudential')) return 'risk';
    return 'financial';
  };

  const bscPerspectives = [
    {
      id: 'financial',
      name: 'Financial & Strategic Business Growth Perspective',
      weightage: isRiskAdjusted ? 25 : 30,
      icon: <DollarSign className="h-4 w-4 text-emerald-300" />,
      themeColor: 'text-emerald-950',
      bannerBg: 'bg-[#004d25] text-white',
      borderColor: 'border-emerald-700',
      badgeBg: 'bg-emerald-800'
    },
    {
      id: 'customer',
      name: 'Customer Centricity & Market Relationship Perspective',
      weightage: isRiskAdjusted ? 20 : 25,
      icon: <UsersIcon className="h-4 w-4 text-blue-300" />,
      themeColor: 'text-blue-950',
      bannerBg: 'bg-blue-900 text-white',
      borderColor: 'border-blue-700',
      badgeBg: 'bg-blue-800'
    },
    {
      id: 'process',
      name: 'Internal Business Processes, Controls & Operations',
      weightage: isRiskAdjusted ? 20 : 25,
      icon: <Cog className="h-4 w-4 text-purple-300" />,
      themeColor: 'text-purple-950',
      bannerBg: 'bg-purple-900 text-white',
      borderColor: 'border-purple-700',
      badgeBg: 'bg-purple-800'
    },
    {
      id: 'learning',
      name: 'Learning, Organizational Growth & Talent Development',
      weightage: isRiskAdjusted ? 15 : 20,
      icon: <GraduationCap className="h-4 w-4 text-amber-300" />,
      themeColor: 'text-amber-950',
      bannerBg: 'bg-amber-800 text-white',
      borderColor: 'border-amber-700',
      badgeBg: 'bg-amber-800'
    },
    ...(isRiskAdjusted ? [{
      id: 'risk',
      name: 'Risk Adjustment Perspective & SBP Prudential Adherence',
      weightage: 20,
      icon: <ShieldAlert className="h-4 w-4 text-rose-300" />,
      themeColor: 'text-rose-950',
      bannerBg: 'bg-rose-900 text-white',
      borderColor: 'border-rose-700',
      badgeBg: 'bg-rose-800'
    }] : [])
  ];

  const perspectiveDataMap = bscPerspectives.map(p => {
    const items = evalObjectives.filter(o => getPerspectiveKey(o) === p.id);
    const valid = items.filter(o => {
      const r = isSecondAppraiser
        ? o.secondAppraiserRating
        : o.requiresCoAppraiserReview
        ? (o.coAppraiserRating || o.firstAppraiserRating)
        : o.firstAppraiserRating;
      return r != null || o.employeeSelfRating != null;
    });
    const rawAvg = valid.length > 0
      ? valid.reduce((sum, o) => {
          const r = isSecondAppraiser
            ? (o.secondAppraiserRating || o.firstAppraiserRating || o.employeeSelfRating || 3)
            : o.requiresCoAppraiserReview
            ? (o.coAppraiserRating || o.firstAppraiserRating || o.employeeSelfRating || 3)
            : (o.firstAppraiserRating || o.employeeSelfRating || 3);
          return sum + r;
        }, 0) / valid.length
      : 4.0;
    const weightedScore = rawAvg * (p.weightage / 100);
    const maxScore = 5.0 * (p.weightage / 100);
    return {
      config: p,
      items,
      rawAvg,
      weightedScore,
      maxScore
    };
  });

  const calculateObjectiveScore = () => {
    if (isKpiForm) {
      if (evalObjectives.length === 0) return 0;
      let sum = 0;
      evalObjectives.forEach((o) => {
        const r = (isSecondAppraiser ? o.secondAppraiserRating : o.firstAppraiserRating) || 3;
        sum += r;
      });
      const avg = sum / evalObjectives.length;
      return avg * 0.70;
    } else {
      return perspectiveDataMap.reduce((sum, p) => sum + p.weightedScore, 0);
    }
  };

  const calculateTraitScore = () => {
    if (!isKpiForm || evalTraits.length === 0) return 0;
    let sum = 0;
    evalTraits.forEach((t) => {
      const r = (isSecondAppraiser ? t.secondAppraiserRating : t.firstAppraiserRating) || 3;
      sum += r;
    });
    const avg = sum / evalTraits.length;
    return avg * 0.30;
  };

  const objScore = calculateObjectiveScore();
  const traitScore = calculateTraitScore();
  const totalCompositeScore = isKpiForm ? (objScore + traitScore) : objScore;

  const getRatingGrade = (score: number) => {
    if (score >= 4.5) return { label: 'Outstanding (1)', variant: 'default' as const, color: 'bg-emerald-600 text-white' };
    if (score >= 3.8) return { label: 'Very Good (2)', variant: 'nbp' as const, color: 'bg-emerald-700 text-white' };
    if (score >= 3.0) return { label: 'Good (3)', variant: 'secondary' as const, color: 'bg-blue-600 text-white' };
    if (score >= 2.0) return { label: 'Needs Improvement (4)', variant: 'warning' as const, color: 'bg-amber-600 text-white' };
    return { label: 'Unsatisfactory (5)', variant: 'danger' as const, color: 'bg-rose-600 text-white' };
  };

  const ratingGrade = getRatingGrade(totalCompositeScore);

  const handleSaveEvaluation = async (submit: boolean = false) => {
    if (!evalReview) return;
    setSavingEval(true);
    try {
      const payload = {
        objectives: evalObjectives.map((o) => ({
          id: typeof o.id === 'number' || (typeof o.id === 'string' && !o.id.includes('-')) 
            ? `00000000-0000-0000-0000-00000000000${o.id.toString().substring(0, 1)}` 
            : o.id,
          firstAppraiserRating: o.firstAppraiserRating,
          firstAppraiserComments: o.firstAppraiserComments,
          coAppraiserRating: o.coAppraiserRating,
          coAppraiserComments: o.coAppraiserComments,
          secondAppraiserRating: o.secondAppraiserRating,
          secondAppraiserComments: o.secondAppraiserComments,
          requiresCoAppraiserReview: o.requiresCoAppraiserReview,
        })),
        traits: isKpiForm ? evalTraits.map((t) => ({
          id: typeof t.id === 'number' || (typeof t.id === 'string' && !t.id.includes('-')) 
            ? `00000000-0000-0000-0000-00000000000${t.id.toString().substring(0, 1)}` 
            : t.id,
          firstAppraiserRating: t.firstAppraiserRating,
          firstAppraiserComments: t.firstAppraiserComments,
          secondAppraiserRating: t.secondAppraiserRating,
          secondAppraiserComments: t.secondAppraiserComments,
        })) : undefined,
        developmentReview: evalDevReview ? {
          keyStrengths: evalDevReview.keyStrengths,
          developmentAreas: evalDevReview.developmentAreas,
          trainingActionPlan: evalDevReview.trainingActionPlan,
          supervisorComments: evalDevReview.supervisorComments,
        } : undefined,
        firstAppraiserComments: isSecondAppraiser ? undefined : evalAppraiserComments,
        secondAppraiserComments: isSecondAppraiser ? evalAppraiserComments : undefined,
        actorSapId: currentAppraiserSapId,
        role: isSecondAppraiser ? 'SecondAppraiser' : isCoAppraiser ? 'CoAppraiser' : 'FirstAppraiser',
        submit: submit,
      };

      const res = await api.evaluateAppraisal(evalReview.id, payload);
      setMessage(res.message || (submit ? 'Appraisal evaluation submitted successfully.' : 'Appraisal evaluation draft saved successfully.'));
      setShowEvalModal(false);
      await loadReviews(currentAppraiserSapId);
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
            {userRole === 'PmwAdmin' || userRole === 'PmwSuperAdmin' ? (
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
            ) : (
              <span className="bg-slate-800 text-emerald-300 font-mono font-bold rounded-lg px-2.5 py-1 text-xs border border-slate-700">
                {currentAppraiserSapId}
              </span>
            )}
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

      {/* Mini Compact Dashboard */}
      {(() => {
        const pendingAll = reviews.filter(r => !isReviewCompletedForUser(r, currentAppraiserSapId, userRole));
        const completedAll = reviews.filter(r => isReviewCompletedForUser(r, currentAppraiserSapId, userRole));
        const sap = (currentAppraiserSapId || '').trim().toLowerCase();

        const pending1stCount = pendingAll.filter(r => {
          const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
          const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                       (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
          return is1st && !isCo;
        }).length;

        const pending2ndCount = pendingAll.filter(r => {
          const is2nd = (r.secondAppraiserSapId && r.secondAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingSecondAppraiserSapId && r.pendingSecondAppraiserSapId.toLowerCase() === sap);
          const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
          const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                       (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
          return is2nd && !is1st && !isCo;
        }).length;

        const pendingCoCount = pendingAll.filter(r => {
          return (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                 (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
        }).length;

        const totalCount = reviews.length;
        const completionPct = totalCount > 0 ? Math.round((completedAll.length / totalCount) * 100) : 0;

        const scoredReviews = reviews.filter(r => {
          const s = r.finalScore ?? r.firstAppraiserScore ?? r.secondAppraiserScore;
          return s !== undefined && s !== null && !isNaN(Number(s)) && Number(s) > 0;
        });
        const avgScore = scoredReviews.length > 0 
          ? (scoredReviews.reduce((acc, r) => acc + Number(r.finalScore ?? r.firstAppraiserScore ?? r.secondAppraiserScore), 0) / scoredReviews.length).toFixed(2)
          : null;

        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Card 1: Total Assigned Appraisees */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Appraisees</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Assigned in cycle</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </div>

            {/* Card 2: Line Confirmations */}
            <div 
              onClick={() => setActiveTab('confirmations')}
              className={`bg-white border rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer transition-all hover:border-emerald-400 ${
                activeTab === 'confirmations' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <span>Line Confirmations</span>
                  {pendingConfirmations.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{pendingConfirmations.length}</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  {pendingConfirmations.length === 0 ? '✓ All Validated' : 'Action Required'}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            {/* Card 3: Pending Reviews & Turn */}
            <div 
              onClick={() => setActiveTab('pending')}
              className={`bg-white border rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer transition-all hover:border-amber-400 ${
                activeTab === 'pending' ? 'border-amber-600 ring-2 ring-amber-600/10' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <span>Pending Reviews</span>
                  {pendingAll.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <div className="text-2xl font-black text-amber-950 mt-0.5">{pendingAll.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  1st: {pending1stCount} • 2nd: {pending2ndCount}{pendingCoCount > 0 ? ` • Co: ${pendingCoCount}` : ''}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* Card 4: Completed Reviews */}
            <div 
              onClick={() => setActiveTab('completed')}
              className={`bg-white border rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer transition-all hover:border-emerald-400 ${
                activeTab === 'completed' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</div>
                <div className="text-2xl font-black text-emerald-950 mt-0.5">{completedAll.length}</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  {completionPct}% Completed
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            {/* Card 5: Team Evaluation Average Score */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                <span>Avg Evaluated</span>
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 my-0.5">
                {avgScore ? `${avgScore} / 5.0` : '—'}
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Cycle Progress</span>
                  <span className="font-bold text-white">{completionPct}%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto">
        {/* Tab 1: Line confirmation (upcoming) */}
        <button
          onClick={() => setActiveTab('confirmations')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap relative ${
            activeTab === 'confirmations' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="h-4 w-4 text-emerald-700" />
          <span>Line confirmation (upcoming) ({pendingConfirmations.length})</span>
          {pendingConfirmations.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        {/* Tab 2: Pending Reviews */}
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap relative ${
            activeTab === 'pending' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4 text-emerald-700" />
          <span>Pending Reviews ({reviews.filter(r => !isReviewCompletedForUser(r, currentAppraiserSapId, userRole)).length})</span>
          {reviews.filter(r => !isReviewCompletedForUser(r, currentAppraiserSapId, userRole)).length > 0 && (
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          )}
        </button>

        {/* Tab 3: Completed Reviews */}
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap relative ${
            activeTab === 'completed' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Completed Reviews ({reviews.filter(r => isReviewCompletedForUser(r, currentAppraiserSapId, userRole)).length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LINE CONFIRMATION (UPCOMING)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'confirmations' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-emerald-700" />
              <span>Reporting Line Confirmation Requests (Upcoming Appraisals)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct report employees who have requested their appraisal reporting hierarchy. Review and confirm designated 1st Appraiser, Co-Appraiser, and 2nd Appraiser (Supervisor).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingConfirmations.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                <p className="font-bold text-slate-800 text-sm">All Reporting Lines Confirmed & Validated</p>
                <p>There are no pending line confirmation requests awaiting your action.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">SAP ID</th>
                      <th className="p-3">Appraisee Name</th>
                      <th className="p-3">Grade & Designation</th>
                      <th className="p-3">Place of Posting</th>
                      <th className="p-3">Requested 1st Appraiser</th>
                      <th className="p-3">Requested 2nd Appraiser</th>
                      <th className="p-3">Co-Appraiser (Matrix)</th>
                      <th className="p-3">Validation Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pendingConfirmations.map((r) => {
                      const hasCo = Boolean(r.coAppraiserSapId || r.pendingCoAppraiserSapId || r.coAppraiserName);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {r.sapId}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-900 font-bold">
                              {formatGradeLabel(r.grade)} - {r.designation}
                            </div>
                            <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-700">{r.location || 'Head Office Karachi'}</div>
                            {r.regionBranch && <div className="text-slate-500 text-[10px]">{r.regionBranch}</div>}
                          </td>
                          <td className="p-3 bg-emerald-50/30">
                            <div className="font-bold text-emerald-950">{r.firstAppraiserName || 'Designated 1st Appraiser'}</div>
                            <div className="text-[10px] text-emerald-800 font-mono">SAP: {r.firstAppraiserSapId || r.pendingFirstAppraiserSapId}</div>
                            <div className="text-[10px] text-slate-500">
                              {formatGradeLabel(r.firstAppraiserGrade)} {r.firstAppraiserDesignation && `- ${r.firstAppraiserDesignation}`}
                            </div>
                          </td>
                          <td className="p-3 bg-teal-50/30">
                            <div className="font-bold text-teal-950">{r.secondAppraiserName || 'Designated Supervisor'}</div>
                            <div className="text-[10px] text-teal-800 font-mono">SAP: {r.secondAppraiserSapId || r.pendingSecondAppraiserSapId}</div>
                            <div className="text-[10px] text-slate-500">
                              {formatGradeLabel(r.secondAppraiserGrade)} {r.secondAppraiserDesignation && `- ${r.secondAppraiserDesignation}`}
                            </div>
                          </td>
                          <td className="p-3 bg-sky-50/30">
                            {hasCo ? (
                              <>
                                <div className="font-bold text-sky-950">{r.coAppraiserName || 'Designated Co-Appraiser'}</div>
                                <div className="text-[10px] text-sky-800 font-mono">SAP: {r.coAppraiserSapId || r.pendingCoAppraiserSapId}</div>
                                <div className="text-[10px] text-slate-500">
                                  {formatGradeLabel(r.coAppraiserGrade)} {r.coAppraiserDesignation && `- ${r.coAppraiserDesignation}`}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={r.appraiserValidationStatus === 'Validated' ? 'success' : 'warning'}
                              className="text-[10px] font-bold"
                            >
                              {r.appraiserValidationStatus || 'PendingConfirmation'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <Button
                                variant="nbp"
                                size="sm"
                                disabled={confirming}
                                onClick={() => handleDirectConfirm(r)}
                                className="h-7 px-2 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs"
                                title="Confirm and validate reporting line"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenConfirm(r)}
                                className="h-7 px-2 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                                title="Edit designated appraisers and confirm"
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-1 text-slate-600" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReject(r)}
                                className="h-7 px-2 text-[11px] font-bold border-red-200 text-red-700 hover:bg-red-50"
                                title="Reject reporting line request"
                              >
                                Reject
                              </Button>
                            </div>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING REVIEWS (SEPARATE TABLES FOR 1ST APPRAISER & 2ND APPRAISER)*/}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (() => {
        const pendingAll = reviews.filter(r => !isReviewCompletedForUser(r, currentAppraiserSapId, userRole));
        const sap = (currentAppraiserSapId || '').trim().toLowerCase();

        const pending1st = pendingAll.filter(r => {
          const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
          const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                       (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
          return is1st && !isCo;
        });

        const pending2nd = pendingAll.filter(r => {
          const is2nd = (r.secondAppraiserSapId && r.secondAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingSecondAppraiserSapId && r.pendingSecondAppraiserSapId.toLowerCase() === sap);
          const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
          const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                       (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
          return is2nd && !is1st && !isCo;
        });

        const pendingCo = pendingAll.filter(r => {
          return (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                 (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
        });

        // If user is admin/viewer and didn't match specific roles, place any remaining in 1st appraiser list
        const handledIds = new Set([...pending1st.map(r=>r.id), ...pending2nd.map(r=>r.id), ...pendingCo.map(r=>r.id)]);
        const pendingOthers = pendingAll.filter(r => !handledIds.has(r.id));
        const finalPending1st = [...pending1st, ...pendingOthers];

        return (
          <div className="space-y-6">
            {/* 1. TABLE: REVIEWS AS 1ST APPRAISER */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Briefcase className="h-5 w-5 text-emerald-700" />
                    <span>Direct Reports Evaluation (Review as 1st Appraiser)</span>
                    <Badge className="bg-emerald-100 text-emerald-900 font-mono text-xs ml-2">
                      {finalPending1st.length} Pending
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Primary appraisal evaluations for your direct reports. Evaluate objectives, traits, and complete development review.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {finalPending1st.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-1.5">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto opacity-70" />
                    <p className="font-bold text-slate-700">No Pending 1st Appraiser Reviews</p>
                    <p>You have evaluated all designated direct reports in this cycle.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">SAP ID</th>
                          <th className="p-3">Appraisee Name</th>
                          <th className="p-3">Grade & Designation</th>
                          <th className="p-3">Form Template</th>
                          <th className="p-3">Self-Rating</th>
                          <th className="p-3">Sequential Step Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {finalPending1st.map((r) => {
                          const st = (r.currentStatus || '').toString();
                          const isAwaitingCoApp = st === '8' || st === 'CoAppraiserReview';

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {r.sapId}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900 font-bold">
                                  {formatGradeLabel(r.grade)} - {r.designation}
                                </div>
                                <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                              </td>
                              <td className="p-3">
                                <Badge className="bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[10px]">
                                  {r.formType}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {r.employeeSelfScore !== undefined && r.employeeSelfScore !== null && !isNaN(Number(r.employeeSelfScore)) ? (
                                  <Badge className="bg-emerald-100 text-emerald-950 font-bold text-[10px]">
                                    👤 {Number(r.employeeSelfScore).toFixed(2)} / 5.0
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Submitted</span>
                                )}
                              </td>
                              <td className="p-3">
                                {isAwaitingCoApp ? (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                                    ⏳ Step 1: Awaiting Co-Appraiser Review
                                  </Badge>
                                ) : st === '6' || st === 'FirstAppraiserAssessment' ? (
                                  <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 font-bold text-[10px] animate-pulse">
                                    🎯 Step 2: Action Required (1st Appraiser Evaluation)
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-200">
                                    {formatAppraisalStatus(r.currentStatus)}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="nbp"
                                  size="sm"
                                  onClick={() => handleOpenEvaluate(r, false)}
                                  className="h-7 px-3 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs"
                                >
                                  Evaluate Appraisal
                                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
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

            {/* 2. TABLE: REVIEWS AS 2ND APPRAISER / SUPERVISOR */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-amber-700" />
                    <span>Assigned Countersign Reviews (Review as 2nd Appraiser / Supervisor)</span>
                    <Badge className="bg-amber-100 text-amber-900 font-mono text-xs ml-2">
                      {pending2nd.length} Pending
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Countersign and finalize appraisals evaluated by 1st Appraisers in your supervisory hierarchy.
                  </CardDescription>
                </div>

                {/* Bulk Action Controls */}
                {pending2nd.length > 0 && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const eligible = pending2nd.map(r => r.id);
                        if (selectedReviewIds.length === eligible.length && eligible.length > 0) {
                          setSelectedReviewIds([]);
                        } else {
                          setSelectedReviewIds(eligible);
                        }
                      }}
                      className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 h-7"
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1 text-slate-600" />
                      {selectedReviewIds.length === pending2nd.length && selectedReviewIds.length > 0
                        ? 'Deselect All'
                        : `Select All (${pending2nd.length})`}
                    </Button>
                  </div>
                )}
              </CardHeader>

              {/* Bulk Action Bar */}
              {selectedReviewIds.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 text-white flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>{selectedReviewIds.length} appraisal form(s) selected for 2nd Appraiser Countersign</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReviewIds([])}
                      className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/30 h-7"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      disabled={bulkSubmitting}
                      onClick={handleBulkAcceptSecondAppraiser}
                      className="text-xs font-black bg-white text-slate-900 hover:bg-slate-100 shadow-xs h-7"
                    >
                      {bulkSubmitting ? (
                        <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin text-emerald-700" /> Countersigning...</>
                      ) : (
                        <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-700" /> Bulk Accept Ratings & Countersign ({selectedReviewIds.length})</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <CardContent className="pt-4">
                {pending2nd.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-1.5">
                    <CheckCircle2 className="h-6 w-6 text-amber-600 mx-auto opacity-70" />
                    <p className="font-bold text-slate-700">No Pending 2nd Appraiser Countersign Reviews</p>
                    <p>All supervisory reviews have been countersigned and finalized.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedReviewIds.length === pending2nd.length && pending2nd.length > 0}
                              onChange={() => {
                                if (selectedReviewIds.length === pending2nd.length) setSelectedReviewIds([]);
                                else setSelectedReviewIds(pending2nd.map(r => r.id));
                              }}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                          </th>
                          <th className="p-3">SAP ID</th>
                          <th className="p-3">Appraisee Name</th>
                          <th className="p-3">Grade & Designation</th>
                          <th className="p-3">Form Template</th>
                          <th className="p-3">1st Appraiser Rating</th>
                          <th className="p-3">Sequential Step Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pending2nd.map((r) => {
                          const st = (r.currentStatus || '').toString();
                          const isTurn = st === '7' || st === 'SecondAppraiserReview';
                          const isSelected = selectedReviewIds.includes(r.id);

                          return (
                            <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}>
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectReview(r.id)}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                              </td>
                              <td className="p-3">
                                <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {r.sapId}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900 font-bold">
                                  {formatGradeLabel(r.grade)} - {r.designation}
                                </div>
                                <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                              </td>
                              <td className="p-3">
                                <Badge className="bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[10px]">
                                  {r.formType}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {r.firstAppraiserScore !== undefined && r.firstAppraiserScore !== null && !isNaN(Number(r.firstAppraiserScore)) ? (
                                  <Badge className="bg-emerald-100 text-emerald-950 font-bold text-[10px]">
                                    👔 {Number(r.firstAppraiserScore).toFixed(2)} / 5.0
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Awaiting 1st Appraiser</span>
                                )}
                              </td>
                              <td className="p-3">
                                {isTurn ? (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px] animate-pulse">
                                    🎯 Step 3: Action Required (2nd Appraiser Countersign)
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-[10px]">
                                    ⏳ Step 2: Awaiting 1st Appraiser Evaluation
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="nbp"
                                  size="sm"
                                  onClick={() => handleOpenEvaluate(r, false)}
                                  className="h-7 px-3 text-[11px] font-bold bg-amber-700 hover:bg-amber-600 text-white shadow-xs"
                                >
                                  Countersign Review
                                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
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

            {/* 3. TABLE: MATRIX CO-APPRAISER REVIEWS (IF ANY) */}
            {pendingCo.length > 0 && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Target className="h-5 w-5 text-purple-700" />
                    <span>Cross-Functional Matrix Reviews (Review as Co-Appraiser)</span>
                    <Badge className="bg-purple-100 text-purple-900 font-mono text-xs ml-2">
                      {pendingCo.length} Pending
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evaluate flagged cross-functional objectives assigned to you as Co-Appraiser.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">SAP ID</th>
                          <th className="p-3">Appraisee Name</th>
                          <th className="p-3">Grade & Designation</th>
                          <th className="p-3">Form Template</th>
                          <th className="p-3">Sequential Step Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pendingCo.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {r.sapId}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-900 font-bold">
                                {formatGradeLabel(r.grade)} - {r.designation}
                              </div>
                              <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[10px]">
                                {r.formType}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-bold text-[10px] animate-pulse">
                                🎯 Step 1: Action Required (Co-Appraisal Input)
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="nbp"
                                size="sm"
                                onClick={() => handleOpenEvaluate(r, false)}
                                className="h-7 px-3 text-[11px] font-bold bg-purple-700 hover:bg-purple-600 text-white shadow-xs"
                              >
                                Evaluate Flagged Goals
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 3: COMPLETED REVIEWS (SEPARATE TABLES FOR 1ST & 2ND APPRAISER)        */}
      {/* ========================================================================= */}
      {activeTab === 'completed' && (() => {
        const completedAll = reviews.filter(r => isReviewCompletedForUser(r, currentAppraiserSapId, userRole));
        const sap = (currentAppraiserSapId || '').trim().toLowerCase();

        const completed1st = completedAll.filter(r => {
          const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
          const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                       (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
          return is1st && !isCo;
        });

        const completed2nd = completedAll.filter(r => {
          const is2nd = (r.secondAppraiserSapId && r.secondAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingSecondAppraiserSapId && r.pendingSecondAppraiserSapId.toLowerCase() === sap);
          const is1st = (r.firstAppraiserSapId && r.firstAppraiserSapId.toLowerCase() === sap) ||
                        (r.pendingFirstAppraiserSapId && r.pendingFirstAppraiserSapId.toLowerCase() === sap);
          const isCo = (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                       (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
          return is2nd && !is1st && !isCo;
        });

        const completedCo = completedAll.filter(r => {
          return (r.coAppraiserSapId && r.coAppraiserSapId.toLowerCase() === sap) ||
                 (r.pendingCoAppraiserSapId && r.pendingCoAppraiserSapId.toLowerCase() === sap);
        });

        const handledIds = new Set([...completed1st.map(r=>r.id), ...completed2nd.map(r=>r.id), ...completedCo.map(r=>r.id)]);
        const completedOthers = completedAll.filter(r => !handledIds.has(r.id));
        const finalCompleted1st = [...completed1st, ...completedOthers];

        return (
          <div className="space-y-6">
            {/* 1. TABLE: COMPLETED 1ST APPRAISER EVALUATIONS */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span>Completed 1st Appraiser Evaluations</span>
                  <Badge className="bg-emerald-100 text-emerald-900 font-mono text-xs ml-2">
                    {finalCompleted1st.length} Completed & Sealed
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Direct reports evaluated by you. Historical scores and comments are archived in read-only mode to prevent re-review.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {finalCompleted1st.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-1.5">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto opacity-60" />
                    <p className="font-bold text-slate-700">No Completed 1st Appraiser Evaluations Yet</p>
                    <p>Appraisals will appear here once you submit your formal evaluation.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">SAP ID</th>
                          <th className="p-3">Appraisee Name</th>
                          <th className="p-3">Grade & Designation</th>
                          <th className="p-3">Form Template</th>
                          <th className="p-3">1st Appraiser Rating</th>
                          <th className="p-3">Current Lifecycle Stage</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {finalCompleted1st.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {r.sapId}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-900 font-bold">
                                {formatGradeLabel(r.grade)} - {r.designation}
                              </div>
                              <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10px]">
                                {r.formType}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {r.firstAppraiserScore !== undefined && r.firstAppraiserScore !== null && !isNaN(Number(r.firstAppraiserScore)) ? (
                                <Badge className="bg-emerald-100 text-emerald-950 font-bold text-[10px]">
                                  ⭐ {Number(r.firstAppraiserScore).toFixed(2)} / 5.00 ({getScoreLabel(Number(r.firstAppraiserScore))})
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-900 font-bold text-[10px]">✓ Submitted</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant="warning" className="text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-200">
                                {formatAppraisalStatus(r.currentStatus)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEvalReview(r);
                                    setShowPrintReport(true);
                                  }}
                                  className="h-7 px-2 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1 text-slate-600" />
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEvaluate(r, true)}
                                  className="h-7 px-2.5 text-[11px] font-bold bg-white border-emerald-300 hover:bg-emerald-50 text-emerald-950 shadow-xs"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                                  View Evaluation
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

            {/* 2. TABLE: COMPLETED 2ND APPRAISER / SUPERVISOR COUNTERSIGNS */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-amber-700" />
                  <span>Completed 2nd Appraiser / Supervisor Countersigns</span>
                  <Badge className="bg-amber-100 text-amber-900 font-mono text-xs ml-2">
                    {completed2nd.length} Countersigned & Finalized
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Supervisory appraisals countersigned and finalized by you. Locked against re-review.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {completed2nd.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-1.5">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto opacity-60" />
                    <p className="font-bold text-slate-700">No Completed Countersigned Appraisals Yet</p>
                    <p>Appraisals will appear here once you countersign and finalize them.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">SAP ID</th>
                          <th className="p-3">Appraisee Name</th>
                          <th className="p-3">Grade & Designation</th>
                          <th className="p-3">Form Template</th>
                          <th className="p-3">Final Countersigned Score</th>
                          <th className="p-3">Current Lifecycle Stage</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {completed2nd.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {r.sapId}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-900 font-bold">
                                {formatGradeLabel(r.grade)} - {r.designation}
                              </div>
                              <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10px]">
                                {r.formType}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {r.finalScore !== undefined && r.finalScore !== null && !isNaN(Number(r.finalScore)) ? (
                                <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                                  ⭐ {Number(r.finalScore).toFixed(2)} / 5.00 ({getScoreLabel(Number(r.finalScore))})
                                </Badge>
                              ) : r.secondAppraiserScore !== undefined && r.secondAppraiserScore !== null && !isNaN(Number(r.secondAppraiserScore)) ? (
                                <Badge className="bg-amber-100 text-amber-950 font-bold text-[10px]">
                                  👔 {Number(r.secondAppraiserScore).toFixed(2)} / 5.00
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-900 font-bold text-[10px]">✓ Countersigned</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant="warning" className="text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-200">
                                {formatAppraisalStatus(r.currentStatus)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEvalReview(r);
                                    setShowPrintReport(true);
                                  }}
                                  className="h-7 px-2 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1 text-slate-600" />
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEvaluate(r, true)}
                                  className="h-7 px-2.5 text-[11px] font-bold bg-white border-amber-300 hover:bg-amber-50 text-amber-950 shadow-xs"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1 text-amber-700" />
                                  View Evaluation
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

            {/* 3. TABLE: COMPLETED CO-APPRAISALS (IF ANY) */}
            {completedCo.length > 0 && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Target className="h-5 w-5 text-purple-700" />
                    <span>Completed Matrix Co-Appraisals</span>
                    <Badge className="bg-purple-100 text-purple-900 font-mono text-xs ml-2">
                      {completedCo.length} Completed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">SAP ID</th>
                          <th className="p-3">Appraisee Name</th>
                          <th className="p-3">Grade & Designation</th>
                          <th className="p-3">Form Template</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {completedCo.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-950 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {r.sapId}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 text-sm">{r.employeeName}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-900 font-bold">
                                {formatGradeLabel(r.grade)} - {r.designation}
                              </div>
                              <div className="text-slate-500 text-[10px]">{formatGroupLabel(r.group)}</div>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[10px]">
                                {r.formType}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="warning" className="text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-200">
                                {formatAppraisalStatus(r.currentStatus)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEvalReview(r);
                                    setShowPrintReport(true);
                                  }}
                                  className="h-7 px-2 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1 text-slate-600" />
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEvaluate(r, true)}
                                  className="h-7 px-2.5 text-[11px] font-bold bg-white border-purple-300 hover:bg-purple-50 text-purple-950 shadow-xs"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1 text-purple-700" />
                                  View Evaluation
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* APPRAISAL EVALUATION MODAL WORKSPACE (PDF-ALIGNED STRUCTURE)              */}
      {/* ========================================================================= */}
      {showEvalModal && evalReview && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-300 my-auto flex flex-col max-h-[92vh]">
            
            {/* 1. OFFICIAL TOP ACTION & BRANDING HEADER */}
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <Award className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="text-base font-bold text-white leading-tight">
                      Official Appraisal Review: {evalReview.employeeName}
                    </h3>
                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/40 text-[10px] font-mono">
                      SAP: {evalReview.sapId}
                    </Badge>
                    <Badge className="bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                      {isCoAppraiser ? '🎯 Co-Appraiser Review' : isSecondAppraiser ? '👔 2nd Appraiser Review' : '👔 1st Appraiser Review'}
                    </Badge>
                    {isModalReadOnly && (
                      <Badge className="bg-emerald-500 text-white text-[10px] font-black border-emerald-400">
                        🔒 Sealed & Read-Only
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {formatGradeLabel(evalReview.grade)} • {evalReview.designation} • Group: {formatGroupLabel(evalReview.group)} • Form: <strong>{isKpiForm ? 'KPI Form (70/30)' : isRiskAdjusted ? 'Risk-Adjusted BSC (5 Perspectives)' : 'Balanced Scorecard (4 Perspectives)'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <Badge className={ratingGrade.color}>
                  {ratingGrade.label} — {totalCompositeScore.toFixed(2)} / 5.00
                </Badge>
                <Button 
                  onClick={() => setShowPrintReport(true)} 
                  variant="outline" 
                  size="sm" 
                  className="bg-emerald-900/60 border-emerald-500 hover:bg-emerald-800 text-white font-bold text-xs h-7 px-2.5 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print / PDF
                </Button>
                <button onClick={() => setShowEvalModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 2. MODAL BODY (FOLLOWING PRINTABLE REPORT SECTIONS) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1 bg-white text-slate-900">
              {evalLoading ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                  <p>Loading employee self-assessment and evaluation form...</p>
                </div>
              ) : (
                <>
                  {/* Read-Only Mode Banner */}
                  {isModalReadOnly && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs flex items-center space-x-3 shadow-xs">
                      <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
                      <div>
                        <div className="font-extrabold text-emerald-950">Evaluation Completed & Archived (Read-Only View)</div>
                        <div className="text-[11px] text-emerald-800 mt-0.5">
                          Your evaluation for this appraisal has already been formally submitted. Re-reviewing or editing completed evaluations is prohibited to maintain evaluation integrity.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sequential Workflow Turn Guidance Banners */}
                  {isFirstAppraiser && (evalReview?.currentStatus === 'CoAppraiserReview' || evalReview?.currentStatus === 8 || evalReview?.currentStatus === '8') && (
                    <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs flex items-center space-x-3 shadow-xs">
                      <Clock className="h-5 w-5 text-purple-700 shrink-0" />
                      <div>
                        <div className="font-bold text-purple-950">Sequential Workflow: Awaiting Co-Appraiser Review (Step 1)</div>
                        <div className="text-[11px] text-purple-800 mt-0.5">
                          This appraisal is currently assigned to the Co-Appraiser ({evalReview?.coAppraiserName || 'Co-Appraiser'}). As 1st Appraiser, you can preview the form and draft observations, but formal submission will unlock once the Co-Appraiser submits their review.
                        </div>
                      </div>
                    </div>
                  )}

                  {isSecondAppraiser && (evalReview?.currentStatus === 'CoAppraiserReview' || evalReview?.currentStatus === 8 || evalReview?.currentStatus === '8' || evalReview?.currentStatus === 'FirstAppraiserAssessment' || evalReview?.currentStatus === 6 || evalReview?.currentStatus === '6') && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center space-x-3 shadow-xs">
                      <Clock className="h-5 w-5 text-amber-700 shrink-0" />
                      <div>
                        <div className="font-bold text-amber-950">Sequential Workflow: Awaiting Prior Evaluations</div>
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          This appraisal must be evaluated and submitted by {evalReview?.currentStatus === 8 || evalReview?.currentStatus === 'CoAppraiserReview' ? 'the Co-Appraiser and 1st Appraiser' : 'the 1st Appraiser'} before 2nd Appraiser countersign can be submitted.
                        </div>
                      </div>
                    </div>
                  )}

                  {isCoAppraiser && (
                    <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs flex items-center space-x-3 shadow-xs">
                      <Target className="h-5 w-5 text-purple-700 shrink-0" />
                      <div>
                        <div className="font-bold text-purple-950">Sequential Workflow: Co-Appraiser Matrix Evaluation (Step 1 of 3)</div>
                        <div className="text-[11px] text-purple-800 mt-0.5">
                          Please evaluate your flagged cross-functional objectives below. Submitting will forward this appraisal directly to the 1st Appraiser ({evalReview?.firstAppraiserName || '1st Appraiser'}).
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: EMPLOYEE & EVALUATION GOVERNANCE PROFILE */}
                  <div className="bg-slate-50 rounded-xl border border-slate-300 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-[#004d25]" />
                        <span>1. Employee Profile</span>
                      </h3>
                      <span className="text-[10px] font-bold text-slate-600">
                        Form Template: <strong className="text-emerald-900">{isKpiForm ? 'KPI Form (AVP & Below - 70/30)' : isRiskAdjusted ? 'Risk-Adjusted BSC (MRT/MRC - 5 Perspectives)' : 'Balanced Scorecard (VP & Above - 4 Perspectives)'}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Appraisee Name</span>
                        <span className="font-extrabold text-slate-900">{evalReview.employeeName || 'Staff Member'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">SAP ID</span>
                        <span className="font-mono font-bold text-emerald-900">{evalReview.sapId}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Grade & Level</span>
                        <span className="font-bold text-slate-800">{formatGradeLabel(evalReview.grade)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Designation</span>
                        <span className="font-bold text-slate-800">{evalReview.designation || 'Staff Member'}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Reporting Group</span>
                        <span className="font-bold text-slate-800">{formatGroupLabel(evalReview.group)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Division / Dept</span>
                        <span className="font-bold text-slate-800">{evalReview.division || 'Corporate Banking'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Branch / Region</span>
                        <span className="font-bold text-slate-800">{evalReview.region || 'Main Branch'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Work Location</span>
                        <span className="font-bold text-slate-800">{evalReview.location || 'Head Office Karachi'}</span>
                      </div>
                    </div>

                    <div className={`border-t border-slate-200 pt-2.5 grid grid-cols-1 ${hasCoAppraiser ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 text-[11px]`}>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block">1st Appraiser (Supervisor)</span>
                        <span className="font-bold text-slate-900">{evalReview.firstAppraiserName || 'Tariq Mahmood'}</span>
                        <span className="text-[10px] text-slate-500 block">SAP: {evalReview.firstAppraiserSapId || '10004'} • {formatGradeLabel(evalReview.firstAppraiserGrade || '05')}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[9px] font-bold text-amber-800 uppercase block">2nd Appraiser (Countersigning)</span>
                        <span className="font-bold text-slate-900">{evalReview.secondAppraiserName || 'Rashid Khan'}</span>
                        <span className="text-[10px] text-slate-500 block">SAP: {evalReview.secondAppraiserSapId || '10003'} • {formatGradeLabel(evalReview.secondAppraiserGrade || '04')}</span>
                      </div>
                      {hasCoAppraiser && (
                        <div className="p-2.5 bg-teal-50/70 rounded-lg border border-teal-200">
                          <span className="text-[9px] font-bold text-teal-800 uppercase block">Co-Appraiser (Matrix Supervisor)</span>
                          <span className="font-bold text-teal-950">{evalReview.coAppraiserName || evalReview.coAppraiser?.fullName || 'Matrix Supervisor'}</span>
                          <span className="text-[10px] text-teal-700 block">SAP: {evalReview.coAppraiserSapId || evalReview.pendingCoAppraiserSapId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2: CONSOLIDATED REAL-TIME EVALUATION SCORE & DELTA OVERVIEW */}
                  {(() => {
                    // Compute baseline overall score
                    let baselineComposite = 0;
                    if (isKpiForm) {
                      const baseObjAvg = evalObjectives.length > 0
                        ? evalObjectives.reduce((sum, o) => {
                            const b = isSecondAppraiser ? (o.firstAppraiserRating || o.employeeSelfRating || 3) : (o.employeeSelfRating || 3);
                            return sum + Number(b);
                          }, 0) / evalObjectives.length
                        : 3;
                      const baseTraitAvg = evalTraits.length > 0
                        ? evalTraits.reduce((sum, t) => {
                            const b = isSecondAppraiser ? (t.firstAppraiserRating || 4) : 4;
                            return sum + Number(b);
                          }, 0) / evalTraits.length
                        : 4;
                      baselineComposite = (baseObjAvg * 0.70) + (baseTraitAvg * 0.30);
                    } else {
                      // BSC baseline
                      let bSum = 0;
                      perspectiveDataMap.forEach(p => {
                        const bAvg = p.items.length > 0
                          ? p.items.reduce((sum, o) => {
                              const b = isSecondAppraiser ? (o.firstAppraiserRating || o.employeeSelfRating || 3) : (o.employeeSelfRating || 3);
                              return sum + Number(b);
                            }, 0) / p.items.length
                          : 3;
                        bSum += (bAvg / 5.0) * (p.config.weightage / 100) * 5.0;
                      });
                      baselineComposite = bSum > 0 ? bSum : totalCompositeScore;
                    }

                    const overallDelta = totalCompositeScore - baselineComposite;
                    const isUpgraded = overallDelta > 0.005;
                    const isDowngraded = overallDelta < -0.005;

                    return (
                      <div className="bg-slate-50 rounded-xl border-2 border-emerald-800 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                            <Award className="h-4 w-4 text-[#004d25]" />
                            <span>2. Real-Time Consolidated Performance Score & Scoring Shift</span>
                          </h3>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            Scale: 1.00 to 5.00 Decimal
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Box 1: Composite Score */}
                          <div className="bg-white p-3 rounded-xl border border-emerald-300 text-center flex flex-col justify-center shadow-xs">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Composite Score</span>
                            <div className="text-2xl font-black text-[#004d25] mt-0.5">
                              {totalCompositeScore.toFixed(2)} <span className="text-xs font-semibold text-slate-400">/ 5.00</span>
                            </div>
                            <span className="text-[9px] font-semibold text-emerald-700 mt-0.5">
                              {isKpiForm 
                                ? `${objScore.toFixed(2)} (Obj 70%) + ${traitScore.toFixed(2)} (Trait 30%)` 
                                : 'Sum of 100% Strategic Perspectives'}
                            </span>
                          </div>

                          {/* Box 2: Score Shift Delta vs Baseline */}
                          <div className={`p-3 rounded-xl border text-center flex flex-col justify-center shadow-xs ${
                            isUpgraded 
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                              : isDowngraded 
                              ? 'bg-rose-50/80 border-rose-300 text-rose-950' 
                              : 'bg-white border-slate-300 text-slate-800'
                          }`}>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                              {isSecondAppraiser ? 'Shift vs 1st Appraiser' : 'Shift vs Self-Rating'}
                            </span>
                            <div className="flex items-center justify-center space-x-1.5 mt-0.5">
                              {isUpgraded ? (
                                <>
                                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                                  <span className="text-xl font-black text-emerald-800">+{overallDelta.toFixed(2)}</span>
                                </>
                              ) : isDowngraded ? (
                                <>
                                  <TrendingDown className="h-5 w-5 text-rose-700" />
                                  <span className="text-xl font-black text-rose-800">{overallDelta.toFixed(2)}</span>
                                </>
                              ) : (
                                <>
                                  <Minus className="h-5 w-5 text-slate-500" />
                                  <span className="text-xl font-black text-slate-700">0.00</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] font-bold mt-0.5">
                              {isUpgraded ? '▲ Overall Upgraded' : isDowngraded ? '▼ Overall Downgraded' : '● Rating Maintained'}
                            </span>
                          </div>

                          {/* Box 3: Breakdown */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-300 text-xs flex flex-col justify-center shadow-xs">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 text-center mb-1">
                              Contribution Breakdown
                            </span>
                            {isKpiForm ? (
                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
                                  <span className="text-slate-700 font-semibold">Objectives (70%):</span>
                                  <strong className="text-emerald-800 font-black">{objScore.toFixed(2)} / 3.50</strong>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
                                  <span className="text-slate-700 font-semibold">Competencies (30%):</span>
                                  <strong className="text-teal-800 font-black">{traitScore.toFixed(2)} / 1.50</strong>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5 text-[10px]">
                                {perspectiveDataMap.map(p => (
                                  <div key={p.config.id} className="flex justify-between items-center bg-slate-50 px-1.5 py-0.5 rounded">
                                    <span className="text-slate-700 font-semibold truncate max-w-[120px]">{p.config.name.split(' ')[0]} ({p.config.weightage}%):</span>
                                    <strong className="text-emerald-900 font-bold">+{p.weightedScore.toFixed(2)} / {p.maxScore.toFixed(2)}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Box 4: Rating Level */}
                          <div className="bg-[#004d25] text-white p-3 rounded-xl border border-emerald-950 text-center flex flex-col justify-center items-center shadow-inner">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300">Official Rating Level</span>
                            <div className="text-base font-black text-white mt-0.5">
                              {ratingGrade.label}
                            </div>
                            <span className="text-[9px] text-emerald-200 mt-0.5 font-medium">
                              {totalCompositeScore >= 3.80 ? 'Meets / Exceeds Standards' : 'Standard Standards'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SECTION 3: EVALUATION COMPONENTS */}

                  {/* CASE A: KPI FORM EVALUATION (PART A OBJECTIVES + PART B BEHAVIOURAL TRAITS) */}
                  {isKpiForm && (
                    <div className="space-y-6">
                      {/* PART A: SMART OBJECTIVES & KPIS */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-[#004d25] text-white px-3.5 py-2 rounded-t-xl">
                          <div className="flex items-center space-x-2">
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded">Part A</span>
                            <h4 className="text-xs font-black uppercase tracking-wider">
                              {isCoAppraiser 
                                ? 'Assigned Co-Appraisal Objectives & KPIs' 
                                : 'SMART Objectives & Key Performance Indicators (70% Fixed Weightage - Averaged)'}
                            </h4>
                          </div>
                          <span className="text-[10px] font-extrabold text-emerald-200">
                            Contribution: +{objScore.toFixed(2)} / 3.50
                          </span>
                        </div>

                        {isCoAppraiser && !evalObjectives.some(o => Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser)) ? (
                          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                            <Lock className="h-6 w-6 mx-auto text-slate-400" />
                            <p className="font-bold text-slate-800 text-sm">No Objectives Flagged for Co-Appraiser Review</p>
                            <p>The appraisee has not assigned any specific objectives to Co-Appraiser. All objectives will be evaluated by the 1st Appraiser and 2nd Appraiser.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {evalObjectives
                              .filter(obj => {
                                const isFlagged = Boolean(obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser);
                                if (isCoAppraiser) return isFlagged;
                                return true;
                              })
                              .map((obj, idx) => {
                                const isFlaggedForCoApp = Boolean(obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser);
                                const originalIdx = evalObjectives.findIndex(o => o.id === obj.id);
                                const currentRating = isCoAppraiser
                                  ? (obj.coAppraiserRating || obj.firstAppraiserRating)
                                  : isSecondAppraiser
                                  ? obj.secondAppraiserRating
                                  : obj.firstAppraiserRating;
                                const currentComments = isCoAppraiser
                                  ? (obj.coAppraiserComments || obj.firstAppraiserComments)
                                  : isSecondAppraiser
                                  ? obj.secondAppraiserComments
                                  : obj.firstAppraiserComments;

                                const isAssignedToCoAppOnly = isFirstAppraiser && isFlaggedForCoApp && hasCoAppraiser;

                                const baselineRating = isSecondAppraiser 
                                  ? (obj.firstAppraiserRating || obj.employeeSelfRating || 3) 
                                  : isCoAppraiser 
                                  ? (obj.employeeSelfRating || 3) 
                                  : (isFlaggedForCoApp && obj.coAppraiserRating ? obj.coAppraiserRating : (obj.employeeSelfRating || 3));
                                const baselineLabel = isSecondAppraiser 
                                  ? '1st Appraiser' 
                                  : (isFlaggedForCoApp && obj.coAppraiserRating && isFirstAppraiser ? 'Co-Appraiser' : 'Self-Rating');

                                const deltaInfo = getRatingDeltaInfo(currentRating, baselineRating, baselineLabel);

                                return (
                                  <div key={obj.id || idx} className="p-4 bg-white border border-slate-300 rounded-2xl space-y-3.5 shadow-xs hover:border-slate-400 transition-colors">
                                    {/* Objective Header & Prominent Previous Scores Display */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className="font-extrabold text-slate-900 text-sm">#{idx + 1}. {obj.title}</span>
                                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50 border-slate-300">
                                          Fixed 70% Objectives
                                        </Badge>
                                        {isFlaggedForCoApp && (
                                          <Badge className="bg-purple-700 text-white text-[10px] font-bold px-2 py-0.5">
                                            🎯 Co-Appraiser Goal
                                          </Badge>
                                        )}
                                      </div>

                                      {/* PROMINENT NUMERIC PREVIOUS SCORES */}
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 shrink-0">
                                        {/* Appraisee Self Score Box */}
                                        <div className="flex items-center bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1 text-emerald-950 shadow-2xs">
                                          <span className="text-[10px] uppercase font-black text-emerald-800 mr-1.5">👤 Self:</span>
                                          <span className="text-base font-black font-mono text-emerald-950">{obj.employeeSelfRating || 3}</span>
                                          <span className="text-[10px] text-emerald-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(obj.employeeSelfRating || 3)})</span>
                                        </div>

                                        {/* Co-Appraiser Score Box (Shown ONLY if Co-Appraiser is assigned to employee) */}
                                        {hasCoAppraiser && obj.coAppraiserRating && (
                                          <div className="flex items-center bg-purple-50 border border-purple-300 rounded-xl px-2.5 py-1 text-purple-950 shadow-2xs">
                                            <span className="text-[10px] uppercase font-black text-purple-800 mr-1.5">🎯 Co-App:</span>
                                            <span className="text-base font-black font-mono text-purple-950">{obj.coAppraiserRating}</span>
                                            <span className="text-[10px] text-purple-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(obj.coAppraiserRating)})</span>
                                          </div>
                                        )}

                                        {/* 1st Appraiser Score Box (Shown to 2nd Appraiser) */}
                                        {isSecondAppraiser && (
                                          <div className="flex items-center bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1 text-amber-950 shadow-2xs">
                                            <span className="text-[10px] uppercase font-black text-amber-800 mr-1.5">👔 1st App:</span>
                                            <span className="text-base font-black font-mono text-amber-950">{obj.firstAppraiserRating || 3}</span>
                                            <span className="text-[10px] text-amber-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(obj.firstAppraiserRating || 3)})</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Target and Achievement Descriptions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl text-xs border border-slate-200">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Target Description:</span>
                                        <p className="text-slate-800">{obj.targetDescription || 'Achieve designated annual banking operational and business goals.'}</p>
                                      </div>
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Employee Achievement Summary:</span>
                                        <p className="text-slate-900 font-medium">{obj.achievementDetails || 'Delivered targets in accordance with divisional KPIs and bank policy.'}</p>
                                      </div>
                                    </div>

                                    {/* 1st Appraiser Context & 1-Click Accept for 2nd Appraiser */}
                                    {isSecondAppraiser && (
                                      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs shadow-2xs space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] uppercase font-black text-amber-900">
                                            1st Appraiser Evaluation & Remarks
                                          </span>
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                              const updated = [...evalObjectives];
                                              const targetIdx = originalIdx !== -1 ? originalIdx : idx;
                                              const ratingToAccept = obj.firstAppraiserRating || 3;
                                              updated[targetIdx].secondAppraiserRating = ratingToAccept;
                                              if (!updated[targetIdx].secondAppraiserComments) {
                                                updated[targetIdx].secondAppraiserComments = "Accepted 1st Appraiser Rating.";
                                              }
                                              setEvalObjectives(updated);
                                            }}
                                            className="h-6 text-[10px] font-black bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                                          >
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Accept 1st Appraiser Rating ({obj.firstAppraiserRating || 3})
                                          </Button>
                                        </div>
                                        <p className="text-amber-950 italic font-medium">
                                          "{obj.firstAppraiserComments || 'No specific comments provided by 1st Appraiser.'}"
                                        </p>
                                      </div>
                                    )}

                                    {/* If 1st Appraiser viewing a Co-Appraiser flagged objective */}
                                    {isAssignedToCoAppOnly ? (
                                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center space-x-2">
                                          <Badge className="bg-purple-700 text-white font-bold text-[10px]">
                                            🎯 Co-Appraiser Assigned
                                          </Badge>
                                          <span className="font-semibold text-purple-950">
                                            Assigned exclusively for Co-Appraiser review ({evalReview.coAppraiserName || evalReview.coAppraiserSapId || 'Co-Appraiser'}).
                                          </span>
                                        </div>
                                        {obj.coAppraiserRating ? (
                                          <div className="flex items-center space-x-1.5">
                                            <span className="text-[11px] font-bold text-purple-800">Co-App Score:</span>
                                            <Badge className="bg-white text-purple-950 border border-purple-300 font-mono font-bold text-xs">
                                              {obj.coAppraiserRating} / 5
                                            </Badge>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-purple-700 font-medium italic">
                                            Awaiting Co-Appraiser Evaluation
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-2.5 pt-1">
                                        {/* CLICKABLE RATING PILLS & DYNAMIC DELTA INDICATOR */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                            <label className="font-bold text-slate-800 text-xs">
                                              {isCoAppraiser ? 'Co-Appraiser Rating:' : isSecondAppraiser ? '2nd Appraiser Rating:' : '1st Appraiser Rating:'}
                                            </label>

                                            {/* Dynamic Upgrade / Downgrade Visual Badge */}
                                            {deltaInfo && (
                                              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] border shadow-2xs ${deltaInfo.badgeClass}`}>
                                                {deltaInfo.icon === 'up' ? (
                                                  <TrendingUp className="h-3 w-3 text-emerald-700" />
                                                ) : deltaInfo.icon === 'down' ? (
                                                  <TrendingDown className="h-3 w-3 text-rose-700" />
                                                ) : (
                                                  <Minus className="h-3 w-3 text-slate-500" />
                                                )}
                                                <span>{deltaInfo.label}</span>
                                              </span>
                                            )}
                                          </div>

                                          {/* Clickable Rating Pills */}
                                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                            {[
                                              { val: 1, label: '1 — Unsat.', color: 'bg-rose-700 text-white border-rose-800 shadow-sm ring-2 ring-rose-500/20' },
                                              { val: 2, label: '2 — Needs Imp.', color: 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/20' },
                                              { val: 3, label: '3 — Good', color: 'bg-sky-700 text-white border-sky-800 shadow-sm ring-2 ring-sky-500/20' },
                                              { val: 4, label: '4 — Very Good', color: 'bg-teal-700 text-white border-teal-800 shadow-sm ring-2 ring-teal-500/20' },
                                              { val: 5, label: '5 — Outstanding', color: 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-500/20' }
                                            ].map((pill) => {
                                              const isSelected = currentRating === pill.val;
                                              return (
                                                <button
                                                  key={pill.val}
                                                  type="button"
                                                  disabled={isModalReadOnly}
                                                  onClick={() => {
                                                    const updated = [...evalObjectives];
                                                    const targetIdx = originalIdx !== -1 ? originalIdx : idx;
                                                    if (isCoAppraiser) {
                                                      updated[targetIdx].coAppraiserRating = pill.val;
                                                      updated[targetIdx].firstAppraiserRating = pill.val;
                                                    } else if (isSecondAppraiser) {
                                                      updated[targetIdx].secondAppraiserRating = pill.val;
                                                    } else {
                                                      updated[targetIdx].firstAppraiserRating = pill.val;
                                                    }
                                                    setEvalObjectives(updated);
                                                  }}
                                                  className={`px-2.5 py-1 rounded-xl font-black text-xs transition-all border ${
                                                    isSelected
                                                      ? pill.color
                                                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                                  } ${isModalReadOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                >
                                                  {pill.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <Input
                                          placeholder={isCoAppraiser ? "Enter Co-Appraiser observations for this flagged objective..." : "Enter appraiser remarks / performance observations for this objective..."}
                                          value={currentComments || ''}
                                          onChange={(e) => {
                                            const updated = [...evalObjectives];
                                            const targetIdx = originalIdx !== -1 ? originalIdx : idx;
                                            if (isCoAppraiser) {
                                              updated[targetIdx].coAppraiserComments = e.target.value;
                                              updated[targetIdx].firstAppraiserComments = e.target.value;
                                            } else if (isSecondAppraiser) {
                                              updated[targetIdx].secondAppraiserComments = e.target.value;
                                            } else {
                                              updated[targetIdx].firstAppraiserComments = e.target.value;
                                            }
                                            setEvalObjectives(updated);
                                          }}
                                          className="text-xs"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* PART B: BEHAVIOURAL COMPETENCIES (HIDDEN FOR CO-APPRAISER) */}
                      {!isCoAppraiser && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between bg-teal-800 text-white px-3.5 py-2 rounded-t-xl">
                            <div className="flex items-center space-x-2">
                              <span className="bg-teal-300 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded">Part B</span>
                              <h4 className="text-xs font-black uppercase tracking-wider">
                                Professional Competencies & Behavioural Traits (30% Fixed Weightage - Averaged)
                              </h4>
                            </div>
                            <span className="text-[10px] font-extrabold text-teal-200">
                              Contribution: +{traitScore.toFixed(2)} / 1.50
                            </span>
                          </div>

                          <div className="space-y-4">
                            {evalTraits.map((trait, idx) => {
                              const currentRating = isSecondAppraiser ? trait.secondAppraiserRating : trait.firstAppraiserRating;
                              const baselineRating = isSecondAppraiser ? (trait.firstAppraiserRating || 4) : 4;
                              const baselineLabel = isSecondAppraiser ? '1st Appraiser' : 'Benchmark';
                              const deltaInfo = getRatingDeltaInfo(currentRating, baselineRating, baselineLabel);

                              return (
                                <div key={trait.id || idx} className="p-4 bg-white border border-slate-300 rounded-2xl space-y-3 shadow-xs hover:border-slate-400 transition-colors">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <span className="font-extrabold text-slate-900 text-sm">#{idx + 1}. {trait.traitName}</span>
                                    
                                    <div className="flex items-center space-x-2">
                                      {isSecondAppraiser && (
                                        <div className="flex items-center bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1 text-amber-950 shadow-2xs">
                                          <span className="text-[10px] uppercase font-black text-amber-800 mr-1.5">👔 1st App:</span>
                                          <span className="text-base font-black font-mono text-amber-950">{trait.firstAppraiserRating || 4}</span>
                                          <span className="text-[10px] text-amber-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(trait.firstAppraiserRating || 4)})</span>
                                        </div>
                                      )}
                                      <Badge variant="outline" className="text-[10px] font-mono bg-teal-50 text-teal-900 border-teal-200">
                                        Fixed 30% Traits
                                      </Badge>
                                    </div>
                                  </div>

                                  <p className="text-slate-700 text-xs">{trait.definition}</p>

                                  {/* 1st Appraiser Context for 2nd Appraiser */}
                                  {isSecondAppraiser && (
                                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs shadow-2xs space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-black text-amber-900">
                                          1st Appraiser Assessment
                                        </span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => {
                                            const updated = [...evalTraits];
                                            const ratingToAccept = trait.firstAppraiserRating || 4;
                                            updated[idx].secondAppraiserRating = ratingToAccept;
                                            if (!updated[idx].secondAppraiserComments) {
                                              updated[idx].secondAppraiserComments = "Accepted 1st Appraiser Rating.";
                                            }
                                            setEvalTraits(updated);
                                          }}
                                          className="h-6 text-[10px] font-black bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Accept 1st Appraiser Rating ({trait.firstAppraiserRating || 4})
                                        </Button>
                                      </div>
                                      <p className="text-amber-950 italic font-medium">
                                        "{trait.firstAppraiserComments || 'No specific comments provided by 1st Appraiser.'}"
                                      </p>
                                    </div>
                                  )}

                                  {/* CLICKABLE RATING PILLS & DYNAMIC DELTA INDICATOR */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                      <label className="font-bold text-slate-800 text-xs">Trait Assessment Rating:</label>
                                      {deltaInfo && (
                                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] border shadow-2xs ${deltaInfo.badgeClass}`}>
                                          {deltaInfo.icon === 'up' ? (
                                            <TrendingUp className="h-3 w-3 text-emerald-700" />
                                          ) : deltaInfo.icon === 'down' ? (
                                            <TrendingDown className="h-3 w-3 text-rose-700" />
                                          ) : (
                                            <Minus className="h-3 w-3 text-slate-500" />
                                          )}
                                          <span>{deltaInfo.label}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Clickable Rating Pills */}
                                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                      {[
                                        { val: 1, label: '1 — Unsat.', color: 'bg-rose-700 text-white border-rose-800 shadow-sm ring-2 ring-rose-500/20' },
                                        { val: 2, label: '2 — Needs Imp.', color: 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/20' },
                                        { val: 3, label: '3 — Good', color: 'bg-sky-700 text-white border-sky-800 shadow-sm ring-2 ring-sky-500/20' },
                                        { val: 4, label: '4 — Very Good', color: 'bg-teal-700 text-white border-teal-800 shadow-sm ring-2 ring-teal-500/20' },
                                        { val: 5, label: '5 — Outstanding', color: 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-500/20' }
                                      ].map((pill) => {
                                        const isSelected = currentRating === pill.val;
                                        return (
                                          <button
                                            key={pill.val}
                                            type="button"
                                            disabled={isModalReadOnly}
                                            onClick={() => {
                                              const updated = [...evalTraits];
                                              if (isSecondAppraiser) updated[idx].secondAppraiserRating = pill.val;
                                              else updated[idx].firstAppraiserRating = pill.val;
                                              setEvalTraits(updated);
                                            }}
                                            className={`px-2.5 py-1 rounded-xl font-black text-xs transition-all border ${
                                              isSelected
                                                ? pill.color
                                                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                            } ${isModalReadOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                          >
                                            {pill.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASE B: BSC & RISK-ADJUSTED BSC FORMS (ORGANIZED BY STRATEGIC PERSPECTIVES) */}
                  {!isKpiForm && (
                    <div className="space-y-6">
                      <div className="border-b-2 border-slate-800 pb-1 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                          <Layers className="h-4 w-4 text-[#004d25]" />
                          <span>
                            {isRiskAdjusted 
                              ? 'Risk-Adjusted Balanced Scorecard (5 Strategic Perspectives)' 
                              : 'Balanced Scorecard Performance Evaluation (4 Strategic Perspectives)'}
                          </span>
                        </h3>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {isCoAppraiser 
                            ? '🎯 Filtering by Flagged Co-Appraisal Objectives' 
                            : 'Strategic Perspectives Total 100%'}
                        </span>
                      </div>

                      {perspectiveDataMap.map((pData, pIdx) => {
                        const cfg = pData.config;
                        const visibleItems = pData.items.filter(obj => {
                          const isFlagged = Boolean(obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser);
                          if (isCoAppraiser) return isFlagged;
                          return true;
                        });

                        return (
                          <div key={cfg.id} className="space-y-3 rounded-2xl border border-slate-300 overflow-hidden shadow-xs">
                            {/* Perspective Header Banner */}
                            <div className={`flex items-center justify-between ${cfg.bannerBg} px-3.5 py-2`}>
                              <div className="flex items-center space-x-2">
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                  Perspective {pIdx + 1}
                                </span>
                                <h4 className="text-xs font-black uppercase tracking-wide flex items-center space-x-1.5">
                                  {cfg.icon}
                                  <span>{cfg.name}</span>
                                  <span className="text-[10px] font-bold text-white/80">({cfg.weightage}% Weightage)</span>
                                </h4>
                              </div>
                              <span className="text-[10px] font-black text-white/90">
                                Raw Avg: {pData.rawAvg.toFixed(2)} / 5.00 • Weighted: +{pData.weightedScore.toFixed(2)} / {pData.maxScore.toFixed(2)}
                              </span>
                            </div>

                            {/* Perspective Body */}
                            <div className="p-4 bg-slate-50 space-y-4">
                              {visibleItems.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
                                  {isCoAppraiser 
                                    ? 'No objectives under this perspective were flagged for Co-Appraiser review.' 
                                    : 'No specific objectives recorded under this perspective.'}
                                </div>
                              ) : (
                                visibleItems.map((obj, idx) => {
                                  const isFlaggedForCoApp = Boolean(obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser);
                                  const originalIdx = evalObjectives.findIndex(o => o.id === obj.id);
                                  const currentRating = isCoAppraiser
                                    ? (obj.coAppraiserRating || obj.firstAppraiserRating)
                                    : isSecondAppraiser
                                    ? obj.secondAppraiserRating
                                    : obj.firstAppraiserRating;
                                  const currentComments = isCoAppraiser
                                    ? (obj.coAppraiserComments || obj.firstAppraiserComments)
                                    : isSecondAppraiser
                                    ? obj.secondAppraiserComments
                                    : obj.firstAppraiserComments;

                                  const isAssignedToCoAppOnly = isFirstAppraiser && isFlaggedForCoApp && hasCoAppraiser;

                                  const baselineRating = isSecondAppraiser 
                                    ? (obj.firstAppraiserRating || obj.employeeSelfRating || 3) 
                                    : isCoAppraiser 
                                    ? (obj.employeeSelfRating || 3) 
                                    : (isFlaggedForCoApp && obj.coAppraiserRating ? obj.coAppraiserRating : (obj.employeeSelfRating || 3));
                                  const baselineLabel = isSecondAppraiser 
                                    ? '1st Appraiser' 
                                    : (isFlaggedForCoApp && obj.coAppraiserRating && isFirstAppraiser ? 'Co-Appraiser' : 'Self-Rating');

                                  const deltaInfo = getRatingDeltaInfo(currentRating, baselineRating, baselineLabel);

                                  return (
                                    <div key={obj.id || idx} className="p-4 bg-white border border-slate-300 rounded-2xl space-y-3.5 shadow-xs hover:border-slate-400 transition-colors">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                          <span className="font-extrabold text-slate-900 text-sm">#{idx + 1}. {obj.title}</span>
                                          <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50 border-slate-300">
                                            {cfg.name.split(' ')[0]} ({cfg.weightage}%)
                                          </Badge>
                                          {isFlaggedForCoApp && (
                                            <Badge className="bg-purple-700 text-white text-[10px] font-bold px-2 py-0.5">
                                              🎯 Co-Appraiser Goal
                                            </Badge>
                                          )}
                                        </div>

                                        {/* PROMINENT NUMERIC PREVIOUS SCORES */}
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 shrink-0">
                                          {/* Appraisee Self Score Box */}
                                          <div className="flex items-center bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1 text-emerald-950 shadow-2xs">
                                            <span className="text-[10px] uppercase font-black text-emerald-800 mr-1.5">👤 Self:</span>
                                            <span className="text-base font-black font-mono text-emerald-950">{obj.employeeSelfRating || 3}</span>
                                            <span className="text-[10px] text-emerald-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(obj.employeeSelfRating || 3)})</span>
                                          </div>

                                          {/* Co-Appraiser Score Box */}
                                          {hasCoAppraiser && obj.coAppraiserRating && (
                                            <div className="flex items-center bg-purple-50 border border-purple-300 rounded-xl px-2.5 py-1 text-purple-950 shadow-2xs">
                                              <span className="text-[10px] uppercase font-black text-purple-800 mr-1.5">🎯 Co-App:</span>
                                              <span className="text-base font-black font-mono text-purple-950">{obj.coAppraiserRating}</span>
                                              <span className="text-[10px] text-purple-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(obj.coAppraiserRating)})</span>
                                            </div>
                                          )}

                                          {/* 1st Appraiser Score Box (Shown to 2nd Appraiser) */}
                                          {isSecondAppraiser && (
                                            <div className="flex items-center bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1 text-amber-950 shadow-2xs">
                                              <span className="text-[10px] uppercase font-black text-amber-800 mr-1.5">👔 1st App:</span>
                                              <span className="text-base font-black font-mono text-amber-950">{obj.firstAppraiserRating || 3}</span>
                                              <span className="text-[10px] text-amber-700 font-semibold ml-1">/ 5.0 ({getScoreLabel(obj.firstAppraiserRating || 3)})</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl text-xs border border-slate-200">
                                        <div>
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Target Description:</span>
                                          <p className="text-slate-800">{obj.targetDescription || 'Achieve designated annual banking operational and business goals.'}</p>
                                        </div>
                                        <div>
                                          <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Employee Achievement Summary:</span>
                                          <p className="text-slate-900 font-medium">{obj.achievementDetails || 'Delivered targets in accordance with divisional KPIs and bank policy.'}</p>
                                        </div>
                                      </div>

                                      {/* 1st Appraiser Context & 1-Click Accept for 2nd Appraiser */}
                                      {isSecondAppraiser && (
                                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs shadow-2xs space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-black text-amber-900">
                                              1st Appraiser Evaluation & Remarks
                                            </span>
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={() => {
                                                const updated = [...evalObjectives];
                                                const targetIdx = originalIdx !== -1 ? originalIdx : idx;
                                                const ratingToAccept = obj.firstAppraiserRating || 3;
                                                updated[targetIdx].secondAppraiserRating = ratingToAccept;
                                                if (!updated[targetIdx].secondAppraiserComments) {
                                                  updated[targetIdx].secondAppraiserComments = "Accepted 1st Appraiser Rating.";
                                                }
                                                setEvalObjectives(updated);
                                              }}
                                              className="h-6 text-[10px] font-black bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                                            >
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              Accept 1st Appraiser Rating ({obj.firstAppraiserRating || 3})
                                            </Button>
                                          </div>
                                          <p className="text-amber-950 italic font-medium">
                                            "{obj.firstAppraiserComments || 'No specific comments provided by 1st Appraiser.'}"
                                          </p>
                                        </div>
                                      )}

                                      {/* If 1st Appraiser viewing a Co-Appraiser flagged objective */}
                                      {isAssignedToCoAppOnly ? (
                                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <div className="flex items-center space-x-2">
                                            <Badge className="bg-purple-700 text-white font-bold text-[10px]">
                                              🎯 Co-Appraiser Assigned
                                            </Badge>
                                            <span className="font-semibold text-purple-950">
                                              Assigned exclusively for Co-Appraiser review ({evalReview.coAppraiserName || evalReview.coAppraiserSapId || 'Co-Appraiser'}).
                                            </span>
                                          </div>
                                          {obj.coAppraiserRating ? (
                                            <div className="flex items-center space-x-1.5">
                                              <span className="text-[11px] font-bold text-purple-800">Co-App Score:</span>
                                              <Badge className="bg-white text-purple-950 border border-purple-300 font-mono font-bold text-xs">
                                                {obj.coAppraiserRating} / 5
                                              </Badge>
                                            </div>
                                          ) : (
                                            <span className="text-[10px] text-purple-700 font-medium italic">
                                              Awaiting Co-Appraiser Evaluation
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-2.5 pt-1">
                                          {/* CLICKABLE RATING PILLS & DYNAMIC DELTA INDICATOR */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                              <label className="font-bold text-slate-800 text-xs">
                                                {isCoAppraiser ? 'Co-Appraiser Rating:' : isSecondAppraiser ? '2nd Appraiser Rating:' : '1st Appraiser Rating:'}
                                              </label>

                                              {/* Dynamic Upgrade / Downgrade Visual Badge */}
                                              {deltaInfo && (
                                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] border shadow-2xs ${deltaInfo.badgeClass}`}>
                                                  {deltaInfo.icon === 'up' ? (
                                                    <TrendingUp className="h-3 w-3 text-emerald-700" />
                                                  ) : deltaInfo.icon === 'down' ? (
                                                    <TrendingDown className="h-3 w-3 text-rose-700" />
                                                  ) : (
                                                    <Minus className="h-3 w-3 text-slate-500" />
                                                  )}
                                                  <span>{deltaInfo.label}</span>
                                                </span>
                                              )}
                                            </div>

                                            {/* Clickable Rating Pills */}
                                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                              {[
                                                { val: 1, label: '1 — Unsat.', color: 'bg-rose-700 text-white border-rose-800 shadow-sm ring-2 ring-rose-500/20' },
                                                { val: 2, label: '2 — Needs Imp.', color: 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/20' },
                                                { val: 3, label: '3 — Good', color: 'bg-sky-700 text-white border-sky-800 shadow-sm ring-2 ring-sky-500/20' },
                                                { val: 4, label: '4 — Very Good', color: 'bg-teal-700 text-white border-teal-800 shadow-sm ring-2 ring-teal-500/20' },
                                                { val: 5, label: '5 — Outstanding', color: 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-500/20' }
                                              ].map((pill) => {
                                                const isSelected = currentRating === pill.val;
                                                return (
                                                  <button
                                                    key={pill.val}
                                                    type="button"
                                                    disabled={isModalReadOnly}
                                                    onClick={() => {
                                                      const updated = [...evalObjectives];
                                                      const targetIdx = originalIdx !== -1 ? originalIdx : idx;
                                                      if (isCoAppraiser) {
                                                        updated[targetIdx].coAppraiserRating = pill.val;
                                                        updated[targetIdx].firstAppraiserRating = pill.val;
                                                      } else if (isSecondAppraiser) {
                                                        updated[targetIdx].secondAppraiserRating = pill.val;
                                                      } else {
                                                        updated[targetIdx].firstAppraiserRating = pill.val;
                                                      }
                                                      setEvalObjectives(updated);
                                                    }}
                                                    className={`px-2.5 py-1 rounded-xl font-black text-xs transition-all border ${
                                                      isSelected
                                                        ? pill.color
                                                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                                    } ${isModalReadOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                  >
                                                    {pill.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          <Input
                                            placeholder={isCoAppraiser ? "Enter Co-Appraiser observations for this flagged objective..." : "Enter appraiser remarks / performance observations for this objective..."}
                                            value={currentComments || ''}
                                            onChange={(e) => {
                                              const updated = [...evalObjectives];
                                              const targetIdx = originalIdx !== -1 ? originalIdx : idx;
                                              if (isCoAppraiser) {
                                                updated[targetIdx].coAppraiserComments = e.target.value;
                                                updated[targetIdx].firstAppraiserComments = e.target.value;
                                              } else if (isSecondAppraiser) {
                                                updated[targetIdx].secondAppraiserComments = e.target.value;
                                              } else {
                                                updated[targetIdx].firstAppraiserComments = e.target.value;
                                              }
                                              setEvalObjectives(updated);
                                            }}
                                            className="text-xs"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SECTION 5: OVERALL APPRAISER PERFORMANCE SUMMARY & CAREER RECOMMENDATIONS */}
                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                    <label className="font-bold text-slate-800 block text-xs">
                      {isCoAppraiser 
                        ? 'Co-Appraiser Overall Assessment Remarks:' 
                        : 'Overall Appraiser Performance Summary & Career Recommendations:'}
                    </label>
                    <textarea
                      rows={3}
                      value={evalAppraiserComments}
                      onChange={(e) => setEvalAppraiserComments(e.target.value)}
                      placeholder={isCoAppraiser ? "Provide overall Co-Appraiser summary remarks regarding the appraisee's project contributions..." : "Provide holistic assessment remarks, key strengths demonstrated, and recommended training or career progression areas..."}
                      readOnly={isModalReadOnly}
                      className={`w-full p-3 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none ${isModalReadOnly ? 'bg-slate-100 text-slate-800 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300'}`}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 3. MODAL ACTION FOOTER */}
            <div className="p-4 bg-slate-50 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {isModalReadOnly ? (
                <>
                  <div className="flex items-center space-x-2 text-xs text-slate-600 font-bold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Evaluation Record Sealed & Archived</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowPrintReport(true)} 
                      className="font-bold text-xs border-slate-300 text-slate-800 hover:bg-white"
                    >
                      <Printer className="h-4 w-4 mr-1.5 text-slate-600" />
                      Print / PDF Report
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowEvalModal(false)} className="font-bold text-xs">
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
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

                {(() => {
                  const isAwaitingCoAppraiser = isFirstAppraiser && (evalReview?.currentStatus === 'CoAppraiserReview' || evalReview?.currentStatus === 8 || evalReview?.currentStatus === '8');
                  const isAwaitingFirstAppraiser = isSecondAppraiser && (
                    evalReview?.currentStatus === 'CoAppraiserReview' || evalReview?.currentStatus === 8 || evalReview?.currentStatus === '8' ||
                    evalReview?.currentStatus === 'FirstAppraiserAssessment' || evalReview?.currentStatus === 6 || evalReview?.currentStatus === '6'
                  );
                  const isSubmitDisabled = savingEval || evalLoading || isAwaitingCoAppraiser || isAwaitingFirstAppraiser;

                  return (
                    <Button
                      variant="nbp"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to submit formal evaluation for ${evalReview.employeeName}?`)) {
                          handleSaveEvaluation(true);
                        }
                      }}
                      disabled={isSubmitDisabled}
                      title={
                        isAwaitingCoAppraiser
                          ? "Co-Appraiser must complete and submit evaluation first."
                          : isAwaitingFirstAppraiser
                          ? "1st Appraiser must complete and submit evaluation first."
                          : undefined
                      }
                      className={`font-bold text-xs text-white shadow-md ${
                        isAwaitingCoAppraiser || isAwaitingFirstAppraiser
                          ? 'bg-slate-400 cursor-not-allowed opacity-60'
                          : isSecondAppraiser
                          ? 'bg-amber-600 hover:bg-amber-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      {savingEval
                        ? 'Submitting...'
                        : isCoAppraiser
                        ? 'Submit Co-Appraisal (Forward to 1st Appraiser)'
                        : isSecondAppraiser
                        ? (isAwaitingFirstAppraiser ? 'Countersign (Awaiting 1st Appraiser)' : 'Countersign & Finalize Review')
                        : (isAwaitingCoAppraiser ? 'Submit (Awaiting Co-Appraiser Review)' : 'Submit 1st Appraiser Evaluation')}
                    </Button>
                  );
                })()}
              </div>
            </>
          )}
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
                  <Input value={editFirstSap} onChange={(e) => setEditFirstSap(e.target.value)} placeholder="1st Appraiser SAP ID..." />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Co-Appraiser SAP ID <span className="text-slate-500 font-normal">(Optional / Matrix Supervisor):</span>
                  </label>
                  <Input 
                    value={editCoSap} 
                    onChange={(e) => setEditCoSap(e.target.value)} 
                    placeholder="Enter Co-Appraiser SAP ID (or leave blank if none)..." 
                  />
                  {editCoSap && selectedReview?.coAppraiserName && (
                    <p className="text-[11px] text-teal-800 mt-1 font-medium">
                      🎯 Identified: <strong>{selectedReview.coAppraiserName}</strong> {selectedReview.coAppraiserDesignation ? `(${selectedReview.coAppraiserDesignation})` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Second Appraiser / Supervisor SAP ID:
                  </label>
                  <Input value={editSecondSap} onChange={(e) => setEditSecondSap(e.target.value)} placeholder="2nd Appraiser / Supervisor SAP ID..." />
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

      {showPrintReport && evalReview && (
        <AppraisalPrintableReport
          employeeCycle={{
            id: evalReview.employeeCycleId,
            snapshotGrade: evalReview.grade,
            snapshotDesignation: evalReview.designation,
            snapshotReportingGroup: evalReview.group,
            assignedFormType: evalReview.formType,
            employee: {
              fullName: evalReview.employeeName,
              sapId: evalReview.sapId,
              grade: evalReview.grade,
              designation: evalReview.designation,
              reportingGroup: evalReview.group
            },
            firstAppraiser: {
              fullName: evalReview.firstAppraiserName,
              sapId: evalReview.firstAppraiserSapId,
              designation: '1st Appraiser'
            },
            secondAppraiser: {
              fullName: evalReview.secondAppraiserName,
              sapId: evalReview.secondAppraiserSapId,
              designation: '2nd Appraiser'
            },
            coAppraiser: evalReview.coAppraiserSapId ? {
              fullName: evalReview.coAppraiserName || 'Co-Appraiser',
              sapId: evalReview.coAppraiserSapId,
              designation: 'Co-Appraiser'
            } : undefined
          }}
          objectives={evalObjectives}
          traits={evalTraits}
          score={{
            objectiveTotalScore: objScore,
            traitTotalScore: traitScore,
            finalCompositeScore: totalCompositeScore,
            finalRatingLevel: ratingGrade.label,
            appraiserComments: evalAppraiserComments
          }}
          developmentReview={evalDevReview}
          onClose={() => setShowPrintReport(false)}
          isModal={true}
        />
      )}
    </div>
  );
};
