import React, { useState } from 'react';
import { ScoreSelector } from './ScoreSelector';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Paperclip, MessageSquare, ChevronDown, ChevronUp, Award, Download } from 'lucide-react';

export interface KPIItemData {
  id: string;
  title: string;
  targetDescription: string;
  measurementCriteria?: string;
  achievement: string;
  employeeComments?: string;
  appraiserComments?: string;
  evidenceRef?: string;
  selfRating?: number;
  appraiserRating: number;
}

interface KPIAssessmentItemProps {
  index: number;
  data: KPIItemData;
  onChange: (updated: KPIItemData) => void;
  onRemove?: () => void;
  onOpenEvidence?: () => void;
  onViewEvidence?: () => void;
  userRole?: string;
  readOnly?: boolean;
}

export const KPIAssessmentItem: React.FC<KPIAssessmentItemProps> = ({
  index,
  data,
  onChange,
  onRemove,
  onOpenEvidence,
  onViewEvidence,
  userRole = 'Employee',
  readOnly = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isAppraiser = ['EndUser', 'FirstAppraiser', 'SecondAppraiser', 'PmwAdmin', 'PmwSuperAdmin'].includes(userRole);

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-3">
      {/* Integrated KPI Title & Horizontal Scoring Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        {/* Left Side: KPI # Badge & Editable Title Input */}
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="h-7 w-7 rounded-lg bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
            #{index + 1}
          </span>
          <Input
            disabled={readOnly}
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Enter KPI / Objective Title..."
            className="font-bold text-xs bg-white h-8 border-slate-300 focus:ring-2 focus:ring-emerald-700 flex-1 min-w-[200px]"
          />
        </div>

        {/* Right Side: Clickable Evidence Badge + Horizontal Pure Numeric Scoring Buttons (1 to 5) + Badges */}
        <div className="flex items-center space-x-2 shrink-0">
          {data.evidenceRef && (
            <button
              type="button"
              onClick={onViewEvidence || onOpenEvidence}
              className="hover:opacity-85 focus:outline-none"
              title="Click to View / Download Attached Evidence"
            >
              <Badge variant="outline" className="text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-mono py-1 px-2 border-emerald-300 cursor-pointer flex items-center space-x-1 shadow-2xs">
                <Paperclip className="h-3 w-3 text-emerald-700 shrink-0" />
                <span className="truncate max-w-[150px] font-bold">{data.evidenceRef}</span>
                <Download className="h-2.5 w-2.5 text-emerald-700 ml-1" />
              </Badge>
            </button>
          )}

          {/* Horizontal Pure Numeric Scoring Selector (1-5) */}
          <div className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 mr-1">Score:</span>
            <ScoreSelector
              showLabel={false}
              value={data.appraiserRating || null}
              onChange={(s) => onChange({ ...data, appraiserRating: s })}
              readOnly={readOnly || !isAppraiser}
              orientation="horizontal"
              mode="horizontal"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 text-slate-500"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Body: Compact 2-Column Side-by-Side Target & Achievement Layout */}
      {expanded && (
        <div className="space-y-3 pt-0.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Target Description & Metrics */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1">
              <div className="flex items-center space-x-1 font-bold text-slate-800 text-[11px]">
                <Target className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Target Description & Measurement Metrics</span>
              </div>
              <textarea
                rows={3.5}
                disabled={readOnly}
                value={data.targetDescription}
                onChange={(e) => onChange({ ...data, targetDescription: e.target.value })}
                placeholder="Target details (e.g. PKR 500M with NPL < 1.5%)"
                className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            {/* Actual Achievement (Self-Assessment) */}
            <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-1">
              <div className="flex items-center space-x-1 font-bold text-emerald-900 text-[11px]">
                <Award className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Actual Annual Achievement (Self-Assessment)</span>
              </div>
              <textarea
                rows={3.5}
                disabled={readOnly}
                value={data.achievement}
                onChange={(e) => onChange({ ...data, achievement: e.target.value })}
                placeholder="Document your annual accomplishments against target..."
                className="w-full p-2 text-xs rounded-lg border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Compact Inline Comments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block mb-0.5">
                Employee Self Remarks
              </label>
              <textarea
                rows={1.5}
                disabled={readOnly}
                value={data.employeeComments || ''}
                onChange={(e) => onChange({ ...data, employeeComments: e.target.value })}
                placeholder="Optional employee comments..."
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 text-[10px] uppercase tracking-wider block mb-0.5">
                Appraiser Justification Remarks
              </label>
              <textarea
                rows={1.5}
                disabled={readOnly || !isAppraiser}
                value={data.appraiserComments || ''}
                onChange={(e) => onChange({ ...data, appraiserComments: e.target.value })}
                placeholder="Mandatory appraiser comments justifying rating..."
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Footer (Evidence Upload & View / Remove) */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenEvidence}
                className="h-7 text-[11px] font-semibold border-slate-200 text-slate-700"
              >
                <Paperclip className="h-3 w-3 mr-1 text-emerald-700" />
                {data.evidenceRef ? 'Upload / Update Evidence' : 'Attach Supporting Evidence (PDF, Word, Excel)'}
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

            {onRemove && !readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-7 text-[11px] text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                Remove KPI
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
