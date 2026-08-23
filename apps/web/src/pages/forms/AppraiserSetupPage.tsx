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
  RefreshCw,
  Lock,
  Unlock,
  RotateCcw
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

  const handleUnlockLine = async () => {
    if (!empCycle) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.unlockAppraiserLine(empCycle.id, 'admin');
      setMessage({
        text: res.message || 'Reporting line unlocked successfully. Employee can now submit a new request.',
        type: 'success'
      });
      await loadData();
    } catch (e: any) {
      setMessage({ text: e.message || 'Failed to unlock reporting line.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetLine = async () => {
    if (!empCycle) return;
    if (!window.confirm('Are you sure you want to completely reset this employee\'s appraiser line?')) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.resetAppraiserLine(empCycle.id, 'admin');
      setMessage({
        text: res.message || 'Reporting line reset successfully.',
        type: 'success'
      });
      setFirstSap('');
      setSecondSap('');
      setCoAppSap('');
      setFirstAppraiserInfo(null);
      setSecondAppraiserInfo(null);
      setCoAppraiserInfo(null);
      await loadData();
    } catch (e: any) {
      setMessage({ text: e.message || 'Failed to reset reporting line.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const validationStatus = empCycle?.appraiserValidationStatus || 'Draft';
  const isLocked = validationStatus === 'Validated';
  const isPending = validationStatus === 'PendingConfirmation';
  const isUnlocked = validationStatus === 'UnlockedForRevision';
  const isRejected = validationStatus === 'Rejected';
  const isPmwAdmin = userRole === 'PmwAdmin' || userRole === 'PmwSuperAdmin';

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
            ) : validationStatus === 'UnlockedForRevision' ? (
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/40 flex items-center space-x-1 font-bold">
                <Unlock className="h-3.5 w-3.5 text-sky-400" />
                <span>Unlocked by Admin — Re-Request Permitted</span>
              </Badge>
            ) : validationStatus === 'PendingConfirmation' ? (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 flex items-center space-x-1 font-bold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Pending Appraiser Confirmation</span>
              </Badge>
            ) : (
              <Badge className="bg-slate-500/20 text-slate-300 border-slate-400/40 flex items-center space-x-1 font-bold">
                <span>Draft / Open</span>
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

      {/* Unlocked Banner when Unlocked by Admin */}
      {isUnlocked && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-300 text-sky-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5 text-xs">
            <div className="h-10 w-10 rounded-xl bg-sky-700 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-sky-950 text-sm">Reporting Line Unlocked by PMW Admin</h4>
                <Badge className="bg-sky-200/80 text-sky-900 border-sky-400 text-[10px] font-bold">
                  Ready to Re-Submit
                </Badge>
              </div>
              <p className="text-sky-800 text-xs mt-0.5 leading-relaxed">
                Your appraisal reporting line has been unlocked by PMW Admin. You are now permitted to modify your First Appraiser, Second Appraiser, and optional Co-Appraiser selections below and submit for supervisor validation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lock Banner when Confirmed & Validated */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5 text-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-emerald-950 text-sm">Reporting Line Confirmed & Locked</h4>
                <Badge className="bg-emerald-200/80 text-emerald-900 border-emerald-400 text-[10px] font-bold">
                  Immutable
                </Badge>
              </div>
              <p className="text-emerald-800 text-xs mt-0.5 leading-relaxed">
                Your appraisal hierarchy has been validated by your supervisor and is locked to maintain audit and evaluation integrity. 
                Endusers cannot re-request modifications. If an organizational realignment is needed, please contact <strong>PMW Admin</strong> to unlock your line.
              </p>
            </div>
          </div>

          {isPmwAdmin && (
            <div className="flex items-center space-x-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-emerald-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlockLine}
                disabled={saving}
                className="text-xs font-bold border-amber-300 text-amber-950 bg-amber-50 hover:bg-amber-100 shadow-xs"
              >
                <Unlock className="h-3.5 w-3.5 mr-1 text-amber-700" />
                PMW Admin: Unlock Line
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLine}
                disabled={saving}
                className="text-xs font-bold border-rose-300 text-rose-950 bg-rose-50 hover:bg-rose-100 shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1 text-rose-700" />
                Reset Line
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pending Banner */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5 text-xs">
            <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-amber-950 text-sm">Update Request Awaiting Appraiser Confirmation</h4>
                <Badge className="bg-amber-200/80 text-amber-900 border-amber-400 text-[10px] font-bold">
                  In Review
                </Badge>
              </div>
              <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                You have already submitted an appraiser update request. Editing is disabled until your supervisor confirms or returns your request.
              </p>
            </div>
          </div>

          {isPmwAdmin && (
            <div className="flex items-center space-x-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlockLine}
                disabled={saving}
                className="text-xs font-bold border-amber-400 text-amber-950 bg-amber-100/70 hover:bg-amber-200 shadow-xs"
              >
                <Unlock className="h-3.5 w-3.5 mr-1 text-amber-700" />
                PMW Admin: Force Unlock
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main Appraiser Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. First Appraiser Card */}
        <Card className={`border-slate-200 shadow-sm flex flex-col justify-between ${isLocked ? 'bg-slate-50/50 opacity-95' : ''}`}>
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
                disabled={isLocked || isPending}
                onChange={(val) => setFirstSap(val)}
                onEmployeeSelected={(emp) => {
                  if (emp) setFirstAppraiserInfo(emp);
                }}
                placeholder={isLocked ? 'Line is locked & validated' : 'e.g. 10004 or Tariq Mahmood'}
              />
            </div>

            {/* Selected Info Preview */}
            {firstAppraiserInfo && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">{firstAppraiserInfo.fullName}</span>
                  <Badge variant="nbp" className="text-[10px] font-mono">{firstAppraiserInfo.sapId}</Badge>
                </div>
                <div className="text-slate-700 font-medium flex items-center space-x-2 text-[11px]">
                  <span>{firstAppraiserInfo.grade}</span>
                  <span>•</span>
                  <span>{firstAppraiserInfo.designation}</span>
                </div>
                <div className="text-slate-600 text-[10px] pt-0.5 space-y-0.5">
                  <div>🏢 Group: <strong>{firstAppraiserInfo.reportingGroup || 'Commercial Banking Group'}</strong></div>
                  <div>📍 Place of Posting: <strong>{firstAppraiserInfo.location || 'Head Office, Karachi'}</strong></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Second Appraiser / Supervisor Card */}
        <Card className={`border-slate-200 shadow-sm flex flex-col justify-between ${isLocked ? 'bg-slate-50/50 opacity-95' : ''}`}>
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
                disabled={isLocked || isPending}
                onChange={(val) => setSecondSap(val)}
                onEmployeeSelected={(emp) => {
                  if (emp) setSecondAppraiserInfo(emp);
                }}
                placeholder={isLocked ? 'Line is locked & validated' : 'e.g. 10003 or Rashid Khan'}
              />
            </div>

            {/* Selected Info Preview */}
            {secondAppraiserInfo && (
              <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">{secondAppraiserInfo.fullName}</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-teal-900 border-teal-400 bg-teal-100">{secondAppraiserInfo.sapId}</Badge>
                </div>
                <div className="text-slate-700 font-medium flex items-center space-x-2 text-[11px]">
                  <span>{secondAppraiserInfo.grade}</span>
                  <span>•</span>
                  <span>{secondAppraiserInfo.designation}</span>
                </div>
                <div className="text-slate-600 text-[10px] pt-0.5 space-y-0.5">
                  <div>🏢 Group: <strong>{secondAppraiserInfo.reportingGroup || 'Commercial Banking Group'}</strong></div>
                  <div>📍 Place of Posting: <strong>{secondAppraiserInfo.location || 'Head Office, Karachi'}</strong></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Optional Co-Appraiser / Project Supervisor Card */}
        <Card className={`border-slate-200 shadow-sm md:col-span-2 ${isLocked ? 'bg-slate-50/50 opacity-95' : ''}`}>
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
                  disabled={isLocked || isPending}
                  onChange={(val) => setCoAppSap(val)}
                  onEmployeeSelected={(emp) => {
                    if (emp) setCoAppraiserInfo(emp);
                  }}
                  placeholder={isLocked ? 'Line is locked & validated' : 'Optional SAP ID or Name'}
                />
              </div>

              {coAppraiserInfo ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-slate-900">{coAppraiserInfo.fullName} ({coAppraiserInfo.sapId})</div>
                  <div className="text-slate-600 text-[11px]">{coAppraiserInfo.grade} — {coAppraiserInfo.designation}</div>
                  <div className="text-slate-500 text-[10px]">
                    🏢 {coAppraiserInfo.reportingGroup} | 📍 {coAppraiserInfo.location}
                  </div>
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
          <span>
            {isLocked
              ? 'Reporting line is locked and confirmed. Modifications require PMW Admin authorization.'
              : isPending
              ? 'Request is pending supervisor review. Modifications are disabled.'
              : 'Saving sends a confirmation notification to your nominated appraisers for validation.'}
          </span>
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

          {isLocked ? (
            <div className="flex items-center space-x-2">
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs px-3 py-1.5 font-bold flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-700" />
                <span>Line Locked & Confirmed</span>
              </Badge>
            </div>
          ) : isPending ? (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              Pending Confirmation
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
