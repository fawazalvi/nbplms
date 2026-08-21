import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Download, Eye, X, FileText, FileSpreadsheet, FileCheck, ExternalLink, ShieldCheck } from 'lucide-react';

interface EvidenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  evidenceRef: string;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  evidenceRef,
}) => {
  if (!isOpen || !evidenceRef) return null;

  // Extract file extension and format icon
  const getFileExt = (ref: string) => {
    if (ref.toLowerCase().includes('.pdf') || ref.toLowerCase().includes('pdf')) return 'PDF';
    if (ref.toLowerCase().includes('.xlsx') || ref.toLowerCase().includes('.xls') || ref.toLowerCase().includes('xls')) return 'EXCEL';
    if (ref.toLowerCase().includes('.docx') || ref.toLowerCase().includes('.doc') || ref.toLowerCase().includes('doc')) return 'WORD';
    return 'DOCUMENT';
  };

  const fileType = getFileExt(evidenceRef);

  const getFileIcon = () => {
    if (fileType === 'PDF') return <FileText className="h-10 w-10 text-red-600" />;
    if (fileType === 'EXCEL') return <FileSpreadsheet className="h-10 w-10 text-emerald-600" />;
    if (fileType === 'WORD') return <FileCheck className="h-10 w-10 text-blue-600" />;
    return <Paperclip className="h-10 w-10 text-emerald-700" />;
  };

  const handleDownload = () => {
    // Generate downloadable file blob for demonstration
    const blobContent = `National Bank of Pakistan (NBP) - Appraisal Evidence Attachment\nRef: ${evidenceRef}\nGoal: ${itemTitle}\nTimestamp: ${new Date().toLocaleString()}\nVerified Audit Document`;
    const blob = new Blob([blobContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${evidenceRef.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center border border-emerald-500/30">
              <Eye className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">View & Download Attachment</h3>
              <p className="text-[11px] text-slate-300 truncate max-w-xs">{itemTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-4">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Badge variant="nbp" className="text-[10px] font-bold">
                  {fileType} Document
                </Badge>
                <Badge variant="outline" className="text-[9px] text-slate-600 bg-white">
                  Verified Audit Proof
                </Badge>
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm truncate mt-1">{evidenceRef}</h4>
              <p className="text-[11px] text-slate-500 font-medium">Uploaded for: {itemTitle}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 text-[11px] flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>This document is securely stored in NBP's encrypted audit vault and accessible to Appraisers and Auditors.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="font-bold border-slate-300 text-slate-800">
              <Eye className="h-4 w-4 mr-1 text-emerald-700" />
              Preview Document
            </Button>
            <Button variant="nbp" size="sm" onClick={handleDownload} className="font-extrabold shadow-md">
              <Download className="h-4 w-4 mr-1" />
              Download File
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
