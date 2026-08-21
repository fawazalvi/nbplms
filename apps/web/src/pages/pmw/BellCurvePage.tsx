import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { PieChart, ShieldAlert, CheckCircle2, Sliders, RefreshCw, X, Save, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const BellCurvePage: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState('Commercial Banking Group');
  const [selectedGrade, setSelectedGrade] = useState('AVP');

  // Distribution Data State
  const [policyData, setPolicyData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Policy Config Modal State
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [targetOutstanding, setTargetOutstanding] = useState(10);
  const [targetVeryGood, setTargetVeryGood] = useState(25);
  const [targetGood, setTargetGood] = useState(50);
  const [targetNeedsImprovement, setTargetNeedsImprovement] = useState(10);
  const [targetUnsatisfactory, setTargetUnsatisfactory] = useState(5);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Exception Modal State
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [rationale, setRationale] = useState('');
  const [savingException, setSavingException] = useState(false);

  const loadDistribution = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getBellCurveDistribution(selectedGroup, selectedGrade);
      setPolicyData(data.policy);

      const formatted = (data.chartData || []).map((item: any) => ({
        rating: item.rating,
        Target: item.target ?? item.Target ?? 0,
        Actual: item.actual ?? item.Actual ?? 0,
      }));

      setChartData(formatted);

      if (data.policy) {
        setTargetOutstanding(data.policy.targetOutstandingPercentage ?? 10);
        setTargetVeryGood(data.policy.targetVeryGoodPercentage ?? 25);
        setTargetGood(data.policy.targetGoodPercentage ?? 50);
        setTargetNeedsImprovement(data.policy.targetNeedsImprovementPercentage ?? 10);
        setTargetUnsatisfactory(data.policy.targetUnsatisfactoryPercentage ?? 5);
        setRationale(data.policy.exceptionRationale || '');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistribution();
  }, [selectedGroup, selectedGrade]);

  const currentTotalPercentage = Number(targetOutstanding) + Number(targetVeryGood) + Number(targetGood) + Number(targetNeedsImprovement) + Number(targetUnsatisfactory);

  const handleSavePolicy = async () => {
    if (Math.abs(currentTotalPercentage - 100) > 0.1) {
      setErrorMessage(`Target percentages must sum to exactly 100%. Current sum is ${currentTotalPercentage}%.`);
      return;
    }

    setSavingPolicy(true);
    setErrorMessage(null);
    try {
      await api.saveBellCurvePolicy({
        group: selectedGroup,
        grade: selectedGrade,
        targetOutstanding: Number(targetOutstanding),
        targetVeryGood: Number(targetVeryGood),
        targetGood: Number(targetGood),
        targetNeedsImprovement: Number(targetNeedsImprovement),
        targetUnsatisfactory: Number(targetUnsatisfactory),
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(`Bell Curve policy target percentages updated for ${selectedGroup} (${selectedGrade}).`);
      setShowPolicyModal(false);
      await loadDistribution();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSaveException = async () => {
    if (!rationale.trim()) return;
    setSavingException(true);
    setErrorMessage(null);
    try {
      await api.approveBellCurveException({
        group: selectedGroup,
        grade: selectedGrade,
        rationale: rationale.trim(),
        actorUserId: 'PMW_ADMIN'
      });
      setMessage(`Exception rationale recorded and audited for ${selectedGroup} (${selectedGrade}).`);
      setShowExceptionModal(false);
      await loadDistribution();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    } finally {
      setSavingException(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>PMW Policy Management</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">5 Rating Levels</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Bell Curve Calibration & Distribution</h1>
          <p className="text-slate-300 text-xs mt-1">
            Configure prescribed policy target percentages and monitor rating distributions across NBP Groups & Grades.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadDistribution}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="gold" size="sm" onClick={() => setShowPolicyModal(true)}>
            <Sliders className="h-4 w-4 mr-1" />
            Configure Policy Targets
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-700 shrink-0" />
              <span>System Exception Occurred (Copyable Text):</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
          </div>
          <pre className="p-3 rounded-lg bg-white border border-red-200 font-mono text-[11px] text-red-900 whitespace-pre-wrap select-all select-text overflow-x-auto cursor-text">
            {errorMessage}
          </pre>
        </div>
      )}

      {/* Segment Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Reporting Group:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-700"
              >
                <option value="Commercial Banking Group">Commercial Banking Group</option>
                <option value="Consumer Banking Group">Consumer Banking Group</option>
                <option value="Risk Management Group">Risk Management Group</option>
                <option value="Treasury & Global Markets">Treasury & Global Markets</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Grade Band:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-700"
              >
                <option value="OG III">OG III</option>
                <option value="OG II">OG II</option>
                <option value="OG I">OG I</option>
                <option value="AVP">AVP</option>
                <option value="VP">VP</option>
                <option value="SVP">SVP</option>
              </select>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowExceptionModal(true)}>
            <ShieldAlert className="h-4 w-4 mr-1 text-amber-600" />
            Manage Exception Rationale
          </Button>
        </CardContent>
      </Card>

      {/* Visual Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Distribution Comparison Chart (%)</CardTitle>
          <CardDescription className="text-xs">
            Prescribed Policy Target vs Actual Appraisal Results for {selectedGroup} ({selectedGrade})
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 pt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading chart data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rating" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Target" fill="#94a3b8" name="Prescribed Policy Target %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#047857" name="Actual Appraisals %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Rating Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Prescribed Target vs Actual Distribution Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Rating Category</th>
                  <th className="p-3">Prescribed Target %</th>
                  <th className="p-3">Actual %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{row.rating}</td>
                    <td className="p-3 font-bold text-slate-600">{row.Target}%</td>
                    <td className="p-3 font-bold text-emerald-800">{row.Actual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Policy Target Configuration Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Sliders className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Configure Policy Target %</h3>
                  <p className="text-[11px] text-slate-300">Set rating distribution targets for {selectedGroup} ({selectedGrade})</p>
                </div>
              </div>
              <button onClick={() => setShowPolicyModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-bold">
                <span>Total Policy Percentage Sum:</span>
                <Badge variant={Math.abs(currentTotalPercentage - 100) < 0.1 ? "success" : "danger"}>
                  {currentTotalPercentage}% (Must = 100%)
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700">Outstanding Target (%)</label>
                  <Input type="number" value={targetOutstanding} onChange={(e) => setTargetOutstanding(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Very Good Target (%)</label>
                  <Input type="number" value={targetVeryGood} onChange={(e) => setTargetVeryGood(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Good Target (%)</label>
                  <Input type="number" value={targetGood} onChange={(e) => setTargetGood(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Needs Improvement Target (%)</label>
                  <Input type="number" value={targetNeedsImprovement} onChange={(e) => setTargetNeedsImprovement(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unsatisfactory Target (%)</label>
                  <Input type="number" value={targetUnsatisfactory} onChange={(e) => setTargetUnsatisfactory(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowPolicyModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleSavePolicy} disabled={savingPolicy}>
                <Save className="h-4 w-4 mr-1" />
                {savingPolicy ? 'Saving...' : 'Save Policy Targets'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Rationale Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-700/40 p-2 flex items-center justify-center border border-amber-500/30">
                  <ShieldAlert className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Audited Exception Rationale</h3>
                  <p className="text-[11px] text-slate-300">Justification for {selectedGroup} ({selectedGrade})</p>
                </div>
              </div>
              <button onClick={() => setShowExceptionModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <label className="font-bold text-slate-700">Exception Rationale (Mandatory)</label>
              <textarea
                rows={4}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Enter justification for rating distribution variance..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowExceptionModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleSaveException} disabled={savingException}>
                {savingException ? 'Saving...' : 'Approve & Audit Exception'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
