import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface EmployeeDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigate }) => {
  const [appraisalData, setAppraisalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getMyAppraisal('84920');
      setAppraisalData(data);
    } catch (e) {
      console.error(e);
      setAppraisalData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const empCycle = appraisalData?.employeeCycle;
  const employee = empCycle?.employee;
  const cycle = empCycle?.cycle;
  const objectives: any[] = appraisalData?.objectives || [];
  const firstAppraiser = empCycle?.firstAppraiser;
  const secondAppraiser = empCycle?.secondAppraiser;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 p-6 text-white shadow-lg shadow-emerald-950/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span>{cycle ? cycle.title : 'Annual Appraisal Cycle'}</span>
              <span>•</span>
              <Badge variant="warning" className="text-[10px]">
                {cycle ? cycle.status : 'Active'}
              </Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Welcome, {employee ? employee.fullName : 'Fawaz Ahmed'}
            </h1>
            <p className="text-emerald-100 text-xs mt-1">
              {employee ? `${employee.designation} (${employee.grade}) | ${employee.reportingGroup} | ${employee.regionBranch}` : 'Assistant Vice President (AVP) | Commercial Banking Group'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-right">
              <span className="text-[11px] text-emerald-200 block font-medium">Acknowledgement Deadline</span>
              <span className="text-sm font-bold text-amber-300">
                {cycle ? new Date(cycle.acknowledgementDeadline).toLocaleDateString() : '15-Dec-2026'}
              </span>
            </div>
            <Button variant="gold" size="lg" onClick={() => onNavigate && onNavigate('my-appraisal')}>
              <span>Open My Form</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid — Live DB Driven */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-700">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase">Assigned Form Type</CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900">
              {empCycle ? empCycle.assignedFormType : 'KPI & Trait Form'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">70% Objectives + 30% Behavioural Traits</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase">Current Stage</CardDescription>
            <CardTitle className="text-lg font-bold text-amber-700">
              {empCycle ? empCycle.currentStatus : 'Annual Self-Assessment'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">Workflow State in Database</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase">First Appraiser</CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900">
              {firstAppraiser ? firstAppraiser.fullName : 'Tariq Mahmood'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">{firstAppraiser ? `${firstAppraiser.grade} — ${firstAppraiser.designation}` : 'VP — Regional Head'}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase">Second Appraiser</CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900">
              {secondAppraiser ? secondAppraiser.fullName : 'Rashid Khan'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">{secondAppraiser ? `${secondAppraiser.grade} — ${secondAppraiser.designation}` : 'SVP — Group Head'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Objectives Overview — Live DB Driven */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Annual Objectives ({objectives.reduce((acc, curr) => acc + (curr.weightagePercentage || 0), 0)}% Weightage)</CardTitle>
                <CardDescription>Live database records from Microsoft SQL Server</CardDescription>
              </div>
              <Badge variant={objectives.length > 0 ? "success" : "warning"}>
                {objectives.length > 0 ? `${objectives.length} Objectives Configured` : '0 Objectives Configured'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {objectives.length > 0 ? (
                objectives.map((obj, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{obj.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Target: {obj.targetDescription}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                        {obj.weightagePercentage}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No objectives found in database. Click <strong>"Database Tools" ➔ "Seed Sample NBP Data"</strong> in the top bar to populate database records!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span>Field Encryption Active</span>
              </CardTitle>
              <CardDescription className="text-slate-300">
                Scores and confidential feedback are encrypted using AES-256-GCM application-layer encryption in SQL Server.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Need Guidance?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <p>• SMART Objectives writing guide</p>
              <p>• Rating scale definitions</p>
              <p>• HR Circular Ref: NBP/HR/2026/041</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
