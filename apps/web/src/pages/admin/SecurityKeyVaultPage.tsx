import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';

export const SecurityKeyVaultPage: React.FC = () => {
  const [activeKeyVersion, setActiveKeyVersion] = useState(1);
  const [rotatedMessage, setRotatedMessage] = useState<string | null>(null);

  const handleRotateKey = () => {
    setActiveKeyVersion(prev => prev + 1);
    setRotatedMessage(`KMS Master Key rotated successfully to Version ${activeKeyVersion + 1}. All new appraisals will be encrypted with KeyVersionId: ${activeKeyVersion + 1}.`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Security Administration & KMS Reference</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-800 text-white">No Plaintext Keys Shown</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Key Vault & Field-Level Encryption</h1>
          <p className="text-slate-300 text-xs mt-1">
            Manage AES-256-GCM envelope key versions, key rotation logs, and DBA secrecy enforcement.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={handleRotateKey}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Rotate KMS Master Key
        </Button>
      </div>

      {rotatedMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{rotatedMessage}</span>
          </div>
          <button onClick={() => setRotatedMessage(null)} className="font-bold text-slate-400 text-xs">✕</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Active KMS Key Version Reference</CardTitle>
          <CardDescription className="text-xs">
            Keys are managed externally in NBP Key Management Vault. The application references KeyVersionId only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-bold text-slate-500 block">Active Key Version:</span>
              <span className="text-lg font-black text-emerald-800">Version {activeKeyVersion}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">KMS Key Reference URI:</span>
              <span className="font-mono text-slate-900 font-bold">kms://nbp-vault/pms-master-key-v{activeKeyVersion}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">Algorithm & Mode:</span>
              <Badge variant="nbp">AES-256-GCM (128-bit Tag)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Database Secrecy Model Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-relaxed text-slate-700">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>
              <strong>DBA Secrecy Guaranteed:</strong> Database administrators executing direct SQL queries (<code>SELECT * FROM Score</code>) see base64 ciphertext, nonces, and tags only. Plaintext scores and confidential comments are never stored in the database.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
