import React, { useState } from 'react';
import { ScoreSelector } from './ScoreSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Paperclip, ChevronDown, ChevronUp, Download } from 'lucide-react';

export interface RiskItemData {
  id: string;
  title: string;
  description: string;
  complianceTarget: string;
  actualComplianceResult: string;
  appraiserComments?: string;
  evidenceRef?: string;
  appraiserRating: number;
}

interface RiskAdjustmentItemProps {
  index: number;
  data: RiskItemData;
  onChange: (updated: RiskItemData) => void;
  onOpenEvidence?: () => void;
  onViewEvidence?: () => void;
  userRole?: string;
  readOnly?: boolean;
}

export const RiskAdjustmentItem: React.FC<RiskAdjustmentItemProps> = ({
  index,
  data,
  onChange,
  onOpenEvidence,
  onViewEvidence,
  userRole = 'Employee',
  readOnly = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isAppraiser = ['FirstAppraiser', 'SecondAppraiser', 'PmwAdmin', 'PmwSuperAdmin'].includes(userRole);

  return (
    <div className="p-4 rounded-2xl bg-white border border-rose-200/90 shadow-xs hover:shadow-sm transition-all space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-2">
        <div className="flex items-center space-x-2.5">
          <span className="h-6 w-6 rounded-lg bg-rose-800 text-white font-bold text-xs flex items-center justify-center">
            R{index + 1}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-slate-900 text-sm">{data.title}</h4>
              <Badge variant="danger" className="text-[9px] px-1.5 py-0">SBP & Risk Control</Badge>
            </div>
            <p className="text-[11px] text-slate-500">{data.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {data.evidenceRef && (
            <button
              type="button"
              onClick={onViewEvidence || onOpenEvidence}
              className="hover:opacity-85 focus:outline-none"
              title="Click to View / Download Attached Evidence"
            >
              <Badge variant="outline" className="text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-900 font-mono py-1 px-2 border-rose-300 cursor-pointer flex items-center space-x-1 shadow-2xs">
                <Paperclip className="h-3 w-3 text-rose-700 shrink-0" />
                <span className="truncate max-w-[150px] font-bold">{data.evidenceRef}</span>
                <Download className="h-2.5 w-2.5 text-rose-700 ml-1" />
              </Badge>
            </button>
          )}

          {data.appraiserRating > 0 ? (
            <Badge variant="nbp" className="text-xs font-bold">
              Score: {data.appraiserRating} / 5
            </Badge>
          ) : (
            <Badge variant="warning" className="text-xs">
              Pending Assessment
            </Badge>
          )}

          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} className="h-7 w-7 text-slate-500">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pt-1">
          {/* Target vs Actual Compliance Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="font-bold text-slate-700 block">Compliance Target & Limit:</span>
              <p className="text-[11px] text-slate-900 font-semibold">{data.complianceTarget}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-950 space-y-0.5">
              <span className="font-bold text-rose-900 block">Audit & Risk Execution Result:</span>
              <p className="text-[11px] font-semibold">{data.actualComplianceResult}</p>
            </div>
          </div>

          {/* Horizontal Score Selector */}
          <div className="flex items-center justify-between bg-rose-50/50 p-2 rounded-xl border border-rose-200">
            <span className="text-[11px] font-bold text-rose-900">Risk Score (1 = Penalty, 5 = Clean):</span>
            <ScoreSelector
              showLabel={false}
              value={data.appraiserRating || null}
              onChange={(s) => onChange({ ...data, appraiserRating: s })}
              readOnly={readOnly || !isAppraiser}
              orientation="horizontal"
              mode="horizontal"
            />
          </div>

          {/* Appraiser Risk Observations */}
          <div className="space-y-1 pt-1 text-xs">
            <label className="font-bold text-slate-800 flex items-center space-x-1">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-700" />
              <span>Risk & Audit Justification Remarks</span>
            </label>
            <textarea
              rows={2}
              disabled={readOnly || !isAppraiser}
              value={data.appraiserComments || ''}
              onChange={(e) => onChange({ ...data, appraiserComments: e.target.value })}
              placeholder="Document compliance verification notes, audit inspection findings, or risk mitigations..."
              className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-rose-100">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenEvidence}
                className="h-7 text-[11px] font-semibold border-rose-200 text-rose-900 hover:bg-rose-50"
              >
                <Paperclip className="h-3 w-3 mr-1 text-rose-700" />
                {data.evidenceRef ? 'Upload / Update Risk Evidence' : 'Attach SBP / Audit Evidence (PDF, Word, Excel)'}
              </Button>

              {data.evidenceRef && (
                <Button
                  variant="nbp"
                  size="sm"
                  onClick={onViewEvidence || onOpenEvidence}
                  className="h-7 text-[11px] font-bold"
                >
                  <Download className="h-3 w-3 mr-1" />
                  View & Download ({data.evidenceRef})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
