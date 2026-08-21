import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, AlertTriangle, Calculator, Save, Send, Award } from 'lucide-react';

interface AppraisalSummaryPanelProps {
  totalItems: number;
  completedItems: number;
  totalWeightage: number;
  overallRawScore: number;
  overallWeightedScore: number;
  finalRatingLabel: string;
  validationErrorCount: number;
  isWeightValid: boolean;
  onSaveDraft: () => void;
  onSubmitForm: () => void;
  onOpenBreakdown: () => void;
  onOpenValidation: () => void;
  saving?: boolean;
  submitting?: boolean;
  readOnly?: boolean;
}

export const AppraisalSummaryPanel: React.FC<AppraisalSummaryPanelProps> = ({
  totalItems,
  completedItems,
  totalWeightage,
  overallRawScore,
  overallWeightedScore,
  finalRatingLabel,
  validationErrorCount,
  isWeightValid,
  onSaveDraft,
  onSubmitForm,
  onOpenBreakdown,
  onOpenValidation,
  saving = false,
  submitting = false,
  readOnly = false,
}) => {
  const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const canSubmit = isWeightValid && validationErrorCount === 0 && completedItems === totalItems;

  const getRatingBadgeStyle = (label: string) => {
    if (label.includes('5 — Outstanding')) {
      return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-amber-200 font-black shadow-lg shadow-amber-500/40 text-xs px-3 py-1 ring-2 ring-amber-300/80 animate-pulse';
    }
    if (label.includes('4 — Exceeds')) {
      return 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 text-slate-950 border-emerald-200 font-black shadow-md shadow-emerald-500/30 text-xs px-3 py-1 ring-2 ring-emerald-300/80';
    }
    if (label.includes('3 — Meets')) {
      return 'bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 text-slate-950 border-blue-200 font-black shadow-md shadow-blue-500/30 text-xs px-3 py-1 ring-2 ring-blue-300/80';
    }
    if (label.includes('2 — Needs')) {
      return 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 text-slate-950 border-orange-200 font-black shadow-md text-xs px-3 py-1 ring-2 ring-orange-300/80';
    }
    if (label.includes('1 — Unsatisfactory')) {
      return 'bg-gradient-to-r from-red-600 via-rose-500 to-red-700 text-white border-red-300 font-black shadow-md text-xs px-3 py-1 ring-2 ring-red-400/80';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700 font-bold text-xs px-2.5 py-0.5';
  };

  return (
    <div className="sticky top-16 z-30 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 text-white shadow-xl border border-slate-800 backdrop-blur-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Real-time Completion & Weightage Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 border-r border-slate-800 pr-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-800/60 p-2 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-white">Form Completion</span>
                <Badge variant={completionPct === 100 ? 'success' : 'warning'} className="text-[10px] py-0">
                  {completedItems} / {totalItems} Scored
                </Badge>
              </div>
              <div className="w-36 bg-slate-800 h-2 rounded-full overflow-hidden mt-1 border border-white/10">
                <div style={{ width: `${completionPct}%` }} className="bg-emerald-400 h-full transition-all duration-300" />
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-xs">
            <span className="text-slate-400 block font-medium">Block Allocation</span>
            <Badge variant={isWeightValid ? 'success' : 'danger'} className="text-[10px] font-bold">
              {totalWeightage}% / 100% Total
            </Badge>
          </div>
        </div>

        {/* Centre: Real-Time Appraisal Score & Rating Display (With High-Visibility Distinct Color Badge) */}
        <div className="flex items-center space-x-4 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 shadow-inner">
          <div>
            <span className="text-[10px] text-slate-300 block font-semibold">Raw Avg Score</span>
            <span className="text-sm font-extrabold text-white">{overallRawScore.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400"> / 5.0</span>
          </div>

          <div className="h-8 border-l border-white/10" />

          <div>
            <span className="text-[10px] text-emerald-400 block font-semibold">Weighted Final Score</span>
            <span className="text-base font-black text-emerald-300">{overallWeightedScore.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400"> / 5.00</span>
          </div>

          <div className="h-8 border-l border-white/10" />

          {/* HIGH-VISIBILITY DISTINCT COLOR RATING DISPLAY */}
          <div className="flex flex-col items-start space-y-0.5">
            <span className="text-[10px] text-amber-300 block font-black tracking-wider uppercase flex items-center space-x-1">
              <Award className="h-3 w-3 text-amber-400 inline mr-0.5" />
              <span>Overall Performance Rating</span>
            </span>
            <div className={`rounded-lg border uppercase tracking-tight flex items-center space-x-1.5 transition-all duration-300 ${getRatingBadgeStyle(finalRatingLabel)}`}>
              <span>{finalRatingLabel}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenBreakdown}
            className="h-9 text-xs font-bold bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <Calculator className="h-4 w-4 mr-1 text-emerald-400" />
            Score Breakdown
          </Button>

          {validationErrorCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenValidation}
              className="h-9 text-xs font-bold bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30"
            >
              <AlertTriangle className="h-4 w-4 mr-1 text-red-300" />
              {validationErrorCount} Issues
            </Button>
          )}

          {!readOnly && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-9 text-xs font-bold"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>

              <Button
                variant="nbp"
                size="sm"
                onClick={onSubmitForm}
                disabled={!canSubmit || submitting}
                className="h-9 text-xs font-extrabold shadow-md"
              >
                <Send className="h-4 w-4 mr-1" />
                {submitting ? 'Submitting...' : 'Submit Form'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
