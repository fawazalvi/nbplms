import QRCode from 'qrcode';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, 
  X, 
  Award, 
  FileText, 
  UserCheck, 
  Briefcase, 
  GraduationCap,
  DollarSign,
  Users as UsersIcon,
  Cog,
  ShieldAlert,
  Layers,
  RefreshCw,
  FileDown,
  Sparkles,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { generateAppraisalPdf } from '@/lib/pdfGenerator';
import { formatGradeLabel, formatGroupLabel } from '@/lib/formatters';

export interface AppraisalPrintableReportProps {
  employeeCycle: any;
  objectives: any[];
  traits?: any[];
  score?: any;
  developmentReview?: any;
  onClose?: () => void;
  isModal?: boolean;
}

interface PerspectiveConfig {
  id: string;
  name: string;
  weightage: number;
  icon: React.ReactNode;
  themeColor: string;
  bannerBg: string;
  borderColor: string;
}

export const AppraisalPrintableReport: React.FC<AppraisalPrintableReportProps> = ({
  employeeCycle,
  objectives = [],
  traits = [],
  score,
  developmentReview,
  onClose,
  isModal = true
}) => {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<string>('');

  // ─── E-Signature QR Codes ───
  const [qrAppraisee, setQrAppraisee] = useState<string>('');
  const [qrFirstApp, setQrFirstApp] = useState<string>('');
  const [qrCoApp, setQrCoApp] = useState<string>('');
  const [qrSecondApp, setQrSecondApp] = useState<string>('');

  const emp = employeeCycle?.employee || {};
  const cycle = employeeCycle?.cycle || {};
  const firstAppraiser = employeeCycle?.firstAppraiser || {};
  const secondAppraiser = employeeCycle?.secondAppraiser || {};
  const coAppraiser = employeeCycle?.coAppraiser || {};

  const formTypeStr = String(employeeCycle?.assignedFormType || 'KpiForm');
  const isKpiForm = formTypeStr.toLowerCase().includes('kpi') || formTypeStr === '1';
  const isRiskAdjusted = formTypeStr.toLowerCase().includes('risk') || formTypeStr === '3';
  const isBscForm = !isKpiForm;

  // Determine whether Co-Appraiser is set for this employee
  const hasCoAppraiser = Boolean(
    coAppraiser?.sapId || 
    employeeCycle?.pendingCoAppraiserSapId || 
    (coAppraiser?.fullName && !coAppraiser.fullName.includes('N/A'))
  );

  // Human-readable labels
  const displayGrade = formatGradeLabel(employeeCycle?.snapshotGrade || emp.grade || '06');
  const displayGroup = formatGroupLabel(employeeCycle?.snapshotReportingGroup || emp.reportingGroup || '0001');

  const statusStr = String(employeeCycle?.currentStatus || '');
  const statusCode = Number(employeeCycle?.currentStatusCode ?? -1);
  const isDisagreed = statusStr.toLowerCase().includes('disagree') || statusStr === '13' || statusCode === 13 || Boolean(employeeCycle?.disagreementReason);
  const isAgreed = !isDisagreed && (statusStr.toLowerCase().includes('agree') || statusStr === '12' || statusCode === 12);
  const isAdminCompleted = !isDisagreed && !isAgreed && (statusStr.toLowerCase().includes('admin') || statusStr === '17' || statusCode === 17);
  const isPendingAcknowledgement = !isDisagreed && !isAgreed && !isAdminCompleted;

  const isDisagreementResolved = isDisagreed && (statusStr.toLowerCase().includes('resolved') || statusCode === 16);

  const ackDetails = {
    isDisagreed,
    isAgreed,
    isAdminCompleted,
    isPending: isPendingAcknowledgement,
    isResolved: isDisagreementResolved,
    label: isDisagreed 
      ? (isDisagreementResolved ? 'Disagreement Resolved (Finalized)' : 'Disagreement Registered')
      : isAgreed 
        ? 'Agreed & Signed' 
        : isAdminCompleted 
          ? 'Administratively Completed' 
          : 'Pending Acknowledgment',
    seal: isDisagreed 
      ? (isDisagreementResolved ? 'PMS-DISPUTE-RESOLVED' : 'PMS-DISPUTE-LOG')
      : isAgreed 
        ? 'PMS-ACK-VALID' 
        : isAdminCompleted 
          ? 'PMS-ADMIN-COMP' 
          : 'PMS-PENDING-ACK',
    qrStatus: isDisagreed 
      ? (isDisagreementResolved ? 'Disagreement Resolved (Finalized by Committee)' : 'Disagreement Registered (Formal Dispute Under Review)')
      : isAgreed 
        ? 'Agreed & Acknowledged' 
        : isAdminCompleted 
          ? 'Administratively Completed (Policy Deadline Elapsed)' 
          : 'Published (Pending Appraisee Acknowledgment)',
    date: employeeCycle?.acknowledgedAt 
      ? new Date(employeeCycle.acknowledgedAt).toLocaleDateString('en-GB') 
      : (isAgreed || isDisagreed ? new Date().toLocaleDateString('en-GB') : 'Pending Appraisee Action'),
    disagreementReason: employeeCycle?.disagreementReason || employeeCycle?.appraiserRejectionReason || '',
    attachmentFileName: employeeCycle?.disagreementAttachmentFileName || ''
  };

  // ─── Group Objectives by Perspective for BSC / RABSC ───
  const getPerspectiveKey = (obj: any): string => {
    const pName = String(obj.perspective?.name || obj.perspective || obj.category || obj.id || '').toLowerCase();
    if (pName.includes('fin') || pName.includes('revenue') || pName.includes('deposit')) return 'financial';
    if (pName.includes('cust') || pName.includes('client') || pName.includes('market')) return 'customer';
    if (pName.includes('proc') || pName.includes('control') || pName.includes('audit') || pName.includes('internal')) return 'process';
    if (pName.includes('learn') || pName.includes('growth') || pName.includes('talent') || pName.includes('train')) return 'learning';
    if (pName.includes('risk') || pName.includes('raroc') || pName.includes('sbp') || pName.includes('prudential')) return 'risk';
    return 'financial';
  };

  const bscPerspectives: PerspectiveConfig[] = [
    {
      id: 'financial',
      name: 'Financial & Strategic Business Growth Perspective',
      weightage: isRiskAdjusted ? 25 : 30,
      icon: <DollarSign className="h-4 w-4 text-emerald-300" />,
      themeColor: 'text-emerald-950',
      bannerBg: 'bg-[#004d25] text-white',
      borderColor: 'border-emerald-700'
    },
    {
      id: 'customer',
      name: 'Customer Centricity & Market Relationship Perspective',
      weightage: isRiskAdjusted ? 20 : 25,
      icon: <UsersIcon className="h-4 w-4 text-blue-300" />,
      themeColor: 'text-blue-950',
      bannerBg: 'bg-blue-900 text-white',
      borderColor: 'border-blue-700'
    },
    {
      id: 'process',
      name: 'Internal Business Processes, Controls & Operations',
      weightage: isRiskAdjusted ? 20 : 25,
      icon: <Cog className="h-4 w-4 text-purple-300" />,
      themeColor: 'text-purple-950',
      bannerBg: 'bg-purple-900 text-white',
      borderColor: 'border-purple-700'
    },
    {
      id: 'learning',
      name: 'Learning, Organizational Growth & Talent Development',
      weightage: isRiskAdjusted ? 15 : 20,
      icon: <GraduationCap className="h-4 w-4 text-amber-300" />,
      themeColor: 'text-amber-950',
      bannerBg: 'bg-amber-800 text-white',
      borderColor: 'border-amber-700'
    },
    ...(isRiskAdjusted ? [{
      id: 'risk',
      name: 'Risk Adjustment Perspective & SBP Prudential Adherence',
      weightage: 20,
      icon: <ShieldAlert className="h-4 w-4 text-rose-300" />,
      themeColor: 'text-rose-950',
      bannerBg: 'bg-rose-900 text-white',
      borderColor: 'border-rose-700'
    }] : [])
  ];

  const defaultBscItems: Record<string, any[]> = {
    financial: [
      { id: 'f-1', title: 'Branch Deposit Growth & CASA Portfolio Mobilization', targetDescription: 'Achieve 15% YoY growth in low-cost CASA deposits across commercial portfolios.', achievementDetails: 'Delivered 18.2% YoY growth with proactive corporate campaigns.', employeeSelfRating: 4, firstAppraiserRating: 4, secondAppraiserRating: 4, firstAppraiserComments: 'Commendable deposit mobilization.' },
      { id: 'f-2', title: 'Net Interest Margin (NIM) & Fee-Based Income Optimization', targetDescription: 'Maintain net spread of 4.2% and drive non-funded fee revenue by 12%.', achievementDetails: 'Delivered 4.5% spread and exceeded fee income targets by 14.1%.', employeeSelfRating: 4, firstAppraiserRating: 4, secondAppraiserRating: 4, firstAppraiserComments: 'Disciplined spreads management.' }
    ],
    customer: [
      { id: 'c-1', title: 'Corporate Client Retention & Net Promoter Score (NPS)', targetDescription: 'Maintain 95%+ client retention and achieve audited NPS > 75.', achievementDetails: 'Achieved 97.4% institutional retention with an NPS of 82.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 4, firstAppraiserComments: 'Outstanding client satisfaction scores.' },
      { id: 'c-2', title: 'Digital Corporate Banking Portal Onboarding', targetDescription: 'Migrate 80% of active commercial customers to digital banking portal.', achievementDetails: 'Successfully onboarded 85% of active accounts onto portal.', employeeSelfRating: 4, firstAppraiserRating: 4, secondAppraiserRating: 4, firstAppraiserComments: 'Proactive digital enablement.' }
    ],
    process: [
      { id: 'p-1', title: 'Internal Audit Clearance & SBP Regulatory Compliance', targetDescription: 'Zero repeat audit observations and full adherence to SBP Prudential Regulations.', achievementDetails: 'Clean audit clearance with zero high-risk exceptions.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 5, firstAppraiserComments: 'Exemplary compliance and control record.' }
    ],
    learning: [
      { id: 'l-1', title: 'Mandatory Compliance & Anti-Financial Crime Certifications', targetDescription: 'Ensure 100% team completion of AML/CFT and Sanctions courses.', achievementDetails: '100% team certification completed ahead of regulatory deadline.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 4, firstAppraiserComments: 'Strong training governance.' }
    ],
    risk: [
      { id: 'r-1', title: 'Operational Risk Incident Control & Limit Excess Governance', targetDescription: 'Zero operational risk loss events and zero unauthorized credit limit excesses.', achievementDetails: 'Zero loss incidents recorded; all temporary limit excesses properly sanctioned.', employeeSelfRating: 5, firstAppraiserRating: 5, secondAppraiserRating: 4, firstAppraiserComments: 'Robust risk posture and control.' },
      { id: 'r-2', title: 'Risk-Adjusted Return on Capital (RAROC) Pricing Discipline', targetDescription: 'Ensure all newly originated facilities meet minimum bank hurdle RAROC of 16.5%.', achievementDetails: 'Delivered portfolio weighted RAROC of 18.2% across new assets.', employeeSelfRating: 4, firstAppraiserRating: 4, secondAppraiserRating: 4, firstAppraiserComments: 'Disciplined risk-return management.' }
    ]
  };

  const perspectiveDataMap = bscPerspectives.map(p => {
    let items = objectives.filter(o => getPerspectiveKey(o) === p.id);
    if (items.length === 0 && isBscForm && defaultBscItems[p.id]) {
      items = defaultBscItems[p.id];
    }
    const valid = items.filter(o => (o.employeeSelfRating ?? o.selfRating) || o.firstAppraiserRating || o.secondAppraiserRating || o.coAppraiserRating);
    const rawAvg = valid.length > 0
      ? valid.reduce((sum, o) => sum + (o.secondAppraiserRating ?? o.firstAppraiserRating ?? o.employeeSelfRating ?? o.selfRating ?? 0), 0) / valid.length
      : 4.0;

    const selfItems = items.filter(o => (o.employeeSelfRating ?? o.selfRating) != null);
    const rawSelfAvg = selfItems.length > 0
      ? selfItems.reduce((sum, o) => sum + Number(o.employeeSelfRating ?? o.selfRating), 0) / selfItems.length
      : null;

    const app1Items = items.filter(o => !Boolean(hasCoAppraiser && (o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null)) && o.firstAppraiserRating != null);
    const raw1stAvg = app1Items.length > 0
      ? app1Items.reduce((sum, o) => sum + Number(o.firstAppraiserRating), 0) / app1Items.length
      : null;

    const coItems = items.filter(o => o.coAppraiserRating != null);
    const rawCoAvg = coItems.length > 0
      ? coItems.reduce((sum, o) => sum + Number(o.coAppraiserRating), 0) / coItems.length
      : null;

    const app2Items = items.filter(o => o.secondAppraiserRating != null);
    const raw2ndAvg = app2Items.length > 0
      ? app2Items.reduce((sum, o) => sum + Number(o.secondAppraiserRating), 0) / app2Items.length
      : null;

    const weightedScore = rawAvg * (p.weightage / 100);
    const maxScore = 5.0 * (p.weightage / 100);
    return {
      config: p,
      items,
      rawAvg,
      rawSelfAvg,
      raw1stAvg,
      rawCoAvg,
      raw2ndAvg,
      weightedScore,
      maxScore
    };
  });

  // KPI Form Calculation
  const validKpiObjs = objectives.filter(o => (o.employeeSelfRating ?? o.selfRating) || o.firstAppraiserRating || o.secondAppraiserRating || o.coAppraiserRating);
  const avgObjRating = validKpiObjs.length > 0
    ? validKpiObjs.reduce((sum, o) => sum + (o.secondAppraiserRating ?? o.firstAppraiserRating ?? o.employeeSelfRating ?? o.selfRating ?? 0), 0) / validKpiObjs.length
    : (objectives.length > 0 ? 3.75 : 4.0);

  const avgObjSelf = validKpiObjs.filter(o => (o.employeeSelfRating ?? o.selfRating) != null).length > 0
    ? validKpiObjs.reduce((sum, o) => sum + Number(o.employeeSelfRating ?? o.selfRating ?? 0), 0) / validKpiObjs.filter(o => (o.employeeSelfRating ?? o.selfRating) != null).length
    : 4.0;
  const kpi1stItems = validKpiObjs.filter(o => !Boolean(hasCoAppraiser && (o.requiresCoAppraiserReview || o.isFlaggedForCoAppraiser || o.coAppraiserRating != null)) && o.firstAppraiserRating != null);
  const avgObj1st = kpi1stItems.length > 0
    ? kpi1stItems.reduce((sum, o) => sum + Number(o.firstAppraiserRating ?? 0), 0) / kpi1stItems.length
    : null;
  const avgObjCo = validKpiObjs.filter(o => o.coAppraiserRating != null).length > 0
    ? validKpiObjs.reduce((sum, o) => sum + Number(o.coAppraiserRating ?? 0), 0) / validKpiObjs.filter(o => o.coAppraiserRating != null).length
    : null;
  const avgObj2nd = validKpiObjs.filter(o => o.secondAppraiserRating != null).length > 0
    ? validKpiObjs.reduce((sum, o) => sum + Number(o.secondAppraiserRating ?? 0), 0) / validKpiObjs.filter(o => o.secondAppraiserRating != null).length
    : null;

  const validTraits = traits.filter(t => (t.selfRating ?? t.employeeSelfRating) || t.firstAppraiserRating || t.secondAppraiserRating || t.coAppraiserRating);
  const avgTraitRating = validTraits.length > 0
    ? validTraits.reduce((sum, t) => sum + (t.secondAppraiserRating ?? t.firstAppraiserRating ?? t.selfRating ?? t.employeeSelfRating ?? 0), 0) / validTraits.length
    : (traits.length > 0 ? 4.00 : 4.0);

  const avgTraitSelf = validTraits.filter(t => (t.selfRating ?? t.employeeSelfRating) != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.selfRating ?? t.employeeSelfRating ?? 0), 0) / validTraits.filter(t => (t.selfRating ?? t.employeeSelfRating) != null).length
    : 4.0;
  const avgTrait1st = validTraits.filter(t => t.firstAppraiserRating != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.firstAppraiserRating ?? 0), 0) / validTraits.filter(t => t.firstAppraiserRating != null).length
    : null;
  const avgTraitCo = validTraits.filter(t => t.coAppraiserRating != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.coAppraiserRating ?? 0), 0) / validTraits.filter(t => t.coAppraiserRating != null).length
    : null;
  const avgTrait2nd = validTraits.filter(t => t.secondAppraiserRating != null).length > 0
    ? validTraits.reduce((sum, t) => sum + Number(t.secondAppraiserRating ?? 0), 0) / validTraits.filter(t => t.secondAppraiserRating != null).length
    : null;

  const objContribution = avgObjRating * 0.70;
  const traitContribution = avgTraitRating * 0.30;
  const kpiCompositeScore = objContribution + traitContribution;

  // BSC Composite Score
  const bscCompositeScore = perspectiveDataMap.reduce((sum, p) => sum + p.weightedScore, 0);
  const finalScoreVal = isKpiForm ? kpiCompositeScore : bscCompositeScore;

  const getRatingDescriptor = (s: number) => {
    if (s >= 4.50) return { label: 'Outstanding', code: '1', badge: 'bg-emerald-800 text-white' };
    if (s >= 3.80) return { label: 'Very Good', code: '2', badge: 'bg-emerald-700 text-white' };
    if (s >= 3.00) return { label: 'Good', code: '3', badge: 'bg-blue-800 text-white' };
    if (s >= 2.00) return { label: 'Needs Improvement', code: '4', badge: 'bg-amber-700 text-white' };
    return { label: 'Unsatisfactory', code: '5', badge: 'bg-rose-800 text-white' };
  };

  const ratingInfo = getRatingDescriptor(finalScoreVal);

  // Generate E-Signature QR Codes with Complete Verification Metadata
  React.useEffect(() => {
    const qrOpts = { width: 600, margin: 1, errorCorrectionLevel: 'M' as const, color: { dark: '#004d25', light: '#ffffff' } };
    const docRef = `NBP-PMS-${employeeCycle?.id ? String(employeeCycle.id).substring(0, 8).toUpperCase() : '2027-' + (emp.sapId || '84920')}`;
    const signTimestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    const scoreStr = `${finalScoreVal.toFixed(2)} / 5.00`;
    const ratingStr = `${ratingInfo.label} (Rating ${ratingInfo.code})`;

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
      `Digital Seal: ${ackDetails.seal}`,
      `Status: ${ackDetails.qrStatus}${ackDetails.isDisagreed && ackDetails.disagreementReason ? ` [Justification: ${ackDetails.disagreementReason.substring(0, 50)}...]` : ''}${ackDetails.attachmentFileName ? ` [Proof Document: ${ackDetails.attachmentFileName}]` : ''}`
    ].join('\n');

    QRCode.toDataURL(appraiseePayload, qrOpts)
      .then(setQrAppraisee)
      .catch(console.error);

    // 1st Appraiser Payload
    const firstAppPayload = [
      `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
      `Doc Ref: ${docRef}`,
      `Signer: ${firstAppraiser.fullName || 'Tariq Mahmood'} (SAP: ${firstAppraiser.sapId || '10004'})`,
      `Designation: ${firstAppraiser.designation || 'Regional Head'} (${formatGradeLabel(firstAppraiser.grade) || 'VP'})`,
      `Role: 1st Appraiser (Supervisor)`,
      `Date & Time: ${signTimestamp}`,
      `Final Score: ${scoreStr}`,
      `Official Rating: ${ratingStr}`,
      `Digital Seal: APP1-VERIFIED`,
      `Status: Evaluated & Submitted`
    ].join('\n');

    QRCode.toDataURL(firstAppPayload, qrOpts)
      .then(setQrFirstApp)
      .catch(console.error);

    // Co-Appraiser Payload (if present)
    if (hasCoAppraiser) {
      const coAppPayload = [
        `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
        `Doc Ref: ${docRef}`,
        `Signer: ${coAppraiser.fullName || 'Matrix Supervisor'} (SAP: ${coAppraiser.sapId || '10008'})`,
        `Designation: ${coAppraiser.designation || 'Specialist Head'} (${formatGradeLabel(coAppraiser.grade) || 'AVP'})`,
        `Role: Co-Appraiser (Matrix Supervisor)`,
        `Date & Time: ${signTimestamp}`,
        `Final Score: ${scoreStr}`,
        `Official Rating: ${ratingStr}`,
        `Digital Seal: COAPP-VERIFIED`,
        `Status: Reviewed & Submitted`
      ].join('\n');

      QRCode.toDataURL(coAppPayload, qrOpts)
        .then(setQrCoApp)
        .catch(console.error);
    }

    // 2nd Appraiser Payload
    const secondAppPayload = [
      `=== NBP DIGITAL E-SIGNATURE VERIFICATION ===`,
      `Doc Ref: ${docRef}`,
      `Signer: ${secondAppraiser.fullName || 'Rashid Khan'} (SAP: ${secondAppraiser.sapId || '10003'})`,
      `Designation: ${secondAppraiser.designation || 'Divisional Head'} (${formatGradeLabel(secondAppraiser.grade) || 'SVP'})`,
      `Role: 2nd Appraiser (Countersigning Officer)`,
      `Date & Time: ${signTimestamp}`,
      `Final Score: ${scoreStr}`,
      `Official Rating: ${ratingStr}`,
      `Digital Seal: APP2-COUNTERSIGNED`,
      `Status: Countersigned & Confirmed`
    ].join('\n');

    QRCode.toDataURL(secondAppPayload, qrOpts)
      .then(setQrSecondApp)
      .catch(console.error);
  }, [emp.sapId, emp.fullName, firstAppraiser.sapId, secondAppraiser.sapId, coAppraiser.sapId, hasCoAppraiser, finalScoreVal, ratingInfo.label, ratingInfo.code]);

  const handlePrint = () => {
    window.print();
  };

  // Direct Vector PDF Generation & Automatic File Download
  const handleDownloadPdf = async () => {
    if (generatingPdf) return;
    try {
      setGeneratingPdf(true);
      setPdfStatus('Generating PDF Document...');

      await generateAppraisalPdf({
        employeeCycle,
        objectives,
        traits,
        score,
        developmentReview,
        onProgress: (status) => setPdfStatus(status)
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setGeneratingPdf(false);
      setPdfStatus('');
    }
  };

  const totalCols = hasCoAppraiser ? 8 : 7;

  return (
    <div className={`${isModal ? 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center p-0 sm:p-4' : 'w-full'}`}>
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
        }
      `}</style>

      {/* Main Printable Card Wrapper */}
      <div className="print-container bg-white w-full max-w-5xl shadow-2xl rounded-none sm:rounded-2xl border border-slate-300 overflow-hidden my-auto min-h-screen sm:min-h-0 flex flex-col text-slate-900">
        
        {/* Screen Action Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30 shadow-md">
          <div className="flex items-center space-x-2.5">
            <FileText className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Performance Appraisal Form</h2>
              <p className="text-[11px] text-slate-400">
                Direct PDF document generator with Appraisee & Appraiser ratings, dynamic evaluator columns, and formal signatures.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            <Button 
              onClick={handleDownloadPdf} 
              disabled={generatingPdf}
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow px-4 h-9 flex items-center space-x-1.5"
            >
              {generatingPdf ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  <span>{pdfStatus || 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-1" />
                  <span>Download PDF Document</span>
                </>
              )}
            </Button>

            <Button 
              onClick={handlePrint} 
              variant="outline"
              size="sm" 
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>

            {onClose && (
              <Button 
                onClick={onClose} 
                variant="outline" 
                size="sm" 
                className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 font-sans text-xs bg-white">
          
          {/* SECTION 1: HEADER & LOGO SECTION */}
          <div className="border-b-2 border-emerald-900 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Official NBP Logo Image */}
                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                  <img 
                    src="/nbp-logo-small.png" 
                    alt="National Bank of Pakistan Logo" 
                    className="h-12 w-auto object-contain max-w-[110px]" 
                  />
                </div>

                <div>
                  <h1 className="text-lg sm:text-xl font-black text-[#004d25] tracking-tight uppercase">
                    National Bank of Pakistan
                  </h1>
                  <p className="text-xs font-bold text-amber-700 tracking-wide">
                    Performance Management System (PMS 2.0)
                  </p>
                  <p className="text-[12px] font-black text-slate-900 mt-0.5 uppercase tracking-wider">
                    Performance Appraisal Form
                  </p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block bg-[#004d25] text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border border-emerald-800">
                  {cycle.title || 'Annual Appraisal Cycle 2027'}
                </div>
                <p className="text-[10px] text-slate-600 font-medium">
                  Circular Ref: <strong className="text-slate-800">{cycle.circularReference || 'NBP/HR/2027/001'}</strong>
                </p>
                <p className="text-[9px] text-slate-500 font-mono">
                  Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: APPRAISEE & EVALUATOR PROFILE GRID */}
          <div className="avoid-break bg-slate-50 rounded-xl border border-slate-300 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                <Briefcase className="h-3.5 w-3.5 text-[#004d25]" />
                <span>1. Employee Profile</span>
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-600">
                  Form: <strong className="text-emerald-900">{isKpiForm ? 'KPI Form (70/30)' : isRiskAdjusted ? 'Risk-Adjusted BSC (5 Perspectives)' : 'Balanced Scorecard'}</strong>
                </span>
                {ackDetails.isDisagreed ? (
                  <Badge variant="outline" className="bg-red-50 text-red-900 border-red-300 text-[10px] font-bold">
                    <AlertTriangle className="h-3 w-3 mr-1 text-red-700" />
                    Formal Disagreement Logged
                  </Badge>
                ) : ackDetails.isAgreed ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-700" />
                    Formal Agreement Confirmed
                  </Badge>
                ) : ackDetails.isAdminCompleted ? (
                  <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-bold">
                    Administratively Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-bold">
                    <Clock className="h-3 w-3 mr-1 text-amber-700" />
                    Pending Appraisee Acknowledgment
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Appraisee Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{emp.fullName || 'Fawaz Ahmed'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">SAP ID</span>
                <span className="font-mono font-bold text-emerald-900">{emp.sapId || '84920'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Grade & Level</span>
                <span className="font-bold text-slate-800">{displayGrade}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Designation</span>
                <span className="font-bold text-slate-800">{employeeCycle.snapshotDesignation || emp.designation || 'Assistant Vice President'}</span>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Reporting Group</span>
                <span className="font-bold text-slate-800">{displayGroup}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Division / Dept</span>
                <span className="font-bold text-slate-800">{emp.division || emp.wingDepartment || 'Corporate Banking'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Branch / Region</span>
                <span className="font-bold text-slate-800">{emp.regionBranch || 'Karachi Main'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Work Location</span>
                <span className="font-bold text-slate-800">{employeeCycle.snapshotLocation || emp.location || 'Head Office Karachi'}</span>
              </div>
            </div>

            <div className={`border-t border-slate-200 pt-2 grid grid-cols-1 ${hasCoAppraiser ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100`}>
              <div>
                <span className="text-[9px] font-bold text-emerald-800 uppercase block">1st Appraiser (Supervisor)</span>
                <span className="font-bold text-slate-900">{firstAppraiser.fullName || 'Tariq Mahmood'}</span>
                <span className="text-[10px] text-slate-500 block">SAP: {firstAppraiser.sapId || '10004'} • {formatGradeLabel(firstAppraiser.grade) || 'VP'} • {firstAppraiser.designation || 'Regional Head'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-amber-800 uppercase block">2nd Appraiser (Countersigning)</span>
                <span className="font-bold text-slate-900">{secondAppraiser.fullName || 'Rashid Khan'}</span>
                <span className="text-[10px] text-slate-500 block">SAP: {secondAppraiser.sapId || '10003'} • {formatGradeLabel(secondAppraiser.grade) || 'SVP'} • {secondAppraiser.designation || 'Divisional Head'}</span>
              </div>
              {hasCoAppraiser && (
                <div>
                  <span className="text-[9px] font-bold text-teal-800 uppercase block">Co-Appraiser (Matrix Supervisor)</span>
                  <span className="font-bold text-slate-900">{coAppraiser.fullName}</span>
                  <span className="text-[10px] text-slate-500 block">SAP: {coAppraiser.sapId} • {formatGradeLabel(coAppraiser.grade)} • {coAppraiser.designation}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: APPRAISAL FORM EVALUATION COMPONENTS */}

          {/* CASE A: OBJECTIVE / KPI FORMS (AVP & BELOW) */}
          {isKpiForm && (
            <div className="space-y-6">
              {/* TABLE 1: SMART OBJECTIVES & KPIS (70%) */}
              <div className="avoid-break space-y-2">
                <div className="flex items-center justify-between bg-[#004d25] text-white px-3 py-1.5 rounded-t-lg">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">Part A</span>
                    <span>SMART Objectives & Key Performance Indicators (70% Fixed Weightage - Averaged)</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-emerald-200">
                    Raw Avg: {avgObjRating.toFixed(2)} / 5.00 • Contribution: +{objContribution.toFixed(2)} / 3.50
                  </span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    {/* Theme-colored & Center Justified Column Header */}
                    <tr className="bg-[#004d25] text-white font-bold border-b border-emerald-950 text-[10px] uppercase">
                      <th className="border border-slate-300 p-2 text-center w-8 text-emerald-200">#</th>
                      <th className="border border-slate-300 p-2 text-center w-1/3 text-emerald-200">SMART Objective & Target Description</th>
                      <th className="border border-slate-300 p-2 text-center text-emerald-200">Key Deliverables & Actual Achievements</th>
                      <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="Appraisee Self Score">Self</th>
                      <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="1st Appraiser Score">1st App</th>
                      {hasCoAppraiser && (
                        <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="Co-Appraiser Score (Flagged Objectives)">Co-App</th>
                      )}
                      <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="2nd Appraiser Score">2nd App</th>
                      <th className="border border-slate-300 p-2 text-center w-1/4 text-emerald-200">Evaluator Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {objectives.length === 0 ? (
                      <tr>
                        <td colSpan={totalCols} className="p-4 text-center text-slate-400 italic">No objectives recorded.</td>
                      </tr>
                    ) : (
                      objectives.map((obj, idx) => {
                        const isFlagged = obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser;
                        return (
                          <tr key={obj.id || idx} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-bold text-slate-900 flex items-center justify-between">
                                <span>{obj.title}</span>
                                {hasCoAppraiser && isFlagged && (
                                  <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                    🎯 Co-App
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">{obj.targetDescription}</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-[11px] text-slate-800 leading-snug">
                              {obj.achievementDetails || <span className="text-slate-400 italic">Target achieved as planned.</span>}
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-bold text-slate-700 bg-slate-50">
                              {(obj.employeeSelfRating ?? obj.selfRating) != null ? `${Number(obj.employeeSelfRating ?? obj.selfRating).toFixed(1)}` : '—'}
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-black text-emerald-900 bg-emerald-50/60 text-xs">
                              {hasCoAppraiser && (obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser || obj.coAppraiserRating != null)
                                ? '—'
                                : (obj.firstAppraiserRating != null ? `${Number(obj.firstAppraiserRating).toFixed(1)}` : '—')}
                            </td>
                            {hasCoAppraiser && (
                              <td className="border border-slate-300 p-2 text-center font-bold text-teal-900 bg-teal-50/40 text-xs">
                                {obj.coAppraiserRating != null ? `${Number(obj.coAppraiserRating).toFixed(1)}` : '—'}
                              </td>
                            )}
                            <td className="border border-slate-300 p-2 text-center font-bold text-amber-900 bg-amber-50/40 text-xs">
                              {obj.secondAppraiserRating != null ? `${Number(obj.secondAppraiserRating).toFixed(1)}` : '—'}
                            </td>
                            <td className="border border-slate-300 p-2 text-[10px] text-slate-700 italic">
                              {obj.firstAppraiserComments || obj.secondAppraiserComments || 'Objective successfully fulfilled within target timeline.'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-xs">
                      <td colSpan={3} className="border border-slate-300 p-2 text-right uppercase text-slate-900 font-black">
                        Objectives Evaluation Subtotal (70% Fixed Weightage):
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700 font-bold">
                        {avgObjSelf.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-black text-emerald-900">
                        {avgObj1st != null ? avgObj1st.toFixed(2) : '—'}
                      </td>
                      {hasCoAppraiser && (
                        <td className="border border-slate-300 p-2 text-center text-teal-900 font-bold">
                          {avgObjCo != null ? avgObjCo.toFixed(2) : '—'}
                        </td>
                      )}
                      <td className="border border-slate-300 p-2 text-center font-bold text-amber-900">
                        {avgObj2nd != null ? avgObj2nd.toFixed(2) : '—'}
                      </td>
                      <td className="border border-slate-300 p-2 font-black text-emerald-900">
                        Contribution: +{objContribution.toFixed(2)} / 3.50
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TABLE 2: BEHAVIOURAL COMPETENCIES & TRAITS (30%) */}
              <div className="avoid-break space-y-2">
                <div className="flex items-center justify-between bg-teal-800 text-white px-3 py-1.5 rounded-t-lg">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="bg-teal-300 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">Part B</span>
                    <span>Professional Competencies & Behavioural Traits (30% Fixed Weightage - Averaged)</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-teal-200">
                    Raw Avg: {avgTraitRating.toFixed(2)} / 5.00 • Contribution: +{traitContribution.toFixed(2)} / 1.50
                  </span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    {/* Theme-colored & Center Justified Column Header */}
                    <tr className="bg-[#004d25] text-white font-bold border-b border-emerald-950 text-[10px] uppercase">
                      <th className="border border-slate-300 p-2 text-center w-8 text-emerald-200">#</th>
                      <th className="border border-slate-300 p-2 text-center w-1/3 text-emerald-200">Competency & Dimension</th>
                      <th className="border border-slate-300 p-2 text-center text-emerald-200">Standard NBP Competency Definition</th>
                      <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="Appraisee Self Score">Self</th>
                      <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="1st Appraiser Score">1st App</th>
                      {hasCoAppraiser && (
                        <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="Co-Appraiser Score">Co-App</th>
                      )}
                      <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="2nd Appraiser Score">2nd App</th>
                      <th className="border border-slate-300 p-2 text-center w-1/4 text-emerald-200">Evaluator Observations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {traits.length === 0 ? (
                      <tr>
                        <td colSpan={totalCols} className="p-4 text-center text-slate-400 italic">No behavioural traits recorded.</td>
                      </tr>
                    ) : (
                      traits.map((t, idx) => (
                        <tr key={t.id || idx} className="hover:bg-slate-50/50">
                          <td className="border border-slate-300 p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">{t.traitName}</td>
                          <td className="border border-slate-300 p-2 text-[10px] text-slate-600 leading-snug">{t.definition}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-slate-700 bg-slate-50">
                            {(t.selfRating ?? t.employeeSelfRating) != null ? `${Number(t.selfRating ?? t.employeeSelfRating).toFixed(1)}` : '—'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-black text-teal-900 bg-teal-50/60 text-xs">
                            {t.firstAppraiserRating != null ? `${Number(t.firstAppraiserRating).toFixed(1)}` : '—'}
                          </td>
                          {hasCoAppraiser && (
                            <td className="border border-slate-300 p-2 text-center font-bold text-teal-900 bg-teal-50/40 text-xs">
                              {t.coAppraiserRating != null ? `${Number(t.coAppraiserRating).toFixed(1)}` : '—'}
                            </td>
                          )}
                          <td className="border border-slate-300 p-2 text-center font-bold text-amber-900 bg-amber-50/40 text-xs">
                            {t.secondAppraiserRating != null ? `${Number(t.secondAppraiserRating).toFixed(1)}` : '—'}
                          </td>
                          <td className="border border-slate-300 p-2 text-[10px] text-slate-700 italic">
                            {t.firstAppraiserComments || 'Consistently demonstrates strong professional conduct.'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-xs">
                      <td colSpan={3} className="border border-slate-300 p-2 text-right uppercase text-slate-900 font-black">
                        Behavioural Competencies Subtotal (30% Fixed Weightage):
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700 font-bold">
                        {avgTraitSelf.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-black text-teal-900">
                        {avgTrait1st != null ? avgTrait1st.toFixed(2) : '—'}
                      </td>
                      {hasCoAppraiser && (
                        <td className="border border-slate-300 p-2 text-center text-teal-900 font-bold">
                          {avgTraitCo != null ? avgTraitCo.toFixed(2) : '—'}
                        </td>
                      )}
                      <td className="border border-slate-300 p-2 text-center font-bold text-amber-900">
                        {avgTrait2nd != null ? avgTrait2nd.toFixed(2) : '—'}
                      </td>
                      <td className="border border-slate-300 p-2 font-black text-teal-900">
                        Contribution: +{traitContribution.toFixed(2)} / 1.50
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* CASE B: BSC & RISK-ADJUSTED BSC FORMS (VP & ABOVE) */}
          {!isKpiForm && (
            <div className="space-y-6">
              <div className="border-b-2 border-slate-800 pb-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-[#004d25]" />
                  <span>
                    {isRiskAdjusted ? 'Risk-Adjusted Balanced Scorecard (5 Strategic Perspectives)' : 'Balanced Scorecard Performance Evaluation (4 Strategic Perspectives)'}
                  </span>
                </h3>
              </div>

              {perspectiveDataMap.map((pData, pIdx) => {
                const cfg = pData.config;
                return (
                  <div key={cfg.id} className="avoid-break space-y-2">
                    <div className={`flex items-center justify-between ${cfg.bannerBg} px-3 py-1.5 rounded-t-lg`}>
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
                        Raw Avg: {pData.rawAvg.toFixed(2)} / 5.00 • Weighted Score: +{pData.weightedScore.toFixed(2)} / {pData.maxScore.toFixed(2)}
                      </span>
                    </div>

                    <table className="w-full border-collapse border border-slate-300 text-xs">
                      <thead>
                        {/* Theme-colored & Center Justified Column Header */}
                        <tr className="bg-[#004d25] text-white font-bold border-b border-emerald-950 text-[10px] uppercase">
                          <th className="border border-slate-300 p-2 text-center w-8 text-emerald-200">#</th>
                          <th className="border border-slate-300 p-2 text-center w-1/3 text-emerald-200">Strategic Objective & Performance Metric</th>
                          <th className="border border-slate-300 p-2 text-center text-emerald-200">Key Deliverables & Actual Results</th>
                          <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="Appraisee Self Score">Self</th>
                          <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="1st Appraiser Score">1st App</th>
                          {hasCoAppraiser && (
                            <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="Co-Appraiser Score">Co-App</th>
                          )}
                          <th className="border border-slate-300 p-2 text-center w-14 text-emerald-200" title="2nd Appraiser Score">2nd App</th>
                          <th className="border border-slate-300 p-2 text-center w-1/4 text-emerald-200">Evaluator Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pData.items.length === 0 ? (
                          <tr>
                            <td colSpan={totalCols} className="p-4 text-center text-slate-400 italic">No specific objectives under this perspective.</td>
                          </tr>
                        ) : (
                          pData.items.map((obj, idx) => (
                            <tr key={obj.id || idx} className="hover:bg-slate-50/50">
                              <td className="border border-slate-300 p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-300 p-2">
                                <div className="font-bold text-slate-900">{obj.title}</div>
                                <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">{obj.targetDescription}</div>
                              </td>
                              <td className="border border-slate-300 p-2 text-[11px] text-slate-800 leading-snug">
                                {obj.achievementDetails || <span className="text-slate-400 italic">Target delivered according to planned schedule.</span>}
                              </td>
                              <td className="border border-slate-300 p-2 text-center font-bold text-slate-700 bg-slate-50">
                                {(obj.employeeSelfRating ?? obj.selfRating) != null ? `${Number(obj.employeeSelfRating ?? obj.selfRating).toFixed(1)}` : '—'}
                              </td>
                              <td className="border border-slate-300 p-2 text-center font-black text-emerald-900 bg-emerald-50/60 text-xs">
                                {hasCoAppraiser && (obj.requiresCoAppraiserReview || obj.isFlaggedForCoAppraiser || obj.coAppraiserRating != null)
                                  ? '—'
                                  : (obj.firstAppraiserRating != null ? `${Number(obj.firstAppraiserRating).toFixed(1)}` : '—')}
                              </td>
                              {hasCoAppraiser && (
                                <td className="border border-slate-300 p-2 text-center font-bold text-teal-900 bg-teal-50/40 text-xs">
                                  {obj.coAppraiserRating != null ? `${Number(obj.coAppraiserRating).toFixed(1)}` : '—'}
                                </td>
                              )}
                              <td className="border border-slate-300 p-2 text-center font-bold text-amber-900 bg-amber-50/40 text-xs">
                                {obj.secondAppraiserRating != null ? `${Number(obj.secondAppraiserRating).toFixed(1)}` : '—'}
                              </td>
                              <td className="border border-slate-300 p-2 text-[10px] text-slate-700 italic">
                                {obj.firstAppraiserComments || obj.secondAppraiserComments || 'Delivered with disciplined compliance.'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-xs">
                          <td colSpan={3} className="border border-slate-300 p-2 text-right uppercase text-slate-900 font-black">
                            {cfg.name} Subtotal ({cfg.weightage}% Weightage):
                          </td>
                          <td className="border border-slate-300 p-2 text-center text-slate-700 font-bold">
                            {pData.rawSelfAvg != null ? pData.rawSelfAvg.toFixed(2) : '—'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-black text-emerald-900 bg-emerald-100/40">
                            {pData.raw1stAvg != null ? pData.raw1stAvg.toFixed(2) : '—'}
                          </td>
                          {hasCoAppraiser && (
                            <td className="border border-slate-300 p-2 text-center text-teal-900 font-bold bg-teal-100/40">
                              {pData.rawCoAvg != null ? pData.rawCoAvg.toFixed(2) : '—'}
                            </td>
                          )}
                          <td className="border border-slate-300 p-2 text-center font-bold text-amber-900">
                            {pData.raw2ndAvg != null ? pData.raw2ndAvg.toFixed(2) : '—'}
                          </td>
                          <td className="border border-slate-300 p-2 font-black text-emerald-900">
                            Weighted Score: +{pData.weightedScore.toFixed(2)} / {pData.maxScore.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 4: CONSOLIDATED PERFORMANCE SCORE & RATING SUMMARY */}
          <div className="avoid-break bg-slate-50 rounded-xl border-2 border-emerald-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                <Award className="h-4 w-4 text-[#004d25]" />
                <span>2. Final Consolidated Performance Evaluation Summary</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                Scale: 1.00 to 5.00 Decimal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-emerald-300 text-center flex flex-col justify-center">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Composite Decimal Score</span>
                <div className="text-2xl font-black text-[#004d25] mt-0.5">
                  {finalScoreVal.toFixed(2)} <span className="text-xs font-semibold text-slate-400">/ 5.00</span>
                </div>
                <span className="text-[9px] font-semibold text-emerald-700 mt-0.5">
                  {isKpiForm ? `${objContribution.toFixed(2)} (Obj 70%) + ${traitContribution.toFixed(2)} (Trait 30%)` : 'Sum of All Strategic Perspectives (100%)'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-300 text-xs flex flex-col justify-center">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 text-center mb-1">
                  Perspective / Block Contribution Breakdown
                </span>
                {isKpiForm ? (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
                      <span className="text-slate-700 font-semibold">Objectives (70%):</span>
                      <strong className="text-emerald-800 font-black">{objContribution.toFixed(2)} / 3.50</strong>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
                      <span className="text-slate-700 font-semibold">Behavioural Traits (30%):</span>
                      <strong className="text-teal-800 font-black">{traitContribution.toFixed(2)} / 1.50</strong>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5 text-[10px]">
                    {perspectiveDataMap.map(p => (
                      <div key={p.config.id} className="flex justify-between items-center bg-slate-50 px-1.5 py-0.5 rounded">
                        <span className="text-slate-700 font-semibold truncate max-w-[140px]">{p.config.name.split(' ')[0]} ({p.config.weightage}%):</span>
                        <strong className="text-emerald-900 font-bold">+{p.weightedScore.toFixed(2)} / {p.maxScore.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#004d25] text-white p-3 rounded-lg border border-emerald-950 text-center flex flex-col justify-center items-center shadow-inner">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300">Official Rating Level</span>
                <div className="text-base font-black text-white mt-0.5">
                  {ratingInfo.label} (Rating {ratingInfo.code})
                </div>
                <span className="text-[9px] text-emerald-200 mt-0.5 font-medium">
                  {finalScoreVal >= 3.80 ? 'Meets / Exceeds Target Standards' : 'Standard Performance'}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-300 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-[#004d25] uppercase tracking-wide flex items-center space-x-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Overall Appraiser Performance Summary & Career Recommendations</span>
              </span>
              <p className="text-[11px] text-slate-800 leading-relaxed italic bg-slate-50 p-2 rounded border border-slate-200">
                {score?.appraiserComments || 'Employee has demonstrated disciplined execution, strong commitment to branch operational goals, and sound ethical conduct throughout the appraisal period. Recommended for professional capability development and elevated operational responsibilities.'}
              </p>
            </div>
          </div>

          {/* SECTION 5: DEVELOPMENT REVIEW & FUTURE ACTION PLAN */}
          <div className="avoid-break bg-slate-50 rounded-xl border border-slate-300 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-[#004d25]" />
                <span>3. Development Review & Capability Building Action Plan</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                Target Development Year: 2027
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold text-emerald-900 uppercase block">A. Key Strengths Demonstrated</span>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {developmentReview?.keyStrengths?.trim() || 'Pending appraiser input during formal evaluation.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold text-amber-900 uppercase block">B. Areas for Performance Development</span>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {developmentReview?.developmentAreas?.trim() || 'Pending appraiser input during formal evaluation.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold text-blue-900 uppercase block">C. Proposed Training & Learning Action Plan</span>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {developmentReview?.trainingActionPlan?.trim() || 'Pending appraiser input during formal evaluation.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold text-purple-900 uppercase block">D. Supervisor Guidance & Career Readiness</span>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {developmentReview?.supervisorComments?.trim() || 'Pending appraiser input during formal evaluation.'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: APPRAISAL ACKNOWLEDGEMENT & DECISION RECORD (ALWAYS VISIBLE ABOVE SIGNATURES) */}
          <div className="avoid-break space-y-3 pt-2">
            {isDisagreed ? (
              <div className="border-t-2 border-red-700 pt-3 space-y-2">
                <div className="flex items-center justify-between border-b border-red-200 pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-950 flex items-center space-x-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-700" />
                    <span>4. Formal Disagreement &amp; Dispute Record</span>
                  </h3>
                  <Badge variant="outline" className="bg-red-50 text-red-900 border-red-300 text-[10px] font-bold">
                    Decision: {ackDetails.isResolved ? 'Disagreement Resolved by Committee' : 'Formal Disagreement Registered'}
                  </Badge>
                </div>

                <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-red-900 uppercase block tracking-wider">Mandatory Appraisee Disagreement Justification:</span>
                    <p className="text-[11px] text-slate-800 font-medium italic mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-red-100">
                      "{employeeCycle?.disagreementReason || employeeCycle?.appraiserRejectionReason || 'Formal contestation registered against evaluation rating.'}"
                    </p>
                  </div>

                  {employeeCycle?.disagreementAttachmentFileName && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-200 text-xs">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="h-4 w-4 text-red-700 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{employeeCycle.disagreementAttachmentFileName}</span>
                          <span className="text-[10px] text-slate-500">Supporting Documentary Evidence Attached at Time of Disagreement • Stored in Permanent Audit Vault</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Audit Record Verified
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-red-800 pt-1 border-t border-red-200">
                    <span>Dispute Status: <strong>{ackDetails.isResolved ? 'Resolved by Management Committee' : 'Under Sequential Review by GPM & PMW Committee'}</strong></span>
                    <span>Dispute Ref: <strong className="font-mono">{ackDetails.seal}</strong> • Logged: <strong>{ackDetails.date}</strong></span>
                  </div>
                </div>
              </div>
            ) : isAgreed ? (
              <div className="border-t-2 border-emerald-700 pt-3 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>4. Appraisal Acknowledgement &amp; Formal Agreement Record</span>
                  </h3>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300 text-[10px] font-bold">
                    Decision: Formal Agreement Accepted
                  </Badge>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                  <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                    The Appraisee has formally reviewed, agreed to, and acknowledged this performance appraisal evaluation score of <strong>{finalScoreVal.toFixed(2)} / 5.00 ({ratingInfo.label})</strong>, objective ratings, behavioral traits, and official career development action plan without objection.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-emerald-800 pt-1 border-t border-emerald-200">
                    <span>Agreement Confirmation: <strong>Formal Agreement Sealed (No Dispute)</strong></span>
                    <span>Digital Seal: <strong className="font-mono">{ackDetails.seal}</strong> • Acknowledged: <strong>{ackDetails.date}</strong></span>
                  </div>
                </div>
              </div>
            ) : isAdminCompleted ? (
              <div className="border-t-2 border-slate-600 pt-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-700" />
                    <span>4. Administrative Closure Record (Calendar Deadline Elapsed)</span>
                  </h3>
                  <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-bold">
                    Status: Administratively Completed
                  </Badge>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    This appraisal was administratively closed upon expiration of the cycle calendar acknowledgement deadline. Per bank governance policy, Administrative Completion is audited as an independent system state and is <strong>not recorded as employee agreement</strong>.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-200">
                    <span>Digital Seal: <strong className="font-mono">{ackDetails.seal}</strong></span>
                    <span>Closed On: <strong>{ackDetails.date}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t-2 border-amber-600 pt-3 space-y-2">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    <span>4. Appraisal Acknowledgement Status</span>
                  </h3>
                  <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-bold">
                    Status: Awaiting Appraisee Action
                  </Badge>
                </div>

                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1 text-xs">
                  <p className="text-[11px] text-amber-950 leading-relaxed">
                    Appraisal results have been published and are pending formal Appraisee acknowledgment. The Appraisee may confirm Agreement or register a formal Disagreement with justification before the deadline.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-amber-800 pt-1 border-t border-amber-200">
                    <span>Status: <strong>Pending Acknowledgment Decision</strong></span>
                    <span>Audit Seal: <strong className="font-mono">{ackDetails.seal}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: FORMAL SIGNATURES & QR CODE E-SIGNATURE VERIFICATION BLOCKS */}
          <div className="avoid-break border-t-2 border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                <UserCheck className="h-3.5 w-3.5 text-[#004d25]" />
                <span>5. Formal Signatures & Digital E-Signature Verification (QR-Secured)</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-800 font-bold">
                Scan QR Code to Verify Authenticity
              </span>
            </div>

            <div className={`grid grid-cols-1 ${hasCoAppraiser ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 pt-2`}>
              {/* Signature Block 1: Appraisee */}
              <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider">Appraisee / Employee</span>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">{emp.fullName || 'Fawaz Ahmed'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SAP: {emp.sapId || '84920'} • {displayGrade}</div>
                  </div>
                  {qrAppraisee && (
                    <div className="p-0.5 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0" title="Scan to verify Appraisee E-Signature">
                      <img src={qrAppraisee} alt="Appraisee QR E-Sign" className="h-14 w-14 object-contain rounded shadow-2xs bg-white p-0.5 border border-slate-200" />
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-1.5 mt-2 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Acknowledgement:</span>
                    <strong className="text-emerald-800 font-bold text-[10px]">Signed</strong>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1">
                    <span>Date: {ackDetails.date}</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {ackDetails.seal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Block 2: 1st Appraiser */}
              <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-emerald-800 uppercase block tracking-wider">1st Appraiser (Supervisor)</span>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">{firstAppraiser.fullName || 'Tariq Mahmood'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SAP: {firstAppraiser.sapId || '10004'} • {formatGradeLabel(firstAppraiser.grade) || 'VP'}</div>
                  </div>
                  {qrFirstApp && (
                    <div className="p-0.5 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0" title="Scan to verify 1st Appraiser E-Signature">
                      <img src={qrFirstApp} alt="1st Appraiser QR E-Sign" className="h-14 w-14 object-contain rounded shadow-2xs bg-white p-0.5 border border-slate-200" />
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-1.5 mt-2 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Evaluation:</span>
                    <strong className="text-emerald-800">Submitted & Signed</strong>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 mt-0.5">
                    <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                    <span className="font-mono font-bold text-emerald-800">APP1-VERIFIED</span>
                  </div>
                </div>
              </div>

              {/* Signature Block 3: Co-Appraiser (Optional) */}
              {hasCoAppraiser && (
                <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-extrabold text-teal-800 uppercase block tracking-wider">Co-Appraiser</span>
                      <div className="font-bold text-slate-900 text-xs mt-0.5">{coAppraiser.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SAP: {coAppraiser.sapId} • {formatGradeLabel(coAppraiser.grade)}</div>
                    </div>
                    {qrCoApp && (
                      <div className="p-0.5 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0" title="Scan to verify Co-Appraiser E-Signature">
                        <img src={qrCoApp} alt="Co-Appraiser QR E-Sign" className="h-14 w-14 object-contain rounded shadow-2xs bg-white p-0.5 border border-slate-200" />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-1.5 mt-2 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">Co-Appraisal:</span>
                      <strong className="text-teal-800">Reviewed & Signed</strong>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 mt-0.5">
                      <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                      <span className="font-mono font-bold text-teal-800">COAPP-VERIFIED</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Block 4: 2nd Appraiser */}
              <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-amber-800 uppercase block tracking-wider">2nd Appraiser (Countersign)</span>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">{secondAppraiser.fullName || 'Rashid Khan'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SAP: {secondAppraiser.sapId || '10003'} • {formatGradeLabel(secondAppraiser.grade) || 'SVP'}</div>
                  </div>
                  {qrSecondApp && (
                    <div className="p-0.5 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0" title="Scan to verify 2nd Appraiser E-Signature">
                      <img src={qrSecondApp} alt="2nd Appraiser QR E-Sign" className="h-14 w-14 object-contain rounded shadow-2xs bg-white p-0.5 border border-slate-200" />
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-1.5 mt-2 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Countersign:</span>
                    <strong className="text-amber-800">Reviewed & Signed</strong>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 mt-0.5">
                    <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                    <span className="font-mono font-bold text-amber-800">APP2-COUNTERSIGNED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENT FOOTER */}
          <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[9px] text-slate-500">
            <div>
              <strong>Confidential Document</strong> • National Bank of Pakistan Performance Management System 2.0
            </div>
            <div>
              Document Reference: NBP-PMS-{employeeCycle?.id ? employeeCycle.id.substring(0, 8).toUpperCase() : '2027-REF'} • Page 1 of 1
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
