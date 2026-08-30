import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Lock, ArrowRight, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-800 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Set New Password</h2>
          <p className="text-slate-500 mt-2 font-medium">Enter a strong password for your account.</p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">Password Updated!</h3>
              <p className="text-sm leading-relaxed">
                Your password has been set successfully. You are being redirected to login...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3">
                <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <span className="text-sm font-semibold text-red-900">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-slate-900 font-medium"
                  disabled={loading || !token}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-slate-900 font-medium"
                  disabled={loading || !token}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !token || !password || !confirmPassword} 
              className="w-full h-12 text-sm font-bold bg-emerald-700 hover:bg-emerald-600 shadow-md shadow-emerald-200 rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? 'Saving...' : 'Set Password'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}
        <div className="mt-8 p-3 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-md shadow-emerald-500/20 relative overflow-hidden flex items-center justify-center space-x-2">
          <div className="absolute -top-6 -right-6 opacity-20 pointer-events-none">
            <Sparkles className="w-20 h-20 text-white" />
          </div>
          <Sparkles className="h-5 w-5 text-amber-200" />
          <p className="text-[10px] text-emerald-50 font-medium">
            Designed by <strong className="font-bold text-white tracking-wide">HR Digital Transformation Team</strong><br/>
            SPB&DTW, SP&RD, HRMG
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
