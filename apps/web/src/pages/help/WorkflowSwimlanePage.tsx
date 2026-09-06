import React, { useState } from 'react';
import { WorkflowSlideshowView } from './WorkflowSlideshowView';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Shield,
  Award,
  GitBranch,
  Printer,
  Info,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  UserCheck,
  Sliders,
  CornerDownRight,
  FolderKanban,
  Presentation,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WorkflowStep {
  id: string;
  statusCode: string;
  numericCode: number;
  phaseId: string;
  actorId: 'employee' | 'coapp' | 'app1' | 'app2' | 'gpm' | 'pmw';
  actorName: string;
  actorRoleTitle: string;
  title: string;
  subtitle: string;
  description: string;
  actions: string[];
  conditions: string[];
  backwardMovement?: string;
  auditEventType: string;
  notifications: string[];
  badgeColor: string;
  accentColor: string;
  isOptionalBranch?: boolean;
  branchNote?: string;
  isTerminalSuccess?: boolean;
  isTerminalDispute?: boolean;
  isTerminalAdmin?: boolean;
  nextStepRef?: string;
}

interface PhaseDefinition {
  id: string;
  stepNumber: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  badgeColor: string;
  themeColor: string;
  bannerGradient: string;
  description: string;
  entryGate: string;
  exitMilestone: string;
  activeActors: Array<'employee' | 'coapp' | 'app1' | 'app2' | 'gpm' | 'pmw'>;
}

const ACTORS = [
  {
    id: 'employee' as const,
    name: 'Appraisee (Employee)',
    shortName: 'Appraisee',
    roleTitle: 'Self-Assessor & Objective Creator',
    color: 'emerald',
    badgeClass: 'bg-emerald-600 text-white',
    pillActive: 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/30',
    dotColor: 'bg-emerald-600',
    bgLight: 'bg-emerald-50/50',
    borderClass: 'border-emerald-200',
    headerBg: 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white',
    accentText: 'text-emerald-700'
  },
  {
    id: 'coapp' as const,
    name: 'Co-Appraiser (Matrix Head)',
    shortName: 'Co-Appraiser',
    roleTitle: 'Project / Functional Matrix Reviewer',
    color: 'teal',
    badgeClass: 'bg-teal-600 text-white',
    pillActive: 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-600/30',
    dotColor: 'bg-teal-600',
    bgLight: 'bg-teal-50/50',
    borderClass: 'border-teal-200',
    headerBg: 'bg-gradient-to-r from-teal-700 to-teal-800 text-white',
    accentText: 'text-teal-700'
  },
  {
    id: 'app1' as const,
    name: '1st Appraiser (Supervisor)',
    shortName: '1st Appraiser',
    roleTitle: 'Line Manager & Primary Evaluator',
    color: 'blue',
    badgeClass: 'bg-blue-600 text-white',
    pillActive: 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-600/30',
    dotColor: 'bg-blue-600',
    bgLight: 'bg-blue-50/50',
    borderClass: 'border-blue-200',
    headerBg: 'bg-gradient-to-r from-blue-700 to-blue-800 text-white',
    accentText: 'text-blue-700'
  },
  {
    id: 'app2' as const,
    name: '2nd Appraiser (Countersigning)',
    shortName: '2nd Appraiser / Supervisor',
    roleTitle: 'Divisional Head / Countersigning Authority',
    color: 'amber',
    badgeClass: 'bg-amber-600 text-white',
    pillActive: 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-600/30',
    dotColor: 'bg-amber-600',
    bgLight: 'bg-amber-50/50',
    borderClass: 'border-amber-200',
    headerBg: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white',
    accentText: 'text-amber-700'
  },
  {
    id: 'gpm' as const,
    name: 'Group Performance Manager (GPM)',
    shortName: 'GPM (Group Calibration)',
    roleTitle: 'Group Governance & Bell Curve Custodian',
    color: 'purple',
    badgeClass: 'bg-purple-600 text-white',
    pillActive: 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-600/30',
    dotColor: 'bg-purple-600',
    bgLight: 'bg-purple-50/50',
    borderClass: 'border-purple-200',
    headerBg: 'bg-gradient-to-r from-purple-700 to-purple-800 text-white',
    accentText: 'text-purple-700'
  },
  {
    id: 'pmw' as const,
    name: 'Performance Management Wing (PMW)',
    shortName: 'PMW Central Admin',
    roleTitle: 'Bank-Wide Admin & Result Publisher',
    color: 'rose',
    badgeClass: 'bg-rose-600 text-white',
    pillActive: 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-600/30',
    dotColor: 'bg-rose-600',
    bgLight: 'bg-rose-50/50',
    borderClass: 'border-rose-200',
    headerBg: 'bg-gradient-to-r from-rose-700 to-rose-800 text-white',
    accentText: 'text-rose-700'
  }
];

const PHASES: PhaseDefinition[] = [
  {
    id: 'phase-0',
    stepNumber: 'Phase 0',
    tabLabel: 'Phase 0: Governance & Setup',
    title: 'Governance & Reporting Line Setup',
    subtitle: 'Hierarchy Mapping & Supervisor Validation',
    badgeColor: 'bg-slate-700 text-white',
    themeColor: 'slate',
    bannerGradient: 'from-slate-100 via-white to-slate-50 border-slate-300',
    description: 'Establish and validate reporting relationships across 1st Appraiser (Supervisor), 2nd Appraiser (Countersigning Authority), and optional Co-Appraiser (Matrix Head).',
    entryGate: 'Cycle initiated & employee profile active in HRMS',
    exitMilestone: 'Validated reporting line locked for the appraisal cycle',
    activeActors: ['employee', 'app1']
  },
  {
    id: 'phase-1',
    stepNumber: 'Phase 1',
    tabLabel: 'Phase 1: Objectives & Approval',
    title: 'Objective Agreement & Approval',
    subtitle: 'Target Setting, SMART Alignment & Baseline Freeze',
    badgeColor: 'bg-emerald-700 text-white',
    themeColor: 'emerald',
    bannerGradient: 'from-emerald-50/90 via-white to-teal-50/50 border-emerald-300',
    description: 'Employee formulates measurable SMART Objectives or BSC Perspective targets summing to exactly 100% weightage; 1st Appraiser reviews, aligns, and approves.',
    entryGate: 'Reporting line confirmed as Validated',
    exitMilestone: 'Objectives approved & immutable baseline established',
    activeActors: ['employee', 'app1']
  },
  {
    id: 'phase-2',
    stepNumber: 'Phase 2',
    tabLabel: 'Phase 2: Self-Assessment',
    title: 'Annual Self-Assessment',
    subtitle: 'Deliverables Recording & Evidence File Attachment',
    badgeColor: 'bg-teal-700 text-white',
    themeColor: 'teal',
    bannerGradient: 'from-teal-50/90 via-white to-emerald-50/50 border-teal-300',
    description: 'Employee records actual achievements against approved targets, uploads PDF/Excel evidence files, provides self-ratings (1-5), and submits for assessment.',
    entryGate: 'Annual Review stage opened & objectives approved',
    exitMilestone: 'Self-assessment submitted into appraiser evaluation queue',
    activeActors: ['employee']
  },
  {
    id: 'phase-3',
    stepNumber: 'Phase 3',
    tabLabel: 'Phase 3: Appraisal Review',
    title: 'Appraisal Review & Assessment',
    subtitle: 'Co-Appraiser Input → 1st Appraiser Evaluation → 2nd Appraiser Countersign',
    badgeColor: 'bg-blue-700 text-white',
    themeColor: 'blue',
    bannerGradient: 'from-blue-50/90 via-white to-indigo-50/50 border-blue-300',
    description: 'Appraisal review workflow: Co-Appraiser scores matrix objectives first (if assigned), 1st Appraiser completes comprehensive scoring and Development Review, and 2nd Appraiser countersigns with delta adjustments.',
    entryGate: 'Self-assessment submitted by Appraisee',
    exitMilestone: 'Countersigned appraisal delivered to Group Performance Manager',
    activeActors: ['coapp', 'app1', 'app2']
  },
  {
    id: 'phase-4',
    stepNumber: 'Phase 4',
    tabLabel: 'Phase 4: Calibration & Bell Curve',
    title: 'Governance & Bell Curve Calibration',
    subtitle: 'GPM Group Calibration & PMW Central Finalization',
    badgeColor: 'bg-purple-700 text-white',
    themeColor: 'purple',
    bannerGradient: 'from-purple-50/90 via-white to-fuchsia-50/50 border-purple-300',
    description: 'GPM calibrates ratings across reporting groups to ensure adherence to Bell Curve quotas; PMW reviews bank-wide statistics, audits exceptions, and locks cycle.',
    entryGate: '2nd Appraiser countersign completed across group',
    exitMilestone: 'Appraisal batch calibrated, audited and approved for publishing',
    activeActors: ['gpm', 'pmw']
  },
  {
    id: 'phase-5',
    stepNumber: 'Phase 5',
    tabLabel: 'Phase 5: Publication & Closure',
    title: 'Result Publication & Employee Acknowledgment',
    subtitle: 'Performance Appraisal Form (HTML/PDF), Agreement, Dispute & Closure',
    badgeColor: 'bg-rose-700 text-white',
    themeColor: 'rose',
    bannerGradient: 'from-rose-50/90 via-white to-amber-50/50 border-rose-300',
    description: 'Appraisal results published. Employee reviews official Performance Appraisal Form (HTML & Vector PDF) to confirm formal Agreement, register a Disagreement dispute, or administrative completion occurs upon deadline.',
    entryGate: 'PMW publication trigger',
    exitMilestone: 'Appraisal permanently sealed, signed, and archived in audit vault',
    activeActors: ['pmw', 'employee', 'gpm']
  }
];

const ALL_STEPS: WorkflowStep[] = [
  // ==========================================
  // PHASE 0: GOVERNANCE & REPORTING LINE SETUP
  // ==========================================
  {
    id: 'step-0-1',
    statusCode: 'APPRAISER_MAPPING_REQ',
    numericCode: 0,
    phaseId: 'phase-0',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    title: '0.1 Select Appraisers',
    subtitle: 'Propose 1st, 2nd & Co-Appraiser SAP IDs',
    description: 'Employee enters designated 1st Appraiser (Supervisor), 2nd Appraiser (Divisional Head), and optional Co-Appraiser (Matrix/Project Head) for the cycle.',
    actions: ['Submit Reporting Line Hierarchy', 'Search Appraiser by SAP ID / Name'],
    conditions: ['Valid active SAP IDs in HR master', 'Cycle active'],
    auditEventType: 'APPRAISER_MAPPING_REQUESTED',
    notifications: ['1st Appraiser notified for validation'],
    badgeColor: 'bg-emerald-600 text-white',
    accentColor: 'emerald',
    nextStepRef: '0.2 Validate Reporting Line'
  },
  {
    id: 'step-0-2',
    statusCode: 'APPRAISER_MAPPING_CONFIRMED',
    numericCode: 0,
    phaseId: 'phase-0',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Supervisor',
    title: '0.2 Validate Reporting Line',
    subtitle: 'Confirm, modify or reject hierarchy',
    description: '1st Appraiser reviews requested reporting line, verifies/adjusts SAP IDs, and locks the validated hierarchy. PMW Admin can unlock for revisions if needed.',
    actions: ['Validate & Confirm Mapping', 'Reject with Mandatory Reason', 'PMW Admin Unlock'],
    conditions: ['Supervisor authentication', 'Mandatory feedback if rejecting'],
    backwardMovement: 'Reject Mapping -> Employee re-enters reporting hierarchy',
    auditEventType: 'APPRAISER_MAPPING_CONFIRMED',
    notifications: ['Employee notified of validation status'],
    badgeColor: 'bg-blue-600 text-white',
    accentColor: 'blue',
    nextStepRef: '1.1 Draft Objectives & KPIs'
  },

  // ==========================================
  // PHASE 1: OBJECTIVE AGREEMENT & APPROVAL
  // ==========================================
  {
    id: 'step-1-1',
    statusCode: 'OBJ_DRAFT',
    numericCode: 1,
    phaseId: 'phase-1',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    title: '1.1 Draft Objectives & KPIs',
    subtitle: 'SMART goals summing to 100% weightage',
    description: 'Employee creates targets based on assigned form: KPI Form (70% Objectives / 30% Traits), Balanced Scorecard (4 Perspectives), or Risk-Adjusted BSC (5 Perspectives). Flags matrix objectives for Co-Appraiser review if applicable.',
    actions: ['Save Draft Objectives', 'Add SMART Objectives', 'Flag Co-Appraiser Objectives'],
    conditions: ['Total weightage must equal 100%', 'Reporting line validated'],
    auditEventType: 'OBJ_DRAFT_SAVED',
    notifications: ['None (Draft mode)'],
    badgeColor: 'bg-emerald-600 text-white',
    accentColor: 'emerald',
    nextStepRef: '1.2 Submit Objectives'
  },
  {
    id: 'step-1-2',
    statusCode: 'OBJ_SUBMITTED',
    numericCode: 2,
    phaseId: 'phase-1',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    title: '1.2 Submit Objectives',
    subtitle: 'Send targets for formal supervisor approval',
    description: 'Employee formally submits drafted objectives to 1st Appraiser. Form enters read-only lock for the employee while pending supervisor review.',
    actions: ['Submit to 1st Appraiser', 'Withdraw Submission (before FA action)'],
    conditions: ['All mandatory target fields filled', 'Total weightage = 100%'],
    backwardMovement: 'Employee can withdraw before 1st Appraiser takes action',
    auditEventType: 'APP_SUBMIT_OBJ',
    notifications: ['1st Appraiser email & inbox alert'],
    badgeColor: 'bg-emerald-600 text-white',
    accentColor: 'emerald',
    nextStepRef: '1.4 Approve Objectives'
  },
  {
    id: 'step-1-3',
    statusCode: 'OBJ_RETURNED',
    numericCode: 3,
    phaseId: 'phase-1',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Supervisor',
    title: '1.3 Return / Reject (Exception)',
    subtitle: 'Request modifications or realignment',
    description: 'If targets require revision, 1st Appraiser returns the form with mandatory feedback comments. Employee updates targets and re-submits (OBJ_SUBMITTED).',
    actions: ['Return with Mandatory Comments', 'Employee Re-submits'],
    conditions: ['Mandatory feedback comments required'],
    backwardMovement: 'Returns form back to Employee editable draft (OBJ_RETURNED)',
    auditEventType: 'APP_RETURN_OBJ',
    notifications: ['Employee alert with return comments'],
    badgeColor: 'bg-amber-600 text-white',
    accentColor: 'amber',
    isOptionalBranch: true,
    branchNote: 'Exception loop if targets need revision',
    nextStepRef: '1.1 Draft Objectives & KPIs'
  },
  {
    id: 'step-1-4',
    statusCode: 'OBJ_APPROVED',
    numericCode: 4,
    phaseId: 'phase-1',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Supervisor',
    title: '1.4 Approve Objectives',
    subtitle: 'Freeze baseline targets for the cycle',
    description: '1st Appraiser formally signs off and approves objectives. Goals become immutable baseline for annual performance evaluation.',
    actions: ['Approve Objectives', 'PMW Force Approve (Admin Override)'],
    conditions: ['Reporting line confirmed', 'All perspectives validated'],
    auditEventType: 'APP_APPROVE_OBJ',
    notifications: ['Employee and 2nd Appraiser notified'],
    badgeColor: 'bg-blue-600 text-white',
    accentColor: 'blue',
    nextStepRef: '2.1 Submit Self-Assessment'
  },

  // ==========================================
  // PHASE 2: ANNUAL SELF-ASSESSMENT
  // ==========================================
  {
    id: 'step-2-1',
    statusCode: 'AR_EMP_ASSESS',
    numericCode: 5,
    phaseId: 'phase-2',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    title: '2.1 Submit Self-Assessment',
    subtitle: 'Record achievements, attach evidence & rate self',
    description: 'Employee enters actual deliverable achievements against each approved objective, attaches PDF/Excel evidence files (e.g. Audit reports, CASA growth summaries), inputs self-ratings, and submits.',
    actions: ['Submit Self-Assessment', 'Attach PDF/Excel Evidence', 'Save Draft'],
    conditions: ['Objectives in Approved state', 'Mandatory achievement details filled'],
    auditEventType: 'APP_SUBMIT_SELF_ASSESS',
    notifications: ['Co-Appraiser (if assigned) or 1st Appraiser notified'],
    badgeColor: 'bg-emerald-600 text-white',
    accentColor: 'emerald',
    nextStepRef: '3.1 Co-Appraiser Review (or 3.2 1st Appraiser Evaluation)'
  },

  // ==========================================
  // PHASE 3: APPRAISAL REVIEW & ASSESSMENT
  // ==========================================
  {
    id: 'step-3-1',
    statusCode: 'AR_CA_ASSESS',
    numericCode: 8,
    phaseId: 'phase-3',
    actorId: 'coapp',
    actorName: 'Co-Appraiser (Matrix Head)',
    actorRoleTitle: 'Matrix Evaluator',
    title: '3.1 Co-Appraiser Review',
    subtitle: 'Score matrix & flagged objectives first',
    description: 'When assigned, Co-Appraiser evaluates functional matrix objectives first (1.0 - 5.0 decimal), records evaluative comments, and submits before 1st Appraiser evaluates.',
    actions: ['Score Flagged Objectives (1-5)', 'Record Matrix Remarks', 'Submit Co-Appraisal'],
    conditions: ['Co-Appraiser assigned to Appraisee', 'Flagged objectives present'],
    auditEventType: 'APP_CA_FEEDBACK',
    notifications: ['1st Appraiser notified with Co-Appraiser ratings'],
    badgeColor: 'bg-teal-600 text-white',
    accentColor: 'teal',
    isOptionalBranch: true,
    branchNote: 'Active only when Co-Appraiser is assigned to employee',
    nextStepRef: '3.2 1st Appraiser Evaluation'
  },
  {
    id: 'step-3-2',
    statusCode: 'AR_FA_ASSESS',
    numericCode: 6,
    phaseId: 'phase-3',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Supervisor',
    title: '3.2 1st Appraiser Evaluation',
    subtitle: 'Comprehensive scoring & Development Review',
    description: '1st Appraiser inspects evidence, views Co-Appraiser scores (for reference), rates remaining objectives and behavioural traits, writes performance remarks, and completes the separate Development Review form.',
    actions: ['Score Objectives (1-5)', 'Score Behavioural Traits (1-5)', 'Complete Development Review Form', 'Submit to 2nd Appraiser'],
    conditions: ['Co-Appraiser completed (if assigned)', 'All mandatory ratings filled'],
    auditEventType: 'APP_FA_ASSESS',
    notifications: ['2nd Appraiser notified for countersign'],
    badgeColor: 'bg-blue-600 text-white',
    accentColor: 'blue',
    nextStepRef: '3.3 2nd Appraiser Countersign'
  },
  {
    id: 'step-3-3',
    statusCode: 'AR_SA_ASSESS',
    numericCode: 7,
    phaseId: 'phase-3',
    actorId: 'app2',
    actorName: '2nd Appraiser (Countersigning)',
    actorRoleTitle: 'Supervisor / Countersigning',
    title: '3.3 2nd Appraiser Countersign',
    subtitle: 'Review & adjust scores with delta flags',
    description: '2nd Appraiser reviews 1st Appraiser & Co-Appraiser ratings, applies score adjustments if needed (with visual upgraded/downgraded delta indicators), enters supervisor comments, and submits.',
    actions: ['Countersign Appraisal', 'Adjust Objective & Trait Scores', 'Return to 1st Appraiser (Exception)', 'Submit to GPM'],
    conditions: ['1st Appraiser evaluation completed', 'Mandatory remarks entered'],
    backwardMovement: 'Can return to 1st Appraiser for re-evaluation with remarks',
    auditEventType: 'APP_SA_COUNTERSIGN',
    notifications: ['Group Performance Manager notified'],
    badgeColor: 'bg-amber-600 text-white',
    accentColor: 'amber',
    nextStepRef: '4.1 GPM Group Calibration'
  },

  // ==========================================
  // PHASE 4: GOVERNANCE & CALIBRATION
  // ==========================================
  {
    id: 'step-4-1',
    statusCode: 'GPM_REVIEW',
    numericCode: 9,
    phaseId: 'phase-4',
    actorId: 'gpm',
    actorName: 'Group Performance Manager (GPM)',
    actorRoleTitle: 'Group Custodian',
    title: '4.1 GPM Group Calibration',
    subtitle: 'Enforce Bell Curve distribution quotas',
    description: 'GPM examines group-wide score distribution against prescribed policy quotas (e.g. 15% Outstanding, 30% Very Good). Requests exceptions or returns non-compliant appraisals for recalibration.',
    actions: ['Approve Group Results', 'Submit Bell Curve Exception Request', 'Return to 2nd Appraiser'],
    conditions: ['All group appraisals submitted', 'Bell curve within tolerance or exception filed'],
    backwardMovement: 'Can return appraisal back to 2nd Appraiser',
    auditEventType: 'APP_GPM_APPROVE',
    notifications: ['PMW Admin alerted for finalization'],
    badgeColor: 'bg-purple-600 text-white',
    accentColor: 'purple',
    nextStepRef: '4.2 PMW Finalization'
  },
  {
    id: 'step-4-2',
    statusCode: 'PMW_FINAL',
    numericCode: 10,
    phaseId: 'phase-4',
    actorId: 'pmw',
    actorName: 'Performance Management Wing (PMW)',
    actorRoleTitle: 'Central Admin',
    title: '4.2 PMW Finalization',
    subtitle: 'Bank-wide audit & exception sign-off',
    description: 'PMW Super Admin & Admin review bank-wide distribution, approve GPM exceptions, ensure audit integrity, and prepare results for official publication.',
    actions: ['Approve Bell Exceptions', 'Finalize Appraisal Batch', 'Trigger Publication'],
    conditions: ['GPM sign-off complete', 'Audit checks passed'],
    auditEventType: 'APP_PMW_FINALIZE',
    notifications: ['Ready for bank-wide publication'],
    badgeColor: 'bg-rose-600 text-white',
    accentColor: 'rose',
    nextStepRef: '5.1 Publish Results'
  },

  // ==========================================
  // PHASE 5: PUBLICATION & CLOSURE
  // ==========================================
  {
    id: 'step-5-1',
    statusCode: 'PUBLISHED',
    numericCode: 11,
    phaseId: 'phase-5',
    actorId: 'pmw',
    actorName: 'Performance Management Wing (PMW)',
    actorRoleTitle: 'Central Admin',
    title: '5.1 Publish Results',
    subtitle: 'Scores & Official Form visible to Appraisee',
    description: 'Appraisal results and consolidated decimal score (1.00 - 5.00) are published. Appraisee can view the official Performance Appraisal Form (HTML) and download vector PDF.',
    actions: ['Publish Cycle Results', 'Trigger Acknowledgment Window'],
    conditions: ['Cycle finalized by PMW', 'Calendar acknowledgment deadline set'],
    auditEventType: 'SYS_PUBLISH_APPRAISAL',
    notifications: ['Appraisee alerted with publication notification'],
    badgeColor: 'bg-rose-600 text-white',
    accentColor: 'rose',
    nextStepRef: '5.2 Outcome Decisions (Agreement / Disagreement / Admin Close)'
  },
  {
    id: 'step-5-2a',
    statusCode: 'EMP_AGREED',
    numericCode: 12,
    phaseId: 'phase-5',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    title: '5.2A Formal Agreement',
    subtitle: 'Accept score & permanently seal document',
    description: 'Employee reviews the Performance Appraisal Form and clicks "Agree & Acknowledge". The document is permanently sealed with cryptographic audit hash and archived.',
    actions: ['Agree & Acknowledge', 'Download Sealed PDF Report'],
    conditions: ['Form in Published status', 'Acknowledgment window active'],
    auditEventType: 'APP_EMP_AGREE',
    notifications: ['Appraisers and GPM notified of formal agreement'],
    badgeColor: 'bg-emerald-700 text-white',
    accentColor: 'emerald',
    isTerminalSuccess: true
  },
  {
    id: 'step-5-2b',
    statusCode: 'EMP_DISAGREED',
    numericCode: 13,
    phaseId: 'phase-5',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    title: '5.2B Disagreement Dispute',
    subtitle: 'Log formal objection with justification & supporting document',
    description: 'If employee disagrees with ratings, they log a dispute with mandatory factual justification and optional supporting document upload (PDF, Word, Excel, Images up to 25MB). The uploaded proof is permanently preserved in the audit vault for committee inspection. The dispute routes sequentially: GPM Review (14) -> PMW Review (15) -> Disagreement Resolved (16).',
    actions: ['Log Disagreement (Mandatory Remarks)', 'Upload Supporting Document Proof', 'GPM Review (14)', 'PMW Committee Review (15)', 'Resolve Dispute (16)'],
    conditions: ['Mandatory dispute justification required', 'Supporting document attachment (Optional)'],
    auditEventType: 'APP_EMP_DISAGREE',
    notifications: ['GPM and PMW alerted of dispute case'],
    badgeColor: 'bg-amber-700 text-white',
    accentColor: 'amber',
    isOptionalBranch: true,
    branchNote: 'Dispute escalation path if employee disagrees',
    isTerminalDispute: true
  },
  {
    id: 'step-5-2c',
    statusCode: 'ADMIN_COMP',
    numericCode: 17,
    phaseId: 'phase-5',
    actorId: 'pmw',
    actorName: 'Performance Management Wing (PMW)',
    actorRoleTitle: 'Central Admin',
    title: '5.2C Administrative Close',
    subtitle: 'Closure upon policy deadline expiry',
    description: 'If an employee fails to acknowledge by the configured deadline (including any granted rolling-days extensions), PMW administratively closes the appraisal (distinct from Agreement).',
    actions: ['Administrative Completion', 'Audit Log Entry'],
    conditions: ['Acknowledgment deadline elapsed', 'Audit justification recorded'],
    auditEventType: 'APP_ADMIN_COMPLETE',
    notifications: ['Employee alerted of administrative closure'],
    badgeColor: 'bg-slate-700 text-white',
    accentColor: 'slate',
    isOptionalBranch: true,
    branchNote: 'Fallback closure if acknowledgment deadline lapses',
    isTerminalAdmin: true
  }
];

export const WorkflowSwimlanePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'swimlane' | 'slideshow'>('swimlane');
  const [slideshowInitialIndex, setSlideshowInitialIndex] = useState<number>(0);
  const [activePhaseTab, setActivePhaseTab] = useState<string>('phase-0');
  const [selectedActorFilter, setSelectedActorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeStepModal, setActiveStepModal] = useState<WorkflowStep | null>(null);

  const stepSlideIndexMap: Record<string, number> = {
    'step-0-1': 0,
    'step-0-2': 1,
    'step-1-1': 2,
    'step-1-2': 3,
    'step-1-3': 4,
    'step-1-4': 4,
    'step-2-1': 5,
    'step-3-1': 6,
    'step-3-2': 7,
    'step-3-3': 8,
    'step-4-1': 9,
    'step-4-2': 10,
    'step-5-1': 11,
    'step-5-2a': 12,
    'step-5-2b': 13,
    'step-5-2c': 13
  };

  // Filter steps based on search query and actor filter
  const getFilteredStepsForPhase = (phaseId: string) => {
    return ALL_STEPS.filter(step => {
      if (step.phaseId !== phaseId) return false;
      const matchesActor = selectedActorFilter === 'all' || step.actorId === selectedActorFilter;
      const matchesSearch = !searchQuery.trim() ||
        step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        step.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        step.statusCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        step.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        step.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesActor && matchesSearch;
    });
  };

  const currentPhaseIndex = PHASES.findIndex(p => p.id === activePhaseTab);

  const handleNextPhase = () => {
    if (currentPhaseIndex >= 0 && currentPhaseIndex < PHASES.length - 1) {
      setActivePhaseTab(PHASES[currentPhaseIndex + 1].id);
    }
  };

  const handlePrevPhase = () => {
    if (currentPhaseIndex > 0) {
      setActivePhaseTab(PHASES[currentPhaseIndex - 1].id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const visiblePhases = activePhaseTab === 'all'
    ? PHASES
    : PHASES.filter(p => p.id === activePhaseTab);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar - Clean Light Branding */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xs no-print">
        <div className="flex items-center space-x-3.5">
          <Link to="/" className="flex items-center space-x-2.5 text-emerald-800 hover:text-emerald-700 transition-colors">
            <div className="bg-white p-1 rounded-md border border-slate-200 shadow-2xs flex items-center justify-center">
              <img src="/nbp-logo-small.png" alt="NBP Logo" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                National Bank of Pakistan
              </h1>
              <p className="text-[11px] font-bold text-emerald-800">
                Performance Management System (PMS 2.0)
              </p>
            </div>
          </Link>
          <div className="hidden md:block h-6 w-px bg-slate-200 mx-1" />
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600">
            <GitBranch className="h-4 w-4 text-emerald-700" />
            <span className="font-bold text-slate-800">Phase-Wise Workflow Swimlane Blueprint</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Switcher: Swimlane Blueprint vs Presentation Slideshow */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-2xs">
            <button
              onClick={() => setViewMode('swimlane')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'swimlane'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Swimlane View</span>
            </button>
            <button
              onClick={() => { setSlideshowInitialIndex(0); setViewMode('slideshow'); }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'slideshow'
                  ? 'bg-[#004d25] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Presentation className="h-3.5 w-3.5 text-amber-300" />
              <span>Slideshow Presentation</span>
            </button>
          </div>

          {/* Quick Search in Top Header */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search steps, codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs h-8 font-medium shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Guide
          </Button>

          <Link to="/">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-8 shadow-2xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Sign In to PMS
            </Button>
          </Link>
        </div>
      </header>

      {/* View Mode Switching: Slideshow View vs Swimlane Blueprint */}
      {viewMode === 'slideshow' ? (
        <WorkflowSlideshowView
          onClose={() => setViewMode('swimlane')}
          initialSlideIndex={slideshowInitialIndex}
        />
      ) : (
        <>
          {/* Hero & Navigation Bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5 no-print shadow-2xs">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Lifecycle Phase Architecture
                </Badge>
                <span className="text-xs text-slate-500">• Complete Interactive Responsibility Matrix</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Appraisal Workflow — Phase-by-Phase Interactive Tabs
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Select any lifecycle phase tab below to inspect its dedicated actor swimlanes, hand-off links, entry prerequisites, and audit checkpoints across all 6 stakeholder roles.
              </p>
            </div>

            {/* Presentation Slideshow Launch Banner */}
            <div className="bg-gradient-to-r from-[#004d25] to-emerald-800 p-3.5 rounded-2xl text-white shadow-sm flex items-center justify-between gap-3 shrink-0 border border-emerald-700">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5 text-xs font-black text-amber-300">
                  <Presentation className="h-4 w-4" />
                  <span>Cycle Walkthrough Presentation</span>
                </div>
                <p className="text-[11px] text-emerald-100/90 max-w-[280px]">
                  14 executive slides with step-by-step commentary and policy rules.
                </p>
              </div>
              <Button
                onClick={() => { setSlideshowInitialIndex(0); setViewMode('slideshow'); }}
                size="sm"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8 px-3 shadow-2xs shrink-0"
              >
                <Play className="h-3 w-3 mr-1 fill-current" />
                <span>Play Slideshow</span>
              </Button>
            </div>
          </div>

          {/* MAIN PHASE TABS NAVIGATION BAR */}
          <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {PHASES.map((phase, idx) => {
                const isActive = activePhaseTab === phase.id;

                return (
                  <button
                    key={phase.id}
                    onClick={() => setActivePhaseTab(phase.id)}
                    className={`p-2.5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600/40'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-black/20 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {phase.stepNumber}
                      </span>
                      <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                        #{idx + 1}/6
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <div className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {phase.title.split(' ')[0]} {phase.title.split(' ')[1] || ''}
                      </div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {phase.subtitle.split('&')[0]}
                      </div>
                    </div>

                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
                    )}
                  </button>
                );
              })}

              {/* All Phases Overview Tab */}
              <button
                onClick={() => setActivePhaseTab('all')}
                className={`p-2.5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between col-span-2 sm:col-span-1 ${
                  activePhaseTab === 'all'
                    ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-600/40'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                    activePhaseTab === 'all' ? 'bg-black/20 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    Full
                  </span>
                  <FolderKanban className="h-3.5 w-3.5 opacity-80" />
                </div>

                <div className="mt-1.5">
                  <div className="text-xs font-black truncate">All Phases</div>
                  <div className={`text-[10px] truncate ${activePhaseTab === 'all' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Full Blueprint
                  </div>
                </div>

                {activePhaseTab === 'all' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
                )}
              </button>
            </div>
          </div>

          {/* DEDICATED FULL-WIDTH ACTOR SELECTION BAR (NO SCROLLBARS) */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1 flex items-center shrink-0">
                <Users className="h-3.5 w-3.5 mr-1 text-slate-500" /> Filter Actor Lane:
              </span>

              <button
                onClick={() => setSelectedActorFilter('all')}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedActorFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs ring-1 ring-slate-800'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                }`}
              >
                All 6 Lanes
              </button>

              {ACTORS.map(actor => {
                const isSelected = selectedActorFilter === actor.id;
                return (
                  <button
                    key={actor.id}
                    onClick={() => setSelectedActorFilter(isSelected ? 'all' : actor.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? actor.pillActive
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${actor.dotColor}`} />
                    <span>{actor.shortName}</span>
                    {isSelected && <X className="h-3 w-3 ml-0.5 opacity-80" />}
                  </button>
                );
              })}
            </div>

            {selectedActorFilter !== 'all' && (
              <Button
                onClick={() => setSelectedActorFilter('all')}
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2 font-semibold"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabbed Content Area: Dedicated Phase Swimlane View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {visiblePhases.map((phase) => {
          const phaseSteps = getFilteredStepsForPhase(phase.id);
          const activeActorIds = Array.from(new Set(phaseSteps.map(s => s.actorId)));

          return (
            <section
              key={phase.id}
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm space-y-0 animate-in fade-in duration-150"
            >
              {/* Phase Banner Header - Light Gradient */}
              <div className={`p-5 bg-gradient-to-r ${phase.bannerGradient} border-b`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <Badge className={`text-xs font-black uppercase px-3 py-1 rounded shadow-xs ${phase.badgeColor}`}>
                        {phase.stepNumber}
                      </Badge>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {phase.title}
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-emerald-800 mt-0.5">
                      {phase.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                      {phase.description}
                    </p>
                  </div>

                  {/* Entry & Exit Milestones */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/90 p-3 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Entry Gate</span>
                      <span className="font-bold text-emerald-800 block max-w-[190px]">
                        {phase.entryGate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Exit Milestone</span>
                      <span className="font-bold text-amber-800 block max-w-[190px]">
                        {phase.exitMilestone}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Swimlane Grid for this Phase */}
              <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50">
                {activeActorIds.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic bg-white rounded-xl border border-slate-200">
                    No steps in {phase.stepNumber} matching the active filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ACTORS.filter(actor => activeActorIds.includes(actor.id)).map(actor => {
                      const actorPhaseSteps = phaseSteps.filter(s => s.actorId === actor.id);

                      return (
                        <div
                          key={actor.id}
                          className={`rounded-xl border-2 ${actor.borderClass} ${actor.bgLight} overflow-hidden shadow-xs bg-white`}
                        >
                          {/* Actor Sub-Lane Header */}
                          <div className={`${actor.headerBg} px-4 py-2 flex items-center justify-between`}>
                            <div className="flex items-center space-x-2">
                              <div className="p-1 rounded bg-white/20">
                                {actor.id === 'employee' && <Users className="h-3.5 w-3.5 text-white" />}
                                {actor.id === 'coapp' && <GitBranch className="h-3.5 w-3.5 text-white" />}
                                {actor.id === 'app1' && <UserCheck className="h-3.5 w-3.5 text-white" />}
                                {actor.id === 'app2' && <Shield className="h-3.5 w-3.5 text-white" />}
                                {actor.id === 'gpm' && <Sliders className="h-3.5 w-3.5 text-white" />}
                                {actor.id === 'pmw' && <Award className="h-3.5 w-3.5 text-white" />}
                              </div>
                              <span className="text-xs font-black uppercase tracking-wide">{actor.name}</span>
                              <span className="text-[10px] opacity-90 font-medium">({actor.roleTitle})</span>
                            </div>
                            <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded text-white">
                              {actorPhaseSteps.length} Step{actorPhaseSteps.length > 1 ? 's' : ''} in this Lane
                            </span>
                          </div>

                          {/* Steps Horizontal Flow within this Actor's Lane */}
                          <div className="p-3 sm:p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                              {actorPhaseSteps.map((step) => (
                                <div
                                  key={step.id}
                                  onClick={() => setActiveStepModal(step)}
                                  className="group cursor-pointer bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-600 p-4 rounded-xl space-y-2.5 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 relative"
                                >
                                  {step.isOptionalBranch && (
                                    <div className="absolute top-2.5 right-2.5">
                                      <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] font-bold">
                                        Branch / Exception
                                      </Badge>
                                    </div>
                                  )}
                                  {step.isTerminalSuccess && (
                                    <div className="absolute top-2.5 right-2.5">
                                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[9px] font-black">
                                        Sealed &amp; Archived
                                      </Badge>
                                    </div>
                                  )}
                                  {step.isTerminalDispute && (
                                    <div className="absolute top-2.5 right-2.5">
                                      <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] font-black">
                                        Dispute Escalation
                                      </Badge>
                                    </div>
                                  )}
                                  {step.isTerminalAdmin && (
                                    <div className="absolute top-2.5 right-2.5">
                                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[9px] font-black">
                                        Policy Timeout
                                      </Badge>
                                    </div>
                                  )}

                                  <div className="flex items-center space-x-2">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-2xs ${step.badgeColor}`}>
                                      {step.statusCode}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                                      Code #{step.numericCode}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                                      {step.title}
                                    </h4>
                                    <p className="text-xs font-bold text-emerald-700 mt-0.5">
                                      {step.subtitle}
                                    </p>
                                  </div>

                                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                                    {step.description}
                                  </p>

                                  {step.nextStepRef && (
                                    <div className="pt-1.5 text-[11px] text-slate-500 flex items-center space-x-1">
                                      <CornerDownRight className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                                      <span className="truncate">Next: <strong className="text-slate-800">{step.nextStepRef}</strong></span>
                                    </div>
                                  )}

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="flex items-center text-emerald-700 font-bold group-hover:underline">
                                      <Info className="h-3.5 w-3.5 mr-1" />
                                      Inspect Step Rules
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Phase Stepper Navigation Buttons (When in single phase mode) */}
              {activePhaseTab !== 'all' && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
                  <Button
                    onClick={handlePrevPhase}
                    disabled={currentPhaseIndex === 0}
                    variant="outline"
                    size="sm"
                    className="bg-white border-slate-300 hover:bg-slate-100 text-slate-700 text-xs disabled:opacity-30 shadow-2xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {currentPhaseIndex > 0 ? `Previous: ${PHASES[currentPhaseIndex - 1].stepNumber}` : 'First Phase'}
                  </Button>

                  <span className="text-xs text-slate-500 font-mono font-bold">
                    Phase {currentPhaseIndex + 1} of {PHASES.length}
                  </span>

                  <Button
                    onClick={handleNextPhase}
                    disabled={currentPhaseIndex === PHASES.length - 1}
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs disabled:opacity-30 shadow-2xs"
                  >
                    {currentPhaseIndex < PHASES.length - 1 ? `Next: ${PHASES[currentPhaseIndex + 1].stepNumber}` : 'Last Phase'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </section>
          );
        })}

        {/* Global Policy Reference Cards - Light Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-emerald-800 flex items-center space-x-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                <span>Form Type Weightages</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 text-slate-600">
              <div>• <strong>KPI Form (AVP &amp; Below):</strong> 70% Objectives + 30% Fixed Behavioural Traits.</div>
              <div>• <strong>BSC Form (VP &amp; Above):</strong> 4 Strategic Perspectives (Fin 30%, Cust 25%, Proc 25%, Learn 20%).</div>
              <div>• <strong>Risk-Adjusted BSC (MRT/MRC):</strong> 5 Perspectives with Risk Adjustment (20%).</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-teal-800 flex items-center space-x-1.5">
                <GitBranch className="h-4 w-4 text-teal-700" />
                <span>Sequential Co-Appraisal Rule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 text-slate-600">
              <div>• <strong>Co-Appraiser First:</strong> If assigned, Co-Appraiser evaluates matrix objectives before 1st Appraiser submits.</div>
              <div>• <strong>Score Isolation:</strong> In reports, 1st Appraiser column shows dash (—) for Co-Appraiser scored objectives.</div>
              <div>• <strong>Supervisor Countersign:</strong> 2nd Appraiser reviews both evaluators with delta flags.</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-purple-800 flex items-center space-x-1.5">
                <Shield className="h-4 w-4 text-purple-700" />
                <span>Dispute &amp; Closure Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 text-slate-600">
              <div>• <strong>Agreement:</strong> Permanently locks and archives the sealed Performance Appraisal Form.</div>
              <div>• <strong>Disagreement:</strong> Mandatory comments route to GPM Review (14) &rarr; PMW (15) &rarr; Resolved (16).</div>
              <div>• <strong>Admin Close:</strong> Non-responsive cases after deadline closed under status 17 (never Agreement).</div>
            </CardContent>
          </Card>
        </div>
      </main>
      </>
      )}

      {/* Interactive Step Detail Modal - Clean Light Theme */}
      {activeStepModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            {/* Modal Header */}
            <div className={`p-5 rounded-t-2xl flex items-center justify-between ${
              activeStepModal.actorId === 'employee' ? 'bg-gradient-to-r from-emerald-800 to-emerald-900 text-white' :
              activeStepModal.actorId === 'coapp' ? 'bg-gradient-to-r from-teal-800 to-teal-900 text-white' :
              activeStepModal.actorId === 'app1' ? 'bg-gradient-to-r from-blue-800 to-blue-900 text-white' :
              activeStepModal.actorId === 'app2' ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white' :
              activeStepModal.actorId === 'gpm' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white' :
              'bg-gradient-to-r from-rose-800 to-rose-900 text-white'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-2xs ${activeStepModal.badgeColor}`}>
                    {activeStepModal.statusCode} (Code #{activeStepModal.numericCode})
                  </span>
                  <span className="text-xs text-white/90 font-bold">
                    {activeStepModal.actorName}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{activeStepModal.title}</h3>
                <p className="text-xs text-amber-200 font-semibold">{activeStepModal.subtitle}</p>
              </div>

              <button
                onClick={() => setActiveStepModal(null)}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Description &amp; Purpose</span>
                <p className="text-xs text-slate-800 leading-relaxed font-normal">{activeStepModal.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Permitted Actions */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Permitted Actions</span>
                  </span>
                  <ul className="space-y-1">
                    {activeStepModal.actions.map((act, i) => (
                      <li key={i} className="flex items-center space-x-1.5 text-slate-700">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Entry Conditions */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
                    <Shield className="h-3.5 w-3.5 text-amber-700" />
                    <span>Prerequisites &amp; Rules</span>
                  </span>
                  <ul className="space-y-1">
                    {activeStepModal.conditions.map((cond, i) => (
                      <li key={i} className="flex items-center space-x-1.5 text-slate-700">
                        <ChevronRight className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Backward Movement / Returns */}
              {activeStepModal.backwardMovement && (
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    <span>Backward Movement / Reversibility</span>
                  </span>
                  <p className="text-xs text-amber-800">{activeStepModal.backwardMovement}</p>
                </div>
              )}

              {/* Audit & Notifications */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Audit Event Generated</span>
                  <code className="text-xs text-emerald-800 font-mono font-bold mt-0.5 block">{activeStepModal.auditEventType}</code>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Notifications Triggered</span>
                  <span className="text-xs text-slate-700 font-medium mt-0.5 block">{activeStepModal.notifications.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <Button
                onClick={() => {
                  const slideIdx = stepSlideIndexMap[activeStepModal.id] ?? 0;
                  setSlideshowInitialIndex(slideIdx);
                  setActiveStepModal(null);
                  setViewMode('slideshow');
                }}
                variant="outline"
                size="sm"
                className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-2xs"
              >
                <Presentation className="h-3.5 w-3.5 mr-1.5 text-emerald-700" />
                <span>View in Slideshow Mode</span>
              </Button>

              <Button
                onClick={() => setActiveStepModal(null)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs"
              >
                Close Step Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500 no-print">
        <p>National Bank of Pakistan • Performance Management System (PMS 2.0) • Strategy &amp; Rewards Division, HRMG</p>
      </footer>
    </div>
  );
};

export default WorkflowSwimlanePage;
