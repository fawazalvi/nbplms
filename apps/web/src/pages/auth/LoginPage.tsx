import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, User, KeyRound, AlertCircle, Sparkles, GitBranch, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both SAP ID/Username and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await api.login(username, password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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
                <Link to="/forgot-password" className="text-[11px] font-semibold text-emerald-700 hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
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

            {/* Interactive Workflow Swimlane Guide Link */}
            <Link
              to="/workflow-swimlane"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 hover:from-emerald-100 hover:to-blue-100 border border-emerald-200 text-emerald-900 flex items-center justify-between transition-all shadow-2xs group"
            >
              <div className="flex items-center space-x-2.5 text-left">
                <div className="p-1.5 rounded-lg bg-emerald-700 text-white shadow-2xs group-hover:bg-emerald-600 transition-colors">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 group-hover:text-emerald-900 flex items-center">
                    <span>Workflow Swimlane &amp; Guide</span>
                    <span className="ml-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      Interactive
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium">
                    Explore all 6 actor lanes, rules &amp; stages
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>

            <div className="text-center pt-1 space-y-2.5">
              <Link to="/forgot-password" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline block">
                First Time Setup / Sign Up
              </Link>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center space-x-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <p className="text-[10px] text-emerald-800 font-medium">
                  Designed by <strong className="font-bold">HR Digital Transformation Team</strong><br/>
                  SPB&DTW, SP&RD, HRMG
                </p>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
