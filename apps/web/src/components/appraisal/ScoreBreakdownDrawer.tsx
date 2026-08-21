import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, X, Info, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface BlockBreakdownSummary {
  id: string;
  title: string;
  weightage: number;
  itemCount: number;
  completedCount: number;
  rawScore: number;
  weightedScore: number;
}

interface ScoreBreakdownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: BlockBreakdownSummary[];
  overallRawScore: number;
  overallWeightedScore: number;
  finalRatingLabel: string;
}

export const ScoreBreakdownDrawer: React.FC<ScoreBreakdownDrawerProps> = ({
  isOpen,
  onClose,
  blocks,
  overallRawScore,
  overallWeightedScore,
  finalRatingLabel,
}) => {
  if (!isOpen) return null;

  const totalWeightage = blocks.reduce((sum, b) => sum + b.weightage, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
              <Calculator className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Appraisal Score Calculation Breakdown</h3>
              <p className="text-[11px] text-slate-300">Detailed Block-Level Weighted Aggregation Formula</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Math Explanation Formula Box */}
        <div className="p-6 space-y-5 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Info className="h-4 w-4 text-emerald-700" />
              <span>Configured Aggregation Formula</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 font-mono text-slate-700">
              <div className="p-2 bg-white rounded border">
                <span className="text-[10px] text-slate-400 block font-sans">Step 1: Block Raw Score</span>
                <strong>Block Score = Sum(Item Scores) ÷ Item Count</strong>
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="text-[10px] text-slate-400 block font-sans">Step 2: Weighted Contribution</span>
                <strong>Weighted Score = Block Score × (Weight % ÷ 100)</strong>
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="text-[10px] text-slate-400 block font-sans">Step 3: Final Rating</span>
                <strong>Final Score = Sum(Weighted Block Scores)</strong>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Assessment Block</th>
                  <th className="p-3 text-center">Items Scored</th>
                  <th className="p-3 text-right">Raw Avg (1-5)</th>
                  <th className="p-3 text-right">Block Weight %</th>
                  <th className="p-3 text-right">Weighted Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blocks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{b.title}</td>
                    <td className="p-3 text-center font-mono">
                      {b.completedCount} / {b.itemCount}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {b.rawScore > 0 ? b.rawScore.toFixed(2) : '0.00'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-800">{b.weightage}%</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      +{b.weightedScore > 0 ? b.weightedScore.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-800">
                <tr>
                  <td className="p-3">Total Appraisal Score</td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-right font-mono text-slate-300">{overallRawScore.toFixed(2)}</td>
                  <td className="p-3 text-right text-emerald-400">{totalWeightage}%</td>
                  <td className="p-3 text-right font-mono text-emerald-300 text-sm">
                    {overallWeightedScore.toFixed(2)} / 5.00
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Final Rating Summary Result Box */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Calculated Final Rating Band</span>
                <h4 className="text-base font-extrabold text-slate-900">{finalRatingLabel}</h4>
              </div>
            </div>
            <Badge variant="nbp" className="text-sm px-3 py-1 font-black">
              {overallWeightedScore.toFixed(2)} / 5.00
            </Badge>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <Button variant="nbp" size="sm" onClick={onClose}>
            Close Score Breakdown
          </Button>
        </div>
      </div>
    </div>
  );
};
