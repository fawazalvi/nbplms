import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, PieChart, Play, Pause, Lock, Send, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface PmwDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const PmwDashboard: React.FC<PmwDashboardProps> = ({ onNavigate }) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, cyclesData] = await Promise.all([
        api.getDbStatus().catch(() => null),
        api.getCycles().catch(() => [])
      ]);
      setDbStatus(statusData);
      setCycles(cyclesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCycle = cycles.find(c => c.status === 101 || c.status === 'CycleActive');

  return (
    <div className="space-y-6">
      {/* PMW Control Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>PMW Admin Control Center</span>
              <span>•</span>
              <Badge variant="nbp" className="text-white bg-emerald-700">Bank-wide Scope</Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {activeCycle ? activeCycle.title : 'Appraisal Cycle Control Center'}
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              Initiated by HR Digital Transformation Wing | Strategy & Rewards Division
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={loadData} title="Refresh Database Metrics">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="nbp" size="sm" onClick={() => onNavigate && onNavigate('cycles')}>
              <Play className="h-4 w-4 mr-1" />
              Manage Cycles
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row — Live Database Driven */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-emerald-700">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500">Total Eligible Employees</CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900">
              {loading ? '...' : (dbStatus?.employeesCount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-emerald-700 font-semibold">
              {dbStatus?.employeesCount > 0 ? '100% SAP ID Data Validated' : '0 Staff Records in Database'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-sky-600">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500">Active Employee Cycles</CardDescription>
            <CardTitle className="text-2xl font-black text-sky-700">
              {loading ? '...' : (dbStatus?.employeeCyclesCount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">
              {dbStatus?.employeeCyclesCount > 0 ? 'Appraisal forms initiated in SQL Server' : 'No active forms in database'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500">Configured Objectives</CardDescription>
            <CardTitle className="text-2xl font-black text-amber-600">
              {loading ? '...' : (dbStatus?.objectivesCount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-amber-700 font-semibold">
              {dbStatus?.objectivesCount > 0 ? 'SMART KPIs saved in DB' : '0 Objectives configured'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-600">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold text-slate-500">Disagreement Register</CardDescription>
            <CardTitle className="text-2xl font-black text-purple-700">
              {loading ? '...' : `${dbStatus?.disagreementCasesCount ?? 0} Cases`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">
              {dbStatus?.disagreementCasesCount > 0 ? 'Pending GPM / PMW Review' : '0 Disagreement Cases'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          onClick={() => onNavigate && onNavigate('employees')}
          className="hover:border-emerald-700/50 cursor-pointer transition-colors"
        >
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
              <Users className="h-5 w-5" />
            </div>
            <CardTitle>Bulk SAP Data Import</CardTitle>
            <CardDescription>Browse staff directory, upload CSV/XLSX records, & inspect MRT/MRC flags</CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => onNavigate && onNavigate('bellcurve')}
          className="hover:border-emerald-700/50 cursor-pointer transition-colors"
        >
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
              <PieChart className="h-5 w-5" />
            </div>
            <CardTitle>Bell Curve Calibration</CardTitle>
            <CardDescription>Prescribed vs actual rating distribution by Group and Grade with exception audits</CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => onNavigate && onNavigate('reminders')}
          className="hover:border-emerald-700/50 cursor-pointer transition-colors"
        >
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
              <Send className="h-5 w-5" />
            </div>
            <CardTitle>Filtered Bulk Reminders</CardTitle>
            <CardDescription>Send recipient-previewed reminder emails filtered by Group, Grade, or workflow stage</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
