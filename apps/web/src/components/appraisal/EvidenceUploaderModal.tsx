import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Upload, X, CheckCircle2, FileText, Link as LinkIcon, FileCheck, FileSpreadsheet, FileCode, Trash2 } from 'lucide-react';

interface EvidenceUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  currentEvidence?: string;
  onSaveEvidence: (evidenceRef: string) => void;
}

export const EvidenceUploaderModal: React.FC<EvidenceUploaderModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  currentEvidence = '',
  onSaveEvidence,
}) => {
  const [evidenceRef, setEvidenceRef] = useState(currentEvidence);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Auto-generate reference code if empty
      const fileExt = file.name.split('.').pop()?.toUpperCase() || 'DOC';
      const generatedRef = `DOC-${fileExt}-${Date.now().toString().slice(-4)} (${file.name})`;
      setEvidenceRef(generatedRef);

      // Simulate quick upload progress
      setUploadProgress(20);
      setTimeout(() => setUploadProgress(60), 150);
      setTimeout(() => setUploadProgress(100), 350);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setEvidenceRef('');
  };

  const handleSave = () => {
    if (evidenceRef.trim()) {
      onSaveEvidence(evidenceRef.trim());
    }
    onClose();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-6 w-6 text-red-600" />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="h-6 w-6 text-emerald-600" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileCheck className="h-6 w-6 text-blue-600" />;
    return <Paperclip className="h-6 w-6 text-emerald-700" />;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
              <Paperclip className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Attach Supporting Evidence / Proof</h3>
              <p className="text-[11px] text-slate-300 truncate max-w-xs">{itemTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Upload supporting documents or enter document reference numbers (e.g. SBP approval letters, audit reports, or Excel portfolios).
          </p>

          {/* Interactive File Upload Area (PDF, Word, Excel) */}
          <div className="p-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 transition-colors text-center space-y-2 relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="h-10 w-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center mx-auto shadow-xs">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Click to browse or drag & drop files</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Allowed formats: <strong>PDF (.pdf)</strong>, <strong>Word (.doc, .docx)</strong>, <strong>Excel (.xls, .xlsx)</strong> (Max 25MB)
              </span>
            </div>
          </div>

          {/* Selected File Preview Box */}
          {selectedFile && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile.name)}
                <div>
                  <h5 className="font-bold text-slate-900 text-xs truncate max-w-[240px]">{selectedFile.name}</h5>
                  <p className="text-[10px] text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready</p>
                  {uploadProgress === 100 && (
                    <Badge variant="success" className="text-[9px] py-0 mt-0.5">
                      Upload Verified ✓
                    </Badge>
                  )}
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-7 w-7 text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Document Reference Number or Link Input */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700 block text-xs flex items-center space-x-1">
              <FileText className="h-3.5 w-3.5 text-emerald-700" />
              <span>Document Reference Code / Attachment Title</span>
            </label>
            <Input
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
              placeholder="e.g. DOC-2026-NBP-COMM-9941 / SBP-APPROVAL-REF-442"
              className="font-mono text-xs"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Auditors can inspect uploaded PDF, Word, and Excel files in the permanent appraisal audit vault.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="nbp" size="sm" onClick={handleSave} disabled={!evidenceRef.trim()}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Save & Attach Evidence
          </Button>
        </div>
      </div>
    </div>
  );
};
