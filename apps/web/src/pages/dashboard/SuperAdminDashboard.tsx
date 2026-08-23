import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, UserCog, Building2, Lock, Activity, RefreshCw, KeyRound, Server, Mail } from 'lucide-react';
import { api } from '@/lib/api';

interface SuperAdminDashboardProps {
  onSelectCycle?: (cycleId: string) => void;
  onNavigate?: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onSelectCycle, onNavigate }) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, usersData, auditData, cyclesData] = await Promise.all([
        api.getDbStatus().catch(() => null),
        api.getUsers().catch(() => []),
        api.getAuditEvents().catch(() => []),
        api.getCycles().catch(() => [])
      ]);
      setDbStatus(statusData);
      setUsers(usersData || []);
      setAuditEvents(auditData || []);
      setCycles(cyclesData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive && !u.isLockedOut).length;
  const lockedUsers = users.filter(u => u.isLockedOut).length;

  return (
    <div className="space-y-6">
      {/* System Admin Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Shield className="h-4 w-4" />
              <span>System & Security Administration Center</span>
              <span>•</span>
              <Badge variant="nbp" className="text-white bg-emerald-800">Super Admin Scope</Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Enterprise System Governance & Identity Control
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              National Bank of Pakistan | Information Security & IT Infrastructure Division
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={loadData} title="Refresh System Status">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">System Portal Users</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalUsers}</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{activeUsers} active accounts</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCog className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Locked Out Accounts</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{lockedUsers}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Failed login protection</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Active Encryption Key</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">v1.0 (2026)</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">AES-256-GCM Envelope</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <KeyRound className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Security Audit Events</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{auditEvents.length}</h3>
              <p className="text-[11px] text-blue-600 font-bold mt-0.5">Tamper-evident log</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-sm hover:border-emerald-700/50 transition-all cursor-pointer" onClick={() => onNavigate?.('cycles')}>
          <CardHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Appraisal Cycles</CardTitle>
                <CardDescription className="text-[11px]">Cycles, circulars & rosters</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-600 line-clamp-2">
              Create and manage annual appraisal cycles, upload employee batches, and freeze historical snapshots.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full text-[11px] font-bold border-emerald-700/30 text-emerald-900 hover:bg-emerald-50 h-8">
              Open Cycles →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm hover:border-emerald-700/50 transition-all cursor-pointer" onClick={() => onNavigate?.('employees')}>
          <CardHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Staff & Cycle Rosters</CardTitle>
                <CardDescription className="text-[11px]">Uploads, grades & groups</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-600 line-clamp-2">
              Add, edit, remove staff records, upload cycle batches, and configure appraiser assignments.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full text-[11px] font-bold border-teal-700/30 text-teal-900 hover:bg-teal-50 h-8">
              Manage Staff →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm hover:border-emerald-700/50 transition-all cursor-pointer" onClick={() => onNavigate?.('users')}>
          <CardHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <UserCog className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">User Management</CardTitle>
                <CardDescription className="text-[11px]">Accounts, roles & unlock</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-600 line-clamp-2">
              Manage portal login credentials, active user statuses, and role authorization.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full text-[11px] font-bold border-emerald-700/30 text-emerald-900 hover:bg-emerald-50 h-8">
              Open Users →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm hover:border-emerald-700/50 transition-all cursor-pointer" onClick={() => onNavigate?.('email-config')}>
          <CardHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Email & Exchange</CardTitle>
                <CardDescription className="text-[11px]">SMTP, Exchange & Test</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-600 line-clamp-2">
              Configure SMTP/Exchange gateway, port, encryption, and test live email connection.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full text-[11px] font-bold border-emerald-700/30 text-emerald-900 hover:bg-emerald-50 h-8">
              Email Setup →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm hover:border-amber-700/50 transition-all cursor-pointer" onClick={() => onNavigate?.('security')}>
          <CardHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Security & Key Vault</CardTitle>
                <CardDescription className="text-[11px]">KMS encryption & keys</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-600 line-clamp-2">
              Inspect active cryptographic key versions and verify AES-256-GCM envelope encryption.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full text-[11px] font-bold border-amber-700/30 text-amber-900 hover:bg-amber-50 h-8">
              Key Vault →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm hover:border-blue-700/50 transition-all cursor-pointer" onClick={() => onNavigate?.('audit')}>
          <CardHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">Audit & Compliance</CardTitle>
                <CardDescription className="text-[11px]">Immutable security logs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-600 line-clamp-2">
              Review tamper-evident security logs and track user authentication & admin actions.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full text-[11px] font-bold border-blue-700/30 text-blue-900 hover:bg-blue-50 h-8">
              View Audit Logs →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Control Centers Quick Switcher */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-emerald-700" />
              <span>Appraisal Cycle Control Centers</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Select a cycle to enter its dedicated Control Center, live metrics, and staff rosters
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('cycles')} className="text-xs font-bold border-slate-300 h-8">
            Manage All Cycles →
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500 font-medium">Loading cycles...</div>
          ) : cycles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No cycles found. Click <strong>"Manage All Cycles"</strong> to create your first appraisal cycle!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cycles.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    if (onSelectCycle) {
                      onSelectCycle(c.id);
                    } else if (onNavigate) {
                      onNavigate('cycle-control');
                    }
                  }}
                  className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-500/50 rounded-xl transition-all cursor-pointer space-y-3 group shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        c.status === 101 || c.statusName === 'CycleActive'
                          ? 'nbp'
                          : c.status === 102 || c.statusName === 'CycleSuspended'
                          ? 'danger'
                          : c.status === 103 || c.statusName === 'CycleClosed'
                          ? 'secondary'
                          : 'default'
                      }
                      className="text-[10px] font-bold"
                    >
                      {c.statusName || (c.status === 101 ? 'Active' : 'Draft')}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-500 group-hover:text-emerald-800 font-bold">
                      {c.enrolledCount ?? 0} Enrolled
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950 leading-tight">
                      {c.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{c.circularReference}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:translate-x-0.5 transition-transform">
                    <span>Enter Control Center</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Schema Health Overview */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Server className="h-4 w-4 text-emerald-700" />
            <span>Database Storage & Record Health Summary</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Live Microsoft SQL Server relational entities state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-slate-700">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">System Users Table</span>
              <span className="text-lg font-bold text-slate-900">{dbStatus?.systemUsersCount ?? 0} records</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Employees Master Table</span>
              <span className="text-lg font-bold text-slate-900">{dbStatus?.employeesCount ?? 0} records</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Audit Events Table</span>
              <span className="text-lg font-bold text-slate-900">{dbStatus?.auditEventsCount ?? 0} records</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Security Key Versions</span>
              <span className="text-lg font-bold text-slate-900">1 active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
