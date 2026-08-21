import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface ValidationErrorItem {
  id: string;
  blockTitle: string;
  fieldLabel: string;
  message: string;
}

interface ValidationSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationErrorItem[];
  onScrollToField?: (id: string) => void;
}

export const ValidationSummaryPanel: React.FC<ValidationSummaryPanelProps> = ({
  isOpen,
  onClose,
  errors,
  onScrollToField,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        <div className="bg-gradient-to-r from-red-950 via-slate-950 to-rose-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-red-700/40 p-2 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Form Validation Issues ({errors.length})</h3>
              <p className="text-[11px] text-slate-300">Resolve required items before submitting appraisal form</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs max-h-96 overflow-y-auto">
          {errors.length === 0 ? (
            <div className="p-6 text-center text-emerald-800 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
              <p className="font-bold">No Validation Errors Found!</p>
              <p className="text-[11px]">All required scores, comments, and block weightages are complete and valid.</p>
            </div>
          ) : (
            errors.map((err, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center justify-between space-x-3 hover:bg-red-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-red-900 block text-xs">{err.blockTitle}</span>
                  <p className="text-[11px] text-red-700 font-semibold">{err.message}</p>
                </div>
                {onScrollToField && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onScrollToField(err.id);
                      onClose();
                    }}
                    className="h-8 text-[11px] font-bold border-red-300 text-red-800 shrink-0"
                  >
                    Fix Issue
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Validation Summary
          </Button>
        </div>
      </div>
    </div>
  );
};
