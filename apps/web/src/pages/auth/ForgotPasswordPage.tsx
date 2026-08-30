import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, ArrowRight, ArrowLeft, MailCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const ForgotPasswordPage: React.FC = () => {
  const [sapId, setSapId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sapId.trim()) {
      setError('Please enter your SAP ID.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.forgotPassword(sapId.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-12 text-white flex flex-col justify-center relative overflow-hidden hidden md:flex">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Building2 className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black mb-6 tracking-tight leading-tight">Performance<br/>Management<br/>System <span className="text-emerald-400">2.0</span></h1>
            <p className="text-emerald-100 text-lg mb-8 leading-relaxed font-medium">
              Securely reset your password or set up your account for the first time.
            </p>
          </div>
        </div>
        <div className="p-8 md:p-12 flex flex-col justify-center relative">
          <div className="max-w-sm mx-auto w-full">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-800 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm">
                <Building2 className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Setup</h2>
              <p className="text-slate-500 mt-2 font-medium">Enter your SAP ID to receive a secure link.</p>
            </div>

            {success ? (
              <div className="text-center space-y-6">
                <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-200">
                  <MailCheck className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">Check Your Email</h3>
                  <p className="text-sm leading-relaxed">
                    If an account matching <strong>{sapId}</strong> exists, a password reset link has been sent to your registered email address.
                  </p>
                </div>
                <Link to="/login">
                  <Button className="w-full h-12 text-sm font-bold bg-slate-900 hover:bg-slate-800 rounded-xl">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Return to Login
                  </Button>
                </Link>
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
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">SAP ID</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Enter your SAP ID"
                      value={sapId}
                      onChange={(e) => setSapId(e.target.value)}
                      className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-slate-900 font-medium"
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !sapId} 
                  className="w-full h-12 text-sm font-bold bg-emerald-700 hover:bg-emerald-600 shadow-md shadow-emerald-200 rounded-xl transition-all active:scale-[0.98]"
                >
                  {loading ? 'Sending...' : 'Send Setup Link'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="text-center pt-4">
                  <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors">
                    Back to Login
                  </Link>
                </div>
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
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
