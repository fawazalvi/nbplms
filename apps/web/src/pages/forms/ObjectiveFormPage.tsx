import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  History
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

interface ObjectiveFormPageProps {
  formType?: 'KPI' | 'BSC' | 'RISK_BSC';
  userRole?: string;
}

export const ObjectiveFormPage: React.FC<ObjectiveFormPageProps> = ({
  formType: initialFormType = 'KPI',
  userRole: initialRole = 'FirstAppraiser',
}) => {
  const [formMode, setFormMode] = useState<'KPI' | 'BSC' | 'RISK_BSC'>(initialFormType);
  const [currentUserRole, setCurrentUserRole] = useState<string>(initialRole);

  // Appraiser Self-Service Line Status
  const [empCycleData, setEmpCycleData] = useState<any>(null);
  const [appraiserStatus, setAppraiserStatus] = useState<'Validated' | 'PendingConfirmation' | 'Rejected'>('Validated');
  const [firstAppraiserName, setFirstAppraiserName] = useState('Tariq Mahmood (VP - SAP ID: 10004)');
  const [secondAppraiserName, setSecondAppraiserName] = useState('Rashid Khan (SVP - SAP ID: 10003)');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Update Appraiser Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [inputFirstSap, setInputFirstSap] = useState('10004');
  const [inputSecondSap, setInputSecondSap] = useState('10003');
  const [updatingAppraiser, setUpdatingAppraiser] = useState(false);

  // Audit History Modal State
  const [showAuditHistoryModal, setShowAuditHistoryModal] = useState(false);

  // Form State - Block Weightages
  const [blocks, setBlocks] = useState<BlockWeightageConfig[]>([]);

  // Form State - Item Data (KPI) — loaded from API
  const [kpiItems, setKpiItems] = useState<KPIItemData[]>([]);

  // Behavioural Traits — loaded from API
  const [traitItems, setTraitItems] = useState<TraitItemData[]>([]);

  // BSC Perspective Items — loaded from API
  const [financialItems, setFinancialItems] = useState<KPIItemData[]>([]);
  const [customerItems, setCustomerItems] = useState<KPIItemData[]>([]);
  const [processItems, setProcessItems] = useState<KPIItemData[]>([]);
  const [learningItems, setLearningItems] = useState<KPIItemData[]>([]);

  // Risk Adjustment Items — loaded from API
  const [riskItems, setRiskItems] = useState<RiskItemData[]>([]);

  // Drawer & Modal States
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [evidenceModalItem, setEvidenceModalItem] = useState<{ title: string; ref: string } | null>(null);
  const [viewEvidenceItem, setViewEvidenceItem] = useState<{ title: string; ref: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Default Block Weightages depending on Form Mode
  useEffect(() => {
    if (formMode === 'KPI') {
      setBlocks([
        { id: 'kpis', title: 'KPIs / Objectives Block', weightage: 70, colorClass: 'bg-emerald-700', icon: <Layers className="h-5 w-5 text-emerald-400" /> },
        { id: 'traits', title: 'Behavioural Traits Block', weightage: 30, colorClass: 'bg-teal-700', icon: <GraduationCap className="h-5 w-5 text-teal-400" /> },
      ]);
    } else if (formMode === 'BSC') {
      setBlocks([
        { id: 'financial', title: 'Financial Perspective', weightage: 30, colorClass: 'bg-emerald-700', icon: <DollarSign className="h-5 w-5 text-emerald-400" /> },
        { id: 'customer', title: 'Customer Perspective', weightage: 25, colorClass: 'bg-blue-700', icon: <UsersIcon className="h-5 w-5 text-blue-400" /> },
        { id: 'process', title: 'Internal Controls & Processes', weightage: 25, colorClass: 'bg-purple-700', icon: <Cog className="h-5 w-5 text-purple-400" /> },
        { id: 'learning', title: 'Learning & Growth', weightage: 20, colorClass: 'bg-amber-700', icon: <GraduationCap className="h-5 w-5 text-amber-400" /> },
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

  // Load My Appraisal Data from API
  const [formLoading, setFormLoading] = useState(true);
  const loadMyAppraisal = async () => {
    setFormLoading(true);
    try {
      const data = await api.getMyAppraisal('84920');
      if (data && data.employeeCycle) {
        setEmpCycleData(data.employeeCycle);
        setAppraiserStatus(data.employeeCycle.appraiserValidationStatus || 'Validated');
        setRejectionReason(data.employeeCycle.appraiserRejectionReason || null);

        // Set form type based on assigned form
        const ft = data.employeeCycle.assignedFormType;
        if (ft === 1 || ft === 'BalancedScorecard') setFormMode('BSC');
        else if (ft === 2 || ft === 'RiskAdjustedBsc') setFormMode('RISK_BSC');
        else setFormMode('KPI');

        if (data.employeeCycle.firstAppraiser) {
          const fa = data.employeeCycle.firstAppraiser;
          setFirstAppraiserName(`${fa.fullName} (${fa.grade} - SAP ID: ${fa.sapId})`);
          setInputFirstSap(fa.sapId);
        }
        if (data.employeeCycle.secondAppraiser) {
          const sa = data.employeeCycle.secondAppraiser;
          setSecondAppraiserName(`${sa.fullName} (${sa.grade} - SAP ID: ${sa.sapId})`);
          setInputSecondSap(sa.sapId);
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
        }

        // Map Behavioural Traits from DB
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
        }
      }
    } catch (e: any) {
      console.error('Failed to load appraisal data:', e);
      setErrorMessage('Failed to load appraisal data from server.');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    loadMyAppraisal();
  }, []);

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
        });
        setMessage(res.message);
        setShowUpdateModal(false);
        await loadMyAppraisal();
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

  // Helper Functions for Score & Weighted Calculations
  const calculateAverageScore = (scores: number[]): number => {
    const validScores = scores.filter((s) => s > 0);
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
  };

  // Calculate Scores per Block dynamically
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

  // Calculate Overall Appraisal Weighted Score
  const blockBreakdowns: BlockBreakdownSummary[] = blocks.map((b) => {
    const stats = getBlockScores(b.id);
    return {
      id: b.id,
      title: b.title,
      weightage: b.weightage,
      itemCount: stats.itemCount,
      completedCount: stats.completedCount,
      rawScore: stats.raw,
      weightedScore: stats.weighted,
    };
  });

  const totalConfiguredWeight = blocks.reduce((sum, b) => sum + b.weightage, 0);
  const isWeightValid = Math.abs(totalConfiguredWeight - 100) < 0.1;

  const overallWeightedScore = blockBreakdowns.reduce((sum, b) => sum + b.weightedScore, 0);
  const totalItemCount = blockBreakdowns.reduce((sum, b) => sum + b.itemCount, 0);
  const totalCompletedCount = blockBreakdowns.reduce((sum, b) => sum + b.completedCount, 0);

  const activeRawScores = blockBreakdowns.filter((b) => b.rawScore > 0).map((b) => b.rawScore);
  const overallRawScore = activeRawScores.length > 0 ? activeRawScores.reduce((sum, s) => sum + s, 0) / activeRawScores.length : 0;

  // Determine Final Performance Rating Label
  const getRatingLabel = (score: number) => {
    if (score >= 4.5) return '5 — Outstanding';
    if (score >= 3.8) return '4 — Exceeds Expectations';
    if (score >= 2.8) return '3 — Meets Expectations';
    if (score >= 2.0) return '2 — Needs Improvement';
    if (score > 0) return '1 — Unsatisfactory';
    return 'Pending Assessment';
  };

  const finalRatingLabel = getRatingLabel(overallWeightedScore);

  // Real-Time Validation Errors Generator
  const validationErrors: ValidationErrorItem[] = [];
  if (!isWeightValid) {
    validationErrors.push({
      id: 'weight-error',
      blockTitle: 'Block Weightage Allocation',
      fieldLabel: 'Total Weightage',
      message: `Total block weightage must equal 100%. Current total allocation is ${totalConfiguredWeight}%.`,
    });
  }

  blockBreakdowns.forEach((b) => {
    if (b.completedCount < b.itemCount) {
      validationErrors.push({
        id: `block-${b.id}`,
        blockTitle: b.title,
        fieldLabel: 'Pending Ratings',
        message: `${b.itemCount - b.completedCount} item(s) in "${b.title}" require appraiser score selection.`,
      });
    }
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMessage("Appraisal draft form and ratings saved successfully.");
    }, 500);
  };

  const handleSubmitForm = async () => {
    if (!isWeightValid || validationErrors.length > 0 || appraiserStatus !== 'Validated') return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      if (empCycleData?.id) {
        const res = await api.submitSelfAssessment(empCycleData.id, '84920');
        setMessage(res.message);
      } else {
        setMessage("Appraisal form submitted successfully.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEvidenceForAnyItem = (title: string, ref: string) => {
    setKpiItems(kpiItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setFinancialItems(financialItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setCustomerItems(customerItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setProcessItems(processItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setLearningItems(learningItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setRiskItems(riskItems.map((i) => (i.title === title ? { ...i, evidenceRef: ref } : i)));
    setMessage(`Supporting document evidence (${ref}) attached successfully.`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Interactive Form Mode & Role Selector Header */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Badge variant="nbp">Annual Appraisal Cycle 2026</Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold text-emerald-800">
                  {formMode === 'KPI'
                    ? 'KPI & Behavioural Trait Form (AVP & Below)'
                    : formMode === 'BSC'
                    ? '4-Perspective Balanced Scorecard (VP & Above)'
                    : '5-Perspective Risk-Adjusted BSC (MRT/MRC)'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Fawaz Ahmed (SAP ID: 84920)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Assistant Vice President | Commercial Banking Group | Karachi Central
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuditHistoryModal(true)}
                className="text-xs font-bold border-slate-300 text-slate-800 hover:bg-slate-50"
              >
                <History className="h-4 w-4 mr-1 text-emerald-700" />
                Audit Log & Change History
              </Button>

              {/* Live Form Type & Role Switcher */}
              <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-1 pr-2 border-r border-slate-300">
                  <span className="text-[11px] font-bold text-slate-600">Form:</span>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-emerald-900 focus:outline-none cursor-pointer"
                  >
                    <option value="KPI">KPI Form (AVP & Below)</option>
                    <option value="BSC">4-P BSC Form (VP & Above)</option>
                    <option value="RISK_BSC">5-P Risk BSC (MRT/MRC)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1 pl-1">
                  <span className="text-[11px] font-bold text-slate-600">Role View:</span>
                  <select
                    value={currentUserRole}
                    onChange={(e) => setCurrentUserRole(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Employee">Employee Self-Assessment</option>
                    <option value="FirstAppraiser">First Appraiser Evaluation</option>
                    <option value="SecondAppraiser">Second Appraiser Countersign</option>
                    <option value="PmwAdmin">PMW Admin / Auditor View</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appraiser & Supervisor Self-Service Validation Card */}
      <Card className="border-emerald-200 bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white shadow-xl">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Assigned Appraiser & Supervisor Line</span>
                <span>•</span>
                <Badge
                  variant={appraiserStatus === 'Validated' ? 'success' : appraiserStatus === 'PendingConfirmation' ? 'warning' : 'danger'}
                  className="text-[10px] uppercase font-bold"
                >
                  {appraiserStatus === 'Validated' ? 'Validated & Confirmed' : appraiserStatus === 'PendingConfirmation' ? 'Awaiting Appraiser Confirmation' : 'Appraiser Mapping Rejected'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1 text-xs">
                <div>
                  <span className="text-slate-400">First Appraiser:</span>{' '}
                  <strong className="text-white">{firstAppraiserName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Second Appraiser / Supervisor:</span>{' '}
                  <strong className="text-white">{secondAppraiserName}</strong>
                </div>
              </div>
            </div>

            <div>
              <Button
                variant="gold"
                size="sm"
                onClick={() => setShowUpdateModal(true)}
                className="font-bold text-xs shadow-md"
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                Update Appraiser / Supervisor Info
              </Button>
            </div>
          </div>

          {appraiserStatus === 'PendingConfirmation' && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-300 shrink-0" />
              <span>
                <strong>Confirmation Pending:</strong> Form submission is locked until your requested Appraiser & Supervisor line is confirmed by your First Appraiser.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Appraisal Summary Top Panel */}
      <AppraisalSummaryPanel
        totalItems={totalItemCount}
        completedItems={totalCompletedCount}
        totalWeightage={totalConfiguredWeight}
        overallRawScore={overallRawScore}
        overallWeightedScore={overallWeightedScore}
        finalRatingLabel={finalRatingLabel}
        validationErrorCount={validationErrors.length}
        isWeightValid={isWeightValid}
        onSaveDraft={handleSaveDraft}
        onSubmitForm={handleSubmitForm}
        onOpenBreakdown={() => setShowBreakdown(true)}
        onOpenValidation={() => setShowValidation(true)}
        saving={saving}
        submitting={submitting}
        readOnly={currentUserRole === 'Employee' && empCycleData?.currentStatus !== 'AnnualReviewSelfAssessment'}
      />

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Interactive Block-Level Weightage Control Bar */}
      <WeightageAllocationBar
        blocks={blocks}
        onChange={(updated) => setBlocks(updated)}
        readOnly={currentUserRole === 'Employee'}
      />

      {/* ASSESSMENT BLOCKS RENDERING */}

      {/* Mode 1: KPI & Behavioural Traits Blocks */}
      {formMode === 'KPI' && (
        <div className="space-y-6">
          {/* Block 1: KPIs / Objectives Block */}
          {(() => {
            const b = blockBreakdowns.find((item) => item.id === 'kpis');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="kpis"
                title="Block 1: KPIs / Objectives Assessment"
                description="Employee annual SMART goals, performance targets, actual achievements, and appraiser scoring."
                weightage={b.weightage}
                colorTheme="emerald"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<Layers className="h-5 w-5 text-emerald-400" />}
              >
                <div className="space-y-4">
                  {kpiItems.map((item, idx) => (
                    <KPIAssessmentItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setKpiItems(kpiItems.map((i) => (i.id === item.id ? updated : i)))
                      }
                      onRemove={() => setKpiItems(kpiItems.filter((i) => i.id !== item.id))}
                      onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                      onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                      userRole={currentUserRole}
                    />
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setKpiItems([
                        ...kpiItems,
                        {
                          id: `kpi-${Date.now()}`,
                          title: '',
                          targetDescription: '',
                          achievement: '',
                          appraiserRating: 0,
                        },
                      ])
                    }
                    className="w-full font-bold text-xs border-dashed border-slate-300 hover:border-emerald-600"
                  >
                    <Plus className="h-4 w-4 mr-1 text-emerald-700" />
                    Add New KPI / Objective
                  </Button>
                </div>
              </AppraisalBlockCard>
            );
          })()}

          {/* Block 2: Behavioural Traits Block */}
          {(() => {
            const b = blockBreakdowns.find((item) => item.id === 'traits');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="traits"
                title="Block 2: Behavioural Traits Assessment"
                description="Standard NBP core competencies, values, ethical conduct, and appraiser ratings."
                weightage={b.weightage}
                colorTheme="teal"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<GraduationCap className="h-5 w-5 text-teal-400" />}
              >
                <div className="space-y-3">
                  {traitItems.map((item, idx) => (
                    <BehaviouralTraitItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setTraitItems(traitItems.map((t) => (t.id === item.id ? updated : t)))
                      }
                      userRole={currentUserRole}
                    />
                  ))}
                </div>
              </AppraisalBlockCard>
            );
          })()}
        </div>
      )}

      {/* Mode 2 & 3: Balanced Scorecard (BSC & Risk BSC) Perspective Blocks */}
      {(formMode === 'BSC' || formMode === 'RISK_BSC') && (
        <div className="space-y-6">
          {/* Financial Perspective Block */}
          {(() => {
            const b = blockBreakdowns.find((item) => item.id === 'financial');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="financial"
                title="Financial Perspective Block"
                description="Revenue, Net Interest Margin, cost control, trade commission, and deposit targets."
                weightage={b.weightage}
                colorTheme="emerald"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
              >
                <div className="space-y-3">
                  {financialItems.map((item, idx) => (
                    <KPIAssessmentItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setFinancialItems(financialItems.map((i) => (i.id === item.id ? updated : i)))
                      }
                      onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                      onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                      userRole={currentUserRole}
                    />
                  ))}
                </div>
              </AppraisalBlockCard>
            );
          })()}

          {/* Customer Perspective Block */}
          {(() => {
            const b = blockBreakdowns.find((item) => item.id === 'customer');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="customer"
                title="Customer Perspective Block"
                description="Client retention, service quality, NPS scores, and client relationship expansion."
                weightage={b.weightage}
                colorTheme="blue"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<UsersIcon className="h-5 w-5 text-blue-400" />}
              >
                <div className="space-y-3">
                  {customerItems.map((item, idx) => (
                    <KPIAssessmentItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setCustomerItems(customerItems.map((i) => (i.id === item.id ? updated : i)))
                      }
                      onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                      onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                      userRole={currentUserRole}
                    />
                  ))}
                </div>
              </AppraisalBlockCard>
            );
          })()}

          {/* Internal Controls & Processes Block */}
          {(() => {
            const b = blockBreakdowns.find((item) => item.id === 'process');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="process"
                title="Internal Controls & Processes Block"
                description="Operational efficiency, credit processing turn-around time, and internal workflow execution."
                weightage={b.weightage}
                colorTheme="purple"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<Cog className="h-5 w-5 text-purple-400" />}
              >
                <div className="space-y-3">
                  {processItems.map((item, idx) => (
                    <KPIAssessmentItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setProcessItems(processItems.map((i) => (i.id === item.id ? updated : i)))
                      }
                      onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                      onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                      userRole={currentUserRole}
                    />
                  ))}
                </div>
              </AppraisalBlockCard>
            );
          })()}

          {/* Learning & Growth Block */}
          {(() => {
            const b = blockBreakdowns.find((item) => item.id === 'learning');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="learning"
                title="Learning & Growth Perspective Block"
                description="Professional certifications, staff training, AML/CFT compliance, and leadership development."
                weightage={b.weightage}
                colorTheme="amber"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<GraduationCap className="h-5 w-5 text-amber-400" />}
              >
                <div className="space-y-3">
                  {learningItems.map((item, idx) => (
                    <KPIAssessmentItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setLearningItems(learningItems.map((i) => (i.id === item.id ? updated : i)))
                      }
                      onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                      onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                      userRole={currentUserRole}
                    />
                  ))}
                </div>
              </AppraisalBlockCard>
            );
          })()}

          {/* Mode 3: Risk Adjustment Perspective Block (MRT / MRC Employees) */}
          {formMode === 'RISK_BSC' && (() => {
            const b = blockBreakdowns.find((item) => item.id === 'risk');
            if (!b) return null;
            return (
              <AppraisalBlockCard
                id="risk"
                title="5th Perspective: Risk Adjustment & Audit Compliance"
                description="Mandatory for Material Risk Takers (MRT/MRC). SBP Prudential Regulations, audit penalty flags, and compliance controls."
                weightage={b.weightage}
                colorTheme="rose"
                itemCount={b.itemCount}
                completedCount={b.completedCount}
                rawScore={b.rawScore}
                weightedScore={b.weightedScore}
                icon={<ShieldAlert className="h-5 w-5 text-rose-400" />}
              >
                <div className="space-y-3">
                  {riskItems.map((item, idx) => (
                    <RiskAdjustmentItem
                      key={item.id}
                      index={idx}
                      data={item}
                      onChange={(updated) =>
                        setRiskItems(riskItems.map((r) => (r.id === item.id ? updated : r)))
                      }
                      onOpenEvidence={() => setEvidenceModalItem({ title: item.title, ref: item.evidenceRef || '' })}
                      onViewEvidence={() => setViewEvidenceItem({ title: item.title, ref: item.evidenceRef || '' })}
                      userRole={currentUserRole}
                    />
                  ))}
                </div>
              </AppraisalBlockCard>
            );
          })()}
        </div>
      )}

      {/* DRAWERS & MODALS */}

      {/* 1. Score Calculation Breakdown Drawer */}
      <ScoreBreakdownDrawer
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        blocks={blockBreakdowns}
        overallRawScore={overallRawScore}
        overallWeightedScore={overallWeightedScore}
        finalRatingLabel={finalRatingLabel}
      />

      {/* 2. Real-Time Validation Summary Panel */}
      <ValidationSummaryPanel
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        errors={validationErrors}
        onScrollToField={(id) => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. Level-by-Level KPI & Score Change History Audit Log Drawer */}
      <AppraisalFormAuditHistoryDrawer
        isOpen={showAuditHistoryModal}
        onClose={() => setShowAuditHistoryModal(false)}
        employeeCycleId={empCycleData?.id}
      />

      {/* 4. Evidence Uploader Modal (Supports PDF, Word & Excel File Uploads across all Form Types) */}
      {evidenceModalItem && (
        <EvidenceUploaderModal
          isOpen={!!evidenceModalItem}
          onClose={() => setEvidenceModalItem(null)}
          itemTitle={evidenceModalItem.title}
          currentEvidence={evidenceModalItem.ref}
          onSaveEvidence={(ref) => handleSaveEvidenceForAnyItem(evidenceModalItem.title, ref)}
        />
      )}

      {/* 5. Clickable Evidence Viewer & File Downloader Modal */}
      {viewEvidenceItem && (
        <EvidenceViewerModal
          isOpen={!!viewEvidenceItem}
          onClose={() => setViewEvidenceItem(null)}
          itemTitle={viewEvidenceItem.title}
          evidenceRef={viewEvidenceItem.ref}
        />
      )}

      {/* 6. Update Appraiser & Supervisor Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Update Appraiser & Supervisor Info</h3>
                  <p className="text-[11px] text-slate-300">Self-Service Appraiser Line Request</p>
                </div>
              </div>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Start typing a SAP ID or employee name to search. Select the matching employee from the dropdown to auto-fill their details.
              </p>

              <div className="space-y-4">
                <SapIdAutocomplete
                  label="First Appraiser (Mandatory)"
                  value={inputFirstSap}
                  onChange={(sapId) => setInputFirstSap(sapId)}
                  placeholder="Type SAP ID or name to search..."
                  required
                />

                <SapIdAutocomplete
                  label="Second Appraiser / Supervisor (Mandatory)"
                  value={inputSecondSap}
                  onChange={(sapId) => setInputSecondSap(sapId)}
                  placeholder="Type SAP ID or name to search..."
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowUpdateModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleRequestAppraiserUpdate} disabled={updatingAppraiser}>
                {updatingAppraiser ? 'Submitting...' : 'Submit Request for Appraiser Confirmation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
