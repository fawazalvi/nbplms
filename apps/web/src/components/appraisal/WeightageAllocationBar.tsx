import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Scale, RotateCcw, Plus, Minus, Info } from 'lucide-react';

export interface BlockWeightageConfig {
  id: string;
  title: string;
  weightage: number;
  colorClass: string;
  icon?: React.ReactNode;
}

interface WeightageAllocationBarProps {
  blocks: BlockWeightageConfig[];
  onChange: (updatedBlocks: BlockWeightageConfig[]) => void;
  readOnly?: boolean;
  onResetDefault?: () => void;
}

export const WeightageAllocationBar: React.FC<WeightageAllocationBarProps> = ({
  blocks,
  onChange,
  readOnly = false,
  onResetDefault,
}) => {
  const totalWeightage = blocks.reduce((sum, b) => sum + b.weightage, 0);
  const isValid = Math.abs(totalWeightage - 100) < 0.1;
  const isUnder = totalWeightage < 100;
  const isOver = totalWeightage > 100;

  const handleWeightChange = (id: string, newWeight: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newWeight)));
    
    // For 2-block form (KPI 70% + Behavioural Traits 30%), auto balance the other block
    if (blocks.length === 2) {
      const otherId = blocks.find((b) => b.id !== id)!.id;
      const otherWeight = Math.max(0, 100 - clamped);
      onChange(
        blocks.map((b) => {
          if (b.id === id) return { ...b, weightage: clamped };
          if (b.id === otherId) return { ...b, weightage: otherWeight };
          return b;
        })
      );
    } else {
      onChange(blocks.map((b) => (b.id === id ? { ...b, weightage: clamped } : b)));
    }
  };

  const handleAutoBalance = () => {
    if (blocks.length === 0) return;
    const equalShare = Math.floor(100 / blocks.length);
    const remainder = 100 - equalShare * blocks.length;

    onChange(
      blocks.map((b, idx) => ({
        ...b,
        weightage: equalShare + (idx === 0 ? remainder : 0),
      }))
    );
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Scale className="h-5 w-5 text-emerald-700 shrink-0" />
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-tight">Block-Level Weightage Allocation</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Individual items do not carry weightages. Allocation is assigned strictly at the block level.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isValid ? (
            <Badge variant="success" className="px-3 py-1 text-xs font-bold flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Total Allocation: 100% (Valid)</span>
            </Badge>
          ) : isUnder ? (
            <Badge variant="warning" className="px-3 py-1 text-xs font-bold flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Total: {totalWeightage}% — Allocate remaining {100 - totalWeightage}%</span>
            </Badge>
          ) : (
            <Badge variant="danger" className="px-3 py-1 text-xs font-bold flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Total: {totalWeightage}% — Reduce allocation by {totalWeightage - 100}%</span>
            </Badge>
          )}

          {!readOnly && (
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoBalance}
                className="h-8 text-xs font-bold border-slate-200 text-slate-700"
                title="Equally balance block weightages"
              >
                Auto-Balance
              </Button>
              {onResetDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onResetDefault}
                  className="h-8 w-8 text-slate-500"
                  title="Reset to default block weights"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visual Multi-Segment Allocation Bar */}
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/60">
        {blocks.map((b) => (
          <div
            key={b.id}
            style={{ width: `${Math.max(0, b.weightage)}%` }}
            className={`h-full ${b.colorClass} transition-all duration-300 relative group`}
            title={`${b.title}: ${b.weightage}%`}
          >
            <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-white/20 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Individual Block Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {blocks.map((b) => (
          <div
            key={b.id}
            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <span className={`h-3 w-3 rounded-full ${b.colorClass} shrink-0`} />
                <span className="font-bold text-xs text-slate-900 truncate">{b.title}</span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={readOnly}
                  value={b.weightage}
                  onChange={(e) => handleWeightChange(b.id, parseFloat(e.target.value) || 0)}
                  className="w-14 h-7 text-center font-extrabold text-xs bg-white border border-slate-300 rounded font-mono focus:ring-2 focus:ring-emerald-700"
                />
                <span className="font-bold text-xs text-slate-700">%</span>
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center space-x-2 pt-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleWeightChange(b.id, b.weightage - 5)}
                  className="h-6 w-6 text-slate-600"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={b.weightage}
                  onChange={(e) => handleWeightChange(b.id, parseFloat(e.target.value) || 0)}
                  className="w-full h-1.5 accent-emerald-700 cursor-pointer bg-slate-200 rounded-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleWeightChange(b.id, b.weightage + 5)}
                  className="h-6 w-6 text-slate-600"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
