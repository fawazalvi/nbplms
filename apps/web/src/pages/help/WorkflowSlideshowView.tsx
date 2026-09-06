import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Users,
  GitBranch,
  UserCheck,
  Shield,
  Sliders,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  CornerDownRight,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Info,
  Check,
  Building2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface WorkflowSlide {
  id: string;
  slideNumber: number;
  totalSlides: number;
  phaseId: string;
  phaseNumber: string;
  phaseTitle: string;
  phaseBadgeColor: string;
  statusCode: string;
  numericCode: number;
  statusBadgeColor: string;
  actorId: 'employee' | 'coapp' | 'app1' | 'app2' | 'gpm' | 'pmw';
  actorName: string;
  actorRoleTitle: string;
  actorColor: string;
  actorBadgeClass: string;
  actorDotColor: string;
  title: string;
  subtitle: string;
  executiveSummary: string;
  flowNodes: {
    stage: string;
    description: string;
    badge?: string;
  }[];
  parameters: {
    label: string;
    value: string;
    badgeVariant?: 'default' | 'outline' | 'secondary';
  }[];
  commentary: {
    whatIsHappening: string;
    actorResponsibilities: string[];
    systemAutomation: string;
    governanceRule: string;
    auditEvent: string;
    notifications: string[];
    nextHandOff: string;
  };
  isOptionalBranch?: boolean;
  branchNote?: string;
  isTerminal?: boolean;
  terminalType?: 'success' | 'dispute' | 'admin';
}

export const PRESENTATION_SLIDES: WorkflowSlide[] = [
  // ==========================================
  // SLIDE 1 (PHASE 0): APPRAISER NOMINATION
  // ==========================================
  {
    id: 'slide-1',
    slideNumber: 1,
    totalSlides: 14,
    phaseId: 'phase-0',
    phaseNumber: 'Phase 0',
    phaseTitle: 'Setup & Reporting Line Mapping',
    phaseBadgeColor: 'bg-emerald-800 text-white',
    statusCode: 'APPRAISER_MAPPING_REQ',
    numericCode: 0,
    statusBadgeColor: 'bg-emerald-600 text-white',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Self-Assessor & Target Nominee',
    actorColor: 'emerald',
    actorBadgeClass: 'bg-emerald-700 text-white',
    actorDotColor: 'bg-emerald-500',
    title: '1. Select Appraisers & Nominate Reporting Line',
    subtitle: 'Appraisee proposes 1st Appraiser, 2nd Appraiser & Optional Co-Appraiser',
    executiveSummary: 'The performance management cycle commences with organizational alignment. The Appraisee initiates the cycle by proposing their verified reporting hierarchy for the performance year.',
    flowNodes: [
      { stage: '1. Employee Login', description: 'Appraisee logs into PMS 2.0 portal with SAP credentials', badge: 'Active Cycle' },
      { stage: '2. Hierarchy Search', description: 'Queries active supervisors via SAP ID autocomplete', badge: 'HR Master Validated' },
      { stage: '3. Matrix Flagging', description: 'Optionally designates a Co-Appraiser for functional matrix review', badge: 'Optional Matrix' },
      { stage: '4. Transmit Request', description: 'Dispatches reporting structure for supervisor confirmation', badge: 'Status Code 0' }
    ],
    parameters: [
      { label: 'Initiating Role', value: 'Appraisee (Employee)' },
      { label: 'Validation Check', value: 'Active Employee & Supervisor Grade Check' },
      { label: 'Dual Reporting', value: 'Optional Matrix Co-Appraiser Supported' },
      { label: 'Current State', value: 'APPRAISER_MAPPING_REQ (0)' }
    ],
    commentary: {
      whatIsHappening: 'The appraisal cycle begins with establishing the official reporting line. The employee enters the designated 1st Appraiser (Immediate Supervisor), 2nd Appraiser (Divisional/Departmental Head), and an optional Co-Appraiser (Matrix/Project Head) for the cycle. This ensures multi-tier performance oversight aligns strictly with actual operational duties.',
      actorResponsibilities: [
        'Search and select active line manager (1st Appraiser) using verified SAP ID or staff name.',
        'Select senior departmental or divisional countersigning authority (2nd Appraiser).',
        'Flag dual-reporting / matrix supervisor (Co-Appraiser) if working on specialized project deliverables.',
        'Submit reporting line request for supervisor validation.'
      ],
      systemAutomation: 'The API validates entered SAP IDs in real time against the HR Master database. It ensures nominees are active employees with valid supervisory grade hierarchies. Upon submission, the system generates an audit record and queues the mapping in the supervisor\'s inbox.',
      governanceRule: 'Appraisees are prohibited from self-nomination as appraisers. Appraiser hierarchy must conform to bank delegation of authority standards. Only active, eligible cycles allow new hierarchy nominations.',
      auditEvent: 'APPRAISER_MAPPING_REQUESTED',
      notifications: ['1st Appraiser notified via email and in-app bell notification for review.'],
      nextHandOff: 'Transferred immediately to the 1st Appraiser for formal verification and hierarchy freeze.'
    }
  },

  // ==========================================
  // SLIDE 2 (PHASE 0): SUPERVISOR VALIDATION
  // ==========================================
  {
    id: 'slide-2',
    slideNumber: 2,
    totalSlides: 14,
    phaseId: 'phase-0',
    phaseNumber: 'Phase 0',
    phaseTitle: 'Setup & Reporting Line Mapping',
    phaseBadgeColor: 'bg-emerald-800 text-white',
    statusCode: 'APPRAISER_MAPPING_CONFIRMED',
    numericCode: 0,
    statusBadgeColor: 'bg-blue-600 text-white',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Line Manager & Primary Authority',
    actorColor: 'blue',
    actorBadgeClass: 'bg-blue-700 text-white',
    actorDotColor: 'bg-blue-500',
    title: '2. Validate & Confirm Reporting Hierarchy',
    subtitle: 'Supervisor reviews, adjusts or confirms supervisory line, freezing mapping',
    executiveSummary: 'The Line Manager conducts a governance review of the requested hierarchy. Once confirmed, the reporting line is locked, binding the appraisal evaluation permissions for the entire cycle.',
    flowNodes: [
      { stage: '1. Inbox Review', description: '1st Appraiser opens mapping request in supervisor review panel', badge: 'Supervisor View' },
      { stage: '2. Verification', description: 'Verifies operational supervision and countersigning authority', badge: 'Hierarchy Verification' },
      { stage: '3. Decision Gate', description: 'Approves mapping or rejects with mandatory feedback remarks', badge: 'Sign-off' },
      { stage: '4. Target Unlock', description: 'System freezes mapping and unlocks target setting form for employee', badge: 'Form Initialized' }
    ],
    parameters: [
      { label: 'Sign-off Authority', value: '1st Appraiser (Line Manager)' },
      { label: 'Exception Path', value: 'Reject with mandatory comments returns to employee' },
      { label: 'Admin Override', value: 'PMW Admin can unlock or reassign mid-cycle' },
      { label: 'Post-Status', value: 'APPRAISER_MAPPING_CONFIRMED' }
    ],
    commentary: {
      whatIsHappening: 'The nominated 1st Appraiser authenticates and reviews the proposed supervisory structure. The supervisor verifies direct operational oversight of the employee for the appraisal period, validates the designated 2nd Appraiser and Co-Appraiser, and locks the reporting hierarchy for the performance year.',
      actorResponsibilities: [
        'Review employee\'s proposed reporting structure in the Appraiser Setup inbox.',
        'Validate operational oversight and correct any misassigned SAP IDs if necessary.',
        'Execute formal validation sign-off, or reject with clear mandatory feedback for employee correction.',
        'Trigger creation of the employee\'s cycle form based on their official grade.'
      ],
      systemAutomation: 'Upon supervisor confirmation, the system creates the locked EmployeeCycle relationship record and binds the appropriate form template (KPI Form for AVP & below, BSC for VP & above, Risk-Adjusted BSC for MRT/MRC). Write access to reporting line configuration is locked.',
      governanceRule: 'Once locked by the 1st Appraiser, reporting line mappings can only be modified through formal PMW Central Admin intervention (APPRAISER_REASSIGNMENT) with audited managerial justification.',
      auditEvent: 'APPRAISER_MAPPING_CONFIRMED',
      notifications: ['Appraisee notified of confirmed reporting line; 2nd Appraiser and GPM logged.'],
      nextHandOff: 'Form generation completed; lifecycle moves to Phase 1: Objective Agreement & Formulation.'
    }
  },

  // ==========================================
  // SLIDE 3 (PHASE 1): DRAFT OBJECTIVES
  // ==========================================
  {
    id: 'slide-3',
    slideNumber: 3,
    totalSlides: 14,
    phaseId: 'phase-1',
    phaseNumber: 'Phase 1',
    phaseTitle: 'Objective Agreement & Approval',
    phaseBadgeColor: 'bg-emerald-700 text-white',
    statusCode: 'OBJ_DRAFT',
    numericCode: 1,
    statusBadgeColor: 'bg-emerald-600 text-white',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Target Creator',
    actorColor: 'emerald',
    actorBadgeClass: 'bg-emerald-700 text-white',
    actorDotColor: 'bg-emerald-500',
    title: '3. Formulate SMART Performance Targets & KPIs',
    subtitle: 'Draft measurable objectives totaling exactly 100.00% weightage',
    executiveSummary: 'The employee defines annual performance expectations. Targets are mapped to bank strategic imperatives and assigned mathematical weightages governed by grade-specific form templates.',
    flowNodes: [
      { stage: '1. Open Form', description: 'Accesses grade-specific form (KPI, BSC, or Risk-Adjusted BSC)', badge: 'Template Driven' },
      { stage: '2. SMART Goals', description: 'Inputs Specific, Measurable, Achievable, Relevant & Time-bound KPIs', badge: 'SMART Criteria' },
      { stage: '3. Matrix Flagging', description: 'Flags matrix objectives for Co-Appraiser review if applicable', badge: 'Co-App Assignment' },
      { stage: '4. Weight Check', description: 'System recalculates weightage dynamically to enforce 100% total', badge: 'Validation Gate' }
    ],
    parameters: [
      { label: 'Grade OG III - AVP', value: '70% Objectives + 30% Fixed Behavioural Traits' },
      { label: 'Grade VP & Above', value: 'Balanced Scorecard (4 Perspectives: Fin, Cust, Proc, Learn)' },
      { label: 'MRT / MRC Staff', value: 'Risk-Adjusted BSC (5 Perspectives including 20% Risk)' },
      { label: 'Total Weightage', value: 'Strictly 100.00% Mandatory' }
    ],
    commentary: {
      whatIsHappening: 'The Appraisee drafts performance objectives for the upcoming appraisal period. The system provides a tailored form template based on the employee\'s official grade: AVP & Below receive the KPI Form with 70% quantitative objectives and 30% standard behavioural traits. VP & Above receive the 4-perspective Balanced Scorecard, while MRT/MRC staff receive the 5-perspective Risk-Adjusted BSC.',
      actorResponsibilities: [
        'Formulate quantitative and qualitative SMART targets aligned with divisional strategic plans.',
        'Allocate percentage weightages ensuring each target has substantive evaluation weight.',
        'Flag specific objectives for matrix Co-Appraiser evaluation where project deliverables apply.',
        'Save draft iterations securely while refining baseline targets.'
      ],
      systemAutomation: 'The client and server engines continuously compute cumulative perspective and objective weightages. The save mechanism allows draft persistence while blocking formal submission until total weightage equals exactly 100.00%.',
      governanceRule: 'Total weightage must sum to exactly 100%. Objectives must not be vague; baseline metrics (e.g. deposit targets, TAT reduction, audit compliance) must be documented in target descriptions.',
      auditEvent: 'OBJ_DRAFT_SAVED',
      notifications: ['None (Form operates in confidential draft mode).'],
      nextHandOff: 'Employee completes draft formulation and proceeds to formal supervisor submission.'
    }
  },

  // ==========================================
  // SLIDE 4 (PHASE 1): SUBMIT OBJECTIVES
  // ==========================================
  {
    id: 'slide-4',
    slideNumber: 4,
    totalSlides: 14,
    phaseId: 'phase-1',
    phaseNumber: 'Phase 1',
    phaseTitle: 'Objective Agreement & Approval',
    phaseBadgeColor: 'bg-emerald-700 text-white',
    statusCode: 'OBJ_SUBMITTED',
    numericCode: 2,
    statusBadgeColor: 'bg-emerald-600 text-white',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee',
    actorColor: 'emerald',
    actorBadgeClass: 'bg-emerald-700 text-white',
    actorDotColor: 'bg-emerald-500',
    title: '4. Submit Objectives for Supervisor Sign-off',
    subtitle: 'Freeze drafting privileges & dispatch targets to 1st Appraiser review inbox',
    executiveSummary: 'Submitting targets seals the employee\'s drafting privileges and triggers a workflow transition. The form is placed into a read-only lock to preserve integrity while pending supervisor review.',
    flowNodes: [
      { stage: '1. Validation', description: 'System validates 100% total weightage and mandatory fields', badge: 'Pre-flight Check' },
      { stage: '2. State Change', description: 'Workflow state transitions from OBJ_DRAFT (1) to OBJ_SUBMITTED (2)', badge: 'Status Code 2' },
      { stage: '3. Read-Only Lock', description: 'Employee write privileges are suspended to prevent mid-review edits', badge: 'Read-Only' },
      { stage: '4. Queue Dispatch', description: 'Appraisal is queued in 1st Appraiser\'s actionable review inbox', badge: 'Inbox Alert' }
    ],
    parameters: [
      { label: 'Transition Action', value: 'APP_SUBMIT_OBJ' },
      { label: 'Employee Form Mode', value: 'Read-Only (Drafting Locked)' },
      { label: 'Withdrawal Window', value: 'Permitted prior to supervisor action' },
      { label: 'Recipient Inbox', value: '1st Appraiser (Immediate Supervisor)' }
    ],
    commentary: {
      whatIsHappening: 'The Appraisee executes the formal submission of drafted objectives. The workflow engine verifies all validation requirements, transitions the cycle state to OBJ_SUBMITTED (Code #2), and locks the employee\'s editing permissions. The supervisor receives instant notification that the team member\'s targets are ready for review.',
      actorResponsibilities: [
        'Perform a final quality audit of targets, weightages, and flagged matrix assignments.',
        'Acknowledge formal submission confirmation prompt.',
        'Track submission status via the Employee Dashboard.',
        'Utilize the "Withdraw Submission" option if immediate corrections are recognized before supervisor action.'
      ],
      systemAutomation: 'The workflow engine performs atomic state transitions, updates timestamp logs, and applies optimistic concurrency locks. An automated notification email with the employee\'s name, SAP ID, and target summary is queued via the MailKit background service.',
      governanceRule: 'Submission is strictly rejected if total weightage does not equal 100%. Appraisees cannot alter targets once submitted without supervisor rejection or withdrawal.',
      auditEvent: 'APP_SUBMIT_OBJ',
      notifications: ['1st Appraiser alerted via email and system task badge in review inbox.'],
      nextHandOff: 'Handed over to 1st Appraiser for formal evaluation and baseline target sign-off.'
    }
  },

  // ==========================================
  // SLIDE 5 (PHASE 1): APPROVE OBJECTIVES
  // ==========================================
  {
    id: 'slide-5',
    slideNumber: 5,
    totalSlides: 14,
    phaseId: 'phase-1',
    phaseNumber: 'Phase 1',
    phaseTitle: 'Objective Agreement & Approval',
    phaseBadgeColor: 'bg-emerald-700 text-white',
    statusCode: 'OBJ_APPROVED',
    numericCode: 4,
    statusBadgeColor: 'bg-blue-600 text-white',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Supervisor & Sign-off Authority',
    actorColor: 'blue',
    actorBadgeClass: 'bg-blue-700 text-white',
    actorDotColor: 'bg-blue-500',
    title: '5. Approve Objectives & Freeze Target Baseline',
    subtitle: 'Supervisor verifies strategic alignment, signs off targets, or triggers exception return',
    executiveSummary: 'The Line Manager conducts formal target review. Approving objectives establishes the immutable performance contract for the year. Alternatively, if revisions are necessary, an exception return loop is executed.',
    flowNodes: [
      { stage: '1. Supervisor Review', description: 'Line manager reviews targets against departmental priorities', badge: 'Strategic Alignment' },
      { stage: '2. Exception Path', description: 'Optionally returns form (OBJ_RETURNED #3) with mandatory guidance', badge: 'Exception Return' },
      { stage: '3. Formal Sign-off', description: 'Supervisor signs off on target deliverables and weight allocations', badge: 'Approval Sign-off' },
      { stage: '4. Baseline Freeze', description: 'Objectives are permanently frozen as the official benchmark', badge: 'Status Code 4' }
    ],
    parameters: [
      { label: 'Approval State', value: 'OBJ_APPROVED (Code #4)' },
      { label: 'Exception Return State', value: 'OBJ_RETURNED (Code #3) with mandatory comments' },
      { label: 'Immutability', value: 'Baseline permanently frozen for annual assessment' },
      { label: 'Admin Override', value: 'PMW Force Approve available for administrative delays' }
    ],
    commentary: {
      whatIsHappening: 'The 1st Appraiser inspects the submitted objectives for strategic alignment and realistic stretch targets. If targets require recalibration, the supervisor returns the form with mandatory feedback comments (Code #3: OBJ_RETURNED), allowing the employee to update and re-submit. Once satisfied, the supervisor approves the targets (Code #4: OBJ_APPROVED), creating the permanent baseline for the appraisal year.',
      actorResponsibilities: [
        'Review individual KPI clarity, measurability, and divisional quota alignment.',
        'If deficient, execute "Return for Revision" with specific, actionable modification comments.',
        'Execute formal "Approve Objectives" action to freeze targets.',
        'Confirm concurrence with designated Co-Appraiser assignments.'
      ],
      systemAutomation: 'The system locks objective descriptions and percentage weightages against further modification. The approved target snapshot is preserved with digital audit timestamps. The appraisal is now primed for the Annual Review cycle.',
      governanceRule: 'Once approved, baseline objectives cannot be edited or deleted by employee or supervisor without formal PMW cycle intervention and exceptional audit logging.',
      auditEvent: 'APP_APPROVE_OBJ',
      notifications: ['Appraisee notified of approved target baseline; 2nd Appraiser alerted.'],
      nextHandOff: 'Phase 1 completes; appraisal pauses until the Annual Self-Assessment window is activated.'
    }
  },

  // ==========================================
  // SLIDE 6 (PHASE 2): SELF-ASSESSMENT
  // ==========================================
  {
    id: 'slide-6',
    slideNumber: 6,
    totalSlides: 14,
    phaseId: 'phase-2',
    phaseNumber: 'Phase 2',
    phaseTitle: 'Annual Self-Assessment',
    phaseBadgeColor: 'bg-emerald-600 text-white',
    statusCode: 'AR_EMP_ASSESS',
    numericCode: 5,
    statusBadgeColor: 'bg-emerald-600 text-white',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Self-Assessor',
    actorColor: 'emerald',
    actorBadgeClass: 'bg-emerald-700 text-white',
    actorDotColor: 'bg-emerald-500',
    title: '6. Annual Self-Assessment & Achievement Evidence',
    subtitle: 'Record deliverable achievements, upload proof documents & rate self (1.00 - 5.00)',
    executiveSummary: 'At year-end, the employee documents their actual performance achievements against each frozen objective, uploads verifiable supporting evidence files, inputs self-evaluations, and submits.',
    flowNodes: [
      { stage: '1. Access Form', description: 'Employee opens approved target scorecard at annual review opening', badge: 'Year-End Activation' },
      { stage: '2. Log Achievements', description: 'Enters descriptive achievement narrative for each approved target', badge: 'Deliverables Recorded' },
      { stage: '3. Attach Evidence', description: 'Uploads supporting proof (Audit memos, CASA reports, P&L extracts)', badge: 'PDF/Excel Proof' },
      { stage: '4. Self-Scoring', description: 'Selects self-rating on 1.00 to 5.00 decimal scale and submits', badge: 'Status Code 5' }
    ],
    parameters: [
      { label: 'Scoring Scale', value: '1.00 - 5.00 Decimal Rating (Outstanding to Unsatisfactory)' },
      { label: 'Evidence Upload', value: 'PDF, Word, Excel up to 20MB per attachment' },
      { label: 'Behavioural Traits', value: 'Traits rated by line manager (Employee enters self-notes)' },
      { label: 'Post-Status', value: 'AR_EMP_ASSESS (5)' }
    ],
    commentary: {
      whatIsHappening: 'At year-end, the Appraisee completes their Annual Self-Assessment. Against each approved objective, the employee enters actual operational achievements, uploads verifiable supporting documentation (PDF, Excel, business memos up to 20MB), and assigns self-ratings on a 1.00 to 5.00 decimal scale. Submitting this self-assessment initiates the multi-tier managerial evaluation sequence.',
      actorResponsibilities: [
        'Document actual performance outcomes and milestone accomplishments against each objective.',
        'Upload concrete documentary proof to substantiate claimed accomplishments.',
        'Assign objective self-ratings using the standard 5-point rating scale.',
        'Formally submit the self-assessment to commence evaluator reviews.'
      ],
      systemAutomation: 'The system computes self-assessed weighted scores, securely stores uploaded attachments with virus scanning and MIME-type verification, and evaluates routing logic: If a Co-Appraiser is assigned, it routes to Co-Appraiser Review first; otherwise, it routes directly to the 1st Appraiser.',
      governanceRule: 'Achievement narratives are mandatory for all objectives. Uploaded evidence becomes a permanent part of the official appraisal dossier accessible to auditors and review committees.',
      auditEvent: 'APP_SUBMIT_SELF_ASSESS',
      notifications: ['Co-Appraiser (if assigned) or 1st Appraiser alerted for immediate evaluation.'],
      nextHandOff: 'Routes sequentially to Co-Appraiser Review (if assigned) or 1st Appraiser Line Evaluation.'
    }
  },

  // ==========================================
  // SLIDE 7 (PHASE 3): CO-APPRAISER REVIEW
  // ==========================================
  {
    id: 'slide-7',
    slideNumber: 7,
    totalSlides: 14,
    phaseId: 'phase-3',
    phaseNumber: 'Phase 3',
    phaseTitle: 'Appraisal Review & Assessment',
    phaseBadgeColor: 'bg-blue-700 text-white',
    statusCode: 'AR_CA_ASSESS',
    numericCode: 8,
    statusBadgeColor: 'bg-teal-600 text-white',
    actorId: 'coapp',
    actorName: 'Co-Appraiser (Matrix Head)',
    actorRoleTitle: 'Matrix / Project Evaluator',
    actorColor: 'teal',
    actorBadgeClass: 'bg-teal-700 text-white',
    actorDotColor: 'bg-teal-500',
    title: '7. Co-Appraiser Review (Sequential Priority)',
    subtitle: 'Evaluate matrix project deliverables first; scores isolated to flagged goals',
    executiveSummary: 'For matrix-managed employees, the Co-Appraiser evaluates project goals before the line manager scores. Co-Appraiser ratings are preserved with strict column isolation in final reports.',
    flowNodes: [
      { stage: '1. Sequential Gate', description: 'Co-Appraiser receives appraisal prior to 1st Appraiser scoring', badge: 'Sequential Priority' },
      { stage: '2. Flagged Goals Only', description: 'Only evaluates objectives designated for matrix oversight', badge: 'Scoped Evaluation' },
      { stage: '3. Matrix Scoring', description: 'Assigns decimal scores (1.00 - 5.00) and evaluative comments', badge: 'Co-App Scores' },
      { stage: '4. Forward Hand-off', description: 'Submits ratings; 1st Appraiser is unlocked to perform line evaluation', badge: 'Status Code 8' }
    ],
    parameters: [
      { label: 'Condition', value: 'Active only when Co-Appraiser is assigned to employee' },
      { label: 'Evaluation Scope', value: 'Flagged matrix objectives only (Traits excluded)' },
      { label: 'Report Isolation', value: '1st Appraiser column shows dash (—) for Co-App scored goals' },
      { label: 'Audit Code', value: 'APP_CA_FEEDBACK' }
    ],
    commentary: {
      whatIsHappening: 'In matrix organizations, employees contribute to projects outside their direct line. If a Co-Appraiser is assigned, the system routes the appraisal to them first. The Co-Appraiser scores only the objectives flagged for their purview (1.00 - 5.00 scale) and provides specialized feedback before the line manager evaluates.',
      actorResponsibilities: [
        'Access appraisal in the Co-Appraiser review inbox.',
        'Inspect employee\'s achievement descriptions and attached project evidence.',
        'Assign ratings (1.00 - 5.00) and qualitative evaluative remarks strictly for flagged matrix targets.',
        'Submit completed co-appraisal to pass the evaluation baton to the line manager.'
      ],
      systemAutomation: 'The workflow engine enforces strict sequential synchronization: The 1st Appraiser cannot submit the final evaluation until the Co-Appraiser completes input. In printable and PDF reports, the 1st Appraiser column displays a clean dash (—) for Co-Appraiser scored objectives to prevent score confusion or duplicate attribution.',
      governanceRule: 'Co-Appraisers are restricted to rating flagged matrix objectives only. Behavioural traits and overall departmental recommendations remain the exclusive purview of the line manager.',
      auditEvent: 'APP_CA_FEEDBACK',
      notifications: ['1st Appraiser notified that Co-Appraiser input is complete and review is unlocked.'],
      nextHandOff: 'Transfers directly to 1st Appraiser for comprehensive line evaluation.'
    },
    isOptionalBranch: true,
    branchNote: 'Active only when Co-Appraiser is assigned in reporting hierarchy'
  },

  // ==========================================
  // SLIDE 8 (PHASE 3): 1ST APPRAISER EVALUATION
  // ==========================================
  {
    id: 'slide-8',
    slideNumber: 8,
    totalSlides: 14,
    phaseId: 'phase-3',
    phaseNumber: 'Phase 3',
    phaseTitle: 'Appraisal Review & Assessment',
    phaseBadgeColor: 'bg-blue-700 text-white',
    statusCode: 'AR_FA_ASSESS',
    numericCode: 6,
    statusBadgeColor: 'bg-blue-600 text-white',
    actorId: 'app1',
    actorName: '1st Appraiser (Supervisor)',
    actorRoleTitle: 'Line Manager & Primary Evaluator',
    actorColor: 'blue',
    actorBadgeClass: 'bg-blue-700 text-white',
    actorDotColor: 'bg-blue-500',
    title: '8. Line Manager Evaluation & Development Review',
    subtitle: 'Score remaining objectives, rate behavioural traits & complete Development Review form',
    executiveSummary: 'The 1st Appraiser executes the comprehensive evaluation: inspecting evidence, rating objectives and behavioural traits, and completing the separate confidential Development Review form.',
    flowNodes: [
      { stage: '1. Evidence Audit', description: 'Inspects self-assessment achievements and attached evidence files', badge: 'Evidence Audit' },
      { stage: '2. Scoring Matrix', description: 'Rates remaining objectives and all fixed behavioural competencies (1-5)', badge: '70/30 or BSC' },
      { stage: '3. Dev Review Form', description: 'Completes separate Development Review (Strengths, Growth & Training)', badge: 'Separate Form' },
      { stage: '4. AES Encryption', description: 'Confidential remarks and scores encrypted via AES-256-GCM and submitted', badge: 'Status Code 6' }
    ],
    parameters: [
      { label: 'Evaluation Weight', value: '70% Objectives + 30% Traits (KPI) or 100% BSC' },
      { label: 'Development Review', value: 'Separate form submitted under DEVREV_SUBMITTED' },
      { label: 'Score Confidentiality', value: 'AES-256-GCM Encrypted (Invisible to employee until published)' },
      { label: 'Sign-off State', value: 'AR_FA_ASSESS (6)' }
    ],
    commentary: {
      whatIsHappening: 'The 1st Appraiser conducts the comprehensive performance evaluation. The supervisor reviews the employee\'s self-assessment narrative, inspects attached proof documents, references Co-Appraiser scores (if applicable), and inputs ratings on a 1.00 - 5.00 decimal scale for all remaining objectives and behavioural traits. In parallel, the supervisor completes the separate, confidential Development Review form.',
      actorResponsibilities: [
        'Review employee self-scores and attached documentary evidence.',
        'Input objective ratings and evaluate all required behavioural competency traits.',
        'Complete the separate Development Review form detailing key employee strengths, areas for development, and recommended training modules.',
        'Submit the evaluation to the 2nd Appraiser for countersignature.'
      ],
      systemAutomation: 'The system computes the weighted operational score, verifies 100% trait evaluation completeness, encrypts confidential supervisor comments and scores using AES-256-GCM application-layer encryption, and queues the appraisal in the 2nd Appraiser\'s inbox.',
      governanceRule: 'Evaluator scores, ratings, and development review remarks remain strictly confidential and invisible to the employee until official PMW publication. Appraisers must provide written justification for ratings of "Outstanding" (5) or "Unsatisfactory" (1).',
      auditEvent: 'APP_FA_ASSESS',
      notifications: ['2nd Appraiser notified with countersigning review task.'],
      nextHandOff: 'Transferred to 2nd Appraiser for countersigning and supervisory calibration.'
    }
  },

  // ==========================================
  // SLIDE 9 (PHASE 3): 2ND APPRAISER COUNTERSIGN
  // ==========================================
  {
    id: 'slide-9',
    slideNumber: 9,
    totalSlides: 14,
    phaseId: 'phase-3',
    phaseNumber: 'Phase 3',
    phaseTitle: 'Appraisal Review & Assessment',
    phaseBadgeColor: 'bg-blue-700 text-white',
    statusCode: 'AR_SA_ASSESS',
    numericCode: 7,
    statusBadgeColor: 'bg-amber-600 text-white',
    actorId: 'app2',
    actorName: '2nd Appraiser (Countersigning)',
    actorRoleTitle: 'Divisional Head / Countersigning Authority',
    actorColor: 'amber',
    actorBadgeClass: 'bg-amber-700 text-white',
    actorDotColor: 'bg-amber-500',
    title: '9. Countersigning Authority Review & Delta Calibration',
    subtitle: 'Review dual evaluators, adjust scores with delta flags (+/-), and execute countersign',
    executiveSummary: 'The 2nd Appraiser provides departmental governance, reviewing evaluator consistency. If scores are adjusted, the system highlights calibrations with prominent visual delta flags.',
    flowNodes: [
      { stage: '1. Multi-Tier Review', description: 'Inspects 1st Appraiser, Co-Appraiser, and Self-Assessment scores', badge: 'Multi-Tier Review' },
      { stage: '2. Delta Calibration', description: 'Optionally adjusts individual scores (upgraded or downgraded)', badge: 'Delta Indicators' },
      { stage: '3. Remarks Entry', description: 'Inputs mandatory countersigning remarks justifying score adjustments', badge: 'Supervisor Justification' },
      { stage: '4. GPM Delivery', description: 'Countersigns appraisal and submits to Group Performance Manager', badge: 'Status Code 7' }
    ],
    parameters: [
      { label: 'Delta Flagging', value: 'Displays visual +0.50 / -0.25 badges on calibrated scores' },
      { label: 'Exception Return', value: 'Can return appraisal back to 1st Appraiser for re-evaluation' },
      { label: 'Consolidated Score', value: 'Recalculated dynamically based on 2nd Appraiser final values' },
      { label: 'Post-Status', value: 'AR_SA_ASSESS (7)' }
    ],
    commentary: {
      whatIsHappening: 'The 2nd Appraiser provides departmental oversight. They review the evaluations of both the 1st Appraiser and Co-Appraiser. If the 2nd Appraiser disagrees with any individual score, they can calibrate it. The system automatically tags adjusted scores with prominent visual delta flags (+0.50 upgraded, -0.25 downgraded) and requires supervisor remarks.',
      actorResponsibilities: [
        'Examine scoring parity and objectivity across direct and indirect reporting lines.',
        'Apply score calibrations to individual objectives or traits where managerial variance exists.',
        'Enter required countersigning remarks and performance observations.',
        'Execute formal countersign to pass the appraisal batch to the Group Performance Manager.'
      ],
      systemAutomation: 'The system computes the final consolidated decimal score based on the 2nd Appraiser\'s calibrated figures. Visual delta badges are bound to modified items in both interactive views and generated PDF reports. The appraisal transitions to Phase 4: Governance & Calibration.',
      governanceRule: 'Any upward or downward score adjustment by the 2nd Appraiser requires mandatory recorded remarks. In severe disputes, the 2nd Appraiser may return the appraisal back to the 1st Appraiser for re-evaluation.',
      auditEvent: 'APP_SA_COUNTERSIGN',
      notifications: ['Group Performance Manager notified of countersigned appraisal ready for calibration.'],
      nextHandOff: 'Delivered to Group Performance Manager for Phase 4 Bell Curve Calibration.'
    }
  },

  // ==========================================
  // SLIDE 10 (PHASE 4): GPM CALIBRATION
  // ==========================================
  {
    id: 'slide-10',
    slideNumber: 10,
    totalSlides: 14,
    phaseId: 'phase-4',
    phaseNumber: 'Phase 4',
    phaseTitle: 'Governance & Bell Curve Calibration',
    phaseBadgeColor: 'bg-purple-700 text-white',
    statusCode: 'GPM_REVIEW',
    numericCode: 9,
    statusBadgeColor: 'bg-purple-600 text-white',
    actorId: 'gpm',
    actorName: 'Group Performance Manager (GPM)',
    actorRoleTitle: 'Group Governance & Bell Curve Custodian',
    actorColor: 'purple',
    actorBadgeClass: 'bg-purple-700 text-white',
    actorDotColor: 'bg-purple-500',
    title: '10. GPM Group Calibration & Bell Curve Enforcement',
    subtitle: 'Reconcile group rating distribution against bank Bell Curve policy quotas',
    executiveSummary: 'The GPM analyzes group-wide rating distribution against bank Bell Curve benchmarks. Outliers are addressed via managerial recalibration or audited exception requests to PMW.',
    flowNodes: [
      { stage: '1. Group Aggregate', description: 'GPM aggregates all countersigned appraisals across the reporting group', badge: 'Group Analytics' },
      { stage: '2. Bell Curve Check', description: 'Compares actual rating distribution against bank prescribed quotas', badge: 'Quota Reconciliation' },
      { stage: '3. Exception Request', description: 'Files audited Bell Curve Exception Request if group exceeds limits', badge: 'Exception Filing' },
      { stage: '4. Group Sign-off', description: 'Approves calibrated group results and forwards batch to PMW Admin', badge: 'Status Code 9' }
    ],
    parameters: [
      { label: 'Bell Curve Policy', value: 'Outstanding (15%), Very Good (30%), Good (40%), Needs Imp (10%), Unsat (5%)' },
      { label: 'Role Boundary', value: 'Zero access to Groups not assigned to the GPM' },
      { label: 'Recalibration Loop', value: 'Can return non-compliant appraisals back to 2nd Appraiser' },
      { label: 'Post-Status', value: 'GPM_REVIEW (9)' }
    ],
    commentary: {
      whatIsHappening: 'The Group Performance Manager (GPM) reviews all completed appraisals across their assigned reporting group. GPM evaluates the overall rating distribution against bank-prescribed Bell Curve quotas (e.g. 15% Outstanding, 30% Very Good, 40% Good, 10% Needs Improvement, 5% Unsatisfactory).',
      actorResponsibilities: [
        'Audit group-wide score distributions across functions, grades, and regions.',
        'Identify grade inflation or severe rating skewness violating policy caps.',
        'Collaborate with divisional heads to recalibrate ratings or submit formal exception requests.',
        'Execute group sign-off to transmit the calibrated portfolio to PMW Central Admin.'
      ],
      systemAutomation: 'The GPM Dashboard renders real-time bell curve charts comparing prescribed quotas against live distribution metrics. Variances exceeding tolerance limits trigger mandatory exception workflows. Data-level segregation guarantees GPMs only access their assigned groups.',
      governanceRule: 'Reporting groups cannot be finalized until rating distributions conform to policy quotas or have an audited Bell Curve Exception officially approved by PMW Super Admin.',
      auditEvent: 'APP_GPM_APPROVE',
      notifications: ['PMW Central Admin alerted that reporting group calibration is complete.'],
      nextHandOff: 'Transferred to PMW Central Admin for bank-wide audit and finalization.'
    }
  },

  // ==========================================
  // SLIDE 11 (PHASE 4): PMW FINALIZATION
  // ==========================================
  {
    id: 'slide-11',
    slideNumber: 11,
    totalSlides: 14,
    phaseId: 'phase-4',
    phaseNumber: 'Phase 4',
    phaseTitle: 'Governance & Bell Curve Calibration',
    phaseBadgeColor: 'bg-purple-700 text-white',
    statusCode: 'PMW_FINAL',
    numericCode: 10,
    statusBadgeColor: 'bg-rose-600 text-white',
    actorId: 'pmw',
    actorName: 'Performance Management Wing (PMW)',
    actorRoleTitle: 'Central Bank-Wide Administrator',
    actorColor: 'rose',
    actorBadgeClass: 'bg-rose-700 text-white',
    actorDotColor: 'bg-rose-500',
    title: '11. PMW Central Finalization & Bank-Wide Audit',
    subtitle: 'Adjudicate GPM exception requests, verify cryptographic integrity & lock cycle',
    executiveSummary: 'PMW Central Admin conducts the master bank-wide audit. Bell curve exceptions are adjudicated, cryptographic integrity is verified, and appraisal records are permanently locked.',
    flowNodes: [
      { stage: '1. Bank-Wide Audit', description: 'Consolidates all reporting groups into master bank performance index', badge: 'Enterprise Audit' },
      { stage: '2. Exception Adjudication', description: 'PMW Super Admin formally approves or rejects GPM exception requests', badge: 'HR Committee Level' },
      { stage: '3. Cryptographic Lock', description: 'Appraisal records locked; cryptographic audit hash generated', badge: 'Tamper-Evident Lock' },
      { stage: '4. Batch Finalization', description: 'Cycle batch finalized and queued for scheduled public release', badge: 'Status Code 10' }
    ],
    parameters: [
      { label: 'Admin Authority', value: 'PMW Super Admin & PMW Admin' },
      { label: 'Exception Approval', value: 'Audited in system audit logs with justification' },
      { label: 'Record Lock', value: 'No appraiser or GPM edits permitted post-finalization' },
      { label: 'Post-Status', value: 'PMW_FINAL (10)' }
    ],
    commentary: {
      whatIsHappening: 'PMW Super Admin & Admin conduct the final bank-wide audit across all banking groups. PMW reviews consolidated statistics, adjudicates GPM bell curve exception requests, verifies cryptographic audit integrity, and locks the appraisal cycle in preparation for publication.',
      actorResponsibilities: [
        'Conduct bank-wide statistical analysis and ensure compliance with HR policy circulars.',
        'Adjudicate pending GPM Bell Curve exception cases with documented rationale.',
        'Verify audit event log integrity and ensure no unapproved tampering exists.',
        'Execute final batch lock to prime the system for official publication.'
      ],
      systemAutomation: 'The system locks all modification endpoints across employee, appraiser, and GPM roles. Cryptographic hashes are computed for every appraisal record. Background queues prepare publication notification payloads for enterprise dispatch.',
      governanceRule: 'PMW finalization is a mandatory prerequisite for result publication. No rating can be modified once finalized without formal HR Executive Committee approval and full system unfreeze.',
      auditEvent: 'APP_PMW_FINALIZE',
      notifications: ['Bank leadership alerted that cycle finalization is complete and ready for publishing.'],
      nextHandOff: 'PMW triggers official cycle publication to all bank employees.'
    }
  },

  // ==========================================
  // SLIDE 12 (PHASE 5): RESULT PUBLICATION
  // ==========================================
  {
    id: 'slide-12',
    slideNumber: 12,
    totalSlides: 14,
    phaseId: 'phase-5',
    phaseNumber: 'Phase 5',
    phaseTitle: 'Publication & Employee Acknowledgment',
    phaseBadgeColor: 'bg-rose-700 text-white',
    statusCode: 'PUBLISHED',
    numericCode: 11,
    statusBadgeColor: 'bg-rose-600 text-white',
    actorId: 'pmw',
    actorName: 'Performance Management Wing (PMW)',
    actorRoleTitle: 'Central Bank-Wide Administrator',
    actorColor: 'rose',
    actorBadgeClass: 'bg-rose-700 text-white',
    actorDotColor: 'bg-rose-500',
    title: '12. Official Publication & Appraisal Form Generation',
    subtitle: 'Ratings & forms become visible to Appraisee (Interactive HTML & Vector PDF)',
    executiveSummary: 'PMW triggers official cycle publication. Ratings, scores, evaluator remarks, and development feedback become accessible to the employee alongside official printable/PDF documents.',
    flowNodes: [
      { stage: '1. Publication Trigger', description: 'PMW executes bank-wide or group-level publication action', badge: 'Release Trigger' },
      { stage: '2. Decryption & View', description: 'AES-256 encrypted scores decrypted dynamically for authenticated user', badge: 'Access Unlocked' },
      { stage: '3. Form Generation', description: 'Generates official Performance Appraisal Form in HTML & Vector PDF', badge: 'QR Secured Form' },
      { stage: '4. Decision Window', description: 'Configured calendar acknowledgment window begins countdown (e.g. 14 days)', badge: 'Status Code 11' }
    ],
    parameters: [
      { label: 'Appraisal Report', value: 'Interactive HTML View & Enterprise Vector PDF with QR Verification' },
      { label: 'Acknowledgment Clock', value: 'Fixed calendar date per cycle (Rolling extensions by PMW)' },
      { label: 'Available Actions', value: 'Formal Agreement (12) or Formal Disagreement Dispute (13)' },
      { label: 'Post-Status', value: 'PUBLISHED (11)' }
    ],
    commentary: {
      whatIsHappening: 'PMW officially publishes the appraisal results. The employee receives access to their finalized ratings and consolidated decimal score (1.00 - 5.00). The official Performance Appraisal Form becomes viewable in interactive HTML format and exportable as an enterprise vector PDF with digital QR codes.',
      actorResponsibilities: [
        'PMW executes publication by bank, group, or grade band, establishing the official calendar deadline.',
        'Employees receive alert and log in to the PMS 2.0 portal to view their published appraisal.',
        'Employees review Section 1 (Profile & Summary Score), Section 2 (Objectives & Weightages), Section 3 (Behavioural Traits), and Section 4 (Acknowledgement Status).',
        'Download vector PDF report containing scannable evaluator QR codes.'
      ],
      systemAutomation: 'The system decrypts authorized scores, populates Section 4 with "Awaiting Appraisee Action", and starts the policy deadline countdown. Digital signatures and QR codes are generated with document references.',
      governanceRule: 'Employees cannot view final scores prior to official publication. The publication timestamp marks the official start of the statutory acknowledgement and dispute window.',
      auditEvent: 'SYS_PUBLISH_APPRAISAL',
      notifications: ['All appraised employees notified via email and SMS to review and acknowledge.'],
      nextHandOff: 'Employee reviews form to execute Formal Agreement or log a Disagreement Dispute.'
    }
  },

  // ==========================================
  // SLIDE 13 (PHASE 5): FORMAL AGREEMENT
  // ==========================================
  {
    id: 'slide-13',
    slideNumber: 13,
    totalSlides: 14,
    phaseId: 'phase-5',
    phaseNumber: 'Phase 5',
    phaseTitle: 'Publication & Employee Acknowledgment',
    phaseBadgeColor: 'bg-rose-700 text-white',
    statusCode: 'EMP_AGREED',
    numericCode: 12,
    statusBadgeColor: 'bg-emerald-700 text-white',
    actorId: 'employee',
    actorName: 'Appraisee (Employee)',
    actorRoleTitle: 'Appraisee & Signatory',
    actorColor: 'emerald',
    actorBadgeClass: 'bg-emerald-800 text-white',
    actorDotColor: 'bg-emerald-500',
    title: '13. Formal Agreement & Digital Signature Sealing',
    subtitle: 'Appraisee accepts score; form permanently sealed with PMS-ACK-VALID digital seal',
    executiveSummary: 'The employee formally confirms concurrence with their appraisal rating. The document is permanently sealed, signed via digital QR verification, and archived in the corporate audit vault.',
    flowNodes: [
      { stage: '1. Review Concurrence', description: 'Employee inspects final consolidated decimal score and evaluator comments', badge: 'Concurrence' },
      { stage: '2. Execute Agreement', description: 'Clicks "Agree & Acknowledge", confirming formal acceptance statement', badge: 'Digital Sign-off' },
      { stage: '3. Section 4 & 5 Seal', description: 'Section 4 records Formal Agreement Record; Signature block seals QR code', badge: 'PMS-ACK-VALID' },
      { stage: '4. Permanent Archive', description: 'Appraisal locked permanently; archived for promotion and increment eligibility', badge: 'Terminal Success' }
    ],
    parameters: [
      { label: 'Terminal State', value: 'EMP_AGREED (Code #12) — Standard Success Closure' },
      { label: 'Section 4 Title', value: '4. Appraisal Acknowledgement & Formal Agreement Record' },
      { label: 'Signature QR Label', value: 'Acknowledgement: Signed (Seal: PMS-ACK-VALID)' },
      { label: 'Document Immutability', value: 'Permanently sealed and cryptographically locked' }
    ],
    commentary: {
      whatIsHappening: 'If the employee concurs with their performance evaluation and final score, they click "Agree & Acknowledge". The system records formal concurrence, updates the signature section to display "Acknowledgement: Signed" under the Appraisee QR code, generates the digital seal PMS-ACK-VALID, and permanently locks the document.',
      actorResponsibilities: [
        'Review comprehensive evaluation across objectives, behavioural traits, and development feedback.',
        'Accept performance outcomes by clicking "Agree & Acknowledge".',
        'Confirm electronic acknowledgement declaration.',
        'Download permanently sealed PDF copy for personal professional records.'
      ],
      systemAutomation: 'The database marks the appraisal as EMP_AGREED (Code #12). Section 4 of the HTML and PDF reports renders the "Appraisal Acknowledgement & Formal Agreement Record" with green verification badge. The Appraisee signature card shows "Acknowledgement: Signed" with timestamp and digital verification seal PMS-ACK-VALID.',
      governanceRule: 'Formal agreement is permanent, binding, and irreversible. It represents the successful terminal completion of the performance appraisal cycle.',
      auditEvent: 'APP_EMP_AGREE',
      notifications: ['Line Manager, 2nd Appraiser, GPM, and HR Records notified of completed agreement.'],
      nextHandOff: 'Appraisal cycle execution complete! Data archived for HR rewards, increments, and talent boards.'
    },
    isTerminal: true,
    terminalType: 'success'
  },

  // ==========================================
  // SLIDE 14 (PHASE 5): DISPUTE & ADMIN CLOSE
  // ==========================================
  {
    id: 'slide-14',
    slideNumber: 14,
    totalSlides: 14,
    phaseId: 'phase-5',
    phaseNumber: 'Phase 5',
    phaseTitle: 'Publication & Employee Acknowledgment',
    phaseBadgeColor: 'bg-rose-700 text-white',
    statusCode: 'EMP_DISAGREED / ADMIN_COMP',
    numericCode: 13,
    statusBadgeColor: 'bg-amber-700 text-white',
    actorId: 'employee',
    actorName: 'Appraisee & Dispute Governance Committee',
    actorRoleTitle: 'Dispute Resolution & Policy Administration',
    actorColor: 'amber',
    actorBadgeClass: 'bg-amber-800 text-white',
    actorDotColor: 'bg-amber-500',
    title: '14. Alternative Outcomes: Dispute Escalation & Admin Close',
    subtitle: '3-stage dispute resolution with proof upload OR administrative policy deadline closure',
    executiveSummary: 'For contested ratings, a transparent 3-stage dispute process operates with mandatory justification and proof. If deadlines elapse without response, administrative completion occurs.',
    flowNodes: [
      { stage: '1. Dispute Logging', description: 'Employee logs objection with mandatory remarks & uploads supporting proof', badge: 'Status Code 13' },
      { stage: '2. GPM Investigation', description: 'GPM examines dispute, reviews evidence & interviews appraisers', badge: 'Status Code 14' },
      { stage: '3. PMW Committee', description: 'PMW Disagreement Committee conducts final hearing and adjudication', badge: 'Status Code 15' },
      { stage: '4. Dispute Resolved', description: 'Binding determination issued and logged in audit vault (or Admin Close)', badge: 'Status Code 16 / 17' }
    ],
    parameters: [
      { label: 'Dispute Path', value: 'Disagreement (13) -> GPM Review (14) -> PMW Committee (15) -> Resolved (16)' },
      { label: 'Document Proof', value: 'Supporting document upload (PDF, Excel, Word up to 25MB)' },
      { label: 'Admin Close State', value: 'ADMIN_COMP (Code #17) — Distinct from agreement upon deadline expiry' },
      { label: 'Signature QR Label', value: 'Acknowledgement: Signed (Seal: PMS-DISPUTE-LOG)' }
    ],
    commentary: {
      whatIsHappening: 'If an employee disputes their rating, they can log a Formal Disagreement (#13) with mandatory factual justification and upload supporting proof (PDF, Excel up to 25MB). The dispute routes through a transparent 3-stage governance process: GPM Review (#14) -> PMW Committee Review (#15) -> Dispute Resolved (#16). If an employee fails to respond before the deadline, PMW triggers Administrative Closure (#17, distinct from agreement).',
      actorResponsibilities: [
        'Appraisee: Provide comprehensive factual justification and attach documentary proof.',
        'GPM: Conduct fact-finding, examine uploaded proof files, and document calibration findings (Status 14).',
        'PMW Committee: Review evidence, adjudicate final score or uphold rating, and issue binding resolution (Status 16).',
        'PMW Admin: Execute Administrative Completion (Status 17) for non-responsive employees post-deadline.'
      ],
      systemAutomation: 'When a dispute is logged, Section 4 of HTML and PDF reports dynamically displays the "Formal Disagreement & Dispute Record" with dispute badge, justification remarks, attached document proof indicator, and seal PMS-DISPUTE-LOG. The signature card displays "Acknowledgement: Signed".',
      governanceRule: 'Administrative Completion can never be recorded as employee agreement. Disagreement justification remarks and uploaded supporting proof files are permanently preserved in the audit vault.',
      auditEvent: 'APP_EMP_DISAGREE / APP_ADMIN_COMPLETE',
      notifications: ['GPM, PMW Disagreement Committee, and HR Legal alerted for case review.'],
      nextHandOff: 'Dispute investigated and formally closed; permanent resolution archived in the audit vault.'
    },
    isTerminal: true,
    terminalType: 'dispute'
  }
];

interface WorkflowSlideshowViewProps {
  onClose?: () => void;
  initialSlideIndex?: number;
}

export const WorkflowSlideshowView: React.FC<WorkflowSlideshowViewProps> = ({
  onClose,
  initialSlideIndex = 0
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(() => {
    if (initialSlideIndex >= 0 && initialSlideIndex < PRESENTATION_SLIDES.length) {
      return initialSlideIndex;
    }
    return 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isJumpMenuOpen, setIsJumpMenuOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = PRESENTATION_SLIDES[currentSlideIndex];

  // Navigation handlers
  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev < PRESENTATION_SLIDES.length - 1 ? prev + 1 : 0));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : PRESENTATION_SLIDES.length - 1));
  }, []);

  const handleJumpToSlide = (index: number) => {
    if (index >= 0 && index < PRESENTATION_SLIDES.length) {
      setCurrentSlideIndex(index);
      setIsJumpMenuOpen(false);
    }
  };

  const handleRestart = () => {
    setCurrentSlideIndex(0);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isFullscreen, onClose]);

  // Autoplay management
  useEffect(() => {
    if (isPlaying) {
      autoplayTimerRef.current = setInterval(() => {
        handleNext();
      }, 9000); // 9 seconds per slide
    } else if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
    }

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPlaying, handleNext]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-100 text-slate-900 select-none ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : 'w-full'
      }`}
    >
      {/* Top Presentation Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
        {/* Left: Presentation Branding & Status */}
        <div className="flex items-center space-x-3">
          <div className="bg-[#004d25] text-white p-1.5 rounded-lg flex items-center justify-center shadow-xs">
            <Building2 className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase text-[#004d25] tracking-wider">
                Appraisal Lifecycle Slideshow
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                Executive Walkthrough
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              National Bank of Pakistan • PMS 2.0 Process Presentation
            </p>
          </div>
        </div>

        {/* Middle: Slide Jump Dropdown & Slide Counter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setIsJumpMenuOpen(!isJumpMenuOpen)}
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-2xs"
            >
              <span className="font-mono text-emerald-800">
                Slide {currentSlideIndex + 1} of {PRESENTATION_SLIDES.length}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {/* Jump Menu Dropdown */}
            {isJumpMenuOpen && (
              <div className="absolute left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 text-xs">
                <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Select Slide to Jump
                </div>
                {PRESENTATION_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => handleJumpToSlide(idx)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      idx === currentSlideIndex
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <span className="font-mono text-emerald-800 font-bold mr-1.5">#{idx + 1}</span>
                      <span className="truncate">{slide.title.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                      {slide.statusCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
            <span>•</span>
            <span className="text-emerald-800 font-bold truncate max-w-[200px]">
              {currentSlide.phaseTitle}
            </span>
          </div>
        </div>

        {/* Right: Slideshow Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Autoplay Toggle */}
          <Button
            onClick={togglePlay}
            variant="outline"
            size="sm"
            className={`h-8 text-xs font-bold border-slate-300 shadow-2xs ${
              isPlaying ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'text-slate-700 hover:bg-slate-50'
            }`}
            title={isPlaying ? 'Pause auto-progression' : 'Auto-play slideshow (9s per slide)'}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1 text-emerald-700 fill-emerald-700" />
                <span>Playing</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1 text-slate-600 fill-slate-600" />
                <span>Autoplay</span>
              </>
            )}
          </Button>

          {/* Restart */}
          <Button
            onClick={handleRestart}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Restart from Slide 1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          {/* Fullscreen */}
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Slideshow'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Exit / Return to Swimlane */}
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-8 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs border-slate-700 shadow-2xs ml-1"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              <span>Back to Blueprint</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Slide Presentation Stage */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        
        {/* Current Slide Card */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md overflow-hidden flex flex-col space-y-0 transition-all">
          
          {/* Slide Header Banner */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-[#004d25] to-emerald-900 text-white relative overflow-hidden">
            {/* Subtle decorative background glow */}
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-700/20 to-transparent pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${currentSlide.phaseBadgeColor} text-[10px] font-black uppercase px-2.5 py-0.5 shadow-2xs`}>
                    {currentSlide.phaseNumber}: {currentSlide.phaseTitle}
                  </Badge>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-2xs ${currentSlide.statusBadgeColor}`}>
                    {currentSlide.statusCode} (Code #{currentSlide.numericCode})
                  </span>

                  <span className="text-xs text-emerald-200 font-mono font-bold">
                    Slide {currentSlide.slideNumber} of {currentSlide.totalSlides}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {currentSlide.title}
                </h2>

                <p className="text-xs sm:text-sm font-semibold text-amber-300">
                  {currentSlide.subtitle}
                </p>
              </div>

              {/* Active Actor Card in Slide Header */}
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-xl flex items-center space-x-3 shrink-0 shadow-xs">
                <div className="p-2 rounded-lg bg-white/20 text-white">
                  {currentSlide.actorId === 'employee' && <Users className="h-5 w-5" />}
                  {currentSlide.actorId === 'coapp' && <GitBranch className="h-5 w-5" />}
                  {currentSlide.actorId === 'app1' && <UserCheck className="h-5 w-5" />}
                  {currentSlide.actorId === 'app2' && <Shield className="h-5 w-5" />}
                  {currentSlide.actorId === 'gpm' && <Sliders className="h-5 w-5" />}
                  {currentSlide.actorId === 'pmw' && <Award className="h-5 w-5" />}
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider block">
                    Active Driver / Actor
                  </span>
                  <div className="text-xs font-black text-white">{currentSlide.actorName}</div>
                  <div className="text-[10px] text-emerald-100/80">{currentSlide.actorRoleTitle}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Body: 2-Column Responsive Layout */}
          <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
            
            {/* Left Column (5 Cols): Flow Sequence & Key Execution Parameters */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Executive Summary Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-emerald-900 tracking-wide">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <span>Executive Stage Summary</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {currentSlide.executiveSummary}
                </p>
              </div>

              {/* Visual Execution Flow Pipeline */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#004d25]" />
                    <span>Execution Sequence Pipeline</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">4-Stage Hand-off</span>
                </div>

                <div className="space-y-2.5">
                  {currentSlide.flowNodes.map((node, i) => (
                    <div key={i} className="flex items-start space-x-2.5 relative">
                      {/* Left timeline connector */}
                      <div className="flex flex-col items-center mt-0.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                          {i + 1}
                        </div>
                        {i < currentSlide.flowNodes.length - 1 && (
                          <div className="w-0.5 h-6 bg-emerald-200 my-0.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-bold">{node.stage}</strong>
                          {node.badge && (
                            <span className="text-[9px] bg-white border border-slate-200 text-slate-600 font-semibold px-1.5 py-0.5 rounded shadow-2xs">
                              {node.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{node.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Technical Parameters Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block border-b border-slate-100 pb-1.5">
                  System Parameters &amp; Enforcements
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {currentSlide.parameters.map((param, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">{param.label}</span>
                      <strong className="text-[11px] text-slate-900 block mt-0.5">{param.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column (7 Cols): Comprehensive Walkthrough Commentary */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="bg-white p-5 sm:p-6 rounded-xl border-2 border-emerald-200 shadow-xs space-y-4">
                
                {/* Commentary Title Header */}
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <Info className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-emerald-950 tracking-wide">
                        Detailed Stage Commentary &amp; Business Rules
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Standard Operating Procedure (SOP) &amp; Technical Execution Flow
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    SOP Verification
                  </span>
                </div>

                {/* 1. What is Happening at this Slide */}
                <div className="space-y-1.5 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>1. What Is Happening at This Stage</span>
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {currentSlide.commentary.whatIsHappening}
                  </p>
                </div>

                {/* 2. Actor Responsibilities */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                    2. Specific Actor Responsibilities ({currentSlide.actorName})
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {currentSlide.commentary.actorResponsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. System Automation & Calculations */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block flex items-center space-x-1">
                    <Sliders className="h-3.5 w-3.5 text-blue-700" />
                    <span>3. Behind-the-Scenes Automation &amp; Engine Checks</span>
                  </span>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {currentSlide.commentary.systemAutomation}
                  </p>
                </div>

                {/* 4. Bank Policy & Governance Rules */}
                <div className="space-y-1.5 bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block flex items-center space-x-1">
                    <Shield className="h-3.5 w-3.5 text-amber-700" />
                    <span>4. Bank HR Policy &amp; Compliance Rule</span>
                  </span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {currentSlide.commentary.governanceRule}
                  </p>
                </div>

                {/* 5. Audit Event & Hand-off */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Audit Trail Event</span>
                    <code className="text-xs font-mono font-bold text-emerald-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                      {currentSlide.commentary.auditEvent}
                    </code>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Alerts: {currentSlide.commentary.notifications.join(', ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Next Hand-off Transition</span>
                    <div className="flex items-start space-x-1 text-slate-800 font-medium text-[11px] mt-0.5">
                      <CornerDownRight className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{currentSlide.commentary.nextHandOff}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Slide Footer Navigation Controls Bar */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            
            {/* Previous Slide Button */}
            <Button
              onClick={handlePrev}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-slate-100 text-slate-800 border-slate-300 font-bold text-xs h-9 px-4 shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Previous Slide</span>
            </Button>

            {/* Middle Slide Progress Dots / Indicators */}
            <div className="hidden md:flex items-center space-x-1">
              {PRESENTATION_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleJumpToSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentSlideIndex
                      ? 'w-6 bg-emerald-700'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Jump to Slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Next Slide Button */}
            <Button
              onClick={handleNext}
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 px-5 shadow-2xs"
            >
              <span>{currentSlideIndex === PRESENTATION_SLIDES.length - 1 ? 'Restart from Beginning' : 'Next Slide'}</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

          </div>

        </div>

        {/* Bottom Slide Mini-Carousel Stepper */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span className="flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-700" />
              <span>Complete Appraisal Lifecycle Slide Carousel (14 Sequential Stages)</span>
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              Click any slide to jump • Use Left / Right arrow keys to navigate
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {PRESENTATION_SLIDES.map((slide, idx) => {
              const isCurrent = idx === currentSlideIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => handleJumpToSlide(idx)}
                  className={`p-2 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[9px] font-black uppercase px-1 rounded ${
                      isCurrent ? 'bg-black/30 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}>
                      #{idx + 1}
                    </span>
                    <span className={`text-[8px] font-mono ${isCurrent ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {slide.statusCode.split('_')[0]}
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className={`text-[10px] font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                      {slide.title.replace(/^\d+\.\s*/, '')}
                    </div>
                    <div className={`text-[9px] truncate ${isCurrent ? 'text-emerald-200' : 'text-slate-500'}`}>
                      {slide.actorName.split(' ')[0]}
                    </div>
                  </div>

                  {isCurrent && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkflowSlideshowView;
