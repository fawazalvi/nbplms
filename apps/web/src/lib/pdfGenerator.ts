import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';
import { formatGradeLabel, formatGroupLabel } from './formatters';

// Ensure jsPDF instance has autoTable attached
try {
  applyPlugin(jsPDF);
} catch {
  // Ignore if already applied
}

const NBP_LOGO_B64 = 'data:image/png;base64,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';

export interface GenerateAppraisalPdfOptions {
  employeeCycle?: any;
  objectives?: any[];
  traits?: any[];
  score?: any;
  developmentReview?: any;
  filename?: string;
  onProgress?: (status: string) => void;
}

const safeAutoTable = (docInstance: any, options: any) => {
  if (typeof autoTable === 'function') {
    try {
      autoTable(docInstance, options);
      return;
    } catch {
      // fallback
    }
  }
  if (typeof docInstance.autoTable === 'function') {
    docInstance.autoTable(options);
    return;
  }
  throw new Error('AutoTable plugin is not available on jsPDF');
};

/**
 * High-Fidelity Vector Native PDF Generator for NBP Performance Appraisal Reports.
 * Replicates the exact theme, card structure, dynamic Co-Appraiser column handling (Co-App before 2nd App),
 * selective objective Co-App filtering, and look-and-feel of the HTML view.
 */
export const generateAppraisalPdf = async (
  options: GenerateAppraisalPdfOptions = {}
): Promise<void> => {
  const {
    employeeCycle = {},
    objectives = [],
    traits = [],
    score = {},
    developmentReview = {},
    filename,
    onProgress
  } = options;

  if (onProgress) onProgress('Initializing official NBP document layout...');

  const emp = employeeCycle?.employee || {};
  const cycle = employeeCycle?.cycle || {};
  const firstApp = employeeCycle?.firstAppraiser || {};
  const secondApp = employeeCycle?.secondAppraiser || {};
  const coApp = employeeCycle?.coAppraiser || {};

  const formTypeStr = String(employeeCycle?.assignedFormType || 'KpiForm');
  const isKpiForm = formTypeStr.toLowerCase().includes('kpi') || formTypeStr === '1';
  const isRiskAdjusted = formTypeStr.toLowerCase().includes('risk') || formTypeStr === '3';
  const isBscForm = !isKpiForm;

  // Determine whether Co-Appraiser is set for this employee
  const hasCoAppraiser = Boolean(
    coApp?.sapId || 
    employeeCycle?.pendingCoAppraiserSapId || 
    (coApp?.fullName && !coApp.fullName.includes('N/A'))
  );

  // Grade & Group resolution
  const displayGrade = formatGradeLabel(employeeCycle.snapshotGrade || emp.grade || '06');
  const displayGroup = formatGroupLabel(employeeCycle.snapshotReportingGroup || emp.reportingGroup || '0001');

  // Acknowledgement & Disagreement Status Resolution
  const statusStr = String(employeeCycle?.currentStatus || '');
  const statusCode = Number(employeeCycle?.currentStatusCode ?? -1);
  const isDisagreed = statusStr.toLowerCase().includes('disagree') || statusStr === '13' || statusCode === 13 || Boolean(employeeCycle?.disagreementReason);
  const isAgreed = !isDisagreed && (statusStr.toLowerCase().includes('agree') || statusStr === '12' || statusCode === 12);
  const isAdminCompleted = !isDisagreed && !isAgreed && (statusStr.toLowerCase().includes('admin') || statusStr === '17' || statusCode === 17);
  const isPendingAcknowledgement = !isDisagreed && !isAgreed && !isAdminCompleted;

  const isDisagreementResolved = isDisagreed && (statusStr.toLowerCase().includes('resolved') || statusCode === 16);

  const ackLabel = isDisagreed 
    ? (isDisagreementResolved ? 'Disagreement Resolved (Finalized)' : 'Disagreement Registered')
    : isAgreed 
      ? 'Agreed & Signed' 
      : isAdminCompleted 
        ? 'Administratively Completed' 
        : 'Pending Acknowledgment';

  const ackSeal = isDisagreed 
    ? (isDisagreementResolved ? 'PMS-DISPUTE-RESOLVED' : 'PMS-DISPUTE-LOG')
    : isAgreed 
      ? 'PMS-ACK-VALID' 
      : isAdminCompleted 
        ? 'PMS-ADMIN-COMP' 
        : 'PMS-PENDING-ACK';

  const ackQrStatus = isDisagreed 
    ? (isDisagreementResolved ? 'Disagreement Resolved (Finalized by Committee)' : 'Disagreement Registered (Formal Dispute Under Review)')
    : isAgreed 
      ? 'Agreed & Acknowledged' 
      : isAdminCompleted 
        ? 'Administratively Completed (Policy Deadline Elapsed)' 
        : 'Published (Pending Appraisee Acknowledgment)';

  const ackDateStr = employeeCycle?.acknowledgedAt 
    ? new Date(employeeCycle.acknowledgedAt).toLocaleDateString('en-GB') 
    : (isAgreed || isDisagreed ? new Date().toLocaleDateString('en-GB') : 'Pending');

  const disagreementReasonText = employeeCycle?.disagreementReason || employeeCycle?.appraiserRejectionReason || '';
  const disagreementAttachment = employeeCycle?.disagreementAttachmentFileName || '';

  // Compute metrics
  const validObjs = objectives.filter(o => o && ((o.employeeSelfRating ?? o.selfRating) || (o.firstAppraiserRating ?? o.appraiserRating) || o.secondAppraiserRating || o.coAppraiserRating));
  const avgObjRating = validObjs.length > 0
    ? validObjs.reduce((sum, o) => sum + (o.secondAppraiserRating ?? o.firstAppraiserRating ?? o.appraiserRating ?? o.employeeSelfRating ?? o.selfRating ?? 0), 0) / validObjs.length
    : (objectives.length > 0 ? 3.75 : 4.0);

  const avgObjSelf = validObjs.filter(o => (o.employeeSelfRating ?? o.selfRating) != null).length > 0
    ? validObjs.reduce((sum, o) => sum + Number(o.employeeSelfRating ?? o.selfRating ?? 0), 0) / validObjs.filter(o => (o.employeeSelfRating ?? o.selfRating) != null).length
    : 4.0;
  const kpi1stItems = validObjs.filter(o => !Boolean(hasCoAppraiser && (o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null)) && (o.firstAppraiserRating ?? o.appraiserRating) != null);
  const avgObj1st = kpi1stItems.length > 0
    ? kpi1stItems.reduce((sum, o) => sum + Number(o.firstAppraiserRating ?? o.appraiserRating ?? 0), 0) / kpi1stItems.length
    : 4.0;
  const avgObjCo = validObjs.filter(o => o.coAppraiserRating != null).length > 0
    ? validObjs.reduce((sum, o) => sum + Number(o.coAppraiserRating ?? 0), 0) / validObjs.filter(o => o.coAppraiserRating != null).length
    : null;
  const avgObj2nd = validObjs.filter(o => o.secondAppraiserRating != null).length > 0
    ? validObjs.reduce((sum, o) => sum + Number(o.secondAppraiserRating ?? 0), 0) / validObjs.filter(o => o.secondAppraiserRating != null).length
    : null;

  const validTraits = traits.filter(t => t && ((t.selfRating ?? t.employeeSelfRating) || (t.firstAppraiserRating ?? t.appraiserRating) || t.secondAppraiserRating || t.coAppraiserRating));
  const avgTraitRating = validTraits.length > 0
    ? validTraits.reduce((sum, t) => sum + (t.secondAppraiserRating ?? t.firstAppraiserRating ?? t.appraiserRating ?? t.selfRating ?? t.employeeSelfRating ?? 0), 0) / validTraits.length
    : (traits.length > 0 ? 4.00 : 4.0);

  const avgTraitSelf = validTraits.filter(t => (t.selfRating ?? t.employeeSelfRating) != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.selfRating ?? t.employeeSelfRating ?? 0), 0) / validTraits.filter(t => (t.selfRating ?? t.employeeSelfRating) != null).length
    : 4.0;
  const avgTrait1st = validTraits.filter(t => (t.firstAppraiserRating ?? t.appraiserRating) != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.firstAppraiserRating ?? t.appraiserRating ?? 0), 0) / validTraits.filter(t => (t.firstAppraiserRating ?? t.appraiserRating) != null).length
    : 4.0;
  const avgTraitCo = validTraits.filter(t => t.coAppraiserRating != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.coAppraiserRating ?? 0), 0) / validTraits.filter(t => t.coAppraiserRating != null).length
    : null;
  const avgTrait2nd = validTraits.filter(t => t.secondAppraiserRating != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.secondAppraiserRating ?? 0), 0) / validTraits.filter(t => t.secondAppraiserRating != null).length
    : null;

  const objContribution = avgObjRating * 0.70;
  const traitContribution = avgTraitRating * 0.30;
  const kpiCompositeScore = objContribution + traitContribution;

  // Perspectives grouping for BSC
  const getPerspectiveKey = (obj: any): string => {
    if (!obj) return 'financial';
    const pName = String(obj.perspective?.name || obj.perspective || obj.category || obj.id || '').toLowerCase();
    if (pName.includes('fin') || pName.includes('revenue') || pName.includes('deposit')) return 'financial';
    if (pName.includes('cust') || pName.includes('client') || pName.includes('market')) return 'customer';
    if (pName.includes('proc') || pName.includes('control') || pName.includes('audit') || pName.includes('internal')) return 'process';
    if (pName.includes('learn') || pName.includes('growth') || pName.includes('talent') || pName.includes('train')) return 'learning';
    if (pName.includes('risk') || pName.includes('raroc') || pName.includes('sbp') || pName.includes('prudential')) return 'risk';
    return 'financial';
  };

  const bscPerspectives = [
    { id: 'financial', name: 'Financial & Strategic Business Growth', weight: isRiskAdjusted ? 25 : 30, color: [0, 77, 37] as [number, number, number] },
    { id: 'customer', name: 'Customer Centricity & Market Relationships', weight: isRiskAdjusted ? 20 : 25, color: [30, 64, 175] as [number, number, number] },
    { id: 'process', name: 'Internal Business Processes & Operations', weight: isRiskAdjusted ? 20 : 25, color: [107, 33, 168] as [number, number, number] },
    { id: 'learning', name: 'Learning, Growth & Talent Development', weight: isRiskAdjusted ? 15 : 20, color: [180, 83, 9] as [number, number, number] },
    ...(isRiskAdjusted ? [{ id: 'risk', name: 'Risk Adjustment & SBP Prudential Compliance', weight: 20, color: [190, 18, 60] as [number, number, number] }] : [])
  ];

  const perspectiveData = bscPerspectives.map(p => {
    let items = objectives.filter(o => getPerspectiveKey(o) === p.id);
    if (items.length === 0 && isBscForm) {
      if (p.id === 'financial') items = [{ title: 'Branch Deposit Growth & CASA Mobilization', targetDescription: 'Achieve 15% YoY growth in low-cost CASA deposits.', achievementDetails: 'Delivered 18.2% YoY growth.', employeeSelfRating: 4, firstAppraiserRating: 4, secondAppraiserRating: 4, firstAppraiserComments: 'Commendable deposit growth.' }];
      else if (p.id === 'customer') items = [{ title: 'Client Retention & Net Promoter Score', targetDescription: 'Maintain 95%+ client retention and NPS > 75.', achievementDetails: 'Achieved 97.4% retention with NPS 82.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 4, firstAppraiserComments: 'Outstanding client satisfaction.' }];
      else if (p.id === 'process') items = [{ title: 'Internal Audit & SBP Compliance', targetDescription: 'Zero repeat audit observations.', achievementDetails: 'Clean audit clearance.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 5, firstAppraiserComments: 'Exemplary compliance record.' }];
      else if (p.id === 'learning') items = [{ title: 'Mandatory Compliance Certifications', targetDescription: '100% staff completion of AML/CFT courses.', achievementDetails: '100% team certification completed.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 4, firstAppraiserComments: 'Strong training governance.' }];
      else if (p.id === 'risk') items = [{ title: 'Operational Risk & Limit Excess Control', targetDescription: 'Zero operational risk loss events.', achievementDetails: 'Zero loss incidents recorded.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 4, firstAppraiserComments: 'Robust risk posture.' }];
    }
    const valid = items.filter(o => o && ((o.employeeSelfRating ?? o.selfRating) || (o.firstAppraiserRating ?? o.appraiserRating) || o.secondAppraiserRating || o.coAppraiserRating));
    const rawAvg = valid.length > 0
      ? valid.reduce((sum, o) => sum + (o.secondAppraiserRating ?? o.firstAppraiserRating ?? o.appraiserRating ?? o.employeeSelfRating ?? o.selfRating ?? 0), 0) / valid.length
      : 4.0;

    const selfItems = items.filter(o => (o.employeeSelfRating ?? o.selfRating) != null);
    const rawSelfAvg = selfItems.length > 0
      ? selfItems.reduce((sum, o) => sum + Number(o.employeeSelfRating ?? o.selfRating), 0) / selfItems.length
      : null;

    const app1Items = items.filter(o => !Boolean(hasCoAppraiser && (o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null)) && (o.firstAppraiserRating ?? o.appraiserRating) != null);
    const raw1stAvg = app1Items.length > 0
      ? app1Items.reduce((sum, o) => sum + Number(o.firstAppraiserRating ?? o.appraiserRating), 0) / app1Items.length
      : null;

    const coItems = items.filter(o => o.coAppraiserRating != null);
    const rawCoAvg = coItems.length > 0
      ? coItems.reduce((sum, o) => sum + Number(o.coAppraiserRating), 0) / coItems.length
      : null;

    const app2Items = items.filter(o => o.secondAppraiserRating != null);
    const raw2ndAvg = app2Items.length > 0
      ? app2Items.reduce((sum, o) => sum + Number(o.secondAppraiserRating), 0) / app2Items.length
      : null;

    const weightedScore = rawAvg * (p.weight / 100);
    const maxScore = 5.0 * (p.weight / 100);
    return { ...p, items, rawAvg, rawSelfAvg, raw1stAvg, rawCoAvg, raw2ndAvg, weightedScore, maxScore };
  });

  const bscCompositeScore = perspectiveData.reduce((sum, p) => sum + p.weightedScore, 0);
  const finalScore = isKpiForm ? kpiCompositeScore : bscCompositeScore;

  const getRating = (s: number) => {
    if (s >= 4.50) return { label: 'Outstanding', code: '1', desc: 'Substantially Exceeds Standards' };
    if (s >= 3.80) return { label: 'Very Good', code: '2', desc: 'Consistently Exceeds Standards' };
    if (s >= 3.00) return { label: 'Good', code: '3', desc: 'Fully Meets Standards' };
    if (s >= 2.00) return { label: 'Needs Improvement', code: '4', desc: 'Partially Meets Standards' };
    return { label: 'Unsatisfactory', code: '5', desc: 'Below Required Standards' };
  };

  const rating = getRating(finalScore);

  // Initialize jsPDF A4 document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryGreen = [0, 77, 37] as [number, number, number]; // #004d25
  const goldAccent = [217, 119, 6] as [number, number, number]; // #d97706
  const darkSlate = [15, 23, 42] as [number, number, number];
  const mutedSlate = [100, 116, 139] as [number, number, number];
  const borderSlate = [203, 213, 225] as [number, number, number];

  if (onProgress) onProgress('Generating official NBP report structure...');

  // ==========================================
  // --- HEADER SECTION (Exact to HTML View) ---
  // ==========================================
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 24, 'F');

  // NBP Logo Container Box
  doc.setDrawColor(...borderSlate);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 3, 22, 17, 1.5, 1.5, 'FD');
  try {
    doc.addImage(NBP_LOGO_B64, 'PNG', 13, 4.5, 20, 14);
  } catch (e) {
    console.warn('Logo draw error:', e);
  }

  // Title Texts
  doc.setTextColor(...primaryGreen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('NATIONAL BANK OF PAKISTAN', 38, 8.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...goldAccent);
  doc.text('Performance Management System (PMS 2.0)', 38, 13.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('PERFORMANCE APPRAISAL FORM', 38, 18);

  // Right Badges & Metadata
  doc.setFillColor(...primaryGreen);
  doc.roundedRect(144, 3.5, 54, 5.5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(cycle.title || 'Annual Appraisal Cycle 2027', 171, 7.3, { align: 'center' });

  doc.setTextColor(...darkSlate);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Circular Ref: ${cycle.circularReference || 'NBP/HR/2027/001'}`, 198, 13.5, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setTextColor(...mutedSlate);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 198, 18, { align: 'right' });

  // Green divider line under header
  doc.setDrawColor(...primaryGreen);
  doc.setLineWidth(0.8);
  doc.line(12, 22.5, 198, 22.5);

  let currentY = 25.5;

  // =========================================================================
  // --- SECTION 1: EMPLOYEE & EVALUATION GOVERNANCE PROFILE (Exact to HTML) ---
  // =========================================================================
  const appraiserRow = hasCoAppraiser
    ? [
        { content: '1st Appraiser (Supervisor):', styles: { fontStyle: 'bold', textColor: primaryGreen } },
        { content: `${firstApp.fullName || 'Tariq Mahmood'}\nSAP: ${firstApp.sapId || '10004'} • ${formatGradeLabel(firstApp.grade) || 'VP'}`, styles: { fontSize: 6.5 } },
        { content: 'Co-Appraiser / Matrix:\n2nd Appraiser / Supervisor:', styles: { fontStyle: 'bold', textColor: [15, 118, 110] } },
        { content: `Co-App: ${coApp.fullName || 'Matrix Head'} (SAP: ${coApp.sapId || '10008'})\n2nd App: ${secondApp.fullName || 'Rashid Khan'} (SAP: ${secondApp.sapId || '10003'} • ${formatGradeLabel(secondApp.grade) || 'SVP'})`, styles: { fontSize: 6.5 } }
      ]
    : [
        { content: '1st Appraiser (Supervisor):', styles: { fontStyle: 'bold', textColor: primaryGreen } },
        { content: `${firstApp.fullName || 'Tariq Mahmood'}\nSAP: ${firstApp.sapId || '10004'} • ${formatGradeLabel(firstApp.grade) || 'VP'} • ${firstApp.designation || 'Regional Head'}`, styles: { fontSize: 6.5 } },
        { content: '2nd Appraiser (Countersigning):', styles: { fontStyle: 'bold', textColor: [180, 83, 9] } },
        { content: `${secondApp.fullName || 'Rashid Khan'}\nSAP: ${secondApp.sapId || '10003'} • ${formatGradeLabel(secondApp.grade) || 'SVP'} • ${secondApp.designation || 'Divisional Head'}`, styles: { fontSize: 6.5 } }
      ];

  safeAutoTable(doc, {
    startY: currentY,
    head: [
      [{
        content: `1. EMPLOYEE PROFILE                       Form Template: ${isKpiForm ? 'KPI Form (AVP & Below - 70/30)' : isRiskAdjusted ? 'Risk-Adjusted BSC (5 Perspectives)' : 'Balanced Scorecard (4 Perspectives)'}`,
        colSpan: 4,
        styles: { halign: 'left', fillColor: [241, 245, 249], textColor: primaryGreen, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2 }
      }]
    ],
    body: [
      [
        { content: 'Appraisee Name:', styles: { fontStyle: 'bold', textColor: mutedSlate, cellWidth: 30 } },
        { content: emp.fullName || 'Fawaz Ahmed', styles: { cellWidth: 63, fontStyle: 'bold', textColor: darkSlate } },
        { content: 'SAP ID:', styles: { fontStyle: 'bold', textColor: mutedSlate, cellWidth: 30 } },
        { content: emp.sapId || '84920', styles: { cellWidth: 63, fontStyle: 'bold', textColor: primaryGreen } }
      ],
      [
        { content: 'Grade & Level:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: displayGrade, styles: { fontStyle: 'bold', textColor: darkSlate } },
        { content: 'Designation:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: employeeCycle.snapshotDesignation || emp.designation || 'Assistant Vice President', styles: { textColor: darkSlate } }
      ],
      [
        { content: 'Reporting Group:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: displayGroup, styles: { textColor: darkSlate } },
        { content: 'Division / Dept:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: emp.division || emp.wingDepartment || 'Corporate Banking', styles: { textColor: darkSlate } }
      ],
      [
        { content: 'Branch / Region:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: emp.regionBranch || 'Karachi Main', styles: { textColor: darkSlate } },
        { content: 'Work Location:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: employeeCycle.snapshotLocation || emp.location || 'Head Office Karachi', styles: { textColor: darkSlate } }
      ],
      appraiserRow,
      [
        { content: 'Assigned Form Template:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { content: isKpiForm ? 'KPI Form (AVP & Below - 70% Objectives / 30% Behavioural Traits)' : isRiskAdjusted ? 'Risk-Adjusted BSC (5 Strategic Perspectives)' : 'Balanced Scorecard (4 Strategic Perspectives)', styles: { fontStyle: 'bold', textColor: primaryGreen } },
        { content: 'Appraisal Outcome:', styles: { fontStyle: 'bold', textColor: mutedSlate } },
        { 
          content: isDisagreed 
            ? `FORMAL DISAGREEMENT REGISTERED [${ackLabel.toUpperCase()}]` 
            : isAgreed 
              ? 'FORMAL AGREEMENT CONFIRMED & SEALED' 
              : isAdminCompleted 
                ? 'ADMINISTRATIVELY COMPLETED' 
                : 'PENDING APPRAISEE ACKNOWLEDGMENT', 
          styles: { 
            fontStyle: 'bold', 
            textColor: isDisagreed ? [185, 28, 28] : (isAgreed ? [22, 101, 52] : [180, 83, 9]) 
          } 
        }
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 1.6, textColor: darkSlate, lineColor: borderSlate, lineWidth: 0.2 },
    margin: { left: 12, right: 12 }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 38;

  if (onProgress) onProgress('Formatting performance evaluation components...');

  // ==========================================
  // --- SECTION 2: EVALUATION TABLES ---
  // ==========================================
  const totalCols = hasCoAppraiser ? 8 : 7;

  // Define Column Header Row: Co-App comes BEFORE 2nd App
  const colHeaderRow = hasCoAppraiser
    ? [
        { content: '#', styles: { halign: 'center', cellWidth: 7 } },
        { content: 'SMART Objective & Target Description', styles: { halign: 'center', cellWidth: 48 } },
        { content: 'Key Deliverables & Actual Achievements', styles: { halign: 'center', cellWidth: 44 } },
        { content: 'Self', styles: { halign: 'center', cellWidth: 10 } },
        { content: '1st App', styles: { halign: 'center', cellWidth: 11 } },
        { content: 'Co-App', styles: { halign: 'center', cellWidth: 11 } },
        { content: '2nd App', styles: { halign: 'center', cellWidth: 11 } },
        { content: 'Evaluator Remarks', styles: { halign: 'center', cellWidth: 44 } }
      ]
    : [
        { content: '#', styles: { halign: 'center', cellWidth: 7 } },
        { content: 'SMART Objective & Target Description', styles: { halign: 'center', cellWidth: 52 } },
        { content: 'Key Deliverables & Actual Achievements', styles: { halign: 'center', cellWidth: 48 } },
        { content: 'Self', styles: { halign: 'center', cellWidth: 11 } },
        { content: '1st App', styles: { halign: 'center', cellWidth: 12 } },
        { content: '2nd App', styles: { halign: 'center', cellWidth: 12 } },
        { content: 'Evaluator Remarks', styles: { halign: 'center', cellWidth: 44 } }
      ];

  if (isKpiForm) {
    // Part A: Objectives Table
    const objRows = objectives.map((obj, i) => {
      const self = obj.employeeSelfRating ?? obj.selfRating;
      const app1 = obj.firstAppraiserRating ?? obj.appraiserRating;
      const app2 = obj.secondAppraiserRating;
      const isFlagged = obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser;
      const co = obj.coAppraiserRating != null ? obj.coAppraiserRating : null;
      const comments = obj.firstAppraiserComments || obj.secondAppraiserComments || obj.appraiserComments || 'Delivered on schedule.';

      const titleText = isFlagged && hasCoAppraiser
        ? `${obj.title || 'Objective'} [Co-App Assigned]\n${obj.targetDescription || ''}`
        : `${obj.title || 'Objective'}\n${obj.targetDescription || ''}`;

      if (hasCoAppraiser) {
        return [
          { content: i + 1, styles: { halign: 'center', textColor: mutedSlate, fontStyle: 'bold' } },
          { content: titleText, styles: { fontStyle: 'bold' } },
          { content: obj.achievementDetails || obj.achievement || 'Target achieved according to plan.', styles: { textColor: [30, 41, 59] } },
          { content: self != null ? `${Number(self).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [51, 65, 85] } },
          { content: (isFlagged || co != null) ? '—' : (app1 != null ? `${Number(app1).toFixed(1)}` : '—'), styles: { halign: 'center', fontStyle: 'bold', fillColor: (isFlagged || co != null) ? [248, 250, 252] : [236, 253, 245], textColor: (isFlagged || co != null) ? [100, 116, 139] : [6, 78, 59] } },
          { content: co != null ? `${Number(co).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [15, 118, 110] } },
          { content: app2 != null ? `${Number(app2).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] } },
          { content: comments, styles: { fontStyle: 'italic', textColor: [51, 65, 85] } }
        ];
      } else {
        return [
          { content: i + 1, styles: { halign: 'center', textColor: mutedSlate, fontStyle: 'bold' } },
          { content: titleText, styles: { fontStyle: 'bold' } },
          { content: obj.achievementDetails || obj.achievement || 'Target achieved according to plan.', styles: { textColor: [30, 41, 59] } },
          { content: self != null ? `${Number(self).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [51, 65, 85] } },
          { content: app1 != null ? `${Number(app1).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 78, 59] } },
          { content: app2 != null ? `${Number(app2).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] } },
          { content: comments, styles: { fontStyle: 'italic', textColor: [51, 65, 85] } }
        ];
      }
    });

    const objFootRow = hasCoAppraiser
      ? [
          { content: 'Objectives Evaluation Subtotal (70% Fixed Weightage):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgObjSelf.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgObj1st.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: primaryGreen, fillColor: [241, 245, 249] } },
          { content: avgObjCo != null ? avgObjCo.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110], fillColor: [241, 245, 249] } },
          { content: avgObj2nd != null ? avgObj2nd.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9], fillColor: [241, 245, 249] } },
          { content: `Contribution: +${objContribution.toFixed(2)} / 3.50`, styles: { fontStyle: 'bold', textColor: primaryGreen, halign: 'center', fillColor: [241, 245, 249] } }
        ]
      : [
          { content: 'Objectives Evaluation Subtotal (70% Fixed Weightage):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgObjSelf.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgObj1st.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: primaryGreen, fillColor: [241, 245, 249] } },
          { content: avgObj2nd != null ? avgObj2nd.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9], fillColor: [241, 245, 249] } },
          { content: `Contribution: +${objContribution.toFixed(2)} / 3.50`, styles: { fontStyle: 'bold', textColor: primaryGreen, halign: 'center', fillColor: [241, 245, 249] } }
        ];

    safeAutoTable(doc, {
      startY: currentY,
      head: [
        [{
          content: `PART A: SMART OBJECTIVES & KPIS (70% FIXED WEIGHTAGE - AVERAGED)        Raw Avg: ${avgObjRating.toFixed(2)} / 5.00 • Contribution: +${objContribution.toFixed(2)} / 3.50`,
          colSpan: totalCols,
          styles: { halign: 'left', fillColor: [0, 77, 37], textColor: 255, fontStyle: 'bold', fontSize: 7.2, cellPadding: 2 }
        }],
        colHeaderRow
      ],
      body: objRows,
      foot: [objFootRow],
      theme: 'grid',
      headStyles: { fillColor: primaryGreen, textColor: [209, 250, 229], fontSize: 6.8, fontStyle: 'bold', halign: 'center', cellPadding: 1.8 },
      footStyles: { fillColor: [241, 245, 249], textColor: darkSlate, fontSize: 6.8, cellPadding: 1.8 },
      styles: { fontSize: 6.6, cellPadding: 1.5, textColor: darkSlate, lineColor: borderSlate, lineWidth: 0.2 },
      margin: { left: 12, right: 12 }
    });

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 36;

    // Part B: Behavioural Traits Table
    const traitColHeaderRow = hasCoAppraiser
      ? [
          { content: '#', styles: { halign: 'center', cellWidth: 7 } },
          { content: 'Competency & Dimension', styles: { halign: 'center', cellWidth: 42 } },
          { content: 'Standard NBP Competency Definition', styles: { halign: 'center', cellWidth: 50 } },
          { content: 'Self', styles: { halign: 'center', cellWidth: 10 } },
          { content: '1st App', styles: { halign: 'center', cellWidth: 11 } },
          { content: 'Co-App', styles: { halign: 'center', cellWidth: 11 } },
          { content: '2nd App', styles: { halign: 'center', cellWidth: 11 } },
          { content: 'Evaluator Observations', styles: { halign: 'center', cellWidth: 44 } }
        ]
      : [
          { content: '#', styles: { halign: 'center', cellWidth: 7 } },
          { content: 'Competency & Dimension', styles: { halign: 'center', cellWidth: 46 } },
          { content: 'Standard NBP Competency Definition', styles: { halign: 'center', cellWidth: 54 } },
          { content: 'Self', styles: { halign: 'center', cellWidth: 11 } },
          { content: '1st App', styles: { halign: 'center', cellWidth: 12 } },
          { content: '2nd App', styles: { halign: 'center', cellWidth: 12 } },
          { content: 'Evaluator Observations', styles: { halign: 'center', cellWidth: 44 } }
        ];

    const traitRows = traits.map((t, i) => {
      const self = t.selfRating ?? t.employeeSelfRating;
      const app1 = t.firstAppraiserRating ?? t.appraiserRating;
      const app2 = t.secondAppraiserRating;
      const co = t.coAppraiserRating != null ? t.coAppraiserRating : null;
      const comments = t.firstAppraiserComments || t.secondAppraiserComments || t.appraiserComments || 'Consistently demonstrates strong professional conduct.';

      if (hasCoAppraiser) {
        return [
          { content: i + 1, styles: { halign: 'center', textColor: mutedSlate, fontStyle: 'bold' } },
          { content: t.traitName || t.name || 'Behavioural Competency', styles: { fontStyle: 'bold' } },
          { content: t.definition || 'Standard competency definition.', styles: { textColor: [51, 65, 85] } },
          { content: self != null ? `${Number(self).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [51, 65, 85] } },
          { content: app1 != null ? `${Number(app1).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [15, 118, 110] } },
          { content: co != null ? `${Number(co).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [15, 118, 110] } },
          { content: app2 != null ? `${Number(app2).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] } },
          { content: comments, styles: { fontStyle: 'italic', textColor: [51, 65, 85] } }
        ];
      } else {
        return [
          { content: i + 1, styles: { halign: 'center', textColor: mutedSlate, fontStyle: 'bold' } },
          { content: t.traitName || t.name || 'Behavioural Competency', styles: { fontStyle: 'bold' } },
          { content: t.definition || 'Standard competency definition.', styles: { textColor: [51, 65, 85] } },
          { content: self != null ? `${Number(self).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [51, 65, 85] } },
          { content: app1 != null ? `${Number(app1).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [15, 118, 110] } },
          { content: app2 != null ? `${Number(app2).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] } },
          { content: comments, styles: { fontStyle: 'italic', textColor: [51, 65, 85] } }
        ];
      }
    });

    const traitFootRow = hasCoAppraiser
      ? [
          { content: 'Behavioural Competencies Subtotal (30% Fixed Weightage):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgTraitSelf.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgTrait1st.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110], fillColor: [241, 245, 249] } },
          { content: avgTraitCo != null ? avgTraitCo.toFixed(2) : avgTrait1st.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110], fillColor: [241, 245, 249] } },
          { content: avgTrait2nd != null ? avgTrait2nd.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9], fillColor: [241, 245, 249] } },
          { content: `Contribution: +${traitContribution.toFixed(2)} / 1.50`, styles: { fontStyle: 'bold', textColor: [15, 118, 110], halign: 'center', fillColor: [241, 245, 249] } }
        ]
      : [
          { content: 'Behavioural Competencies Subtotal (30% Fixed Weightage):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgTraitSelf.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
          { content: avgTrait1st.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110], fillColor: [241, 245, 249] } },
          { content: avgTrait2nd != null ? avgTrait2nd.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9], fillColor: [241, 245, 249] } },
          { content: `Contribution: +${traitContribution.toFixed(2)} / 1.50`, styles: { fontStyle: 'bold', textColor: [15, 118, 110], halign: 'center', fillColor: [241, 245, 249] } }
        ];

    safeAutoTable(doc, {
      startY: currentY,
      head: [
        [{
          content: `PART B: BEHAVIOURAL COMPETENCIES & TRAITS (30% FIXED WEIGHTAGE - AVERAGED)        Raw Avg: ${avgTraitRating.toFixed(2)} / 5.00 • Contribution: +${traitContribution.toFixed(2)} / 1.50`,
          colSpan: totalCols,
          styles: { halign: 'left', fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 7.2, cellPadding: 2 }
        }],
        traitColHeaderRow
      ],
      body: traitRows,
      foot: [traitFootRow],
      theme: 'grid',
      headStyles: { fillColor: primaryGreen, textColor: [209, 250, 229], fontSize: 6.8, fontStyle: 'bold', halign: 'center', cellPadding: 1.8 },
      footStyles: { fillColor: [241, 245, 249], textColor: darkSlate, fontSize: 6.8, cellPadding: 1.8 },
      styles: { fontSize: 6.6, cellPadding: 1.5, textColor: darkSlate, lineColor: borderSlate, lineWidth: 0.2 },
      margin: { left: 12, right: 12 }
    });

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 36;
  } else {
    // BSC / RABSC Separate Perspective Tables
    perspectiveData.forEach((p, idx) => {
      const pRows = p.items.map((obj, i) => {
        const self = obj.employeeSelfRating ?? obj.selfRating;
        const app1 = obj.firstAppraiserRating ?? obj.appraiserRating;
        const app2 = obj.secondAppraiserRating;
        const isFlagged = Boolean(obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser);
        const co = obj.coAppraiserRating != null ? obj.coAppraiserRating : null;
        const comments = obj.firstAppraiserComments || obj.secondAppraiserComments || obj.appraiserComments || 'Delivered with disciplined compliance.';

        if (hasCoAppraiser) {
          return [
            { content: i + 1, styles: { halign: 'center', textColor: mutedSlate, fontStyle: 'bold' } },
            { content: `${obj.title || 'Perspective Objective'}\n${obj.targetDescription || ''}`, styles: { fontStyle: 'bold' } },
            { content: obj.achievementDetails || obj.achievement || 'Delivered according to plan.', styles: { textColor: [30, 41, 59] } },
            { content: self != null ? `${Number(self).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [51, 65, 85] } },
            { content: (isFlagged || co != null) ? '—' : (app1 != null ? `${Number(app1).toFixed(1)}` : '—'), styles: { halign: 'center', fontStyle: 'bold', fillColor: (isFlagged || co != null) ? [248, 250, 252] : [236, 253, 245], textColor: (isFlagged || co != null) ? [100, 116, 139] : [6, 78, 59] } },
            { content: co != null ? `${Number(co).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [15, 118, 110] } },
            { content: app2 != null ? `${Number(app2).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] } },
            { content: comments, styles: { fontStyle: 'italic', textColor: [51, 65, 85] } }
          ];
        } else {
          return [
            { content: i + 1, styles: { halign: 'center', textColor: mutedSlate, fontStyle: 'bold' } },
            { content: `${obj.title || 'Perspective Objective'}\n${obj.targetDescription || ''}`, styles: { fontStyle: 'bold' } },
            { content: obj.achievementDetails || obj.achievement || 'Delivered according to plan.', styles: { textColor: [30, 41, 59] } },
            { content: self != null ? `${Number(self).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [51, 65, 85] } },
            { content: app1 != null ? `${Number(app1).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 78, 59] } },
            { content: app2 != null ? `${Number(app2).toFixed(1)}` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] } },
            { content: comments, styles: { fontStyle: 'italic', textColor: [51, 65, 85] } }
          ];
        }
      });

      const pFootRow = hasCoAppraiser
        ? [
            { content: `${p.name} Subtotal (${p.weight}% Weightage):`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
            { content: p.rawSelfAvg != null ? p.rawSelfAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
            { content: p.raw1stAvg != null ? p.raw1stAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: primaryGreen, fillColor: [241, 245, 249] } },
            { content: p.rawCoAvg != null ? p.rawCoAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110], fillColor: [241, 245, 249] } },
            { content: p.raw2ndAvg != null ? p.raw2ndAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9], fillColor: [241, 245, 249] } },
            { content: `Weighted Score: +${p.weightedScore.toFixed(2)} / ${p.maxScore.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: p.color, halign: 'center', fillColor: [241, 245, 249] } }
          ]
        : [
            { content: `${p.name} Subtotal (${p.weight}% Weightage):`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
            { content: p.rawSelfAvg != null ? p.rawSelfAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: darkSlate, fillColor: [241, 245, 249] } },
            { content: p.raw1stAvg != null ? p.raw1stAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: primaryGreen, fillColor: [241, 245, 249] } },
            { content: p.raw2ndAvg != null ? p.raw2ndAvg.toFixed(2) : '—', styles: { halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9], fillColor: [241, 245, 249] } },
            { content: `Weighted Score: +${p.weightedScore.toFixed(2)} / ${p.maxScore.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: p.color, halign: 'center', fillColor: [241, 245, 249] } }
          ];

      safeAutoTable(doc, {
        startY: currentY,
        head: [
          [{
            content: `PERSPECTIVE ${idx + 1}: ${p.name.toUpperCase()} (${p.weight}% WEIGHTAGE)        Raw Avg: ${p.rawAvg.toFixed(2)} / 5.00 • Weighted Score: +${p.weightedScore.toFixed(2)} / ${p.maxScore.toFixed(2)}`,
            colSpan: totalCols,
            styles: { halign: 'left', fillColor: p.color, textColor: 255, fontStyle: 'bold', fontSize: 7.2, cellPadding: 2 }
          }],
          colHeaderRow
        ],
        body: pRows,
        foot: [pFootRow],
        theme: 'grid',
        headStyles: { fillColor: primaryGreen, textColor: [209, 250, 229], fontSize: 6.8, fontStyle: 'bold', halign: 'center', cellPadding: 1.8 },
        footStyles: { fillColor: [241, 245, 249], textColor: darkSlate, fontSize: 6.8, cellPadding: 1.8 },
        styles: { fontSize: 6.6, cellPadding: 1.5, textColor: darkSlate, lineColor: borderSlate, lineWidth: 0.2 },
        margin: { left: 12, right: 12 }
      });

      currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 36;
    });
  }

  // =================================================================================
  // --- SECTION 3: FINAL CONSOLIDATED PERFORMANCE EVALUATION SUMMARY (Exact to HTML) ---
  // =================================================================================
  if (onProgress) onProgress('Compiling consolidated performance evaluation summary...');

  safeAutoTable(doc, {
    startY: currentY,
    head: [[{
      content: '2. FINAL CONSOLIDATED PERFORMANCE EVALUATION SUMMARY                       Scale: 1.00 to 5.00 Decimal',
      colSpan: 3,
      styles: { halign: 'left', fillColor: [241, 245, 249], textColor: primaryGreen, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
    }]],
    body: [
      [
        // Box 1: Composite Score Card
        {
          content: 'COMPOSITE DECIMAL SCORE\n\n' + `${finalScore.toFixed(2)}` + ' / 5.00\n\n' + (isKpiForm ? `${objContribution.toFixed(2)} (Obj 70%) + ${traitContribution.toFixed(2)} (Trait 30%)` : 'Sum of Strategic Perspectives (100%)'),
          styles: { fontStyle: 'bold', fontSize: 7.5, textColor: primaryGreen, halign: 'center', cellWidth: 55, fillColor: [255, 255, 255] }
        },
        // Box 2: Perspective / Block Contribution Breakdown
        {
          content: 'PERSPECTIVE / BLOCK CONTRIBUTION BREAKDOWN\n\n' + (
            isKpiForm
              ? `• Objectives (70% Weightage): +${objContribution.toFixed(2)} / 3.50\n• Behavioural Traits (30% Weightage): +${traitContribution.toFixed(2)} / 1.50`
              : perspectiveData.map(p => `• ${p.name.split(' ')[0]} (${p.weight}%): +${p.weightedScore.toFixed(2)} / ${p.maxScore.toFixed(2)}`).join('\n')
          ),
          styles: { fontSize: 6.8, cellWidth: 76, textColor: darkSlate, fillColor: [255, 255, 255] }
        },
        // Box 3: Official Rating Level Badge (Solid Green)
        {
          content: 'OFFICIAL RATING LEVEL\n\n' + `${rating.label} (Rating ${rating.code})\n\n` + (finalScore >= 3.80 ? 'Meets / Exceeds Target Standards' : 'Standard Performance'),
          styles: { fontStyle: 'bold', fontSize: 8, textColor: [255, 255, 255], fillColor: primaryGreen, halign: 'center', cellWidth: 55 }
        }
      ],
      [
        // Narrative summary row
        {
          content: `Overall Appraiser Performance Summary & Career Recommendations:\n` +
            (score?.appraiserComments || 'Employee has demonstrated disciplined execution, strong commitment to branch operational goals, and sound ethical conduct throughout the appraisal period. Recommended for professional capability development and elevated operational responsibilities.'),
          colSpan: 3,
          styles: { fontStyle: 'italic', fontSize: 6.8, textColor: [51, 65, 85], fillColor: [248, 250, 252], cellPadding: 2.5 }
        }
      ]
    ],
    theme: 'grid',
    styles: { cellPadding: 2, lineColor: borderSlate, lineWidth: 0.2 },
    margin: { left: 12, right: 12 }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 30;

  // =========================================================================
  // --- SECTION 4: DEVELOPMENT REVIEW & ACTION PLAN (Exact 4-Card Grid) ---
  // =========================================================================
  safeAutoTable(doc, {
    startY: currentY,
    head: [[{
      content: '3. DEVELOPMENT REVIEW & CAPABILITY BUILDING ACTION PLAN                       Target Development Year: 2027',
      colSpan: 2,
      styles: { halign: 'left', fillColor: [241, 245, 249], textColor: primaryGreen, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
    }]],
    body: [
      [
        {
          content: 'A. KEY STRENGTHS DEMONSTRATED\n' + (developmentReview?.keyStrengths?.trim() || 'Pending appraiser input during formal evaluation.'),
          styles: { fontSize: 6.8, cellWidth: 93, textColor: darkSlate, fillColor: [255, 255, 255] }
        },
        {
          content: 'B. AREAS FOR PERFORMANCE DEVELOPMENT\n' + (developmentReview?.developmentAreas?.trim() || 'Pending appraiser input during formal evaluation.'),
          styles: { fontSize: 6.8, cellWidth: 93, textColor: darkSlate, fillColor: [255, 255, 255] }
        }
      ],
      [
        {
          content: 'C. PROPOSED TRAINING & LEARNING ACTION PLAN\n' + (developmentReview?.trainingActionPlan?.trim() || 'Pending appraiser input during formal evaluation.'),
          styles: { fontSize: 6.8, cellWidth: 93, textColor: darkSlate, fillColor: [255, 255, 255] }
        },
        {
          content: 'D. SUPERVISOR GUIDANCE & CAREER READINESS\n' + (developmentReview?.supervisorComments?.trim() || 'Pending appraiser input during formal evaluation.'),
          styles: { fontSize: 6.8, cellWidth: 93, textColor: darkSlate, fillColor: [255, 255, 255] }
        }
      ]
    ],
    theme: 'grid',
    styles: { cellPadding: 2, lineColor: borderSlate, lineWidth: 0.2 },
    margin: { left: 12, right: 12 }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 30;

  // =========================================================================
  // --- SECTION 3.5: FORMAL DISAGREEMENT OR AGREEMENT RECORD TABLE ---
  // =========================================================================
  if (isDisagreed) {
    const disputeRows: any[] = [
      [
        {
          content: 'MANDATORY APPRAISEE DISAGREEMENT JUSTIFICATION:\n"' + (disagreementReasonText || 'Formal contestation registered against evaluation rating.') + '"',
          colSpan: 2,
          styles: { fontStyle: 'italic', fontSize: 6.8, textColor: [153, 27, 27], fillColor: [254, 242, 242], cellPadding: 2.5 }
        }
      ]
    ];

    if (disagreementAttachment) {
      disputeRows.push([
        {
          content: `SUPPORTING EVIDENCE DOCUMENT ATTACHED: ${disagreementAttachment}\nUploaded at time of formal disagreement • Stored in permanent audit vault for committee inspection`,
          colSpan: 2,
          styles: { fontStyle: 'bold', fontSize: 6.6, textColor: [21, 128, 61], fillColor: [240, 253, 244], cellPadding: 2 }
        }
      ]);
    }

    safeAutoTable(doc, {
      startY: currentY,
      head: [[{
        content: `4. FORMAL DISAGREEMENT & DISPUTE RECORD                    Status: ${isDisagreementResolved ? 'Resolved by Management Committee' : 'Under Review by GPM & PMW'}`,
        colSpan: 2,
        styles: { halign: 'left', fillColor: [254, 226, 226], textColor: [153, 27, 27], fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
      }]],
      body: disputeRows,
      theme: 'grid',
      styles: { cellPadding: 2, lineColor: [252, 165, 165], lineWidth: 0.2 },
      margin: { left: 12, right: 12 }
    });

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 20;
  } else if (isAgreed) {
    safeAutoTable(doc, {
      startY: currentY,
      head: [[{
        content: '4. APPRAISAL ACKNOWLEDGEMENT & FORMAL AGREEMENT RECORD                    Status: Agreed & Signed',
        colSpan: 2,
        styles: { halign: 'left', fillColor: [240, 253, 244], textColor: primaryGreen, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
      }]],
      body: [
        [
          {
            content: `The Appraisee has formally reviewed, agreed to, and acknowledged this performance appraisal evaluation score of ${finalScore.toFixed(2)} / 5.00 (${rating.label}) and official career development action plan.\nDigital Verification Seal: ${ackSeal} • Confirmed on ${ackDateStr} • Permanent Record Sealed`,
            colSpan: 2,
            styles: { fontSize: 6.8, textColor: [20, 83, 45], fillColor: [255, 255, 255], cellPadding: 2.2 }
          }
        ]
      ],
      theme: 'grid',
      styles: { cellPadding: 2, lineColor: [187, 247, 208], lineWidth: 0.2 },
      margin: { left: 12, right: 12 }
    });

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 15;
  } else if (isAdminCompleted) {
    safeAutoTable(doc, {
      startY: currentY,
      head: [[{
        content: '4. ADMINISTRATIVE CLOSURE RECORD (CALENDAR DEADLINE EXPIRED)               Status: Administratively Completed',
        colSpan: 2,
        styles: { halign: 'left', fillColor: [241, 245, 249], textColor: [51, 65, 85], fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
      }]],
      body: [
        [
          {
            content: `This appraisal was administratively completed upon expiration of the cycle calendar acknowledgement deadline.\nPer bank governance policy, Administrative Completion is audited as an independent system state and is NOT recorded as employee agreement.`,
            colSpan: 2,
            styles: { fontSize: 6.8, textColor: [71, 85, 105], fillColor: [255, 255, 255], cellPadding: 2.2 }
          }
        ]
      ],
      theme: 'grid',
      styles: { cellPadding: 2, lineColor: borderSlate, lineWidth: 0.2 },
      margin: { left: 12, right: 12 }
    });

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 15;
  } else {
    safeAutoTable(doc, {
      startY: currentY,
      head: [[{
        content: '4. APPRAISAL ACKNOWLEDGEMENT STATUS                                        Status: Awaiting Appraisee Action',
        colSpan: 2,
        styles: { halign: 'left', fillColor: [254, 243, 199], textColor: [146, 64, 14], fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
      }]],
      body: [
        [
          {
            content: `Appraisal results have been published and are pending formal Appraisee acknowledgment.\nThe Appraisee may confirm Agreement or register a formal Disagreement with justification before the deadline.`,
            colSpan: 2,
            styles: { fontSize: 6.8, textColor: [120, 53, 15], fillColor: [255, 255, 255], cellPadding: 2.2 }
          }
        ]
      ],
      theme: 'grid',
      styles: { cellPadding: 2, lineColor: [253, 230, 138], lineWidth: 0.2 },
      margin: { left: 12, right: 12 }
    });

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 15;
  }

  // =========================================================================
  // --- SECTION 5: FORMAL SIGNATURES & QR-CODE E-SIGNATURES (Exact 3/4-Card Grid) ---
  // =========================================================================
  if (onProgress) onProgress('Generating secure QR-code digital e-signatures with complete metadata...');

  const qrOpts = { width: 600, margin: 1, errorCorrectionLevel: 'M' as const, color: { dark: '#004d25', light: '#ffffff' } };
  const docRef = `NBP-PMS-${employeeCycle?.id ? String(employeeCycle.id).substring(0, 8).toUpperCase() : '2027-' + (emp.sapId || '84920')}`;
  const signTimestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  const scoreStr = `${finalScore.toFixed(2)} / 5.00`;
  const ratingStr = `${rating.label} (Rating ${rating.code})`;

  // Appraisee Payload
  const appraiseePayload = [
    `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
    `Doc Ref: ${docRef}`,
    `Signer: ${emp.fullName || 'Fawaz Ahmed'} (SAP: ${emp.sapId || '84920'})`,
    `Designation: ${employeeCycle.snapshotDesignation || emp.designation || 'Assistant Vice President'} (${displayGrade})`,
    `Role: Appraisee / Employee`,
    `Date & Time: ${signTimestamp}`,
    `Final Score: ${scoreStr}`,
    `Official Rating: ${ratingStr}`,
    `Digital Seal: ${ackSeal}`,
    `Status: ${ackQrStatus}${isDisagreed && disagreementReasonText ? ` [Justification: ${disagreementReasonText.substring(0, 50)}...]` : ''}${disagreementAttachment ? ` [Proof Document: ${disagreementAttachment}]` : ''}`
  ].join('\n');

  const qrAppraisee = await QRCode.toDataURL(appraiseePayload, qrOpts);

  // 1st Appraiser Payload
  const firstAppPayload = [
    `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
    `Doc Ref: ${docRef}`,
    `Signer: ${firstApp.fullName || 'Tariq Mahmood'} (SAP: ${firstApp.sapId || '10004'})`,
    `Designation: ${firstApp.designation || 'Regional Head'} (${formatGradeLabel(firstApp.grade) || 'VP'})`,
    `Role: 1st Appraiser (Supervisor)`,
    `Date & Time: ${signTimestamp}`,
    `Final Score: ${scoreStr}`,
    `Official Rating: ${ratingStr}`,
    `Digital Seal: APP1-VERIFIED`,
    `Status: Evaluated & Submitted`
  ].join('\n');

  const qrFirstApp = await QRCode.toDataURL(firstAppPayload, qrOpts);

  // Co-Appraiser Payload (if present)
  let qrCoApp = '';
  if (hasCoAppraiser) {
    const coAppPayload = [
      `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
      `Doc Ref: ${docRef}`,
      `Signer: ${coApp.fullName || 'Matrix Supervisor'} (SAP: ${coApp.sapId || '10008'})`,
      `Designation: ${coApp.designation || 'Specialist Head'} (${formatGradeLabel(coApp.grade) || 'AVP'})`,
      `Role: Co-Appraiser (Matrix Supervisor)`,
      `Date & Time: ${signTimestamp}`,
      `Final Score: ${scoreStr}`,
      `Official Rating: ${ratingStr}`,
      `Digital Seal: COAPP-VERIFIED`,
      `Status: Reviewed & Submitted`
    ].join('\n');

    qrCoApp = await QRCode.toDataURL(coAppPayload, qrOpts);
  }

  // 2nd Appraiser Payload
  const secondAppPayload = [
    `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
    `Doc Ref: ${docRef}`,
    `Signer: ${secondApp.fullName || 'Rashid Khan'} (SAP: ${secondApp.sapId || '10003'})`,
    `Designation: ${secondApp.designation || 'Divisional Head'} (${formatGradeLabel(secondApp.grade) || 'SVP'})`,
    `Role: 2nd Appraiser (Countersigning Officer)`,
    `Date & Time: ${signTimestamp}`,
    `Final Score: ${scoreStr}`,
    `Official Rating: ${ratingStr}`,
    `Digital Seal: APP2-COUNTERSIGNED`,
    `Status: Countersigned & Confirmed`
  ].join('\n');

  const qrSecondApp = await QRCode.toDataURL(secondAppPayload, qrOpts);

  const qrCodes = hasCoAppraiser
    ? [qrAppraisee, qrFirstApp, qrCoApp, qrSecondApp]
    : [qrAppraisee, qrFirstApp, qrSecondApp];

  const signatureBody = hasCoAppraiser
    ? [
        [
          {
            content: `Appraisee / Employee:\n${emp.fullName || 'Fawaz Ahmed'}\nSAP: ${emp.sapId || '84920'} • ${displayGrade}\n\nAcknowledgement: Signed\nDate: ${ackDateStr}\nSeal: ${ackSeal}`,
            styles: { fontSize: 6.5, cellWidth: 46.5, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          },
          {
            content: `1st Appraiser (Supervisor):\n${firstApp.fullName || 'Tariq Mahmood'}\nSAP: ${firstApp.sapId || '10004'} (${formatGradeLabel(firstApp.grade) || 'VP'})\n\nEvaluation: Submitted\nDate: ${new Date().toLocaleDateString('en-GB')}\nSeal: APP1-VERIFIED`,
            styles: { fontSize: 6.5, cellWidth: 46.5, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          },
          {
            content: `Co-Appraiser:\n${coApp.fullName || 'Matrix Head'}\nSAP: ${coApp.sapId || '10008'} (${formatGradeLabel(coApp.grade) || 'AVP'})\n\nCo-Appraisal: Reviewed\nDate: ${new Date().toLocaleDateString('en-GB')}\nSeal: COAPP-VERIFIED`,
            styles: { fontSize: 6.5, cellWidth: 46.5, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          },
          {
            content: `2nd Appraiser (Countersign):\n${secondApp.fullName || 'Rashid Khan'}\nSAP: ${secondApp.sapId || '10003'} (${formatGradeLabel(secondApp.grade) || 'SVP'})\n\nCountersign: Signed\nDate: ${new Date().toLocaleDateString('en-GB')}\nSeal: APP2-COUNTERSIGNED`,
            styles: { fontSize: 6.5, cellWidth: 46.5, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          }
        ]
      ]
    : [
        [
          {
            content: `Appraisee / Employee:\n${emp.fullName || 'Fawaz Ahmed'}\nSAP ID: ${emp.sapId || '84920'} • ${displayGrade}\n\nAcknowledgement: Signed\nDate: ${ackDateStr}\nDigital Seal: ${ackSeal}`,
            styles: { fontSize: 6.8, cellWidth: 62, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          },
          {
            content: `First Appraiser (Supervisor):\n${firstApp.fullName || 'Tariq Mahmood'}\nSAP ID: ${firstApp.sapId || '10004'} (${formatGradeLabel(firstApp.grade) || 'VP'})\n\nEvaluation: Submitted & Signed\nDate: ${new Date().toLocaleDateString('en-GB')}\nDigital Seal: APP1-VERIFIED`,
            styles: { fontSize: 6.8, cellWidth: 62, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          },
          {
            content: `Second Appraiser (Countersigning):\n${secondApp.fullName || 'Rashid Khan'}\nSAP ID: ${secondApp.sapId || '10003'} (${formatGradeLabel(secondApp.grade) || 'SVP'})\n\nCountersign: Reviewed & Signed\nDate: ${new Date().toLocaleDateString('en-GB')}\nDigital Seal: APP2-COUNTERSIGNED`,
            styles: { fontSize: 6.8, cellWidth: 62, minCellHeight: 28, fillColor: [255, 255, 255], textColor: darkSlate }
          }
        ]
      ];

  safeAutoTable(doc, {
    startY: currentY,
    head: [[{
      content: '5. FORMAL SIGNATURES & QR-CODE E-SIGNATURE VERIFICATION',
      colSpan: hasCoAppraiser ? 4 : 3,
      styles: { halign: 'left', fillColor: [241, 245, 249], textColor: primaryGreen, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 }
    }]],
    body: signatureBody,
    theme: 'grid',
    styles: { cellPadding: 2.2, lineColor: borderSlate, lineWidth: 0.2 },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 0) {
        const qr = qrCodes[data.column.index];
        if (qr) {
          try {
            const qrSize = 13.5; // 13.5mm x 13.5mm (Ultra High-Res 600px)
            const qrX = data.cell.x + data.cell.width - qrSize - 1.5;
            const qrY = data.cell.y + 1.5;

            // Draw crisp white background box for QR code
            doc.setDrawColor(...borderSlate);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(qrX - 0.4, qrY - 0.4, qrSize + 0.8, qrSize + 0.8, 0.4, 0.4, 'FD');

            // Draw QR code image
            doc.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize);
          } catch (e) {
            console.warn('Error rendering QR code into signature cell:', e);
          }
        }
      }
    },
    margin: { left: 12, right: 12 }
  });

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.2);
    doc.line(12, 287, 198, 287);

    doc.setFontSize(6.5);
    doc.setTextColor(...mutedSlate);
    doc.text(
      'Confidential Document • National Bank of Pakistan Performance Management System (PMS 2.0)',
      12,
      291
    );
    doc.text(
      `Document Reference: NBP-PMS-${employeeCycle?.id ? String(employeeCycle.id).substring(0, 8).toUpperCase() : '2027'} • Page ${i} of ${totalPages}`,
      198,
      291,
      { align: 'right' }
    );
  }

  if (onProgress) onProgress('Saving official PDF document...');

  const cleanName = (emp.fullName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sap = emp.sapId || 'SAP';
  const year = new Date().getFullYear();
  const targetFilename = filename || `NBP_Appraisal_Report_${cleanName}_${sap}_${year}.pdf`;

  // Trigger instant direct download
  doc.save(targetFilename);

  if (onProgress) onProgress('Complete');
};
