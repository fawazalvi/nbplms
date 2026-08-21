import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';

interface AppraisalBlockCardProps {
  id: string;
  title: string;
  description: string;
  weightage: number;
  icon?: React.ReactNode;
  colorTheme?: 'emerald' | 'teal' | 'blue' | 'purple' | 'amber' | 'rose';
  itemCount: number;
  completedCount: number;
  rawScore: number;
  weightedScore: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isActive?: boolean;
  onSelectBlock?: () => void;
}

export const AppraisalBlockCard: React.FC<AppraisalBlockCardProps> = ({
  id,
  title,
  description,
  weightage,
  icon,
  colorTheme = 'emerald',
  itemCount,
  completedCount,
  rawScore,
  weightedScore,
  children,
  defaultExpanded = true,
  isActive = false,
  onSelectBlock,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const completionPct = itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0;
  const isFullyScored = itemCount > 0 && completedCount === itemCount;

  const colorStyles = {
    emerald: {
      headerBg: 'bg-emerald-950 text-white',
      accentText: 'text-emerald-400',
      borderActive: 'ring-2 ring-emerald-600 shadow-md',
      badgeBg: 'bg-emerald-800 text-white',
    },
    teal: {
      headerBg: 'bg-slate-900 text-white',
      accentText: 'text-teal-400',
      borderActive: 'ring-2 ring-teal-600 shadow-md',
      badgeBg: 'bg-teal-800 text-white',
    },
    blue: {
      headerBg: 'bg-slate-900 text-white',
      accentText: 'text-blue-400',
      borderActive: 'ring-2 ring-blue-600 shadow-md',
      badgeBg: 'bg-blue-800 text-white',
    },
    purple: {
      headerBg: 'bg-slate-900 text-white',
      accentText: 'text-purple-400',
      borderActive: 'ring-2 ring-purple-600 shadow-md',
      badgeBg: 'bg-purple-800 text-white',
    },
    amber: {
      headerBg: 'bg-slate-900 text-white',
      accentText: 'text-amber-400',
      borderActive: 'ring-2 ring-amber-600 shadow-md',
      badgeBg: 'bg-amber-800 text-white',
    },
    rose: {
      headerBg: 'bg-rose-950 text-white',
      accentText: 'text-rose-400',
      borderActive: 'ring-2 ring-rose-600 shadow-md',
      badgeBg: 'bg-rose-800 text-white',
    },
  }[colorTheme];

  return (
    <div
      id={`block-${id}`}
      onClick={onSelectBlock}
      className={`rounded-2xl bg-white border border-slate-200/90 overflow-hidden transition-all duration-200 ${
        isActive ? colorStyles.borderActive : 'shadow-xs hover:border-slate-300'
      }`}
    >
      {/* Header Container */}
      <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${colorStyles.headerBg}`}>
        {/* Left Side: Icon, Title, Description */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 p-2 flex items-center justify-center border border-white/10 shrink-0">
            {icon || <Layers className="h-5 w-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <Badge variant="nbp" className="text-[10px] font-bold px-2 py-0">
                {weightage}% Block Weight
              </Badge>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5 line-clamp-1">{description}</p>
          </div>
        </div>

        {/* Centre: Progress & Item Count */}
        <div className="flex items-center space-x-4 bg-white/5 p-2 rounded-xl border border-white/10">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Items Scored</span>
            <span className="text-xs font-bold text-white">
              {completedCount} / {itemCount}
            </span>
          </div>

          <div className="w-24 bg-slate-800/80 h-2 rounded-full overflow-hidden border border-white/10">
            <div
              style={{ width: `${completionPct}%` }}
              className="bg-emerald-400 h-full transition-all duration-300"
            />
          </div>

          <span className="text-xs font-bold text-emerald-400">{completionPct}%</span>
        </div>

        {/* Right Side: Score Summary & Collapse */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-300 block font-medium">Raw Avg / Weighted</span>
            <div className="flex items-center space-x-1.5 justify-end">
              <span className="text-sm font-extrabold text-white">{rawScore > 0 ? rawScore.toFixed(2) : '0.00'}</span>
              <span className="text-xs text-slate-400">/ 5.0</span>
              <span className={`text-xs font-bold ${colorStyles.accentText}`}>
                (+{weightedScore > 0 ? weightedScore.toFixed(2) : '0.00'})
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="h-8 w-8 text-white hover:bg-white/10"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Card Content Body */}
      {expanded && <div className="p-5 space-y-4 bg-slate-50/40">{children}</div>}
    </div>
  );
};
