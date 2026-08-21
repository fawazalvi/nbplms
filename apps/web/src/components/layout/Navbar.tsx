import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, LogOut, Database, RefreshCw, Trash2, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '@/lib/api';

interface NavbarProps {
  userRole: string;
  onRoleChange: (role: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userRole, onRoleChange, onLogout }) => {
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbMessage, setDbMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getDbStatus();
      setDbStatus(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSeedDb = async () => {
    setLoadingDb(true);
    setDbMessage(null);
    try {
      const res = await api.seedDb();
      setDbMessage(res.message || 'Sample NBP Data seeded successfully.');
      await fetchStatus();
    } catch (e: any) {
      setDbMessage(`Error: ${e.message}`);
    } finally {
      setLoadingDb(false);
    }
  };

  const handleCleanDb = async () => {
    setLoadingDb(true);
    setDbMessage(null);
    try {
      const res = await api.cleanDb();
      setDbMessage(res.message || 'Database cleaned successfully.');
      await fetchStatus();
    } catch (e: any) {
      setDbMessage(`Error: ${e.message}`);
    } finally {
      setLoadingDb(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-emerald-900/10 bg-white/95 backdrop-blur shadow-xs">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* Official NBP Header Logo */}
              <img
                src="/nbp-logo.png"
                alt="National Bank of Pakistan"
                className="h-10 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
              />
              <div className="border-l border-slate-200 pl-3">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight">NATIONAL BANK OF PAKISTAN</span>
                  <Badge variant="nbp" className="text-[10px] px-1.5 py-0">PMS 2.0</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">Performance Management System | Strategy & Rewards Division</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Database Tools Admin Control Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStatus();
                setShowDbModal(true);
              }}
              className="text-xs font-bold border-emerald-700/40 text-emerald-900 hover:bg-emerald-50"
            >
              <Database className="h-4 w-4 mr-1 text-emerald-700" />
              <span>Database Tools</span>
            </Button>

            {/* Active Role Selector */}
            <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-semibold text-slate-600">Role:</span>
              <select
                value={userRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="Employee">Employee</option>
                <option value="FirstAppraiser">First Appraiser</option>
                <option value="SecondAppraiser">Second Appraiser</option>
                <option value="GroupPerformanceManager">Group Perf. Manager (GPM)</option>
                <option value="PmwAdmin">PMW Admin</option>
                <option value="PmwSuperAdmin">PMW Super Admin</option>
                <option value="Auditor">Auditor</option>
              </select>
            </div>

            <button className="relative p-2 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
            </button>

            <div className="flex items-center space-x-3 border-l border-slate-200 pl-3">
              <div className="h-9 w-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                FA
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">Fawaz Ahmed</p>
                <p className="text-[11px] text-slate-500 leading-tight">SAP ID: 84920 | AVP</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onLogout} title="Sign Out">
                <LogOut className="h-4 w-4 text-slate-500 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Database Tools Centered Viewport Overlay Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Database className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">SQL Server Database Tools</h3>
                  <p className="text-[11px] text-slate-300">1-Click Sample Data Population & Clean Reset</p>
                </div>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {dbMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>{dbMessage}</span>
                </div>
              )}

              {/* Live Record Counts */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">Live Database Table Record Counts</span>
                {dbStatus ? (
                  <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                    <div>Employees: <strong>{dbStatus.employeesCount ?? 0}</strong></div>
                    <div>Appraisal Cycles: <strong>{dbStatus.cyclesCount ?? 0}</strong></div>
                    <div>Employee Cycles: <strong>{dbStatus.employeeCyclesCount ?? 0}</strong></div>
                    <div>Objectives: <strong>{dbStatus.objectivesCount ?? 0}</strong></div>
                    <div>Scores: <strong>{dbStatus.scoresCount ?? 0}</strong></div>
                    <div>Disagreements: <strong>{dbStatus.disagreementCasesCount ?? 0}</strong></div>
                    <div>Audit Log Events: <strong>{dbStatus.auditEventsCount ?? 0}</strong></div>
                  </div>
                ) : (
                  <span className="text-slate-400">Fetching live database counts...</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="nbp"
                  onClick={handleSeedDb}
                  disabled={loadingDb}
                  className="h-11"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingDb ? 'animate-spin' : ''}`} />
                  Seed Sample NBP Data
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleCleanDb}
                  disabled={loadingDb}
                  className="h-11"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clean Database
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
