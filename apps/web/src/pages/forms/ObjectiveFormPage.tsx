import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Send,
  UserCheck,
  Edit3,
  Clock,
  XCircle,
  X,
  AlertTriangle,
  Layers,
  DollarSign,
  Users as UsersIcon,
  Cog,
  GraduationCap,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Scale,
  History,
  Lock,
  Unlock,
  Download,
  FileText,
  CheckCircle,
  Calendar,
  ArrowRight,
  FileCheck,
  ChevronRight,
  Printer,
  Sparkles,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  ClipboardList,
  BarChart3,
  Eye
} from 'lucide-react';

import { ScoreSelector } from '@/components/appraisal/ScoreSelector';
import { WeightageAllocationBar, BlockWeightageConfig } from '@/components/appraisal/WeightageAllocationBar';
import { AppraisalBlockCard } from '@/components/appraisal/AppraisalBlockCard';
import { KPIAssessmentItem, KPIItemData } from '@/components/appraisal/KPIAssessmentItem';
import { BehaviouralTraitItem, TraitItemData } from '@/components/appraisal/BehaviouralTraitItem';
import { RiskAdjustmentItem, RiskItemData } from '@/components/appraisal/RiskAdjustmentItem';
import { AppraisalSummaryPanel } from '@/components/appraisal/AppraisalSummaryPanel';
import { ScoreBreakdownDrawer, BlockBreakdownSummary } from '@/components/appraisal/ScoreBreakdownDrawer';
import { ValidationSummaryPanel, ValidationErrorItem } from '@/components/appraisal/ValidationSummaryPanel';
import { EvidenceUploaderModal } from '@/components/appraisal/EvidenceUploaderModal';
import { EvidenceViewerModal } from '@/components/appraisal/EvidenceViewerModal';
import { AppraisalFormAuditHistoryDrawer } from '@/components/appraisal/AppraisalFormAuditHistoryDrawer';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';
import { formatGradeLabel, formatGroupLabel } from '@/lib/formatters';

interface ObjectiveFormPageProps {
  formType?: 'KPI' | 'BSC' | 'RISK_BSC';
  userRole?: string;
}

export const ObjectiveFormPage: React.FC<ObjectiveFormPageProps> = ({
  formType: initialFormType = 'KPI',
  userRole: initialRole = 'Employee',
}) => {
  // ─── Tab Navigation ───
  const [activeTab, setActiveTab] = useState<'cycles' | 'form' | 'review'>('cycles');

  // ─── Cycle & History State ───
  const [openCycles, setOpenCycles] = useState<any[]>([]);
  const [selectedEmployeeCycleId, setSelectedEmployeeCycleId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPastArchives, setShowPastArchives] = useState(false);

  // ─── Form Mode & Role ───
  const [formMode, setFormMode] = useState<'KPI' | 'BSC' | 'RISK_BSC'>(initialFormType);
  const [currentUserRole, setCurrentUserRole] = useState<string>(initialRole);

  // ─── Employee Cycle Data ───
  const [empCycleData, setEmpCycleData] = useState<any>(null);
  const [appraiserStatus, setAppraiserStatus] = useState<'Validated' | 'PendingConfirmation' | 'UnlockedForRevision' | 'Rejected' | 'Draft'>('Draft');
  const [firstAppraiserName, setFirstAppraiserName] = useState('Tariq Mahmood (VP - ESG 05)');
  const [secondAppraiserName, setSecondAppraiserName] = useState('Rashid Khan (SVP - ESG 04)');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // ─── Appraiser Profile Info ───
  const [firstAppraiserInfo, setFirstAppraiserInfo] = useState<any>(null);
  const [secondAppraiserInfo, setSecondAppraiserInfo] = useState<any>(null);
  const [coAppraiserInfo, setCoAppraiserInfo] = useState<any>(null);

  // ─── Update Appraiser Modal ───
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [inputFirstSap, setInputFirstSap] = useState('10004');
  const [inputSecondSap, setInputSecondSap] = useState('10003');
  const [inputCoAppSap, setInputCoAppSap] = useState('');
  const [updatingAppraiser, setUpdatingAppraiser] = useState(false);

  // ─── Disagreement Modal ───
  const [showDisagreementModal, setShowDisagreementModal] = useState(false);
  const [disagreementReason, setDisagreementReason] = useState('');
  const [submittingDisagreement, setSubmittingDisagreement] = useState(false);
  const [agreeingAppraisal, setAgreeingAppraisal] = useState(false);

  // ─── Audit History ───
  const [showAuditHistoryModal, setShowAuditHistoryModal] = useState(false);

  // ─── Collapsible Sections ───
  const [appraiserSectionOpen, setAppraiserSectionOpen] = useState(false);
  const [weightageBarOpen, setWeightageBarOpen] = useState(false);

  // ─── Form State - Block Weightages ───
  const [blocks, setBlocks] = useState<BlockWeightageConfig[]>([]);

  // ─── Form Item Data ───
  const [kpiItems, setKpiItems] = useState<KPIItemData[]>([]);
  const [traitItems, setTraitItems] = useState<TraitItemData[]>([]);
  const [financialItems, setFinancialItems] = useState<KPIItemData[]>([]);
  const [customerItems, setCustomerItems] = useState<KPIItemData[]>([]);
  const [processItems, setProcessItems] = useState<KPIItemData[]>([]);
  const [learningItems, setLearningItems] = useState<KPIItemData[]>([]);
  const [riskItems, setRiskItems] = useState<RiskItemData[]>([]);

  // ─── Drawer & Modal States ───
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [evidenceModalItem, setEvidenceModalItem] = useState<{ title: string; ref: string } | null>(null);
  const [viewEvidenceItem, setViewEvidenceItem] = useState<{ title: string; ref: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [developmentReview, setDevelopmentReview] = useState<any>(null);

  // ─── Initialize Block Weightages ───
  useEffect(() => {
    if (formMode === 'KPI') {
      setBlocks([
        { id: 'kpis', title: 'KPIs / Objectives Block', weightage: 70, colorClass: 'bg-emerald-700', icon: <Layers className="h-5 w-5 text-emerald-400" /> },
        { id: 'traits', title: 'Behavioural Traits Block', weightage: 30, colorClass: 'bg-teal-700', icon: <GraduationCap className="h-5 w-5 text-teal-400" /> },
      ]);
    } else if (formMode === 'BSC') {
      setBlocks([
        { id: 'financial', title: 'Financial & Strategic Perspective', weightage: 30, colorClass: 'bg-emerald-700', icon: <DollarSign className="h-5 w-5 text-emerald-400" /> },
        { id: 'customer', title: 'Customer Centricity Perspective', weightage: 25, colorClass: 'bg-blue-700', icon: <UsersIcon className="h-5 w-5 text-blue-400" /> },
        { id: 'process', title: 'Internal Controls & Processes', weightage: 25, colorClass: 'bg-purple-700', icon: <Cog className="h-5 w-5 text-purple-400" /> },
        { id: 'learning', title: 'Learning & Organizational Growth', weightage: 20, colorClass: 'bg-amber-700', icon: <GraduationCap className="h-5 w-5 text-amber-400" /> },
      ]);
    } else {
      setBlocks([
        { id: 'financial', title: 'Financial Perspective', weightage: 25, colorClass: 'bg-emerald-700', icon: <DollarSign className="h-5 w-5 text-emerald-400" /> },
        { id: 'customer', title: 'Customer Perspective', weightage: 20, colorClass: 'bg-blue-700', icon: <UsersIcon className="h-5 w-5 text-blue-400" /> },
        { id: 'process', title: 'Internal Controls & Processes', weightage: 20, colorClass: 'bg-purple-700', icon: <Cog className="h-5 w-5 text-purple-400" /> },
        { id: 'learning', title: 'Learning & Growth', weightage: 15, colorClass: 'bg-amber-700', icon: <GraduationCap className="h-5 w-5 text-amber-400" /> },
        { id: 'risk', title: 'Risk Adjustment Perspective', weightage: 20, colorClass: 'bg-rose-700', icon: <ShieldAlert className="h-5 w-5 text-rose-400" /> },
      ]);
    }
  }, [formMode]);

  // ─── Load Open Cycles ───
  const loadOpenCycles = async () => {
    try {
      const list = await api.getMyCycles('84920');
      if (list && list.length > 0) {
        setOpenCycles(list);
        if (!selectedEmployeeCycleId) {
          const firstActive = list.find((c: any) => c.isCycleActive !== false) || list[0];
          setSelectedEmployeeCycleId(firstActive.employeeCycleId);
        }
      }
    } catch (e) {
      console.error('Failed to load active cycles:', e);
    }
  };

  // ─── Load My Appraisal Data ───
  const [formLoading, setFormLoading] = useState(true);
  const loadMyAppraisal = async (empCycleId?: string) => {
    setFormLoading(true);
    try {
      const targetId = empCycleId || selectedEmployeeCycleId || undefined;
      const data = await api.getMyAppraisal('84920', undefined, targetId);
      if (data && data.employeeCycle) {
        setEmpCycleData(data.employeeCycle);
        setSelectedEmployeeCycleId(data.employeeCycle.id);
        const vStatus = data.employeeCycle.appraiserValidationStatus || 'Draft';
        setAppraiserStatus(vStatus as any);
        setRejectionReason(data.employeeCycle.appraiserRejectionReason || null);

        // Set form type based on assigned form
        const ft = data.employeeCycle.assignedFormType;
        const ftStr = String(ft || '').toLowerCase();
        if (ft === 3 || ftStr === 'riskadjustedbsc' || ftStr.includes('risk') || data.employeeCycle.snapshotIsMrtOrMrc) {
          setFormMode('RISK_BSC');
        } else if (ft === 2 || ftStr === 'balancedscorecard' || ftStr.includes('scorecard') || ftStr.includes('bsc')) {
          setFormMode('BSC');
        } else {
          setFormMode('KPI');
        }

        // Auto-collapse appraiser section if validated
        setAppraiserSectionOpen(vStatus !== 'Validated');

        if (data.employeeCycle.firstAppraiser) {
          const fa = data.employeeCycle.firstAppraiser;
          setFirstAppraiserName(`${fa.fullName} (${formatGradeLabel(fa.grade)} - SAP ID: ${fa.sapId})`);
          setFirstAppraiserInfo(fa);
          setInputFirstSap(fa.sapId);
        } else if (data.employeeCycle.pendingFirstAppraiserSapId) {
          setInputFirstSap(data.employeeCycle.pendingFirstAppraiserSapId);
        }

        if (data.employeeCycle.secondAppraiser) {
          const sa = data.employeeCycle.secondAppraiser;
          setSecondAppraiserName(`${sa.fullName} (${formatGradeLabel(sa.grade)} - SAP ID: ${sa.sapId})`);
          setSecondAppraiserInfo(sa);
          setInputSecondSap(sa.sapId);
        } else if (data.employeeCycle.pendingSecondAppraiserSapId) {
          setInputSecondSap(data.employeeCycle.pendingSecondAppraiserSapId);
        }

        if (data.employeeCycle.coAppraiser) {
          setCoAppraiserInfo(data.employeeCycle.coAppraiser);
          setInputCoAppSap(data.employeeCycle.coAppraiser.sapId);
        } else if (data.employeeCycle.pendingCoAppraiserSapId) {
          setInputCoAppSap(data.employeeCycle.pendingCoAppraiserSapId);
        }

        if (data.developmentReview) {
          setDevelopmentReview(data.developmentReview);
        } else if (data.employeeCycle.workflowStatus >= 6) { // if at least submitted to first appraiser
          setDevelopmentReview({
            keyStrengths: 'Strong analytical skills and problem-solving abilities. Consistently meets and often exceeds targets.',
            developmentAreas: 'Needs to improve on cross-departmental communication and presentation skills to senior management.',
            trainingActionPlan: 'Enroll in advanced communication workshops and participate in cross-functional projects in the upcoming cycle.',
            supervisorComments: 'A valuable team member with great potential. Focusing on these development areas will prepare them for future leadership roles.'
          });
        } else {
          setDevelopmentReview(null);
        }

        // Map Objectives from DB to KPI items
        if (data.objectives && data.objectives.length > 0) {
          const mapped: KPIItemData[] = data.objectives.map((o: any, idx: number) => ({
            id: o.id || `kpi-${idx + 1}`,
            title: o.title || '',
            targetDescription: o.targetDescription || '',
            achievement: o.achievementDetails || '',
            employeeComments: '',
            appraiserComments: '',
            appraiserRating: o.firstAppraiserRating || 0,
            evidenceRef: '',
          }));
          setKpiItems(mapped);
        } else {
          setKpiItems([
            { id: 'kpi-1', title: 'Branch Deposit Growth & Portfolio Expansion', targetDescription: 'Achieve 15% YoY growth in CASA deposits across Karachi Central commercial accounts.', achievement: 'Successfully increased branch deposits by 18.2% through targeted corporate account campaigns.', employeeComments: 'Exceeded target by 3.2% with proactive client engagement.', appraiserComments: 'Commendable performance in deposit mobilization.', appraiserRating: 4, evidenceRef: 'Q4_CASA_Deposit_Report.pdf' },
            { id: 'kpi-2', title: 'NPL Reduction & Credit Portfolio Quality', targetDescription: 'Maintain gross NPL ratio below 2.5% and execute timely recovery on overdue loans.', achievement: 'Recovered PKR 14.5M in overdue facilities, bringing NPL ratio down to 2.1%.', employeeComments: 'Strict adherence to credit risk guidelines and regular monitoring.', appraiserComments: 'Proactive credit monitoring and effective recovery actions.', appraiserRating: 4, evidenceRef: 'NPL_Recovery_Summary_2026.xlsx' },
            { id: 'kpi-3', title: 'Digital Banking Adoption & Customer Service Excellence', targetDescription: 'Drive digital onboarding adoption to 80% and resolve customer complaints within SLA.', achievement: 'Achieved 86% digital banking conversion with zero escalated complaints.', employeeComments: 'Conducted customer awareness sessions and streamlined digital setup.', appraiserComments: 'Excellent customer satisfaction and digital drive.', appraiserRating: 5, evidenceRef: 'Digital_Onboarding_Audit.pdf' },
          ]);
        }

        setFinancialItems([
          { id: 'fin-1', title: 'Revenue Growth & Spreads Optimization', targetDescription: 'Achieve 18% YoY growth in Net Interest Income and Fee-based income across portfolio.', achievement: 'Exceeded NII target by 21.4% with structured corporate financing products.', employeeComments: 'Strong pipeline conversion.', appraiserComments: 'Excellent revenue performance.', appraiserRating: 4, evidenceRef: 'FY26_NII_Financial_Summary.pdf' },
          { id: 'fin-2', title: 'Cost-to-Income Optimization', targetDescription: 'Maintain departmental operating cost-to-income ratio below 48%.', achievement: 'Achieved cost-to-income ratio of 45.2% via digital processing efficiencies.', employeeComments: 'Streamlined vendor workflows.', appraiserComments: 'Prudent cost management.', appraiserRating: 4, evidenceRef: 'Cost_Optimization_Review.xlsx' },
        ]);
        setCustomerItems([
          { id: 'cust-1', title: 'Tier-1 Client Retention & Net Promoter Score', targetDescription: 'Maintain 95%+ client retention rate and achieve NPS > 75 across key institutional clients.', achievement: 'Achieved 97.5% corporate retention with an audited NPS of 82.', employeeComments: 'Quarterly relationship reviews held consistently.', appraiserComments: 'Outstanding client satisfaction scores.', appraiserRating: 5, evidenceRef: 'Customer_NPS_Survey_2026.pdf' },
          { id: 'cust-2', title: 'Digital Corporate Banking Portal Adoption', targetDescription: 'Migrate 80% of active commercial relationships to digital corporate banking portal.', achievement: 'Onboarded 84% of corporate clients onto portal with high volume transactions.', employeeComments: 'Dedicated training webinars conducted.', appraiserComments: 'Strong digital drive and client enablement.', appraiserRating: 4, evidenceRef: 'Digital_Portal_Adoption_Audit.pdf' },
        ]);
        setProcessItems([
          { id: 'proc-1', title: 'Internal Audit & SBP Regulatory Compliance', targetDescription: 'Zero repeat audit observations and 100% adherence to SBP Prudential Regulations.', achievement: 'Clean audit clearance with zero high-risk exceptions during annual inspection.', employeeComments: 'Conducted regular pre-audit control health checks.', appraiserComments: 'Exemplary compliance record.', appraiserRating: 5, evidenceRef: 'Audit_Compliance_Report_2026.pdf' },
          { id: 'proc-2', title: 'Credit Proposal Processing Turnaround Time (TAT)', targetDescription: 'Reduce average credit proposal review TAT from 12 days to 6 working days.', achievement: 'Average TAT brought down to 5.4 days via automated credit scorecards.', employeeComments: 'Standardized appraisal packs.', appraiserComments: 'Noticeable turnaround efficiency gain.', appraiserRating: 4, evidenceRef: 'Credit_TAT_Metrics_Q4.xlsx' },
        ]);
        setLearningItems([
          { id: 'learn-1', title: 'Mandatory Compliance & Anti-Financial Crime Certifications', targetDescription: 'Ensure 100% of departmental staff complete AML/CFT, Sanctions and Cybersecurity courses.', achievement: '100% team completion achieved within Q2 ahead of SBP regulatory deadline.', employeeComments: 'Monitored team compliance weekly.', appraiserComments: 'Proactive team management and training governance.', appraiserRating: 5, evidenceRef: 'Learning_Compliance_Register.pdf' },
          { id: 'learn-2', title: 'Talent Succession & Capability Building', targetDescription: 'Identify and groom successors for all key critical operational roles.', achievement: 'Developed 3 ready-now successor candidates across corporate and risk units.', employeeComments: 'Structured rotation and mentorship program.', appraiserComments: 'Valuable leadership and coaching impact.', appraiserRating: 4, evidenceRef: 'Talent_Succession_Plan_2026.pdf' },
        ]);
        setRiskItems([
          { id: 'risk-1', title: 'Operational Risk Incident Control & Limit Excess Management', description: 'Ensure strict compliance with operational risk threshold and unauthorized exposure limits.', complianceTarget: 'Zero operational risk loss incidents and zero unauthorized credit limit excess breaches.', actualComplianceResult: 'Zero operational losses recorded; all temporary limit excesses properly sanctioned.', appraiserComments: 'Robust risk posture and control.', appraiserRating: 5, evidenceRef: 'Risk_Loss_Register_2026.pdf' },
          { id: 'risk-2', title: 'Risk-Adjusted Return on Capital (RAROC) Governance', description: 'Ensure portfolio pricing aligns with capital risk-adjusted return hurdle.', complianceTarget: 'Ensure all new credit facilities meet bank minimum hurdle RAROC of 16.5%.', actualComplianceResult: 'Weighted portfolio RAROC delivered at 18.2% across newly originated facilities.', appraiserComments: 'Disciplined capital and risk allocation.', appraiserRating: 4, evidenceRef: 'RAROC_Capital_Pricing_Audit.pdf' },
        ]);

        if (data.traits && data.traits.length > 0) {
          const mappedTraits: TraitItemData[] = data.traits.map((t: any, idx: number) => ({
            id: t.id || `trait-${idx + 1}`,
            name: t.traitName || '',
            definition: t.definition || '',
            expectedBehaviour: '',
            appraiserComments: '',
            appraiserRating: t.firstAppraiserRating || 0,
          }));
          setTraitItems(mappedTraits);
        } else {
          setTraitItems([
            { id: 'trait-1', name: 'Integrity, Ethics & Professional Conduct', definition: 'Demonstrates uncompromising adherence to NBP Code of Conduct, AML/KYC policies, and regulatory banking standards.', expectedBehaviour: 'Upholds ethical banking standards at all times.', appraiserComments: 'Exemplary ethics and compliance track record.', appraiserRating: 5 },
            { id: 'trait-2', name: 'Leadership, Teamwork & Collaboration', definition: 'Inspires team members, fosters cross-departmental collaboration, and mentors junior staff effectively.', expectedBehaviour: 'Proactively supports colleagues and cross-functional teams.', appraiserComments: 'Strong team player and collaborative colleague.', appraiserRating: 4 },
            { id: 'trait-3', name: 'Customer Centricity & Service Delivery', definition: 'Prioritizes customer needs, resolves complex complaints efficiently, and delivers superior branch banking experience.', expectedBehaviour: 'Maintains highest standards of client service.', appraiserComments: 'Consistently receives positive customer feedback.', appraiserRating: 4 },
          ]);
        }
      }
    } catch (e: any) {
      console.error('Failed to load appraisal data:', e);
      setErrorMessage('Failed to load appraisal data from server.');
    } finally {
      setFormLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getAppraisalHistory('84920');
      setHistoryList(data);
    } catch (e: any) {
      console.error('Failed to load appraisal history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadOpenCycles();
    loadMyAppraisal();
  }, []);

  const handleCycleSelect = (empCycleId: string) => {
    setSelectedEmployeeCycleId(empCycleId);
    loadMyAppraisal(empCycleId);
    setActiveTab('form');
  };

  useEffect(() => {
    if (showPastArchives && historyList.length === 0) {
      loadHistory();
    }
  }, [showPastArchives]);

  // ─── Action Handlers (preserved from original) ───

  const handleRequestAppraiserUpdate = async () => {
    if (!inputFirstSap || !inputSecondSap) {
      setErrorMessage("Both First Appraiser and Second Appraiser / Supervisor SAP IDs are required.");
      return;
    }
    setUpdatingAppraiser(true);
    setErrorMessage(null);
    try {
      if (empCycleData?.id) {
        const res = await api.requestAppraiserUpdate(empCycleData.id, {
          firstAppraiserSapId: inputFirstSap,
          secondAppraiserSapId: inputSecondSap,
          coAppraiserSapId: inputCoAppSap || undefined,
        });
        setMessage(res.message);
        setShowUpdateModal(false);
        await loadMyAppraisal(empCycleData.id);
      } else {
        setAppraiserStatus('PendingConfirmation');
        setMessage("Appraiser & Supervisor update requested. Awaiting confirmation from your appraiser.");
        setShowUpdateModal(false);
      }
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    } finally {
      setUpdatingAppraiser(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!empCycleData?.id) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const objsToSave: any[] = [];
      if (formMode === 'KPI') {
        kpiItems.forEach((k) => { objsToSave.push({ title: k.title, targetDescription: k.targetDescription, achievementDetails: k.achievement, weightage: 10, evidenceReference: k.evidenceRef }); });
      } else {
        [...financialItems, ...customerItems, ...processItems, ...learningItems].forEach((k) => { objsToSave.push({ title: k.title, targetDescription: k.targetDescription, achievementDetails: k.achievement, weightage: 10, evidenceReference: k.evidenceRef }); });
        if (formMode === 'RISK_BSC') {
          riskItems.forEach((r) => { objsToSave.push({ title: r.title, targetDescription: r.complianceTarget, achievementDetails: r.actualComplianceResult, weightage: 10, evidenceReference: r.evidenceRef }); });
        }
      }
      await api.saveObjectives(empCycleData.id, objsToSave);
      setMessage("Appraisal draft saved successfully. You can return and continue anytime.");
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setSaving(false); }
  };

  const handleSubmitSelfAssessment = async () => {
    if (!empCycleData?.id) return;
    if (appraiserStatus !== 'Validated') {
      setErrorMessage("You cannot submit your appraisal until your reporting line has been confirmed and validated by your supervisor.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const objsToSave: any[] = [];
      if (formMode === 'KPI') {
        kpiItems.forEach((k) => { objsToSave.push({ title: k.title, targetDescription: k.targetDescription, achievementDetails: k.achievement, weightage: 10, evidenceReference: k.evidenceRef }); });
      } else {
        [...financialItems, ...customerItems, ...processItems, ...learningItems].forEach((k) => { objsToSave.push({ title: k.title, targetDescription: k.targetDescription, achievementDetails: k.achievement, weightage: 10, evidenceReference: k.evidenceRef }); });
        if (formMode === 'RISK_BSC') {
          riskItems.forEach((r) => { objsToSave.push({ title: r.title, targetDescription: r.complianceTarget, achievementDetails: r.actualComplianceResult, weightage: 10, evidenceReference: r.evidenceRef }); });
        }
      }
      await api.saveObjectives(empCycleData.id, objsToSave);
      const res = await api.submitSelfAssessment(empCycleData.id, '84920');
      setMessage(res.message || "Self assessment submitted to your evaluators successfully.");
      await loadMyAppraisal(empCycleData.id);
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setSubmitting(false); }
  };

  const handleAgreeAppraisal = async () => {
    if (!empCycleData?.id) return;
    setAgreeingAppraisal(true);
    setErrorMessage(null);
    try {
      const res = await api.agreeAppraisal(empCycleData.id, '84920');
      setMessage(res.message || "Appraisal acknowledged and agreed successfully. Form is now permanently locked.");
      await loadMyAppraisal(empCycleData.id);
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setAgreeingAppraisal(false); }
  };

  const handleRecordDisagreement = async () => {
    if (!empCycleData?.id) return;
    if (!disagreementReason.trim()) { setErrorMessage("Please enter a mandatory justification for your disagreement."); return; }
    setSubmittingDisagreement(true);
    setErrorMessage(null);
    try {
      const res = await api.recordDisagreement(empCycleData.id, '84920', disagreementReason.trim());
      setMessage(res.message || "Disagreement lodged successfully. Awaiting supervisor and management review.");
      setShowDisagreementModal(false);
      setDisagreementReason('');
      await loadMyAppraisal(empCycleData.id);
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setSubmittingDisagreement(false); }
  };

  const handleDownloadPdf = () => { window.print(); };

  // ─── Score Calculations ───
  const calculateAverageScore = (scores: number[]): number => {
    const validScores = scores.filter((s) => s > 0);
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
  };

  const getBlockScores = (blockId: string) => {
    let scores: number[] = [];
    if (blockId === 'kpis') scores = kpiItems.map((i) => i.appraiserRating);
    else if (blockId === 'traits') scores = traitItems.map((i) => i.appraiserRating);
    else if (blockId === 'financial') scores = financialItems.map((i) => i.appraiserRating);
    else if (blockId === 'customer') scores = customerItems.map((i) => i.appraiserRating);
    else if (blockId === 'process') scores = processItems.map((i) => i.appraiserRating);
    else if (blockId === 'learning') scores = learningItems.map((i) => i.appraiserRating);
    else if (blockId === 'risk') scores = riskItems.map((i) => i.appraiserRating);
    const raw = calculateAverageScore(scores);
    const blockWeight = blocks.find((b) => b.id === blockId)?.weightage || 0;
    const weighted = raw * (blockWeight / 100);
    const completed = scores.filter((s) => s > 0).length;
    return { raw, weighted, itemCount: scores.length, completedCount: completed };
  };

  const blockBreakdowns: BlockBreakdownSummary[] = blocks.map((b) => {
    const stats = getBlockScores(b.id);
    return { id: b.id, title: b.title, weightage: b.weightage, itemCount: stats.itemCount, completedCount: stats.completedCount, rawScore: stats.raw, weightedScore: stats.weighted };
  });

  const totalConfiguredWeight = blocks.reduce((sum, b) => sum + b.weightage, 0);
  const isWeightValid = Math.abs(totalConfiguredWeight - 100) < 0.1;
  const overallWeightedScore = blockBreakdowns.reduce((sum, b) => sum + b.weightedScore, 0);
  const totalItemCount = blockBreakdowns.reduce((sum, b) => sum + b.itemCount, 0);
  const totalCompletedCount = blockBreakdowns.reduce((sum, b) => sum + b.completedCount, 0);
  const activeRawScores = blockBreakdowns.filter((b) => b.rawScore > 0).map((b) => b.rawScore);
  const overallRawScore = activeRawScores.length > 0 ? activeRawScores.reduce((sum, s) => sum + s, 0) / activeRawScores.length : 0;

  const getRatingLabel = (score: number) => {
    if (score >= 4.5) return 'Outstanding';
    if (score >= 3.5) return 'Very Good';
    if (score >= 2.5) return 'Good';
    if (score >= 1.5) return 'Needs Improvement';
    if (score > 0) return 'Unsatisfactory';
    return 'Pending Evaluation';
  };
  const finalRatingLabel = getRatingLabel(overallRawScore);

  // ─── Workflow Status ───
  const currentStatus = (empCycleData?.currentStatus || 'ObjectiveDraft').toString();
  const isLineValidated = appraiserStatus === 'Validated';
  const isUnderReview = ['FirstAppraiserAssessment', 'CoAppraiserReview', 'SecondAppraiserReview', 'GroupPerformanceManagerReview', 'PmwFinalization', '6', '7', '8', '9', '10'].some((s) => currentStatus.includes(s));
  const isPublished = currentStatus === 'Published' || currentStatus === '11';
  const isAgreedOrClosed = ['EmployeeAgreed', 'DisagreementResolved', 'AdministrativelyCompleted', '12', '16', '17'].some((s) => currentStatus.includes(s));
  const isDisagreed = currentStatus === 'EmployeeDisagreed' || currentStatus === 'DisagreementGpmReview' || currentStatus === '13' || currentStatus === '14';
  const isReadOnly = isUnderReview || isPublished || isAgreedOrClosed || isDisagreed;

  const validationErrors: ValidationErrorItem[] = [];
  if (!isWeightValid) {
    validationErrors.push({ id: 'weight-mismatch', blockTitle: 'Overall Perspective Weightages', fieldLabel: 'Total Weightage', message: `Total weightage across perspectives must equal exactly 100% (Current: ${totalConfiguredWeight}%).` });
  }

  const handleSaveEvidenceForAnyItem = (title: string, ref: string) => {
    setKpiItems(kpiItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setFinancialItems(financialItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setCustomerItems(customerItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setProcessItems(processItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setLearningItems(learningItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setRiskItems(riskItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setMessage(`Supporting document evidence (${ref}) attached successfully.`);
  };

  // ─── Helper functions ───
  const getFormLabel = (c: any) => {
    const ft = String(c?.assignedFormType || '').toLowerCase();
    if (ft.includes('risk') || c?.assignedFormType === '3' || c?.assignedFormType === 3) return '5-P Risk BSC';
    if (ft.includes('kpi') || c?.assignedFormType === '1' || c?.assignedFormType === 1) return 'KPI (70/30)';
    return '4-P Balanced Scorecard';
  };
  const getFormColor = (c: any) => {
    const ft = String(c?.assignedFormType || '').toLowerCase();
    if (ft.includes('risk') || c?.assignedFormType === '3' || c?.assignedFormType === 3) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (ft.includes('kpi') || c?.assignedFormType === '1' || c?.assignedFormType === 1) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };
  const getStatusLabel = (status: string) => {
    if (status === 'ObjectiveDraft' || status === '1') return 'Drafting';
    if (status === 'AnnualReviewSelfAssessment' || status === '5') return 'Self-Assessment';
    if (status.includes('FirstAppraiser') || status === '6') return 'Under 1st Review';
    if (status.includes('CoAppraiser') || status === '8') return 'Co-Appraiser Review';
    if (status.includes('SecondAppraiser') || status === '7') return 'Under 2nd Review';
    if (status.includes('GroupPerformance') || status === '9') return 'GPM Review';
    if (status.includes('PmwFinalization') || status === '10') return 'PMW Finalizing';
    if (status === 'Published' || status === '11') return 'Published';
    if (status === 'EmployeeAgreed' || status === '12') return 'Agreed';
    if (status === 'EmployeeDisagreed' || status === '13') return 'Disagreed';
    return status;
  };
  const getStatusColor = (status: string) => {
    if (status === 'Published' || status === '11') return 'bg-blue-100 text-blue-800';
    if (status === 'EmployeeAgreed' || status === '12') return 'bg-emerald-100 text-emerald-800';
    if (status === 'EmployeeDisagreed' || status === '13') return 'bg-red-100 text-red-800';
    if (['FirstAppraiserAssessment', 'CoAppraiserReview', 'SecondAppraiserReview', 'GroupPerformanceManagerReview', 'PmwFinalization', '6', '7', '8', '9', '10'].some((s) => status.includes(s))) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  };

  const selectedCycle = openCycles.find(c => c.employeeCycleId === selectedEmployeeCycleId);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto pb-16">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #ccc !important; box-shadow: none !important; }
        }
      `}</style>

      {/* ═══ COMPACT HEADER ═══ */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 px-5 py-4 text-white no-print rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-white tracking-tight">My Appraisals</h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white/10 text-emerald-300">
                  SAP: {empCycleData?.employee?.sapId || '84920'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {empCycleData?.employee?.fullName || 'Fawaz Ahmed'} • {formatGradeLabel(empCycleData?.snapshotGrade || '06')} • {empCycleData?.snapshotDesignation || 'Officer'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAuditHistoryModal(true)} className="text-[11px] font-bold border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white h-8">
            <History className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            Audit Trail
          </Button>
        </div>
      </div>

      {/* ═══ TABS CONTAINER ═══ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="no-print">
        {/* Tab Navigation */}
        <TabsList className="bg-white border-x border-b border-slate-200 rounded-none px-2 gap-1">
          <TabsTrigger value="cycles" className="gap-2 rounded-t-lg data-[state=active]:rounded-t-lg">
            <LayoutGrid className="h-4 w-4" />
            <span>My Cycles</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${activeTab === 'cycles' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {openCycles.filter(c => c.isCycleActive !== false).length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-2 rounded-t-lg">
            <ClipboardList className="h-4 w-4" />
            <span>Appraisal Form</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2 rounded-t-lg">
            <BarChart3 className="h-4 w-4" />
            <span>Review & Results</span>
            {(isUnderReview || isPublished) && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Flash Messages (visible across all tabs) */}
        <div className="px-1 pt-3 space-y-2">
          {message && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold">
              <div className="flex items-center space-x-2"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /><span>{message}</span></div>
              <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs ml-3">✕</button>
            </div>
          )}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between font-semibold">
              <div className="flex items-center space-x-2"><AlertCircle className="h-4 w-4 text-red-700 shrink-0" /><span>{errorMessage}</span></div>
              <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs ml-3">✕</button>
            </div>
          )}
        </div>

        {/* ═══ TAB 1: MY CYCLES ═══ */}
        <TabsContent value="cycles">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Cycles</h3>
            </div>
            <div className="space-y-1.5">
              {openCycles.filter(c => c.isCycleActive !== false).map((c) => {
                const isSelected = selectedEmployeeCycleId === c.employeeCycleId;
                return (
                  <div key={c.employeeCycleId} onClick={() => handleCycleSelect(c.employeeCycleId)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                          <span className="text-sm font-bold text-slate-900 truncate">{c.cycleTitle}</span>
                          <Badge className={`text-[10px] font-bold border ${getFormColor(c)}`}>{getFormLabel(c)}</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span>{formatGradeLabel(c.snapshotGrade)} • {c.snapshotDesignation || 'Officer'}</span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Due: {new Date(c.acknowledgementDeadline || '2026-12-15').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Badge className={`text-[10px] font-bold ${getStatusColor(c.currentStatus || '')}`}>{getStatusLabel(c.currentStatus || 'ObjectiveDraft')}</Badge>
                      <ChevronRight className={`h-4 w-4 transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                    </div>
                  </div>
                );
              })}
              {openCycles.filter(c => c.isCycleActive !== false).length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold">No active appraisal cycles found.</p>
                  <p className="text-slate-400 mt-1">You'll see your assigned cycles here when a new evaluation period opens.</p>
                </div>
              )}
            </div>
          </div>

          {/* Past Archives Accordion */}
          <div className="border-t border-slate-100 pt-3">
            <button onClick={() => setShowPastArchives(!showPastArchives)} className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Past Archives & Closed Cycles</span>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full normal-case">
                  {openCycles.filter(c => c.isCycleActive === false).length + historyList.length}
                </span>
              </div>
              {showPastArchives ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {showPastArchives && (
              <div className="mt-2 space-y-2">
                {loadingHistory ? (
                  <div className="p-6 text-center text-xs text-slate-500"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />Loading historical records...</div>
                ) : (
                  <>
                    {openCycles.filter(c => c.isCycleActive === false).map((closedCycle) => (
                      <div key={closedCycle.employeeCycleId} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"><Lock className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-slate-700 truncate">{closedCycle.cycleTitle}</span>
                              <Badge className={`text-[10px] font-bold border ${getFormColor(closedCycle)}`}>{getFormLabel(closedCycle)}</Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{formatGradeLabel(closedCycle.snapshotGrade)} • Closed & Archived</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedEmployeeCycleId(closedCycle.employeeCycleId); loadMyAppraisal(closedCycle.employeeCycleId); setActiveTab('form'); setMessage(`Viewing read-only form for closed cycle '${closedCycle.cycleTitle}'.`); }} className="text-[11px] font-bold h-7 border-slate-300 text-slate-700 hover:bg-white">
                            <Eye className="h-3 w-3 mr-1" />View
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="text-[11px] font-bold h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                            <Printer className="h-3 w-3 mr-1" />PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                    {historyList.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-slate-800 truncate">{rec.cycleName}</span>
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 rounded">{rec.cycleYear}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                              <span>Score: <strong className="text-emerald-800">{rec.finalScore}/100</strong></span>
                              <span className="text-slate-300">|</span>
                              <span>Rating: <strong className="text-emerald-800">{rec.finalRating}</strong></span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="text-[11px] font-bold h-7 border-slate-300 text-slate-700 hover:bg-slate-50">
                          <Printer className="h-3 w-3 mr-1" />PDF
                        </Button>
                      </div>
                    ))}
                    {openCycles.filter(c => c.isCycleActive === false).length === 0 && historyList.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400">No archived records found.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        </TabsContent>

        {/* ═══ TAB 2: APPRAISAL FORM ═══ */}
        <TabsContent value="form">
        <div className="space-y-3 pt-3 px-1">
          {/* Context Bar */}
          {selectedCycle && (
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <span className="text-sm font-bold text-slate-900">{selectedCycle.cycleTitle || empCycleData?.cycle?.title || 'Current Cycle'}</span>
                <Badge className={`text-[10px] font-bold border ${getFormColor(selectedCycle || empCycleData)}`}>
                  {formMode === 'KPI' ? 'KPI Form (70/30)' : formMode === 'BSC' ? '4-P Balanced Scorecard' : '5-P Risk BSC'}
                </Badge>
                <Badge className={`text-[10px] font-bold ${getStatusColor(currentStatus)}`}>{getStatusLabel(currentStatus)}</Badge>
              </div>
              <button onClick={() => setActiveTab('cycles')} className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline shrink-0">Switch Cycle →</button>
            </div>
          )}

          {!selectedCycle && !empCycleData && (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <LayoutGrid className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No Cycle Selected</p>
              <p className="text-xs text-slate-500 mt-1">Go to the My Cycles tab to select an appraisal cycle.</p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('cycles')} className="mt-3 text-xs font-bold">Go to My Cycles</Button>
            </div>
          )}

          {(selectedCycle || empCycleData) && (
            <>
              {/* Collapsible Appraiser Section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setAppraiserSectionOpen(!appraiserSectionOpen)} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">Reporting Line</span>
                    {appraiserStatus === 'Validated' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold flex items-center space-x-1"><CheckCircle2 className="h-3 w-3" /><span>Confirmed</span></Badge>
                    ) : appraiserStatus === 'PendingConfirmation' ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold flex items-center space-x-1"><Clock className="h-3 w-3" /><span>Pending</span></Badge>
                    ) : appraiserStatus === 'Rejected' ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-bold flex items-center space-x-1"><AlertTriangle className="h-3 w-3" /><span>Rejected</span></Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">Needs Setup</Badge>
                    )}
                    {!appraiserSectionOpen && appraiserStatus === 'Validated' && (
                      <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">— {firstAppraiserInfo?.fullName || 'N/A'} → {secondAppraiserInfo?.fullName || 'N/A'}</span>
                    )}
                  </div>
                  {appraiserSectionOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {appraiserSectionOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-3">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs space-y-0.5">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">1st Appraiser</div>
                        <div className="font-bold text-slate-900 truncate">{firstAppraiserInfo?.fullName || (inputFirstSap ? `SAP: ${inputFirstSap}` : 'Not designated')}</div>
                        <div className="text-slate-500 text-[11px]">{formatGradeLabel(firstAppraiserInfo?.grade)} • {firstAppraiserInfo?.designation || '—'}</div>
                      </div>
                      <div className="p-2.5 bg-teal-50 border border-teal-100 rounded-lg text-xs space-y-0.5">
                        <div className="text-[10px] text-teal-700 font-bold uppercase">2nd Appraiser / Supervisor</div>
                        <div className="font-bold text-slate-900 truncate">{secondAppraiserInfo?.fullName || (inputSecondSap ? `SAP: ${inputSecondSap}` : 'Not designated')}</div>
                        <div className="text-slate-500 text-[11px]">{formatGradeLabel(secondAppraiserInfo?.grade)} • {secondAppraiserInfo?.designation || '—'}</div>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Co-Appraiser (Optional)</div>
                        <div className="font-bold text-slate-900 truncate">{coAppraiserInfo?.fullName || (inputCoAppSap ? `SAP: ${inputCoAppSap}` : 'None')}</div>
                        <div className="text-slate-500 text-[11px]">{formatGradeLabel(coAppraiserInfo?.grade)} • {coAppraiserInfo?.designation || '—'}</div>
                      </div>
                    </div>
                    {appraiserStatus === 'PendingConfirmation' && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center space-x-2">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" /><span><strong>Pending:</strong> Awaiting confirmation by your supervisor.</span>
                      </div>
                    )}
                    {appraiserStatus === 'Rejected' && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-[11px] flex items-center space-x-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" /><span><strong>Returned:</strong> {rejectionReason || 'Please update and re-submit.'}</span>
                      </div>
                    )}
                    {appraiserStatus !== 'Validated' && appraiserStatus !== 'PendingConfirmation' && (
                      <Button variant="outline" size="sm" onClick={() => setShowUpdateModal(true)} className="text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50">
                        <Edit3 className="h-3.5 w-3.5 mr-1" />Setup / Update Appraisers
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Gate: Line not validated */}
              {!isLineValidated && !isReadOnly && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <Lock className="h-8 w-8 text-amber-500 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-sm">Form Locked</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">Your reporting line must be confirmed before you can fill the form.</p>
                  <Button variant="outline" size="sm" onClick={() => { setAppraiserSectionOpen(true); setShowUpdateModal(true); }} className="text-xs font-bold mt-1">
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Manage Reporting Line
                  </Button>
                </div>
              )}

              {/* Form Content */}
              {(isLineValidated || isReadOnly) && (
                <div className="space-y-3">
                  {/* Weightage Bar (Collapsible) */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden no-print">
                    <button onClick={() => setWeightageBarOpen(!weightageBarOpen)} className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-2">
                        <Scale className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700">Perspective Weightages</span>
                        <span className="text-[11px] text-slate-400">({blocks.map(b => `${b.title.split(' ')[0]} ${b.weightage}%`).join(', ')})</span>
                      </div>
                      {weightageBarOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {weightageBarOpen && (
                      <div className="px-3 pb-3 border-t border-slate-100">
                        <WeightageAllocationBar blocks={blocks} onChange={(updatedBlocks) => setBlocks(updatedBlocks)} readOnly={isReadOnly} />
                      </div>
                    )}
                  </div>

                  {/* KPI Form */}
                  {formMode === 'KPI' && (
                    <>
                      <AppraisalBlockCard id="kpis" title="Part A: KPIs & Objectives" description="Define targets, achievements, and supporting evidence." weightage={blocks.find((b) => b.id === 'kpis')?.weightage || 70} itemCount={kpiItems.length} completedCount={kpiItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(kpiItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('kpis').weighted} colorTheme="emerald" defaultExpanded={false}>
                        <div className="space-y-3">
                          {kpiItems.map((item, idx) => (
                            <KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole}
                              onChange={(updated: KPIItemData) => setKpiItems(kpiItems.map((i) => (i.id === updated.id ? updated : i)))}
                              onRemove={() => setKpiItems(kpiItems.filter((i) => i.id !== item.id))}
                              onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                              onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                            />
                          ))}
                          {!isReadOnly && (
                            <Button variant="outline" size="sm" onClick={() => setKpiItems([...kpiItems, { id: `kpi-${kpiItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-emerald-400 text-emerald-800 hover:bg-emerald-50 w-full py-2 no-print">
                              <Plus className="h-4 w-4 mr-1.5" />Add Objective
                            </Button>
                          )}
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="traits" title="Part B: Behavioural Traits" description="Integrity, teamwork, service excellence competencies." weightage={blocks.find((b) => b.id === 'traits')?.weightage || 30} itemCount={traitItems.length} completedCount={traitItems.filter((t) => t.appraiserRating > 0).length} rawScore={calculateAverageScore(traitItems.map((t) => t.appraiserRating))} weightedScore={getBlockScores('traits').weighted} colorTheme="teal" defaultExpanded={false}>
                        <div className="space-y-3">
                          {traitItems.map((trait, idx) => (
                            <BehaviouralTraitItem key={trait.id} index={idx} data={trait} readOnly={isReadOnly} userRole={currentUserRole}
                              onChange={(updated: TraitItemData) => setTraitItems(traitItems.map((t) => (t.id === updated.id ? updated : t)))}
                            />
                          ))}
                        </div>
                      </AppraisalBlockCard>
                    </>
                  )}

                  {/* BSC / Risk BSC Form */}
                  {(formMode === 'BSC' || formMode === 'RISK_BSC') && (
                    <>
                      <AppraisalBlockCard id="financial" title="P1: Financial & Strategic" description="Revenue, cost optimization, NII." weightage={blocks.find((b) => b.id === 'financial')?.weightage || (formMode === 'BSC' ? 30 : 25)} itemCount={financialItems.length} completedCount={financialItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(financialItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('financial').weighted} colorTheme="emerald" defaultExpanded={false}>
                        <div className="space-y-3">
                          {financialItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setFinancialItems(financialItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setFinancialItems(financialItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          {!isReadOnly && (<Button variant="outline" size="sm" onClick={() => setFinancialItems([...financialItems, { id: `fin-${financialItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-emerald-400 text-emerald-800 hover:bg-emerald-50 w-full py-2 no-print"><Plus className="h-4 w-4 mr-1.5" />Add Financial Objective</Button>)}
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="customer" title="P2: Customer Centricity" description="Client satisfaction, NPS, onboarding." weightage={blocks.find((b) => b.id === 'customer')?.weightage || (formMode === 'BSC' ? 25 : 20)} itemCount={customerItems.length} completedCount={customerItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(customerItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('customer').weighted} colorTheme="blue" defaultExpanded={false}>
                        <div className="space-y-3">
                          {customerItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setCustomerItems(customerItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setCustomerItems(customerItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          {!isReadOnly && (<Button variant="outline" size="sm" onClick={() => setCustomerItems([...customerItems, { id: `cust-${customerItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-blue-400 text-blue-800 hover:bg-blue-50 w-full py-2 no-print"><Plus className="h-4 w-4 mr-1.5" />Add Customer Objective</Button>)}
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="process" title="P3: Internal Controls & Compliance" description="Audit, risk controls, TAT, regulatory." weightage={blocks.find((b) => b.id === 'process')?.weightage || (formMode === 'BSC' ? 25 : 20)} itemCount={processItems.length} completedCount={processItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(processItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('process').weighted} colorTheme="purple" defaultExpanded={false}>
                        <div className="space-y-3">
                          {processItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setProcessItems(processItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setProcessItems(processItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          {!isReadOnly && (<Button variant="outline" size="sm" onClick={() => setProcessItems([...processItems, { id: `proc-${processItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-purple-400 text-purple-800 hover:bg-purple-50 w-full py-2 no-print"><Plus className="h-4 w-4 mr-1.5" />Add Process Objective</Button>)}
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="learning" title="P4: Learning & Growth" description="Certifications, capability building, succession." weightage={blocks.find((b) => b.id === 'learning')?.weightage || (formMode === 'BSC' ? 20 : 15)} itemCount={learningItems.length} completedCount={learningItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(learningItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('learning').weighted} colorTheme="amber" defaultExpanded={false}>
                        <div className="space-y-3">
                          {learningItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setLearningItems(learningItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setLearningItems(learningItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          {!isReadOnly && (<Button variant="outline" size="sm" onClick={() => setLearningItems([...learningItems, { id: `learn-${learningItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-amber-400 text-amber-800 hover:bg-amber-50 w-full py-2 no-print"><Plus className="h-4 w-4 mr-1.5" />Add Learning Objective</Button>)}
                        </div>
                      </AppraisalBlockCard>
                      {formMode === 'RISK_BSC' && (
                        <AppraisalBlockCard id="risk" title="P5: Risk Adjustment (MRT/MRC)" description="RAROC, limit governance, risk posture." weightage={blocks.find((b) => b.id === 'risk')?.weightage || 20} itemCount={riskItems.length} completedCount={riskItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(riskItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('risk').weighted} colorTheme="rose" defaultExpanded={false}>
                          <div className="space-y-3">
                            {riskItems.map((item, idx) => (<RiskAdjustmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: RiskItemData) => setRiskItems(riskItems.map((i) => (i.id === updated.id ? updated : i)))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                            {!isReadOnly && (<Button variant="outline" size="sm" onClick={() => setRiskItems([...riskItems, { id: `risk-${riskItems.length + 1}`, title: '', description: '', complianceTarget: '', actualComplianceResult: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-rose-400 text-rose-800 hover:bg-rose-50 w-full py-2 no-print"><Plus className="h-4 w-4 mr-1.5" />Add Risk Objective</Button>)}
                          </div>
                        </AppraisalBlockCard>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Sticky Action Bar */}
              {!isReadOnly && isLineValidated && (
                <div className="fixed bottom-0 left-0 right-0 z-50 no-print">
                  <div className="max-w-6xl mx-auto px-4 pb-4">
                    <div className="flex items-center justify-between p-3 bg-white/95 backdrop-blur-lg border border-slate-200 rounded-xl shadow-lg">
                      <div className="text-xs text-slate-600">
                        <span className="font-bold text-slate-800">{totalCompletedCount}/{totalItemCount}</span> items scored • Weighted: <span className="font-bold text-emerald-700">{overallWeightedScore.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 h-8">
                          <Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button size="sm" onClick={handleSubmitSelfAssessment} disabled={submitting} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md h-8">
                          <Send className="h-3.5 w-3.5 mr-1" />{submitting ? 'Submitting...' : 'Submit to Appraisers'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </TabsContent>

        {/* ═══ TAB 3: REVIEW & RESULTS ═══ */}
        <TabsContent value="review">
        <div className="p-4 space-y-4">
          {selectedCycle && (
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="font-bold text-slate-800">{selectedCycle.cycleTitle || empCycleData?.cycle?.title || 'Current Cycle'}</span>
              <Badge className={`text-[10px] font-bold ${getStatusColor(currentStatus)}`}>{getStatusLabel(currentStatus)}</Badge>
            </div>
          )}

          {isUnderReview && (
            <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0"><Clock className="h-5 w-5 animate-spin" /></div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm">Under Review</h3>
                    <p className="text-xs text-amber-800 mt-0.5">Pipeline: {firstAppraiserInfo?.fullName || '1st Appraiser'} → Co-Appraiser → {secondAppraiserInfo?.fullName || 'Supervisor'} → PMW</p>
                    <Badge className="bg-amber-200 text-amber-950 border-amber-300 text-[10px] font-bold mt-1.5">Current Stage: {getStatusLabel(currentStatus)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(isPublished || isAgreedOrClosed || isDisagreed) && (
            <Card className={`border-2 shadow-md ${isAgreedOrClosed ? 'border-emerald-500 bg-emerald-50/80' : isDisagreed ? 'border-amber-500 bg-amber-50/80' : 'border-blue-500 bg-blue-50/80'}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-base font-black text-slate-900">
                    {isAgreedOrClosed ? 'Appraisal Finalized & Locked' : isDisagreed ? 'Disagreement Under Review' : 'Published — Acknowledgment Required'}
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  {isAgreedOrClosed ? 'You have formally acknowledged your appraisal. This document is sealed.' : isDisagreed ? 'Your comments are under review with GPM and PMW.' : 'Review your scores below, then confirm or submit a disagreement.'}
                </p>
                <div className="grid grid-cols-3 gap-3 p-3 bg-white/80 rounded-xl border border-slate-200">
                  <div className="text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Weighted Score</div><div className="text-xl font-black text-emerald-800">{overallWeightedScore.toFixed(2)}</div></div>
                  <div className="text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Raw Average</div><div className="text-xl font-black text-slate-800">{overallRawScore.toFixed(2)} / 5.0</div></div>
                  <div className="text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Rating</div><div className="text-lg font-black text-emerald-700">{finalRatingLabel}</div></div>
                </div>
                <div className="space-y-1.5">
                  {blockBreakdowns.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-700">{b.title}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-500">{b.weightage}%</span>
                        <span className="font-bold text-slate-800">{b.rawScore > 0 ? b.rawScore.toFixed(2) : '—'}</span>
                        <span className="font-bold text-emerald-700">+{b.weightedScore.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  {isPublished && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setShowDisagreementModal(true)} className="border-red-300 text-red-700 hover:bg-red-50 font-bold text-xs"><XCircle className="h-4 w-4 mr-1" />Disagree</Button>
                      <Button size="sm" onClick={handleAgreeAppraisal} disabled={agreeingAppraisal} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md"><CheckCircle2 className="h-4 w-4 mr-1" />{agreeingAppraisal ? 'Submitting...' : 'Agree & Acknowledge'}</Button>
                    </>
                  )}
                  {(isAgreedOrClosed || isDisagreed) && (
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-bold text-xs"><Printer className="h-4 w-4 mr-1.5" />Download PDF</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {developmentReview && (
            <Card className="border border-indigo-200 shadow-sm mt-4 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-white px-5 py-3 border-b border-indigo-100 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-indigo-700" />
                <h3 className="text-sm font-bold text-indigo-950">Development Feedback & Action Plan</h3>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-indigo-100">
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Key Strengths</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{developmentReview.keyStrengths || '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Areas for Development</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{developmentReview.developmentAreas || '—'}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 bg-slate-50/50">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Training & Action Plan</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{developmentReview.trainingActionPlan || '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Supervisor Comments</h4>
                      <p className="text-sm text-slate-700 italic">{developmentReview.supervisorComments || 'No additional comments provided.'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isUnderReview && !isPublished && !isAgreedOrClosed && !isDisagreed && (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
              <BarChart3 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">Nothing Here Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Review results will appear here once your appraisal is submitted and reviewed. Complete your form in the Appraisal Form tab.</p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('form')} className="mt-3 text-xs font-bold"><ClipboardList className="h-3.5 w-3.5 mr-1" />Go to Form</Button>
            </div>
          )}
        </div>
        </TabsContent>
      </Tabs>

      {/* ═══ MODALS (Preserved) ═══ */}
      {showDisagreementModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-red-800/40 p-2 flex items-center justify-center border border-red-500/30"><XCircle className="h-5 w-5 text-red-400" /></div>
                <div><h3 className="text-base font-bold text-white leading-tight">Formal Appraisal Disagreement</h3><p className="text-[11px] text-red-200">Mandatory Justification Required</p></div>
              </div>
              <button onClick={() => setShowDisagreementModal(false)} className="text-slate-300 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">Please provide detailed factual justification for your disagreement. This will be escalated to GPM and PMW Administration.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mandatory Justification <span className="text-red-500">*</span></label>
                <textarea rows={5} value={disagreementReason} onChange={(e) => setDisagreementReason(e.target.value)} placeholder="Explain why you disagree with specific scores or comments..." className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none font-medium" />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowDisagreementModal(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleRecordDisagreement} disabled={submittingDisagreement || !disagreementReason.trim()} className="font-bold text-xs">{submittingDisagreement ? 'Submitting...' : 'Submit Disagreement'}</Button>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30"><UserCheck className="h-5 w-5 text-emerald-400" /></div>
                <div><h3 className="text-base font-bold text-white leading-tight">Setup / Update Reporting Line</h3><p className="text-[11px] text-slate-300">Designate evaluators for this cycle</p></div>
              </div>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-300 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">Type a SAP ID or staff name to search. Submitting sends confirmation to nominated appraisers.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <SapIdAutocomplete label="First Appraiser (Mandatory)" value={inputFirstSap} onChange={(sapId) => setInputFirstSap(sapId)} onEmployeeSelected={(emp) => { if (emp) setFirstAppraiserInfo(emp); }} placeholder="e.g. 10004 or Tariq Mahmood" required />
                  {firstAppraiserInfo && (<div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] space-y-0.5 text-slate-700"><div className="font-bold text-emerald-950">{firstAppraiserInfo.fullName}</div><div>{formatGradeLabel(firstAppraiserInfo.grade)} • {firstAppraiserInfo.designation}</div><div className="text-[10px] text-slate-500">🏢 {formatGroupLabel(firstAppraiserInfo.reportingGroup)}</div></div>)}
                </div>
                <div className="space-y-1.5">
                  <SapIdAutocomplete label="Second Appraiser / Supervisor (Mandatory)" value={inputSecondSap} onChange={(sapId) => setInputSecondSap(sapId)} onEmployeeSelected={(emp) => { if (emp) setSecondAppraiserInfo(emp); }} placeholder="e.g. 10003 or Rashid Khan" required />
                  {secondAppraiserInfo && (<div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-[11px] space-y-0.5 text-slate-700"><div className="font-bold text-teal-950">{secondAppraiserInfo.fullName}</div><div>{formatGradeLabel(secondAppraiserInfo.grade)} • {secondAppraiserInfo.designation}</div><div className="text-[10px] text-slate-500">🏢 {formatGroupLabel(secondAppraiserInfo.reportingGroup)}</div></div>)}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <SapIdAutocomplete label="Co-Appraiser (Optional)" value={inputCoAppSap} onChange={(sapId) => setInputCoAppSap(sapId)} onEmployeeSelected={(emp) => { if (emp) setCoAppraiserInfo(emp); }} placeholder="Optional SAP ID or staff name..." />
                  {coAppraiserInfo && (<div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-0.5 text-slate-700"><div className="font-bold text-slate-900">{coAppraiserInfo.fullName}</div><div>{formatGradeLabel(coAppraiserInfo.grade)} • {coAppraiserInfo.designation}</div><div className="text-[10px] text-slate-500">🏢 {formatGroupLabel(coAppraiserInfo.reportingGroup)}</div></div>)}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowUpdateModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleRequestAppraiserUpdate} disabled={updatingAppraiser || !inputFirstSap || !inputSecondSap} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">{updatingAppraiser ? 'Submitting...' : 'Save & Submit for Confirmation'}</Button>
            </div>
          </div>
        </div>
      )}

      <AppraisalFormAuditHistoryDrawer isOpen={showAuditHistoryModal} onClose={() => setShowAuditHistoryModal(false)} employeeCycleId={empCycleData?.id} />
      {evidenceModalItem && (<EvidenceUploaderModal isOpen={!!evidenceModalItem} onClose={() => setEvidenceModalItem(null)} itemTitle={evidenceModalItem.title} currentEvidence={evidenceModalItem.ref} onSaveEvidence={(ref) => handleSaveEvidenceForAnyItem(evidenceModalItem.title, ref)} />)}
      {viewEvidenceItem && (<EvidenceViewerModal isOpen={!!viewEvidenceItem} onClose={() => setViewEvidenceItem(null)} itemTitle={viewEvidenceItem.title} evidenceRef={viewEvidenceItem.ref} />)}
    </div>
  );
};
