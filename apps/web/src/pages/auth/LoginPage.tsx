import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

interface LoginPageProps {
  onLoginSuccess: (role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('84920');
  const [password, setPassword] = useState('NbpPms2026!');
  const [selectedRole, setSelectedRole] = useState('Employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both SAP ID/Username and password.');
      return;
    }
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(selectedRole);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-600/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />

      <Card className="w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl border-slate-200/80 z-10">
        <CardHeader className="text-center space-y-3 pb-3">
          {/* Main Official NBP Application Logo */}
          <div className="mx-auto flex items-center justify-center pt-2">
            <img
              src="/nbp-logo.png"
              alt="National Bank of Pakistan"
              className="h-16 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
            />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight mt-1">
              National Bank of Pakistan
            </CardTitle>
            <CardDescription className="text-xs font-bold text-emerald-800 tracking-wide mt-0.5">
              Performance Management System (PMS 2.0)
            </CardDescription>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Strategy & Rewards Division | HR Digital Transformation
            </p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                <span>SAP ID / Personnel Number</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. 84920"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="font-mono font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <Lock className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Password</span>
                </label>
                <a href="#forgot" className="text-[11px] font-semibold text-emerald-700 hover:underline">
                  Forgot?
                </a>
              </div>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span>Target Role Context (Demo Selector)</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRole(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="Employee">Employee Workspace</option>
                <option value="FirstAppraiser">First Appraiser Workspace</option>
                <option value="SecondAppraiser">Second Appraiser Workspace</option>
                <option value="GroupPerformanceManager">Group Performance Manager (GPM)</option>
                <option value="PmwAdmin">PMW Admin Control Center</option>
                <option value="PmwSuperAdmin">PMW Super Admin</option>
                <option value="Auditor">Auditor View</option>
              </select>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button variant="nbp" size="lg" className="w-full font-bold" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Authenticating...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Sign In to NBP PMS</span>
                </span>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400">
                Protected by NBP Enterprise Auth & AES-256-GCM Envelope Encryption
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
