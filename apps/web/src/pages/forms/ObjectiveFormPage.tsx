import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { AppraisalPrintableReport } from '@/components/appraisal/AppraisalPrintableReport';
import { SetWorkflowStageModal } from '@/components/admin/SetWorkflowStageModal';
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
  Shield,
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
  Eye,
  Mail,
  Upload,
  Paperclip,
  FileSpreadsheet
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
  currentUser?: any;
  formType?: 'KPI' | 'BSC' | 'RISK_BSC';
  userRole?: string;
}

export const ObjectiveFormPage: React.FC<ObjectiveFormPageProps> = ({
  currentUser,
  formType: initialFormType = 'KPI',
  userRole: initialRole = 'Employee',
}) => {
  const currentSapId = currentUser?.sapId || currentUser?.username || '84920';
  const effectiveRole = initialRole || currentUser?.role || (currentUser?.roles && currentUser?.roles[0]) || 'Employee';
  const isPmwAdmin = ['PmwSuperAdmin', 'PmwAdmin'].includes(effectiveRole);

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
  const [currentUserRole, setCurrentUserRole] = useState<string>(effectiveRole);

  // ─── Employee Cycle Data ───
  const [empCycleData, setEmpCycleData] = useState<any>(null);
  const [appraisalScore, setAppraisalScore] = useState<any>(null);
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

  // ─── Disagreement Modal & Supporting Document ───
  const [showDisagreementModal, setShowDisagreementModal] = useState(false);
  const [disagreementReason, setDisagreementReason] = useState('');
  const [submittingDisagreement, setSubmittingDisagreement] = useState(false);
  const [agreeingAppraisal, setAgreeingAppraisal] = useState(false);
  const [disagreementFile, setDisagreementFile] = useState<File | null>(null);
  const [disagreementFileData, setDisagreementFileData] = useState<string | null>(null);
  const [disagreementFileName, setDisagreementFileName] = useState<string>('');
  const [disagreementFileSize, setDisagreementFileSize] = useState<number>(0);
  const [disagreementFileType, setDisagreementFileType] = useState<string>('');

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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAdminStageModal, setShowAdminStageModal] = useState(false);
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
      const list = await api.getMyCycles(currentSapId);
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
      const data = await api.getMyAppraisal(currentSapId, undefined, targetId);
      if (data && data.employeeCycle) {
        setEmpCycleData(data.employeeCycle);
        setAppraisalScore(data.score || null);
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
          api.getEmployeeBySap(data.employeeCycle.pendingCoAppraiserSapId).then(ca => {
            if (ca) setCoAppraiserInfo(ca);
          }).catch(() => {});
        } else {
          setCoAppraiserInfo(null);
          setInputCoAppSap('');
        }

        if (data.developmentReview) {
          setDevelopmentReview(data.developmentReview);
        } else {
          setDevelopmentReview(null);
        }

        const defaultKpis: KPIItemData[] = [
          { id: 'kpi-1', title: 'Branch Deposit Growth & Portfolio Expansion', targetDescription: 'Achieve 15% YoY growth in CASA deposits across Karachi Central commercial accounts.', achievement: 'Successfully increased branch deposits by 18.2% through targeted corporate account campaigns.', employeeComments: 'Exceeded target by 3.2% with proactive client engagement.', appraiserComments: 'Commendable performance in deposit mobilization.', appraiserRating: 4, evidenceRef: 'Q4_CASA_Deposit_Report.pdf' },
          { id: 'kpi-2', title: 'NPL Reduction & Credit Portfolio Quality', targetDescription: 'Maintain gross NPL ratio below 2.5% and execute timely recovery on overdue loans.', achievement: 'Recovered PKR 14.5M in overdue facilities, bringing NPL ratio down to 2.1%.', employeeComments: 'Strict adherence to credit risk guidelines and regular monitoring.', appraiserComments: 'Proactive credit monitoring and effective recovery actions.', appraiserRating: 4, evidenceRef: 'NPL_Recovery_Summary_2026.xlsx' },
          { id: 'kpi-3', title: 'Digital Banking Adoption & Customer Service Excellence', targetDescription: 'Drive digital onboarding adoption to 80% and resolve customer complaints within SLA.', achievement: 'Achieved 86% digital banking conversion with zero escalated complaints.', employeeComments: 'Conducted customer awareness sessions and streamlined digital setup.', appraiserComments: 'Excellent customer satisfaction and digital drive.', appraiserRating: 5, evidenceRef: 'Digital_Onboarding_Audit.pdf' },
        ];

        const defaultFin: KPIItemData[] = [
          { id: 'fin-1', title: 'Revenue Growth & Spreads Optimization', targetDescription: 'Achieve 18% YoY growth in Net Interest Income and Fee-based income across portfolio.', achievement: 'Exceeded NII target by 21.4% with structured corporate financing products.', employeeComments: 'Strong pipeline conversion.', appraiserComments: 'Excellent revenue performance.', appraiserRating: 4, evidenceRef: 'FY26_NII_Financial_Summary.pdf' },
          { id: 'fin-2', title: 'Cost-to-Income Optimization', targetDescription: 'Maintain departmental operating cost-to-income ratio below 48%.', achievement: 'Achieved cost-to-income ratio of 45.2% via digital processing efficiencies.', employeeComments: 'Streamlined vendor workflows.', appraiserComments: 'Prudent cost management.', appraiserRating: 4, evidenceRef: 'Cost_Optimization_Review.xlsx' },
        ];
        const defaultCust: KPIItemData[] = [
          { id: 'cust-1', title: 'Tier-1 Client Retention & Net Promoter Score', targetDescription: 'Maintain 95%+ client retention rate and achieve NPS > 75 across key institutional clients.', achievement: 'Achieved 97.5% corporate retention with an audited NPS of 82.', employeeComments: 'Quarterly relationship reviews held consistently.', appraiserComments: 'Outstanding client satisfaction scores.', appraiserRating: 5, evidenceRef: 'Customer_NPS_Survey_2026.pdf' },
          { id: 'cust-2', title: 'Digital Corporate Banking Portal Adoption', targetDescription: 'Migrate 80% of active commercial relationships to digital corporate banking portal.', achievement: 'Onboarded 84% of corporate clients onto portal with high volume transactions.', employeeComments: 'Dedicated training webinars conducted.', appraiserComments: 'Strong digital drive and client enablement.', appraiserRating: 4, evidenceRef: 'Digital_Portal_Adoption_Audit.pdf' },
        ];
        const defaultProc: KPIItemData[] = [
          { id: 'proc-1', title: 'Internal Audit & SBP Regulatory Compliance', targetDescription: 'Zero repeat audit observations and 100% adherence to SBP Prudential Regulations.', achievement: 'Clean audit clearance with zero high-risk exceptions during annual inspection.', employeeComments: 'Conducted regular pre-audit control health checks.', appraiserComments: 'Exemplary compliance record.', appraiserRating: 5, evidenceRef: 'Audit_Compliance_Report_2026.pdf' },
          { id: 'proc-2', title: 'Credit Proposal Processing Turnaround Time (TAT)', targetDescription: 'Reduce average credit proposal review TAT from 12 days to 6 working days.', achievement: 'Average TAT brought down to 5.4 days via automated credit scorecards.', employeeComments: 'Standardized appraisal packs.', appraiserComments: 'Noticeable turnaround efficiency gain.', appraiserRating: 4, evidenceRef: 'Credit_TAT_Metrics_Q4.xlsx' },
        ];
        const defaultLrn: KPIItemData[] = [
          { id: 'learn-1', title: 'Mandatory Compliance & Anti-Financial Crime Certifications', targetDescription: 'Ensure 100% of departmental staff complete AML/CFT, Sanctions and Cybersecurity courses.', achievement: '100% team completion achieved within Q2 ahead of SBP regulatory deadline.', employeeComments: 'Monitored team compliance weekly.', appraiserComments: 'Proactive team management and training governance.', appraiserRating: 5, evidenceRef: 'Learning_Compliance_Register.pdf' },
          { id: 'learn-2', title: 'Talent Succession & Capability Building', targetDescription: 'Identify and groom successors for all key critical operational roles.', achievement: 'Developed 3 ready-now successor candidates across corporate and risk units.', employeeComments: 'Structured rotation and mentorship program.', appraiserComments: 'Valuable leadership and coaching impact.', appraiserRating: 4, evidenceRef: 'Talent_Succession_Plan_2026.pdf' },
        ];
        const defaultRsk: RiskItemData[] = [
          { id: 'risk-1', title: 'Operational Risk Incident Control & Limit Excess Management', description: 'Ensure strict compliance with operational risk threshold and unauthorized exposure limits.', complianceTarget: 'Zero operational risk loss incidents and zero unauthorized credit limit excess breaches.', actualComplianceResult: 'Zero operational losses recorded; all temporary limit excesses properly sanctioned.', appraiserComments: 'Robust risk posture and control.', appraiserRating: 5, evidenceRef: 'Risk_Loss_Register_2026.pdf' },
          { id: 'risk-2', title: 'Risk-Adjusted Return on Capital (RAROC) Governance', description: 'Ensure portfolio pricing aligns with capital risk-adjusted return hurdle.', complianceTarget: 'Ensure all new credit facilities meet bank minimum hurdle RAROC of 16.5%.', actualComplianceResult: 'Weighted portfolio RAROC delivered at 18.2% across newly originated facilities.', appraiserComments: 'Disciplined capital and risk allocation.', appraiserRating: 4, evidenceRef: 'RAROC_Capital_Pricing_Audit.pdf' },
        ];

        // Map Objectives from DB to state items
        if (data.objectives && data.objectives.length > 0) {
          const mappedKpi: KPIItemData[] = data.objectives.map((o: any, idx: number) => ({
            id: o.id || `kpi-${idx + 1}`,
            title: o.title || '',
            targetDescription: o.targetDescription || '',
            achievement: o.achievementDetails || '',
            employeeComments: '',
            appraiserComments: o.firstAppraiserComments || o.secondAppraiserComments || '',
            appraiserRating: o.employeeSelfRating || 0,
            evidenceRef: o.evidenceReference || o.evidenceRef || '',
            selfRating: o.employeeSelfRating || undefined,
            employeeSelfRating: o.employeeSelfRating || undefined,
            firstAppraiserRating: o.firstAppraiserRating || undefined,
            secondAppraiserRating: o.secondAppraiserRating || undefined,
            coAppraiserRating: o.coAppraiserRating || undefined,
            firstAppraiserComments: o.firstAppraiserComments || '',
            secondAppraiserComments: o.secondAppraiserComments || '',
            requiresCoAppraiserReview: Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser),
            isFlaggedForCoAppraiser: Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser),
          } as any));
          setKpiItems(mappedKpi);

          const getPName = (o: any) => (o.perspective?.name || o.perspectiveName || o.category || o.perspective || o.title || '').toLowerCase();
          
          const isFin = (o: any) => {
            const p = getPName(o);
            return p.includes('fin') || p.includes('revenue') || p.includes('spread') || p.includes('cost') || p.includes('nii') || p.includes('deposit');
          };
          const isCust = (o: any) => {
            const p = getPName(o);
            return p.includes('cust') || p.includes('market') || p.includes('client') || p.includes('nps') || p.includes('onboard') || p.includes('retention') || p.includes('portal');
          };
          const isProc = (o: any) => {
            const p = getPName(o);
            return p.includes('proc') || p.includes('audit') || p.includes('control') || p.includes('tat') || p.includes('compliance') || p.includes('internal') || p.includes('regulatory');
          };
          const isLrn = (o: any) => {
            const p = getPName(o);
            return p.includes('learn') || p.includes('growth') || p.includes('talent') || p.includes('train') || p.includes('certif') || p.includes('succession');
          };
          const isRsk = (o: any) => {
            const p = getPName(o);
            return p.includes('risk') || p.includes('raroc') || p.includes('limit') || p.includes('loss') || p.includes('sbp');
          };

          const fin = data.objectives.filter((o: any) => isFin(o));
          const cust = data.objectives.filter((o: any) => isCust(o) && !isFin(o));
          const proc = data.objectives.filter((o: any) => isProc(o) && !isFin(o) && !isCust(o));
          const lrn = data.objectives.filter((o: any) => isLrn(o) && !isFin(o) && !isCust(o) && !isProc(o));
          const rsk = data.objectives.filter((o: any) => isRsk(o) && !isFin(o) && !isCust(o) && !isProc(o) && !isLrn(o));

          // Catch any leftover items into financial
          const mappedIds = new Set([...fin, ...cust, ...proc, ...lrn, ...rsk].map((o: any) => o.id));
          const leftovers = data.objectives.filter((o: any) => !mappedIds.has(o.id));
          const allFin = [...fin, ...leftovers];

          const mapBscObj = (o: any, prefix: string, idx: number) => ({
            id: o.id || `${prefix}-${idx + 1}`,
            title: o.title || '',
            targetDescription: o.targetDescription || '',
            achievement: o.achievementDetails || '',
            achievementDetails: o.achievementDetails || '',
            employeeComments: '',
            appraiserComments: o.firstAppraiserComments || '',
            appraiserRating: o.employeeSelfRating || 0,
            evidenceRef: o.evidenceReference || o.evidenceRef || '',
            selfRating: o.employeeSelfRating || undefined,
            employeeSelfRating: o.employeeSelfRating || undefined,
            firstAppraiserRating: o.firstAppraiserRating || undefined,
            secondAppraiserRating: o.secondAppraiserRating || undefined,
            coAppraiserRating: o.coAppraiserRating != null ? o.coAppraiserRating : undefined,
            firstAppraiserComments: o.firstAppraiserComments || '',
            secondAppraiserComments: o.secondAppraiserComments || '',
            coAppraiserComments: o.coAppraiserComments || '',
            requiresCoAppraiserReview: Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null),
            isFlaggedForCoAppraiser: Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null),
          });

          setFinancialItems(allFin.length > 0 ? allFin.map((o: any, idx: number) => mapBscObj(o, 'fin', idx)) : defaultFin);
          setCustomerItems(cust.length > 0 ? cust.map((o: any, idx: number) => mapBscObj(o, 'cust', idx)) : defaultCust);
          setProcessItems(proc.length > 0 ? proc.map((o: any, idx: number) => mapBscObj(o, 'proc', idx)) : defaultProc);
          setLearningItems(lrn.length > 0 ? lrn.map((o: any, idx: number) => mapBscObj(o, 'learn', idx)) : defaultLrn);

          setRiskItems(rsk.length > 0 ? rsk.map((o: any, idx: number) => ({
            id: o.id || `risk-${idx + 1}`,
            title: o.title || '',
            description: o.targetDescription || '',
            complianceTarget: o.targetDescription || '',
            actualComplianceResult: o.achievementDetails || '',
            achievementDetails: o.achievementDetails || '',
            appraiserComments: o.firstAppraiserComments || '',
            appraiserRating: o.employeeSelfRating || 0,
            selfRating: o.employeeSelfRating || undefined,
            employeeSelfRating: o.employeeSelfRating || undefined,
            firstAppraiserRating: o.firstAppraiserRating || undefined,
            secondAppraiserRating: o.secondAppraiserRating || undefined,
            coAppraiserRating: o.coAppraiserRating != null ? o.coAppraiserRating : undefined,
            firstAppraiserComments: o.firstAppraiserComments || '',
            secondAppraiserComments: o.secondAppraiserComments || '',
            coAppraiserComments: o.coAppraiserComments || '',
            evidenceRef: o.evidenceReference || o.evidenceRef || '',
            requiresCoAppraiserReview: Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null),
            isFlaggedForCoAppraiser: Boolean(o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null),
          })) : defaultRsk);
        } else {
          setKpiItems(defaultKpis);
          setFinancialItems(defaultFin);
          setCustomerItems(defaultCust);
          setProcessItems(defaultProc);
          setLearningItems(defaultLrn);
          setRiskItems(defaultRsk);
        }

        if (data.traits && data.traits.length > 0) {
          const mappedTraits: TraitItemData[] = data.traits.map((t: any, idx: number) => ({
            id: t.id || `trait-${idx + 1}`,
            name: t.traitName || '',
            definition: t.definition || '',
            expectedBehaviour: '',
            appraiserComments: t.firstAppraiserComments || t.secondAppraiserComments || '',
            appraiserRating: t.firstAppraiserRating || 0,
            selfRating: t.selfRating || t.employeeSelfRating || undefined,
            firstAppraiserRating: t.firstAppraiserRating || undefined,
            secondAppraiserRating: t.secondAppraiserRating || undefined,
            coAppraiserRating: (data.employeeCycle?.coAppraiser || data.employeeCycle?.coAppraiserSapId) ? t.coAppraiserRating : undefined,
            firstAppraiserComments: t.firstAppraiserComments || '',
            secondAppraiserComments: t.secondAppraiserComments || '',
          } as any));
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
      const data = await api.getAppraisalHistory(currentSapId);
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
  }, [currentSapId]);

  const handleCycleSelect = (empCycleId: string) => {
    setSelectedEmployeeCycleId(empCycleId);
    loadMyAppraisal(empCycleId);
    setActiveTab('form');
  };

  useEffect(() => {
    if (showPastArchives && historyList.length === 0) {
      loadHistory();
    }
  }, [showPastArchives, currentSapId]);

  // ─── Action Handlers (preserved from original) ───

  const [modalError, setModalError] = useState<string | null>(null);

  const handleRequestAppraiserUpdate = async () => {
    if (!inputFirstSap || !inputSecondSap) {
      setModalError("Both First Appraiser and Second Appraiser / Supervisor SAP IDs are required.");
      return;
    }
    setUpdatingAppraiser(true);
    setModalError(null);
    setErrorMessage(null);
    try {
      if (empCycleData?.id) {
        const res = await api.requestAppraiserUpdate(empCycleData.id, {
          firstAppraiserSapId: inputFirstSap.trim(),
          secondAppraiserSapId: inputSecondSap.trim(),
          coAppraiserSapId: inputCoAppSap?.trim() || undefined,
        });
        setMessage(res.message || "Reporting line update requested successfully.");
        setShowUpdateModal(false);
        setAppraiserStatus('PendingConfirmation');
        await loadMyAppraisal(empCycleData.id);
      } else {
        setAppraiserStatus('PendingConfirmation');
        setMessage("Appraiser & Supervisor update requested. Awaiting confirmation from your appraiser.");
        setShowUpdateModal(false);
      }
    } catch (e: any) {
      let msg = e.message || String(e);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.message) msg = parsed.message;
      } catch {}
      setModalError(msg);
      setErrorMessage(msg);
    } finally {
      setUpdatingAppraiser(false);
    }
  };

  const handleSaveDraft = async () => {
    const cycleId = empCycleData?.id || selectedEmployeeCycleId;
    if (!cycleId) {
      setErrorMessage("No active appraisal cycle found. Please select a cycle first.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const objsToSave: any[] = [];
      if (formMode === 'KPI') {
        kpiItems.forEach((k) => {
          if (k.title || k.targetDescription || k.achievement) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('kpi-') ? k.id : undefined,
              title: k.title.trim() || 'KPI Objective',
              targetDescription: k.targetDescription || '',
              achievementDetails: k.achievement || '',
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef || '',
              requiresCoAppraiserReview: Boolean(k.requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean(k.requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'KPI'
            });
          }
        });
      } else {
        financialItems.forEach((k) => {
          if (k.title || k.targetDescription || k.achievement) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('fin-') ? k.id : undefined,
              title: k.title.trim() || 'Financial Objective',
              targetDescription: k.targetDescription || '',
              achievementDetails: k.achievement || '',
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef || '',
              requiresCoAppraiserReview: Boolean(k.requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean(k.requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Financial'
            });
          }
        });
        customerItems.forEach((k) => {
          if (k.title || k.targetDescription || k.achievement) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('cust-') ? k.id : undefined,
              title: k.title.trim() || 'Customer Objective',
              targetDescription: k.targetDescription || '',
              achievementDetails: k.achievement || '',
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef || '',
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Customer'
            });
          }
        });
        processItems.forEach((k) => {
          if (k.title || k.targetDescription || k.achievement) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('proc-') ? k.id : undefined,
              title: k.title.trim() || 'Internal Process Objective',
              targetDescription: k.targetDescription || '',
              achievementDetails: k.achievement || '',
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef || '',
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Internal Process'
            });
          }
        });
        learningItems.forEach((k) => {
          if (k.title || k.targetDescription || k.achievement) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('learn-') ? k.id : undefined,
              title: k.title.trim() || 'Learning & Growth Objective',
              targetDescription: k.targetDescription || '',
              achievementDetails: k.achievement || '',
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef || '',
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Learning & Growth'
            });
          }
        });
        if (formMode === 'RISK_BSC') {
          riskItems.forEach((r) => {
            if (r.title || r.complianceTarget || r.actualComplianceResult) {
              objsToSave.push({
                id: r.id && !r.id.startsWith('risk-') ? r.id : undefined,
                title: r.title.trim() || 'Risk Objective',
                targetDescription: r.complianceTarget || '',
                achievementDetails: r.actualComplianceResult || '',
                employeeSelfRating: r.appraiserRating || (r as any).employeeSelfRating || (r as any).selfRating || 0,
                firstAppraiserRating: (r as any).firstAppraiserRating,
                secondAppraiserRating: (r as any).secondAppraiserRating,
                coAppraiserRating: (r as any).coAppraiserRating,
                weightage: 10,
                evidenceReference: r.evidenceRef || '',
                requiresCoAppraiserReview: Boolean((r as any).requiresCoAppraiserReview || (r as any).isFlaggedForCoAppraiser),
                isFlaggedForCoAppraiser: Boolean((r as any).requiresCoAppraiserReview || (r as any).isFlaggedForCoAppraiser),
                perspectiveName: 'Risk Adjustment'
              });
            }
          });
        }
      }
      if (objsToSave.length === 0) {
        setErrorMessage("Please enter at least one KPI title or target before saving draft.");
        return;
      }
      const saveRes = await api.saveObjectives(cycleId, objsToSave);
      setMessage(saveRes.message || "Appraisal draft saved successfully. All objectives have been saved to the database.");
      await loadMyAppraisal(cycleId);
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
        kpiItems.forEach((k) => {
          if (k.title.trim() || k.targetDescription.trim()) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('kpi-') ? k.id : undefined,
              title: k.title,
              targetDescription: k.targetDescription,
              achievementDetails: k.achievement,
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              requiresCoAppraiserReview: (k as any).requiresCoAppraiserReview ?? false,
              isFlaggedForCoAppraiser: (k as any).requiresCoAppraiserReview ?? false,
              weightage: 10,
              evidenceReference: k.evidenceRef,
              perspectiveName: 'KPI'
            });
          }
        });
      } else {
        financialItems.forEach((k) => {
          if (k.title.trim() || k.targetDescription.trim()) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('fin-') ? k.id : undefined,
              title: k.title,
              targetDescription: k.targetDescription,
              achievementDetails: k.achievement,
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef,
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Financial'
            });
          }
        });
        customerItems.forEach((k) => {
          if (k.title.trim() || k.targetDescription.trim()) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('cust-') ? k.id : undefined,
              title: k.title,
              targetDescription: k.targetDescription,
              achievementDetails: k.achievement,
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef,
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Customer'
            });
          }
        });
        processItems.forEach((k) => {
          if (k.title.trim() || k.targetDescription.trim()) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('proc-') ? k.id : undefined,
              title: k.title,
              targetDescription: k.targetDescription,
              achievementDetails: k.achievement,
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef,
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Internal Process'
            });
          }
        });
        learningItems.forEach((k) => {
          if (k.title.trim() || k.targetDescription.trim()) {
            objsToSave.push({
              id: k.id && !k.id.startsWith('learn-') ? k.id : undefined,
              title: k.title,
              targetDescription: k.targetDescription,
              achievementDetails: k.achievement,
              employeeSelfRating: k.appraiserRating || (k as any).employeeSelfRating || (k as any).selfRating || 0,
              firstAppraiserRating: (k as any).firstAppraiserRating,
              secondAppraiserRating: (k as any).secondAppraiserRating,
              coAppraiserRating: (k as any).coAppraiserRating,
              weightage: 10,
              evidenceReference: k.evidenceRef,
              requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              isFlaggedForCoAppraiser: Boolean((k as any).requiresCoAppraiserReview || (k as any).isFlaggedForCoAppraiser),
              perspectiveName: 'Learning & Growth'
            });
          }
        });
        if (formMode === 'RISK_BSC') {
          riskItems.forEach((r) => {
            if (r.title.trim() || r.complianceTarget.trim()) {
              objsToSave.push({
                id: r.id && !r.id.startsWith('risk-') ? r.id : undefined,
                title: r.title,
                targetDescription: r.complianceTarget,
                achievementDetails: r.actualComplianceResult,
                employeeSelfRating: r.appraiserRating || (r as any).employeeSelfRating || (r as any).selfRating || 0,
                firstAppraiserRating: (r as any).firstAppraiserRating,
                secondAppraiserRating: (r as any).secondAppraiserRating,
                coAppraiserRating: (r as any).coAppraiserRating,
                weightage: 10,
                evidenceReference: r.evidenceRef,
                perspectiveName: 'Risk Adjustment'
              });
            }
          });
        }
      }
      await api.saveObjectives(empCycleData.id, objsToSave);
      const res = await api.submitSelfAssessment(empCycleData.id, currentSapId);
      setMessage(res.message || "Self assessment submitted to your evaluators successfully.");
      await loadMyAppraisal(empCycleData.id);
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setSubmitting(false); }
  };

  const handleAgreeAppraisal = async () => {
    if (!empCycleData?.id) return;
    setAgreeingAppraisal(true);
    setErrorMessage(null);
    try {
      const res = await api.agreeAppraisal(empCycleData.id, currentSapId);
      setMessage(res.message || "Appraisal acknowledged and agreed successfully. Form is now permanently locked.");
      await loadMyAppraisal(empCycleData.id);
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setAgreeingAppraisal(false); }
  };

  const handleDisagreementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDisagreementFile(file);
      setDisagreementFileName(file.name);
      setDisagreementFileSize(file.size);
      setDisagreementFileType(file.type || 'application/octet-stream');

      const reader = new FileReader();
      reader.onload = () => {
        setDisagreementFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveDisagreementFile = () => {
    setDisagreementFile(null);
    setDisagreementFileData(null);
    setDisagreementFileName('');
    setDisagreementFileSize(0);
    setDisagreementFileType('');
  };

  const handleDownloadDisagreementAttachment = (fileName?: string, fileData?: string) => {
    const fName = fileName || empCycleData?.disagreementAttachmentFileName || 'Disagreement_Supporting_Document.pdf';
    const data = fileData || empCycleData?.disagreementAttachmentFileData;
    if (data && data.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = data;
      link.download = fName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([
        `NATIONAL BANK OF PAKISTAN (NBP) - DISAGREEMENT SUPPORTING RECORD\n` +
        `----------------------------------------------------------------\n` +
        `File Reference: ${fName}\n` +
        `Appraisee SAP ID: ${empCycleData?.employee?.sapId || currentSapId}\n` +
        `Employee Name: ${empCycleData?.employee?.fullName || 'NBP Employee'}\n` +
        `Appraisal Cycle: ${empCycleData?.cycle?.title || 'Annual Cycle'}\n` +
        `Logged Justification: ${empCycleData?.disagreementReason || empCycleData?.appraiserRejectionReason || ''}\n` +
        `Status: Under Review by Group Performance Manager & PMW Committee\n` +
        `Audit Seal: NBP-DISPUTE-DOC-VERIFIED`
      ], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fName.endsWith('.txt') ? fName : `${fName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleRecordDisagreement = async () => {
    if (!empCycleData?.id) return;
    if (!disagreementReason.trim()) { setErrorMessage("Please enter a mandatory justification for your disagreement."); return; }
    setSubmittingDisagreement(true);
    setErrorMessage(null);
    try {
      const attachment = disagreementFileName ? {
        fileName: disagreementFileName,
        fileData: disagreementFileData || undefined,
        fileSize: disagreementFileSize || undefined,
        fileType: disagreementFileType || undefined,
      } : undefined;

      const res = await api.recordDisagreement(empCycleData.id, currentSapId, disagreementReason.trim(), attachment);
      setMessage(res.message || "Disagreement lodged successfully. Awaiting supervisor and management review.");
      setShowDisagreementModal(false);
      setDisagreementReason('');
      handleRemoveDisagreementFile();
      await loadMyAppraisal(empCycleData.id);
    } catch (e: any) { setErrorMessage(e.message || String(e)); } finally { setSubmittingDisagreement(false); }
  };

  const handleDownloadPdf = () => {
    setShowPrintModal(true);
  };

  // ─── Score Calculations & Synchronization ───
  const getEffectiveItemScore = (item: any): number => {
    const val = item.secondAppraiserRating ??
      (item.requiresCoAppraiserReview || item.isFlaggedForCoAppraiser ? item.coAppraiserRating : null) ??
      item.firstAppraiserRating ??
      item.coAppraiserRating ??
      item.appraiserRating ??
      item.employeeSelfRating ??
      item.selfRating ??
      0;
    return Number(val) || 0;
  };

  const calculateAverageScore = (scores: number[]): number => {
    const validScores = scores.filter((s) => s > 0);
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
  };

  const getBlockScores = (blockId: string) => {
    let rawItems: any[] = [];
    if (blockId === 'kpis') rawItems = kpiItems;
    else if (blockId === 'traits') rawItems = traitItems;
    else if (blockId === 'financial') rawItems = financialItems;
    else if (blockId === 'customer') rawItems = customerItems;
    else if (blockId === 'process') rawItems = processItems;
    else if (blockId === 'learning') rawItems = learningItems;
    else if (blockId === 'risk') rawItems = riskItems;

    const scores = rawItems.map(getEffectiveItemScore);
    const validScores = scores.filter((s) => s > 0);
    const raw = validScores.length > 0 ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length : (scores.length > 0 ? 4.0 : 0);
    const blockWeight = blocks.find((b) => b.id === blockId)?.weightage || (
      blockId === 'kpis' ? 70 :
      blockId === 'traits' ? 30 :
      blockId === 'financial' ? (formMode === 'RISK_BSC' ? 25 : 30) :
      blockId === 'customer' ? (formMode === 'RISK_BSC' ? 20 : 25) :
      blockId === 'process' ? (formMode === 'RISK_BSC' ? 20 : 25) :
      blockId === 'learning' ? (formMode === 'RISK_BSC' ? 15 : 20) :
      blockId === 'risk' ? 20 : 0
    );
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

  const getRatingDescriptor = (s: number) => {
    if (s >= 4.50) return { label: 'Outstanding', code: '1', badge: 'bg-emerald-800 text-white' };
    if (s >= 3.80) return { label: 'Very Good', code: '2', badge: 'bg-emerald-700 text-white' };
    if (s >= 3.00) return { label: 'Good', code: '3', badge: 'bg-blue-800 text-white' };
    if (s >= 2.00) return { label: 'Needs Improvement', code: '4', badge: 'bg-amber-700 text-white' };
    if (s > 0) return { label: 'Unsatisfactory', code: '5', badge: 'bg-rose-800 text-white' };
    return { label: 'Pending Evaluation', code: '—', badge: 'bg-slate-500 text-white' };
  };

  const getRatingLabel = (score: number) => {
    const d = getRatingDescriptor(score);
    return d.code !== '—' ? `${d.label} (Rating ${d.code})` : d.label;
  };
  const finalRatingLabel = getRatingLabel(formMode === 'KPI' ? ((blockBreakdowns.find(b => b.id === 'kpis')?.weightedScore || 0) + (blockBreakdowns.find(b => b.id === 'traits')?.weightedScore || 0)) : overallWeightedScore);

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
                  SAP: {empCycleData?.employee?.sapId || currentSapId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {empCycleData?.employee?.fullName || currentUser?.fullName || currentUser?.name || 'Staff Member'} • {formatGradeLabel(empCycleData?.snapshotGrade || currentUser?.grade || '06')} • {empCycleData?.snapshotDesignation || currentUser?.designation || 'Staff'}
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
        <div className="space-y-4 pt-3 px-1">
          {/* Context Bar */}
          {selectedCycle && (
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl no-print">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <span className="text-sm font-bold text-slate-900">{selectedCycle.cycleTitle || empCycleData?.cycle?.title || 'Current Cycle'}</span>
                <Badge className={`text-[10px] font-bold border ${getFormColor(selectedCycle || empCycleData)}`}>
                  {formMode === 'KPI' ? 'KPI Form (70/30)' : formMode === 'BSC' ? '4-P Balanced Scorecard' : '5-P Risk BSC'}
                </Badge>
                <Badge className={`text-[10px] font-bold ${getStatusColor(currentStatus)}`}>{getStatusLabel(currentStatus)}</Badge>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {isPmwAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdminStageModal(true)}
                    className="text-xs font-bold border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 h-7 px-2.5 shadow-2xs"
                    title="PMW Admin Override: Set Appraisal Workflow Stage"
                  >
                    <Shield className="h-3 w-3 mr-1 text-purple-700" /> Stage Control
                  </Button>
                )}
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-emerald-600 text-emerald-800 hover:bg-emerald-50 h-7 px-3">
                    <Save className="h-3 w-3 mr-1" />{saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                )}
                <button onClick={() => setActiveTab('cycles')} className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline">Switch Cycle →</button>
              </div>
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
              {/* CASE A: APPRAISAL HAS BEEN SUBMITTED FOR REVIEW (READ-ONLY) */}
              {/* When submitted, render ONLY the clean HTML Appraisal Report */}
              {isReadOnly ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  {isUnderReview && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs no-print">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-950">Appraisal Form Submitted for Review</h4>
                          <p className="text-[11px] text-amber-800">
                            Your appraisal form has been formally submitted and is currently undergoing review ({getStatusLabel(currentStatus)}). Below is your official HTML Appraisal Report.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs py-1 px-2.5">
                          {getStatusLabel(currentStatus)}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {isPublished && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs no-print">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-blue-950">Appraisal Evaluation Published</h4>
                          <p className="text-[11px] text-blue-800">
                            Your appraisal review is complete and published. Below is your official HTML Appraisal Report. Please inspect your scores and submit your formal agreement or disagreement.
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('review')} className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shrink-0 shadow-xs">
                        <CheckCircle className="h-4 w-4 mr-1.5" />Review & Acknowledge
                      </Button>
                    </div>
                  )}

                  {isAgreedOrClosed && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs no-print">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950">Appraisal Form Finalized & Archived</h4>
                          <p className="text-[11px] text-emerald-800">
                            Formally acknowledged ({getStatusLabel(currentStatus)}). Below is your permanent official HTML appraisal report.
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="border-emerald-600 text-emerald-800 hover:bg-emerald-100 text-xs font-bold shrink-0">
                        <Printer className="h-3.5 w-3.5 mr-1" />Print / PDF
                      </Button>
                    </div>
                  )}

                  {isDisagreed && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs no-print">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-950">Formal Disagreement Registered</h4>
                          <p className="text-[11px] text-amber-800">
                            Under review by GPM and PMW Administration. Below is your official HTML Appraisal Report.
                          </p>
                          {empCycleData?.disagreementAttachmentFileName && (
                            <div className="mt-1 flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-red-900 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md flex items-center">
                                <Paperclip className="h-3 w-3 mr-1 text-red-600" />
                                Attached Record: {empCycleData.disagreementAttachmentFileName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadDisagreementAttachment(empCycleData.disagreementAttachmentFileName, empCycleData.disagreementAttachmentFileData)}
                                className="text-[10px] text-red-700 underline font-bold hover:text-red-900"
                              >
                                Download / Inspect
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('review')} className="border-amber-400 text-amber-900 hover:bg-amber-100 text-xs font-bold shrink-0">
                        <Eye className="h-3.5 w-3.5 mr-1" />View Details
                      </Button>
                    </div>
                  )}

                  {/* Clean Official HTML Appraisal Report */}
                  <AppraisalPrintableReport
                    employeeCycle={empCycleData}
                    objectives={
                      formMode === 'KPI'
                        ? (kpiItems.length > 0 ? kpiItems.map(k => ({
                            id: k.id,
                            title: k.title,
                            targetDescription: k.targetDescription,
                            achievementDetails: k.achievement,
                            employeeSelfRating: (k as any).employeeSelfRating ?? k.selfRating ?? k.appraiserRating,
                            firstAppraiserRating: (k as any).firstAppraiserRating,
                            secondAppraiserRating: (k as any).secondAppraiserRating,
                            coAppraiserRating: (empCycleData?.coAppraiser || empCycleData?.coAppraiserSapId || empCycleData?.pendingCoAppraiserSapId) ? ((k as any).coAppraiserRating != null ? (k as any).coAppraiserRating : undefined) : undefined,
                            requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview),
                            firstAppraiserComments: (k as any).firstAppraiserComments || k.appraiserComments || '',
                            secondAppraiserComments: (k as any).secondAppraiserComments || ''
                          })) : [])
                        : [
                            ...financialItems.map(k => ({ ...k, perspective: 'financial', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? k.appraiserRating, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                            ...customerItems.map(k => ({ ...k, perspective: 'customer', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? k.appraiserRating, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                            ...processItems.map(k => ({ ...k, perspective: 'process', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? k.appraiserRating, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                            ...learningItems.map(k => ({ ...k, perspective: 'learning', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? k.appraiserRating, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                            ...riskItems.map(r => ({
                              id: r.id,
                              title: r.title,
                              targetDescription: r.complianceTarget || r.description,
                              achievementDetails: (r as any).actualComplianceResult || (r as any).achievementDetails,
                              perspective: 'risk',
                              employeeSelfRating: (r as any).employeeSelfRating ?? (r as any).selfRating ?? r.appraiserRating,
                              firstAppraiserRating: (r as any).firstAppraiserRating,
                              secondAppraiserRating: (r as any).secondAppraiserRating,
                              coAppraiserRating: (r as any).coAppraiserRating,
                              firstAppraiserComments: (r as any).firstAppraiserComments || (r as any).appraiserComments,
                              secondAppraiserComments: (r as any).secondAppraiserComments
                            }))
                          ]
                    }
                    traits={traitItems.length > 0 ? traitItems.map(t => ({
                      id: t.id,
                      traitName: t.name,
                      definition: t.definition,
                      selfRating: (t as any).selfRating ?? (t as any).employeeSelfRating,
                      firstAppraiserRating: (t as any).firstAppraiserRating,
                      secondAppraiserRating: (t as any).secondAppraiserRating,
                      coAppraiserRating: (empCycleData?.coAppraiser || empCycleData?.coAppraiserSapId) ? ((t as any).coAppraiserRating ?? (t as any).firstAppraiserRating) : undefined,
                      firstAppraiserComments: (t as any).firstAppraiserComments || t.appraiserComments || ''
                    })) : []}
                    score={appraisalScore}
                    developmentReview={developmentReview}
                    isModal={false}
                  />
                </div>
              ) : (
                /* CASE B: DRAFT / SELF-ASSESSMENT STAGE (NOT YET SUBMITTED) - EDITABLE FORM */
                <div className="space-y-3">
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

                  {/* Reporting Line Status Advisory */}
                  {!isLineValidated && !isReadOnly && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900 shadow-2xs">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                        <span>
                          <strong>Reporting Line Pending Confirmation:</strong> You can add and save draft objectives now. Formal submission to your evaluators will be enabled once your supervisor validates your reporting line.
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setAppraiserSectionOpen(true); setShowUpdateModal(true); }} className="text-[11px] font-bold border-amber-300 text-amber-900 hover:bg-amber-100 h-7 shrink-0">
                        <Edit3 className="h-3 w-3 mr-1" /> View Reporting Line
                      </Button>
                    </div>
                  )}

                  {/* Weightage Bar: Fixed 70/30 banner for KPI forms, or interactive perspective slider for BSC / Risk BSC */}
                  {formMode === 'KPI' ? (
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print text-xs">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <Scale className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span className="font-bold text-slate-800">Fixed Weightage Allocation:</span>
                        <Badge className="bg-emerald-700 text-white text-[11px] font-bold">70% Objectives (Averaged)</Badge>
                        <Badge className="bg-teal-700 text-white text-[11px] font-bold">30% Behavioural Traits (Averaged)</Badge>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium italic">Fixed for AVP &amp; Below Grades (Non-Modifiable)</span>
                    </div>
                  ) : (
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
                  )}

                  {/* Form Blocks */}
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
                          <div className="flex items-center space-x-2 pt-1 no-print">
                            <Button variant="outline" size="sm" onClick={() => setKpiItems([...kpiItems, { id: `kpi-${Date.now()}-${kpiItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-emerald-400 text-emerald-800 hover:bg-emerald-50 flex-1 py-2">
                              <Plus className="h-4 w-4 mr-1.5" />Add Objective
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-emerald-600 text-emerald-800 hover:bg-emerald-50 py-2 px-4 shrink-0 shadow-2xs">
                              <Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving...' : 'Save Draft'}
                            </Button>
                          </div>
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

                  {(formMode === 'BSC' || formMode === 'RISK_BSC') && (
                    <>
                      <AppraisalBlockCard id="financial" title="P1: Financial & Strategic" description="Revenue, cost optimization, NII." weightage={blocks.find((b) => b.id === 'financial')?.weightage || (formMode === 'BSC' ? 30 : 25)} itemCount={financialItems.length} completedCount={financialItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(financialItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('financial').weighted} colorTheme="emerald" defaultExpanded={false}>
                        <div className="space-y-3">
                          {financialItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setFinancialItems(financialItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setFinancialItems(financialItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          <div className="flex items-center space-x-2 pt-1 no-print">
                            <Button variant="outline" size="sm" onClick={() => setFinancialItems([...financialItems, { id: `fin-${Date.now()}-${financialItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-emerald-400 text-emerald-800 hover:bg-emerald-50 flex-1 py-2"><Plus className="h-4 w-4 mr-1.5" />Add Financial Objective</Button>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-emerald-600 text-emerald-800 hover:bg-emerald-50 py-2 px-4 shrink-0 shadow-2xs"><Save className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                          </div>
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="customer" title="P2: Customer Centricity" description="Client satisfaction, NPS, onboarding." weightage={blocks.find((b) => b.id === 'customer')?.weightage || (formMode === 'BSC' ? 25 : 20)} itemCount={customerItems.length} completedCount={customerItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(customerItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('customer').weighted} colorTheme="blue" defaultExpanded={false}>
                        <div className="space-y-3">
                          {customerItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setCustomerItems(customerItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setCustomerItems(customerItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          <div className="flex items-center space-x-2 pt-1 no-print">
                            <Button variant="outline" size="sm" onClick={() => setCustomerItems([...customerItems, { id: `cust-${Date.now()}-${customerItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-blue-400 text-blue-800 hover:bg-blue-50 flex-1 py-2"><Plus className="h-4 w-4 mr-1.5" />Add Customer Objective</Button>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-blue-600 text-blue-800 hover:bg-blue-50 py-2 px-4 shrink-0 shadow-2xs"><Save className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                          </div>
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="process" title="P3: Internal Controls & Compliance" description="Audit, risk controls, TAT, regulatory." weightage={blocks.find((b) => b.id === 'process')?.weightage || (formMode === 'BSC' ? 25 : 20)} itemCount={processItems.length} completedCount={processItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(processItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('process').weighted} colorTheme="purple" defaultExpanded={false}>
                        <div className="space-y-3">
                          {processItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setProcessItems(processItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setProcessItems(processItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          <div className="flex items-center space-x-2 pt-1 no-print">
                            <Button variant="outline" size="sm" onClick={() => setProcessItems([...processItems, { id: `proc-${Date.now()}-${processItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-purple-400 text-purple-800 hover:bg-purple-50 flex-1 py-2"><Plus className="h-4 w-4 mr-1.5" />Add Process Objective</Button>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-purple-600 text-purple-800 hover:bg-purple-50 py-2 px-4 shrink-0 shadow-2xs"><Save className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                          </div>
                        </div>
                      </AppraisalBlockCard>
                      <AppraisalBlockCard id="learning" title="P4: Learning & Growth" description="Certifications, capability building, succession." weightage={blocks.find((b) => b.id === 'learning')?.weightage || (formMode === 'BSC' ? 20 : 15)} itemCount={learningItems.length} completedCount={learningItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(learningItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('learning').weighted} colorTheme="amber" defaultExpanded={false}>
                        <div className="space-y-3">
                          {learningItems.map((item, idx) => (<KPIAssessmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: KPIItemData) => setLearningItems(learningItems.map((i) => (i.id === updated.id ? updated : i)))} onRemove={() => setLearningItems(learningItems.filter((i) => i.id !== item.id))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                          <div className="flex items-center space-x-2 pt-1 no-print">
                            <Button variant="outline" size="sm" onClick={() => setLearningItems([...learningItems, { id: `learn-${Date.now()}-${learningItems.length + 1}`, title: '', targetDescription: '', achievement: '', employeeComments: '', appraiserComments: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-amber-400 text-amber-800 hover:bg-amber-50 flex-1 py-2"><Plus className="h-4 w-4 mr-1.5" />Add Learning Objective</Button>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-amber-600 text-amber-800 hover:bg-amber-50 py-2 px-4 shrink-0 shadow-2xs"><Save className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                          </div>
                        </div>
                      </AppraisalBlockCard>
                      {formMode === 'RISK_BSC' && (
                        <AppraisalBlockCard id="risk" title="P5: Risk Adjustment (MRT/MRC)" description="RAROC, limit governance, risk posture." weightage={blocks.find((b) => b.id === 'risk')?.weightage || 20} itemCount={riskItems.length} completedCount={riskItems.filter((k) => k.appraiserRating > 0).length} rawScore={calculateAverageScore(riskItems.map((k) => k.appraiserRating))} weightedScore={getBlockScores('risk').weighted} colorTheme="rose" defaultExpanded={false}>
                          <div className="space-y-3">
                            {riskItems.map((item, idx) => (<RiskAdjustmentItem key={item.id} index={idx} data={item} readOnly={isReadOnly} userRole={currentUserRole} onChange={(updated: RiskItemData) => setRiskItems(riskItems.map((i) => (i.id === updated.id ? updated : i)))} onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })} onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })} />))}
                            <div className="flex items-center space-x-2 pt-1 no-print">
                              <Button variant="outline" size="sm" onClick={() => setRiskItems([...riskItems, { id: `risk-${Date.now()}-${riskItems.length + 1}`, title: '', description: '', complianceTarget: '', actualComplianceResult: '', appraiserRating: 0, evidenceRef: '' }])} className="text-xs font-bold border-dashed border-rose-400 text-rose-800 hover:bg-rose-50 flex-1 py-2"><Plus className="h-4 w-4 mr-1.5" />Add Risk Objective</Button>
                              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="text-xs font-bold border-rose-600 text-rose-800 hover:bg-rose-50 py-2 px-4 shrink-0 shadow-2xs"><Save className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                            </div>
                          </div>
                        </AppraisalBlockCard>
                      )}
                    </>
                  )}

                  {/* Sticky Action Bar */}
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
                          <Button
                            size="sm"
                            onClick={handleSubmitSelfAssessment}
                            disabled={submitting || !isLineValidated}
                            title={!isLineValidated ? "Reporting line must be confirmed before submitting" : ""}
                            className={`text-xs font-bold text-white shadow-md h-8 ${!isLineValidated ? 'bg-slate-400 hover:bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />{submitting ? 'Submitting...' : 'Submit to Appraisers'}
                          </Button>
                        </div>
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
                {(() => {
                  // Compute live evaluated block contributions so consolidation matches individual blocks perfectly
                  const kpiBlock = blockBreakdowns.find((b) => b.id === 'kpis');
                  const traitBlock = blockBreakdowns.find((b) => b.id === 'traits');

                  const objRaw = kpiBlock ? kpiBlock.rawScore : getBlockScores('kpis').raw;
                  const objVal = kpiBlock ? kpiBlock.weightedScore : (objRaw * 0.70);

                  const traitRaw = traitBlock ? traitBlock.rawScore : getBlockScores('traits').raw;
                  const traitVal = traitBlock ? traitBlock.weightedScore : (traitRaw * 0.30);

                  const finalVal = formMode === 'KPI'
                    ? (objVal + traitVal)
                    : overallWeightedScore;

                  const ratingText = getRatingLabel(finalVal);

                  return (
                    <div className="space-y-3">
                      {/* Top Consolidated 3-Column Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-center p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                          <div className="text-[10px] text-emerald-900 uppercase font-extrabold tracking-wider">Composite Decimal Score</div>
                          <div className="text-2xl font-black text-emerald-800 mt-0.5">
                            {finalVal.toFixed(2)} <span className="text-xs font-semibold text-slate-400">/ 5.00</span>
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                            {formMode === 'KPI' ? `${objVal.toFixed(2)} (Obj) + ${traitVal.toFixed(2)} (Trait)` : 'Sum of weighted perspectives'}
                          </div>
                        </div>

                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-center">
                          <div className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Score Contribution Breakdown</div>
                          <div className="text-xs font-bold text-slate-800 mt-1 space-y-0.5">
                            {formMode === 'KPI' ? (
                              <>
                                <div>Objectives (70%): <span className="text-emerald-700 font-extrabold">{objVal.toFixed(2)} / 3.50</span> <span className="text-slate-400 text-[10px]">(Avg: {objRaw.toFixed(2)})</span></div>
                                <div>Behavioural Traits (30%): <span className="text-teal-700 font-extrabold">{traitVal.toFixed(2)} / 1.50</span> <span className="text-slate-400 text-[10px]">(Avg: {traitRaw.toFixed(2)})</span></div>
                              </>
                            ) : (
                              <div>Weighted Perspectives Score: <span className="text-emerald-700 font-extrabold">{overallWeightedScore.toFixed(2)} / 5.00</span></div>
                            )}
                          </div>
                        </div>

                        <div className="text-center p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 flex flex-col justify-center items-center">
                          <div className="text-[10px] text-emerald-900 uppercase font-extrabold tracking-wider">Rating Level</div>
                          <div className="text-lg font-black text-emerald-800 mt-1">
                            {ratingText}
                          </div>
                        </div>
                      </div>

                      {/* Detailed Consolidated Block Breakdown Table */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="bg-slate-100/80 px-4 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12">
                          <div className="col-span-5">Component / Performance Block</div>
                          <div className="col-span-2 text-center">Weightage</div>
                          <div className="col-span-2 text-center">Raw Avg (1–5)</div>
                          <div className="col-span-3 text-right">Decimal Contribution</div>
                        </div>
                        <div className="divide-y divide-slate-100 text-xs">
                          {blockBreakdowns.map((b) => {
                            const maxContr = (b.weightage * 0.05).toFixed(2);
                            return (
                              <div key={b.id} className="px-4 py-2.5 grid grid-cols-12 items-center hover:bg-slate-50/50">
                                <div className="col-span-5 font-semibold text-slate-800">{b.title}</div>
                                <div className="col-span-2 text-center font-bold text-slate-600">{b.weightage}%</div>
                                <div className="col-span-2 text-center font-bold text-slate-700">{b.rawScore > 0 ? b.rawScore.toFixed(2) : '—'} <span className="text-[10px] text-slate-400">/ 5.0</span></div>
                                <div className="col-span-3 text-right font-black text-emerald-700">+{b.weightedScore.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ {maxContr}</span></div>
                              </div>
                            );
                          })}
                          <div className="px-4 py-2.5 bg-emerald-900 text-white grid grid-cols-12 items-center font-black rounded-b-xl">
                            <div className="col-span-5 text-emerald-200 uppercase text-[11px]">Consolidated Total Performance Score</div>
                            <div className="col-span-2 text-center text-emerald-300">100%</div>
                            <div className="col-span-2 text-center text-emerald-300">{overallRawScore.toFixed(2)} / 5.0</div>
                            <div className="col-span-3 text-right text-base text-white">{finalVal.toFixed(2)} / 5.00</div>
                          </div>
                        </div>
                      </div>

                      {/* Disagreement Reason & Supporting Document Display if Disagreed */}
                      {isDisagreed && (empCycleData?.appraiserRejectionReason || empCycleData?.disagreementReason) && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2">
                          <div className="font-bold flex items-center justify-between text-amber-900">
                            <div className="flex items-center space-x-1.5">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span>Recorded Disagreement Justification</span>
                            </div>
                            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                              Status: Under Review (GPM / PMW)
                            </Badge>
                          </div>
                          <p className="italic text-slate-800 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-amber-200">
                            "{empCycleData.disagreementReason || empCycleData.appraiserRejectionReason}"
                          </p>

                          {/* Supporting Document Attached for Record */}
                          {empCycleData?.disagreementAttachmentFileName && (
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
                              <div className="flex items-center space-x-2.5">
                                <div className="p-1.5 bg-red-50 text-red-600 rounded border border-red-100">
                                  {empCycleData.disagreementAttachmentFileName.toLowerCase().endsWith('.pdf') ? (
                                    <FileText className="h-4 w-4" />
                                  ) : empCycleData.disagreementAttachmentFileName.toLowerCase().includes('xls') ? (
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Paperclip className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                                    <span>{empCycleData.disagreementAttachmentFileName}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                      {empCycleData.disagreementAttachmentSizeBytes ? `${(empCycleData.disagreementAttachmentSizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'Record File'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500">Official Evidence Stored in Audit Dossier</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadDisagreementAttachment(empCycleData.disagreementAttachmentFileName, empCycleData.disagreementAttachmentFileData)}
                                className="border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold h-7"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download / Inspect
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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

          {/* Appraiser Performance Summary & Career Recommendations */}
          {appraisalScore?.appraiserComments && (
            <Card className="border border-emerald-200 shadow-sm mt-4 overflow-hidden bg-emerald-50/30">
              <div className="bg-gradient-to-r from-emerald-100 to-white px-5 py-3 border-b border-emerald-200 flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-emerald-950">Overall Appraiser Performance Summary & Career Recommendations</h3>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {appraisalScore.appraiserComments}
                </p>
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
                      <p className="text-sm text-slate-700 leading-relaxed">{developmentReview.keyStrengths?.trim() || 'Pending appraiser input during formal evaluation.'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Areas for Development</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{developmentReview.developmentAreas?.trim() || 'Pending appraiser input during formal evaluation.'}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 bg-slate-50/50">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Training & Action Plan</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{developmentReview.trainingActionPlan?.trim() || 'Pending appraiser input during formal evaluation.'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Supervisor Comments</h4>
                      <p className="text-sm text-slate-700 italic">{developmentReview.supervisorComments?.trim() || 'Pending appraiser input during formal evaluation.'}</p>
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
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-red-800/40 p-2 flex items-center justify-center border border-red-500/30">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Formal Appraisal Disagreement</h3>
                  <p className="text-[11px] text-red-200">Mandatory Justification &amp; Supporting Document Record</p>
                </div>
              </div>
              <button onClick={() => setShowDisagreementModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Please provide detailed factual justification for your disagreement. You can also upload supporting document evidence (e.g. audit clearance, portfolio reports, approval letters) to be archived for record and review by GPM &amp; PMW authorities.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={disagreementReason}
                  onChange={(e) => setDisagreementReason(e.target.value)}
                  placeholder="Explain why you disagree with specific scores, ratings or evaluator comments..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none font-medium"
                />
              </div>

              {/* Supporting Document Upload Area */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-red-600" />
                    <span>Upload Supporting Document (For Record Purpose)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Optional • PDF, Excel, Word (Max 25MB)</span>
                </div>

                {!disagreementFile ? (
                  <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-red-50/30 hover:border-red-300 transition-colors text-center relative cursor-pointer group">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={handleDisagreementFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center space-y-1.5">
                      <div className="h-8 w-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <Upload className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-xs">Click to browse or drop supporting file</span>
                      <span className="text-[10px] text-slate-500">PDF, Excel (.xlsx, .xls), Word (.docx), or Images</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50/60 border border-red-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg border border-red-200 shadow-2xs">
                        {disagreementFileName.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="h-5 w-5 text-red-600" />
                        ) : disagreementFileName.toLowerCase().includes('xls') ? (
                          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Paperclip className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs truncate max-w-[260px]">{disagreementFileName}</h5>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-slate-500">{(disagreementFileSize / (1024 * 1024)).toFixed(2)} MB</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">Attached for Record ✓</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveDisagreementFile}
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>The document will be securely catalogued into the official disagreement dossier and accessible to GPM &amp; PMW authorities.</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowDisagreementModal(false)}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRecordDisagreement}
                disabled={submittingDisagreement || !disagreementReason.trim()}
                className="font-bold text-xs"
              >
                {submittingDisagreement ? 'Lodging Dispute...' : 'Submit Formal Disagreement'}
              </Button>
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
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 font-bold flex items-center space-x-2 text-xs">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
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

      {showPrintModal && (
        <AppraisalPrintableReport
          employeeCycle={empCycleData}
          objectives={
            formMode === 'KPI'
              ? (kpiItems.length > 0 ? kpiItems.map(k => ({
                  id: k.id,
                  title: k.title,
                  targetDescription: k.targetDescription,
                  achievementDetails: k.achievement,
                  employeeSelfRating: (k as any).employeeSelfRating ?? k.selfRating ?? 4,
                  firstAppraiserRating: (k as any).firstAppraiserRating,
                  secondAppraiserRating: (k as any).secondAppraiserRating,
                  coAppraiserRating: (k as any).coAppraiserRating,
                  requiresCoAppraiserReview: Boolean((k as any).requiresCoAppraiserReview),
                  firstAppraiserComments: (k as any).firstAppraiserComments || k.appraiserComments || '',
                  secondAppraiserComments: (k as any).secondAppraiserComments || ''
                })) : [])
              : [
                  ...financialItems.map(k => ({ ...k, perspective: 'financial', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? 4, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                  ...customerItems.map(k => ({ ...k, perspective: 'customer', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? 4, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                  ...processItems.map(k => ({ ...k, perspective: 'process', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? 4, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                  ...learningItems.map(k => ({ ...k, perspective: 'learning', targetDescription: k.targetDescription, achievementDetails: (k as any).achievementDetails || k.achievement, employeeSelfRating: (k as any).employeeSelfRating ?? (k as any).selfRating ?? 4, firstAppraiserRating: (k as any).firstAppraiserRating, secondAppraiserRating: (k as any).secondAppraiserRating, coAppraiserRating: (k as any).coAppraiserRating, firstAppraiserComments: (k as any).firstAppraiserComments || (k as any).appraiserComments, secondAppraiserComments: (k as any).secondAppraiserComments })),
                  ...riskItems.map(r => ({
                    id: r.id,
                    title: r.title,
                    targetDescription: r.complianceTarget || r.description,
                    achievementDetails: (r as any).actualComplianceResult || (r as any).achievementDetails,
                    perspective: 'risk',
                    employeeSelfRating: (r as any).employeeSelfRating ?? (r as any).selfRating ?? 4,
                    firstAppraiserRating: (r as any).firstAppraiserRating,
                    secondAppraiserRating: (r as any).secondAppraiserRating,
                    coAppraiserRating: (r as any).coAppraiserRating,
                    firstAppraiserComments: (r as any).firstAppraiserComments || (r as any).appraiserComments,
                    secondAppraiserComments: (r as any).secondAppraiserComments
                  }))
                ]
          }
          traits={traitItems.length > 0 ? traitItems.map(t => ({
            id: t.id,
            traitName: t.name,
            definition: t.definition,
            selfRating: (t as any).selfRating ?? (t as any).employeeSelfRating,
            firstAppraiserRating: (t as any).firstAppraiserRating,
            secondAppraiserRating: (t as any).secondAppraiserRating,
            coAppraiserRating: (t as any).coAppraiserRating,
            firstAppraiserComments: (t as any).firstAppraiserComments || t.appraiserComments || ''
          })) : []}
          score={appraisalScore}
          developmentReview={developmentReview}
          onClose={() => setShowPrintModal(false)}
          isModal={true}
        />
      )}

      {/* Set Appraisal Workflow Stage Modal (PMW Admin Override) */}
      {isPmwAdmin && (
        <SetWorkflowStageModal
          isOpen={showAdminStageModal}
          onClose={() => setShowAdminStageModal(false)}
          currentUser={currentUser}
          onSuccess={() => {
            if (empCycleData?.id) {
              loadMyAppraisal(empCycleData.id);
            }
          }}
          target={
            empCycleData
              ? {
                  id: empCycleData.employeeId,
                  employeeCycleId: empCycleData.id,
                  sapId: empCycleData.employee?.sapId || currentSapId,
                  fullName: empCycleData.employee?.fullName,
                  grade: empCycleData.employee?.grade,
                  designation: empCycleData.employee?.designation,
                  currentStatus: currentStatus,
                  formType: formMode
                }
              : null
          }
          cycleId={selectedCycle?.cycleId || empCycleData?.cycleId}
        />
      )}
    </div>
  );
};
