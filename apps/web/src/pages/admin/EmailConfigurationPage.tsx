import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';
import { api } from '@/lib/api';

export const EmailConfigurationPage: React.FC = () => {
  const [providerType, setProviderType] = useState('ExchangeRelay');
  const [host, setHost] = useState('mailhog');
  const [port, setPort] = useState(1025);
  const [encryptionType, setEncryptionType] = useState('None');
  const [requireAuthentication, setRequireAuthentication] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [senderEmail, setSenderEmail] = useState('pms-notifications@nbp.com.pk');
  const [senderDisplayName, setSenderDisplayName] = useState('NBP Performance Management System');
  const [replyToEmail, setReplyToEmail] = useState('hr-support@nbp.com.pk');

  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [lastTestStatus, setLastTestStatus] = useState<string | null>(null);
  const [lastTestError, setLastTestError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('admin@nbp.com.pk');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; elapsedMs?: number } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getEmailConfig();
      if (data) {
        setProviderType(data.providerType || 'SMTP');
        setHost(data.host || 'mailhog');
        setPort(data.port || 1025);
        setEncryptionType(data.encryptionType || 'None');
        setRequireAuthentication(data.requireAuthentication || false);
        setUsername(data.username || '');
        setHasExistingPassword(data.hasPassword || false);
        setSenderEmail(data.senderEmail || 'pms-notifications@nbp.com.pk');
        setSenderDisplayName(data.senderDisplayName || 'NBP Performance Management System');
        setReplyToEmail(data.replyToEmail || '');
        setLastTestedAt(data.lastTestedAt || null);
        setLastTestStatus(data.lastTestStatus || 'Not Tested');
        setLastTestError(data.lastTestError || null);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage('Failed to load email configuration: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleApplyPreset = (preset: string) => {
    setProviderType(preset);
    if (preset === 'ExchangeRelay') {
      setHost('exchange.nbp.com.pk');
      setPort(25);
      setEncryptionType('None');
      setRequireAuthentication(false);
      setSenderEmail('pms-notifications@nbp.com.pk');
    } else if (preset === 'Office365') {
      setHost('smtp.office365.com');
      setPort(587);
      setEncryptionType('StartTls');
      setRequireAuthentication(true);
      setSenderEmail('pms-notifications@nbp.com.pk');
    } else if (preset === 'MailHog') {
      setHost('mailhog');
      setPort(1025);
      setEncryptionType('None');
      setRequireAuthentication(false);
      setSenderEmail('dev-pms@nbp.local');
    } else {
      setHost('smtp.nbp.com.pk');
      setPort(465);
      setEncryptionType('SslTls');
      setRequireAuthentication(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const res = await api.saveEmailConfig({
        providerType,
        host,
        port: Number(port),
        encryptionType,
        requireAuthentication,
        username,
        password: password || undefined,
        senderEmail,
        senderDisplayName,
        replyToEmail,
        actorUserId: 'SUPER_ADMIN'
      });
      setMessage(res.message || 'Email & Exchange configuration updated successfully.');
      setPassword('');
      await loadConfig();
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save email configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!testRecipient) {
      alert('Please enter a recipient email address for the test.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testEmailConfig({
        providerType,
        host,
        port: Number(port),
        encryptionType,
        requireAuthentication,
        username,
        password: password || undefined,
        senderEmail,
        senderDisplayName,
        testRecipientEmail: testRecipient
      });
      setTestResult(res);
      await loadConfig();
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Connection test failed: ' + (e.message || String(e))
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Mail className="h-4 w-4" />
              <span>System & Email Infrastructure</span>
              <span>•</span>
              <Badge variant="nbp" className="text-white bg-emerald-800">Super Admin Only</Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Email & Microsoft Exchange Server Configuration
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              Configure SMTP gateway, Microsoft Exchange relay, authentication credentials, and notification delivery parameters
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTestResult(null);
                setShowTestModal(true);
              }}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Zap className="h-4 w-4 mr-1.5 text-amber-400" />
              <span>Test Connection</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={loadConfig} title="Refresh Configuration">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-3 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center space-x-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              lastTestStatus === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">Current Server:</span>
                <span className="font-mono text-xs font-bold text-emerald-800">{host}:{port}</span>
                <Badge variant={lastTestStatus === 'Success' ? 'default' : 'secondary'} className="text-[10px]">
                  {lastTestStatus === 'Success' ? 'Verified Connected' : (lastTestStatus || 'Pending Test')}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Provider: <strong>{providerType}</strong> • Encryption: <strong>{encryptionType}</strong> • Sender: <strong>{senderEmail}</strong>
              </p>
            </div>
          </div>
          {lastTestedAt && (
            <div className="text-right text-[11px] text-slate-400">
              <span>Last Tested: </span>
              <span className="font-semibold text-slate-600">{new Date(lastTestedAt).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Configuration Form */}
      <form onSubmit={handleSave}>
        <div className="space-y-6">
          {/* Quick Presets Selection */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>Quick Configuration Presets</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select a pre-configured profile to auto-populate standard host and port parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ExchangeRelay')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    providerType === 'ExchangeRelay'
                      ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-700/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>NBP Exchange Server</span>
                    {providerType === 'ExchangeRelay' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Internal SMTP Relay (Port 25)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('Office365')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    providerType === 'Office365'
                      ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-700/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Office 365 / Online</span>
                    {providerType === 'Office365' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">STARTTLS Auth (Port 587)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('SMTP')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    providerType === 'SMTP'
                      ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-700/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Generic Secure SMTP</span>
                    {providerType === 'SMTP' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">SSL/TLS Gateway (Port 465)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('MailHog')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    providerType === 'MailHog'
                      ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-700/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>MailHog (Local Dev)</span>
                    {providerType === 'MailHog' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Docker Test Trap (Port 1025)</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Server Connection Details */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Globe className="h-4 w-4 text-emerald-700" />
                <span>Server Connection & Transport Security</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Specify network socket, encryption level, and endpoint addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">SMTP / Exchange Server Hostname or IP *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. exchange.nbp.com.pk or mail.nbp.com.pk"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Port Number *</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      required
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      className="font-mono text-xs"
                    />
                    <div className="flex items-center space-x-1">
                      {[25, 465, 587, 1025].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPort(p)}
                          className={`text-[10px] px-2 py-1.5 rounded font-bold border transition-colors ${
                            port === p
                              ? 'bg-emerald-800 text-white border-emerald-800'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Encryption / Security Protocol</label>
                  <select
                    value={encryptionType}
                    onChange={(e) => setEncryptionType(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="None">None (Plaintext / Internal Relay)</option>
                    <option value="SslTls">SSL / TLS (Implicit Encryption - Port 465)</option>
                    <option value="StartTls">STARTTLS (Explicit TLS Handshake - Port 587)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Provider Classification</label>
                  <select
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="ExchangeRelay">Microsoft Exchange Server Relay</option>
                    <option value="SMTP">Generic SMTP Server</option>
                    <option value="Office365">Office 365 / Exchange Online</option>
                    <option value="MailHog">MailHog Dev Trap</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Credentials */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-emerald-700" />
                    <span>Server Authentication</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure SMTP credentials if relay or gateway requires authenticated user
                  </CardDescription>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireAuthentication}
                    onChange={(e) => setRequireAuthentication(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-700">Requires Authentication</span>
                </label>
              </div>
            </CardHeader>
            {requireAuthentication && (
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">SMTP Username / Service Account</label>
                    <Input
                      type="text"
                      placeholder="e.g. svc_pms_notifications or domain\svc_account"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Password {hasExistingPassword && <span className="text-emerald-700 font-normal">(Password currently saved in DB)</span>}
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={hasExistingPassword ? '•••••••••••• (leave empty to keep current)' : 'Enter SMTP password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sender Identity & Notification Template Settings */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Sender Identity & Notification Addresses</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Email headers and display identity shown to bank employees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Sender Display Name *</label>
                  <Input
                    type="text"
                    required
                    value={senderDisplayName}
                    onChange={(e) => setSenderDisplayName(e.target.value)}
                    className="text-xs font-medium"
                    placeholder="e.g. NBP Performance Management System"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">From / Sender Email Address *</label>
                  <Input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="text-xs font-mono"
                    placeholder="pms-notifications@nbp.com.pk"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reply-To Address (Optional)</label>
                <Input
                  type="email"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                  className="text-xs font-mono"
                  placeholder="hr-support@nbp.com.pk"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between py-4">
              <p className="text-[11px] text-slate-500">
                All settings are stored in SQL Server and applied immediately to background reminder jobs and real-time triggers.
              </p>
              <Button variant="nbp" type="submit" disabled={saving} className="font-bold">
                {saving ? (
                  <span className="flex items-center space-x-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>Save Email Configuration</span>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">SMTP / Exchange Connection Test</h3>
                  <p className="text-[11px] text-slate-300">Live Handshake & Test Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Target Server:</span>
                  <span className="font-mono font-bold">{host}:{port}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Security Mode:</span>
                  <span className="font-bold">{encryptionType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Authentication:</span>
                  <span className="font-bold">{requireAuthentication ? 'Enabled' : 'Disabled (Relay)'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Recipient Email Address for Test Message *</label>
                <Input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="admin@nbp.com.pk or your email"
                  className="text-xs"
                />
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border text-xs ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span>Connection Successful</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-rose-700" />
                        <span>Connection Failed</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowTestModal(false)}>
                  Close
                </Button>
                <Button
                  variant="nbp"
                  size="sm"
                  onClick={handleRunTest}
                  disabled={testing}
                  className="font-bold"
                >
                  {testing ? (
                    <span className="flex items-center space-x-1.5">
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Sending Test Email...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1.5">
                      <Send className="h-3.5 w-3.5 mr-1" />
                      <span>Send Test Message</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
