import React, { useState } from 'react';
import { Info, Check, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface RatingOption {
  score: number;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  bgLightClass: string;
  borderClass: string;
}

export const RATING_SCALE_DEFAULTS: RatingOption[] = [
  {
    score: 1,
    label: 'Unsatisfactory',
    shortLabel: '1',
    description: 'Fails to meet minimum performance standards.',
    colorClass: 'text-red-700',
    bgLightClass: 'bg-red-50 hover:bg-red-100 text-red-900 border-red-200',
    borderClass: 'border-red-500 bg-red-600 text-white shadow-xs',
  },
  {
    score: 2,
    label: 'Needs Improvement',
    shortLabel: '2',
    description: 'Inconsistently meets targets.',
    colorClass: 'text-amber-700',
    bgLightClass: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
    borderClass: 'border-amber-500 bg-amber-500 text-white shadow-xs',
  },
  {
    score: 3,
    label: 'Meets Expectations',
    shortLabel: '3',
    description: 'Consistently meets target expectations.',
    colorClass: 'text-blue-700',
    bgLightClass: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200',
    borderClass: 'border-blue-600 bg-blue-600 text-white shadow-xs',
  },
  {
    score: 4,
    label: 'Exceeds Expectations',
    shortLabel: '4',
    description: 'Frequently surpasses targets.',
    colorClass: 'text-emerald-700',
    bgLightClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200',
    borderClass: 'border-emerald-600 bg-emerald-700 text-white shadow-xs',
  },
  {
    score: 5,
    label: 'Outstanding',
    shortLabel: '5',
    description: 'Exceptional performance consistently exceeding stretch goals.',
    colorClass: 'text-teal-700',
    bgLightClass: 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200',
    borderClass: 'border-teal-600 bg-slate-900 text-teal-300 ring-1 ring-teal-400 shadow-xs',
  },
];

interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number) => void;
  readOnly?: boolean;
  disabled?: boolean;
  mode?: 'segmented' | 'vertical' | 'horizontal';
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  showLabel?: boolean;
  required?: boolean;
  error?: string;
  ratings?: RatingOption[];
}

export const ScoreSelector: React.FC<ScoreSelectorProps> = ({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  mode = 'horizontal',
  orientation = 'horizontal',
  label = 'Score',
  showLabel = true,
  required = false,
  error,
  ratings = RATING_SCALE_DEFAULTS,
}) => {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedRating = ratings.find((r) => r.score === value);
  const activeHoverRating = ratings.find((r) => r.score === hoveredScore);
  const displayedRating = activeHoverRating || selectedRating;

  const isHorizontal = orientation === 'horizontal' || mode === 'horizontal';

  // Handle keyboard navigation (1-5 keys)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly || disabled) return;
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-1 select-none" onKeyDown={handleKeyDown} tabIndex={readOnly || disabled ? -1 : 0}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
            <span>{label}</span>
            {required && <span className="text-red-500 font-bold">*</span>}
            <button
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-slate-400 hover:text-emerald-700 focus:outline-none"
              title="Rating Scale Guidance"
            >
              <HelpCircle className="h-3 w-3" />
            </button>
          </label>

          {selectedRating ? (
            <Badge variant="nbp" className="text-[10px] font-bold px-1.5 py-0">
              {selectedRating.score} — {selectedRating.label}
            </Badge>
          ) : (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0 rounded border border-amber-200">
              Pending Score
            </span>
          )}
        </div>
      )}

      {/* Tooltip Guidance */}
      {showTooltip && (
        <div className="p-2 rounded-xl bg-slate-900 text-slate-200 text-[11px] space-y-1 border border-slate-800">
          <div className="font-bold text-emerald-400 flex items-center space-x-1">
            <Info className="h-3 w-3" />
            <span>NBP Rating Scale Guidance (1 to 5)</span>
          </div>
          <div className="space-y-0.5 pt-0.5 text-[10px]">
            {ratings.map((r) => (
              <div key={r.score} className="flex items-center justify-between p-1 rounded bg-slate-800">
                <span className="font-bold text-white">{r.score} — {r.label}</span>
                <span className="text-slate-400 italic">{r.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pure Numeric Buttons (Horizontal or Vertical) */}
      <div
        className={
          isHorizontal
            ? 'flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200'
            : 'space-y-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200'
        }
      >
        {ratings.map((r) => {
          const isSelected = value === r.score;
          const isHovered = hoveredScore === r.score;

          return (
            <button
              key={r.score}
              type="button"
              disabled={readOnly || disabled}
              onClick={() => onChange(r.score)}
              onMouseEnter={() => setHoveredScore(r.score)}
              onMouseLeave={() => setHoveredScore(null)}
              className={`${
                isHorizontal ? 'h-7 w-7' : 'w-full h-8'
              } flex items-center justify-center rounded-lg font-black text-xs transition-all duration-150 border ${
                isSelected
                  ? r.borderClass
                  : isHovered
                  ? `${r.bgLightClass} ring-1`
                  : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50'
              } ${readOnly || disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
              title={`${r.score} — ${r.label}`}
            >
              <span>{r.score}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-[10px] font-bold text-red-600">⚠️ {error}</p>}
    </div>
  );
};
