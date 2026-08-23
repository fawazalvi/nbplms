import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';
import { api } from '@/lib/api';
import {
  UserCog,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Sparkles,
  ArrowRight,
  Info,
  Building2,
  GraduationCap,
  Layers,
  Save,
  RefreshCw
} from 'lucide-react';

interface AppraiserSetupPageProps {
  userRole?: string;
  onNavigate?: (tab: string) => void;
}

export const AppraiserSetupPage: React.FC<AppraiserSetupPageProps> = ({
  userRole = 'EndUser',
  onNavigate
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empCycle, setEmpCycle] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Appraiser Fields
  const [firstSap, setFirstSap] = useState('');
  const [secondSap, setSecondSap] = useState('');
  const [coAppSap, setCoAppSap] = useState('');

  // Selected Employee Info Objects (for display)
  const [firstAppraiserInfo, setFirstAppraiserInfo] = useState<any>(null);
  const [secondAppraiserInfo, setSecondAppraiserInfo] = useState<any>(null);
  const [coAppraiserInfo, setCoAppraiserInfo] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current user's active cycle
      const data = await api.getMyAppraisal('84920');
      if (data && data.employeeCycle) {
        const ec = data.employeeCycle;
        setEmpCycle(ec);

        const fSap = ec.pendingFirstAppraiserSapId || ec.firstAppraiser?.sapId || '';
        const sSap = ec.pendingSecondAppraiserSapId || ec.secondAppraiser?.sapId || '';
        const cSap = ec.pendingCoAppraiserSapId || ec.coAppraiser?.sapId || '';

        setFirstSap(fSap);
        setSecondSap(sSap);
        setCoAppSap(cSap);

        if (ec.firstAppraiser) setFirstAppraiserInfo(ec.firstAppraiser);
        if (ec.secondAppraiser) setSecondAppraiserInfo(ec.secondAppraiser);
        if (ec.coAppraiser) setCoAppraiserInfo(ec.coAppraiser);
      }
    } catch (e: any) {
      console.error('Failed to load employee appraisal line', e);
      setMessage({ text: e.message || 'Failed to load appraiser details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveAppraiserLine = async () => {
    if (!empCycle) return;
    if (!firstSap.trim()) {
      setMessage({ text: 'Please select a valid First Appraiser.', type: 'error' });
      return;
    }
    if (!secondSap.trim()) {
      setMessage({ text: 'Please select a valid Second Appraiser / Supervisor.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await api.requestAppraiserUpdate(empCycle.id, {
        firstAppraiserSapId: firstSap.trim(),
        secondAppraiserSapId: secondSap.trim(),
        coAppraiserSapId: coAppSap.trim() || undefined
      });

      setMessage({
        text: res.message || 'Appraiser line successfully requested! Your appraiser will receive a confirmation prompt.',
        type: 'success'
      });
      await loadData();
    } catch (e: any) {
      setMessage({ text: e.message || 'Failed to update appraiser line.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const validationStatus = empCycle?.appraiserValidationStatus || 'PendingConfirmation';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hero Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-mono font-bold">
                <UserCog className="h-3.5 w-3.5 mr-1" />
                ENDUSER SELF-SERVICE
              </Badge>
              <Badge className="bg-white/10 text-white border-white/20 text-xs">
                {empCycle?.cycle?.title || 'Annual Appraisal Cycle 2026'}
              </Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>My Appraiser Hierarchy & Line Setup</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Designate and verify your First Appraiser, Second Appraiser (Supervisor), and optional Co-Appraiser for performance reviews.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Validation Status Indicator Strip */}
        <div className="border-t border-white/10 mt-6 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-400 font-medium">Hierarchy Verification:</span>
            {validationStatus === 'Validated' ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 flex items-center space-x-1 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Confirmed & Validated</span>
              </Badge>
            ) : validationStatus === 'Rejected' ? (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-400/40 flex items-center space-x-1 font-bold">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Rejected — Needs Revision</span>
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 flex items-center space-x-1 font-bold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Pending Appraiser Confirmation</span>
              </Badge>
            )}
          </div>

          <div className="text-slate-300 font-mono text-[11px]">
            Employee SAP: <strong>{empCycle?.employee?.sapId || '84920'}</strong> | Grade: <strong>{empCycle?.snapshotGrade || 'AVP'}</strong>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-2.5 text-xs font-bold shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-700 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Appraiser Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. First Appraiser Card */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-sm">
                  1st
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">First Appraiser</CardTitle>
                  <CardDescription className="text-xs">Primary evaluator for SMART objectives & behavioural scoring</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-800 border-emerald-300 bg-emerald-50">
                Mandatory
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <SapIdAutocomplete
                label="First Appraiser (SAP ID or Name)"
                value={firstSap}
                onChange={(val) => setFirstSap(val)}
                onEmployeeSelected={(emp) => {
                  if (emp) setFirstAppraiserInfo(emp);
                }}
                placeholder="e.g. 10004 or Tariq Mahmood"
              />
            </div>

            {/* Selected Info Preview */}
            {firstAppraiserInfo && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">{firstAppraiserInfo.fullName}</span>
                  <Badge variant="nbp" className="text-[10px] font-mono">{firstAppraiserInfo.sapId}</Badge>
                </div>
                <div className="text-slate-600 flex items-center space-x-2 text-[11px]">
                  <span>{firstAppraiserInfo.grade}</span>
                  <span>•</span>
                  <span>{firstAppraiserInfo.designation}</span>
                </div>
                {firstAppraiserInfo.reportingGroup && (
                  <div className="text-slate-500 text-[10px] truncate">{firstAppraiserInfo.reportingGroup}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Second Appraiser / Supervisor Card */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-black text-sm">
                  2nd
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Second Appraiser (Supervisor)</CardTitle>
                  <CardDescription className="text-xs">Countersigning senior reviewer & finalization authority</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold text-teal-800 border-teal-300 bg-teal-50">
                Mandatory
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <SapIdAutocomplete
                label="Second Appraiser / Supervisor (SAP ID or Name)"
                value={secondSap}
                onChange={(val) => setSecondSap(val)}
                onEmployeeSelected={(emp) => {
                  if (emp) setSecondAppraiserInfo(emp);
                }}
                placeholder="e.g. 10003 or Rashid Khan"
              />
            </div>

            {/* Selected Info Preview */}
            {secondAppraiserInfo && (
              <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">{secondAppraiserInfo.fullName}</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-teal-900 border-teal-400 bg-teal-100">{secondAppraiserInfo.sapId}</Badge>
                </div>
                <div className="text-slate-600 flex items-center space-x-2 text-[11px]">
                  <span>{secondAppraiserInfo.grade}</span>
                  <span>•</span>
                  <span>{secondAppraiserInfo.designation}</span>
                </div>
                {secondAppraiserInfo.reportingGroup && (
                  <div className="text-slate-500 text-[10px] truncate">{secondAppraiserInfo.reportingGroup}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Optional Co-Appraiser / Project Supervisor Card */}
        <Card className="border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">
                  +
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Additional / Co-Appraiser (Optional)</CardTitle>
                  <CardDescription className="text-xs">Optional matrix/project supervisor providing supplementary feedback</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Optional
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <SapIdAutocomplete
                  label="Additional Co-Appraiser (Optional)"
                  value={coAppSap}
                  onChange={(val) => setCoAppSap(val)}
                  onEmployeeSelected={(emp) => {
                    if (emp) setCoAppraiserInfo(emp);
                  }}
                  placeholder="Optional SAP ID or Name"
                />
              </div>

              {coAppraiserInfo ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-slate-900">{coAppraiserInfo.fullName} ({coAppraiserInfo.sapId})</div>
                  <div className="text-slate-600 text-[11px]">{coAppraiserInfo.grade} — {coAppraiserInfo.designation}</div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl flex items-center text-xs text-slate-400">
                  No additional co-appraiser designated.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Action Ribbon */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <Info className="h-4 w-4 text-emerald-700 flex-shrink-0" />
          <span>Saving sends a confirmation notification to your nominated appraisers for validation.</span>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-bold"
            >
              Back to Dashboard
            </Button>
          )}

          <Button
            variant="nbp"
            size="sm"
            disabled={saving || !firstSap || !secondSap}
            onClick={handleSaveAppraiserLine}
            className="text-xs font-black h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save & Request Appraiser Confirmation'}
          </Button>
        </div>
      </div>
    </div>
  );
};
