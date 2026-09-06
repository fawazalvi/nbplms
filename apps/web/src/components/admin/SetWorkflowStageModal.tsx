import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';
import { api } from '@/lib/api';
import { formatAppraisalStatus, formatGradeLabel } from '@/lib/formatters';
import {
  Shield, AlertCircle, CheckCircle2, X, RefreshCw,
  Send, AlertTriangle, Users
} from 'lucide-react';

export interface SetWorkflowStageTarget {
  id?: string;
  employeeCycleId?: string;
  sapId?: string;
  fullName?: string;
  grade?: string;
  designation?: string;
  currentStatus?: string | number;
  formType?: string;
}

interface SetWorkflowStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  target?: SetWorkflowStageTarget | null;
  bulkTargets?: SetWorkflowStageTarget[];
  cycleId?: string;
}

const STAGE_CATEGORIES = [
  {
    category: '1. Objective Setting & Approval Phase',
    stages: [
      { value: 'ObjectiveDraft', label: '1. Objective Draft (Employee Input)', desc: 'Appraisee can add/edit and save draft objectives' },
      { value: 'ObjectiveSubmitted', label: '2. Objectives Submitted (Pending Appraiser Approval)', desc: 'Submitted to 1st Appraiser for review and sign-off' },
      { value: 'ObjectiveReturned', label: '3. Objectives Returned (Needs Revision)', desc: 'Returned by Appraiser with feedback for employee revision' },
      { value: 'ObjectiveApproved', label: '4. Objectives Approved (Locked for Year)', desc: 'Objectives approved and locked until Annual Review' },
    ]
  },
  {
    category: '2. Annual Review & Evaluation Phase',
    stages: [
      { value: 'AnnualReviewSelfAssessment', label: '5. Self-Assessment (Appraisee Scoring)', desc: 'Appraisee provides self-ratings & achievement comments' },
      { value: 'FirstAppraiserAssessment', label: '6. 1st Appraiser Assessment (Primary Evaluation)', desc: '1st Appraiser rates KPIs, competencies & development review' },
      { value: 'CoAppraiserReview', label: '8. Co-Appraiser Review (Matrix Evaluation)', desc: 'Co-Appraiser evaluates flagged cross-functional objectives' },
      { value: 'SecondAppraiserReview', label: '7. 2nd Appraiser Review (Supervisor Countersign)', desc: '2nd Appraiser reviews, adjusts and countersigns evaluation' },
      { value: 'GroupPerformanceManagerReview', label: '9. GPM Review (Group Performance Governance)', desc: 'GPM reviews group calibration and bell curve alignment' },
    ]
  },
  {
    category: '3. Finalization & Publication Phase',
    stages: [
      { value: 'PmwFinalization', label: '10. PMW Finalization (Central Quality Control)', desc: 'Central PMW team review and final normalization' },
      { value: 'Published', label: '11. Results Published (Available to Appraisee)', desc: 'Final ratings visible to Appraisee for acknowledgement' },
    ]
  },
  {
    category: '4. Acknowledgement & Disagreement Phase',
    stages: [
      { value: 'EmployeeAgreed', label: '12. Employee Agreed & Acknowledged', desc: 'Appraisee formally accepted evaluation and score' },
      { value: 'EmployeeDisagreed', label: '13. Employee Disagreed (Formal Contestation)', desc: 'Appraisee recorded formal disagreement with comments' },
      { value: 'DisagreementGpmReview', label: '14. Disagreement under GPM Review', desc: 'GPM investigating disagreement with appraiser and employee' },
      { value: 'DisagreementPmwReview', label: '15. Disagreement under PMW Review', desc: 'Escalated to PMW committee for final binding resolution' },
      { value: 'DisagreementResolved', label: '16. Disagreement Resolved', desc: 'Disagreement closed with documented resolution notes' },
      { value: 'AdministrativelyCompleted', label: '17. Administratively Completed', desc: 'Cycle closed automatically after acknowledgement deadline' },
    ]
  }
];

const QUICK_JUSTIFICATIONS = [
  'Administrative workflow correction per PMW policy',
  'Supervisor requested reset for objective revision',
  'Employee reassigned / reporting line adjustment',
  'Exceptional deadline extension approved by HR',
  'Resolved review deadlock / administrative advance',
  'Fast-track appraisal progression for executive review'
];

export const SetWorkflowStageModal: React.FC<SetWorkflowStageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  target,
  bulkTargets,
  cycleId
}) => {
  const isBulk = Boolean(bulkTargets && bulkTargets.length > 0);
  const [selectedSap, setSelectedSap] = useState(target?.sapId || '');
  const [selectedEmployee, setSelectedEmployee] = useState<SetWorkflowStageTarget | null>(target || null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [resetObjectives, setResetObjectives] = useState(false);
  const [resetRatings, setResetRatings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setSelectedEmployee(target);
      setSelectedSap(target.sapId || '');
    } else {
      setSelectedEmployee(null);
      setSelectedSap('');
    }
    setTargetStatus('');
    setJustification('');
    setResetObjectives(false);
    setResetRatings(false);
    setError(null);
    setSuccessMsg(null);
  }, [target, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!targetStatus) {
      setError('Please select a target workflow stage.');
      return;
    }

    if (!justification.trim()) {
      setError('Please provide a mandatory justification for the administrative audit log.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isBulk && bulkTargets) {
        const cycleIds = bulkTargets.map(t => t.employeeCycleId).filter(Boolean) as string[];
        const sapIds = bulkTargets.map(t => t.sapId).filter(Boolean) as string[];

        const res = await api.bulkSetWorkflowStage({
          employeeCycleIds: cycleIds.length > 0 ? cycleIds : undefined,
          sapIds: cycleIds.length === 0 ? sapIds : undefined,
          targetStatus,
          justification: justification.trim(),
          actorSapId: 'PMW_ADMIN'
        });

        setSuccessMsg(res.message || `Successfully set workflow stage to ${targetStatus} for ${bulkTargets.length} employees.`);
        setTimeout(() => {
          onSuccess?.(res);
          onClose();
        }, 1200);
      } else {
        const cycleIdToUse = selectedEmployee?.employeeCycleId || undefined;
        const sapToUse = selectedEmployee?.sapId || selectedSap;

        if (!cycleIdToUse && !sapToUse) {
          setError('Please specify an employee SAP ID.');
          setLoading(false);
          return;
        }

        const res = await api.setWorkflowStage({
          employeeCycleId: cycleIdToUse,
          sapId: sapToUse,
          cycleId,
          targetStatus,
          justification: justification.trim(),
          actorSapId: 'PMW_ADMIN',
          resetObjectives,
          resetRatings
        });

        setSuccessMsg(res.message || `Appraisal stage successfully updated to ${targetStatus}.`);
        setTimeout(() => {
          onSuccess?.(res);
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      let msg = e.message || String(e);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.message) msg = parsed.message;
      } catch {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/30 p-2 flex items-center justify-center border border-purple-400/30">
              <Shield className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>Set Appraisal Workflow Stage</span>
                <Badge className="bg-purple-600 text-white text-[10px] font-bold">PMW Admin Override</Badge>
              </h3>
              <p className="text-[11px] text-purple-200 mt-0.5">
                {isBulk ? `Applying stage override to ${bulkTargets?.length} selected employees` : 'Directly transition or reset any employee appraisal workflow stage'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white transition-colors p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold flex items-center space-x-2 text-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-bold flex items-center space-x-2 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Employee Selection */}
          {!isBulk ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 block">Target Employee *</label>
              {target ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{target.fullName || target.sapId}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      SAP ID: <span className="font-mono font-bold text-slate-700">{target.sapId}</span> • {formatGradeLabel(target.grade)} • {target.designation || 'Staff'}
                    </div>
                  </div>
                  {target.currentStatus && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Current Stage</div>
                      <Badge className="bg-slate-800 text-white text-xs font-bold mt-0.5">
                        {formatAppraisalStatus(target.currentStatus)}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <SapIdAutocomplete
                    label="Search Employee by SAP ID or Name"
                    value={selectedSap}
                    onChange={(sap) => setSelectedSap(sap)}
                    onEmployeeSelected={(emp) => {
                      if (emp) {
                        setSelectedEmployee({
                          sapId: emp.sapId,
                          fullName: emp.fullName,
                          grade: emp.grade,
                          designation: emp.designation,
                          currentStatus: (emp as any).currentStatus
                        });
                      } else {
                        setSelectedEmployee(null);
                      }
                    }}
                    placeholder="Enter SAP ID (e.g. 10003, 84920) or staff name..."
                    required
                  />
                  {selectedEmployee && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs space-y-0.5">
                      <div className="font-bold text-purple-950">{selectedEmployee.fullName}</div>
                      <div className="text-[11px] text-slate-600">
                        SAP ID: <span className="font-mono font-bold">{selectedEmployee.sapId}</span> • {formatGradeLabel(selectedEmployee.grade)} • {selectedEmployee.designation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-700" />
                <span>Bulk Selection ({bulkTargets?.length} Employees)</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                {bulkTargets?.map((t, i) => (
                  <Badge key={i} variant="outline" className="bg-white border-purple-200 text-purple-900 text-[10px]">
                    {t.fullName || t.sapId} ({t.sapId})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Target Status Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Target Appraisal Workflow Stage *</span>
              <span className="text-[11px] text-purple-700 font-normal">Select the desired stage</span>
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-2xs"
            >
              <option value="">-- Choose Target Workflow Stage --</option>
              {STAGE_CATEGORIES.map((cat, idx) => (
                <optgroup key={idx} label={cat.category} className="font-bold text-purple-950">
                  {cat.stages.map((st) => (
                    <option key={st.value} value={st.value} className="text-slate-800 font-medium">
                      {st.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {targetStatus && (
              <p className="text-[11px] text-slate-500 italic pl-1">
                {STAGE_CATEGORIES.flatMap(c => c.stages).find(s => s.value === targetStatus)?.desc}
              </p>
            )}
          </div>

          {/* Reset Options (when setting back to Objective Draft or Self-Assessment) */}
          {(targetStatus === 'ObjectiveDraft' || targetStatus === 'AnnualReviewSelfAssessment') && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <span>Optional Reset Actions for Target Stage</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-700 pl-5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetObjectives}
                    onChange={(e) => setResetObjectives(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Completely clear/reset existing objective entries</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetRatings}
                    onChange={(e) => setResetRatings(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Reset all evaluator scores and ratings back to null</span>
                </label>
              </div>
            </div>
          )}

          {/* Justification & Comments */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              Administrative Justification & Reason * <span className="text-rose-500 font-bold">(Mandatory for Audit Trail)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {QUICK_JUSTIFICATIONS.map((quick, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setJustification(quick)}
                  className="px-2 py-1 rounded-md text-[10px] bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors text-left"
                >
                  + {quick}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="State the formal administrative reason for setting this appraisal stage..."
              className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Audit Notice */}
          <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-[11px] text-purple-950 flex items-start space-x-2">
            <Shield className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Governance & Audit Notice:</strong> This action will bypass standard workflow transition gates and immediately update the appraisal cycle state in the database. A permanent record will be created in the tamper-evident <span className="font-mono font-bold">AuditEvent</span> table.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !targetStatus || !justification.trim() || (!isBulk && !selectedEmployee && !target)}
            className="bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Applying Stage Override...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Apply Workflow Stage Override
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
