import React, { useState } from 'react';
import { ScoreSelector } from './ScoreSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeartHandshake, MessageSquare, ChevronDown, ChevronUp, User, Info } from 'lucide-react';

export interface TraitItemData {
  id: string;
  name: string;
  definition: string;
  expectedBehaviour?: string;
  employeeComments?: string;
  appraiserComments?: string;
  selfRating?: number;
  appraiserRating: number;
}

interface BehaviouralTraitItemProps {
  index: number;
  data: TraitItemData;
  onChange: (updated: TraitItemData) => void;
  userRole?: string;
  readOnly?: boolean;
}

export const BehaviouralTraitItem: React.FC<BehaviouralTraitItemProps> = ({
  index,
  data,
  onChange,
  userRole = 'Employee',
  readOnly = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isAppraiser = ['EndUser', 'FirstAppraiser', 'SecondAppraiser', 'PmwAdmin', 'PmwSuperAdmin'].includes(userRole);

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center space-x-2.5">
          <span className="h-6 w-6 rounded-lg bg-teal-800 text-white font-bold text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{data.name}</h4>
            <p className="text-[11px] text-slate-500">{data.definition}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {data.appraiserRating > 0 ? (
            <Badge variant="nbp" className="text-xs font-bold">
              Rating: {data.appraiserRating} / 5
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
          {/* Expected Behaviour Guidance Box */}
          <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/70 text-xs space-y-1">
            <div className="font-bold text-teal-900 flex items-center space-x-1">
              <Info className="h-3.5 w-3.5 text-teal-700" />
              <span>Expected NBP Behavioural Competency:</span>
            </div>
            <p className="text-[11px] text-teal-900 italic">
              "{data.expectedBehaviour || 'Consistently models NBP values, ethical decision-making, and professional team conduct.'}"
            </p>
          </div>

          {/* Interactive Score Selector */}
          <ScoreSelector
            label="Appraiser Trait Rating"
            value={data.appraiserRating || null}
            onChange={(s) => onChange({ ...data, appraiserRating: s })}
            readOnly={readOnly || !isAppraiser}
            mode="segmented"
          />

          {/* Appraiser Observations */}
          <div className="space-y-1 pt-1 text-xs">
            <label className="font-bold text-slate-800 flex items-center space-x-1">
              <MessageSquare className="h-3.5 w-3.5 text-teal-700" />
              <span>Appraiser Behavioural Observations & Feedback</span>
            </label>
            <textarea
              rows={2}
              disabled={readOnly || !isAppraiser}
              value={data.appraiserComments || ''}
              onChange={(e) => onChange({ ...data, appraiserComments: e.target.value })}
              placeholder="Record specific behavioural examples or observations..."
              className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
