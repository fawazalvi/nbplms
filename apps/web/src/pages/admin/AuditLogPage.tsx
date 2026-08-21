import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, Search, Download, Lock, CheckCircle2 } from 'lucide-react';

interface AuditLogItem {
  id: string;
  eventType: string;
  actorUserId: string;
  actorRole: string;
  targetEntityId: string;
  preStatus: string;
  postStatus: string;
  timestamp: string;
  ipAddress: string;
  hashVerified: boolean;
}

export const AuditLogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const auditEvents: AuditLogItem[] = [
    {
      id: 'AUD-89104',
      eventType: 'WORKFLOW_TRANSITION_AnnualReviewSelfAssessment_TO_FirstAppraiserAssessment',
      actorUserId: '84920 (Fawaz Ahmed)',
      actorRole: 'Employee',
      targetEntityId: 'EC-2026-9812',
      preStatus: 'AnnualReviewSelfAssessment',
      postStatus: 'FirstAppraiserAssessment',
      timestamp: '2026-08-01 18:45:12',
      ipAddress: '10.14.2.88',
      hashVerified: true,
    },
    {
      id: 'AUD-89103',
      eventType: 'AES256_FIELD_DECRYPTION_ACCESS',
      actorUserId: '91204 (Tariq Mahmood)',
      actorRole: 'FirstAppraiser',
      targetEntityId: 'SCORE-9812',
      preStatus: 'N/A',
      postStatus: 'N/A',
      timestamp: '2026-08-01 18:40:02',
      ipAddress: '10.14.2.91',
      hashVerified: true,
    },
    {
      id: 'AUD-89102',
      eventType: 'BELL_CURVE_EXCEPTION_APPROVED',
      actorUserId: 'PMW_ADMIN_01',
      actorRole: 'PmwAdmin',
      targetEntityId: 'POLICY-COMM-AVP',
      preStatus: 'NonCompliant',
      postStatus: 'ExceptionApproved',
      timestamp: '2026-08-01 16:20:45',
      ipAddress: '10.10.1.15',
      hashVerified: true,
    },
    {
      id: 'AUD-89101',
      eventType: 'EMPLOYEE_BULK_DATA_IMPORT',
      actorUserId: 'PMW_ADMIN_01',
      actorRole: 'PmwAdmin',
      targetEntityId: 'BATCH-2026-041',
      preStatus: 'N/A',
      postStatus: 'ImportCompleted',
      timestamp: '2026-08-01 14:00:10',
      ipAddress: '10.10.1.15',
      hashVerified: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Tamper-Evident Audit Trail</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-800 text-white">Immutable Ledger</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">System Audit & Compliance Logs</h1>
          <p className="text-slate-300 text-xs mt-1">
            Every workflow transition, score view/decryption, reminder, and administrative action is logged.
          </p>
        </div>
        <Button variant="secondary" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export Audit Log (CSV)
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex items-center space-x-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Search by Actor User ID, Event Type, or Target Entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs"
          />
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Audit ID</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Actor & Role</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditEvents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.id}</td>
                    <td className="p-3">
                      <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.eventType}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{item.actorUserId}</div>
                      <span className="text-[10px] text-slate-500">{item.actorRole}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{item.targetEntityId}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{item.timestamp}</td>
                    <td className="p-3 font-mono text-slate-500">{item.ipAddress}</td>
                    <td className="p-3">
                      <Badge variant="success" className="text-[10px] flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Verified</span>
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
