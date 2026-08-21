import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertCircle, FileCheck, CheckCircle2, MessageSquare, Search, Filter } from 'lucide-react';

interface DisagreementCaseItem {
  id: string;
  sapId: string;
  employeeName: string;
  grade: string;
  group: string;
  publishedRating: string;
  disagreementReason: string;
  status: 'PendingGpmReview' | 'EscalatedPmw' | 'Resolved';
  raisedDate: string;
}

export const DisagreementRegisterPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<DisagreementCaseItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [cases, setCases] = useState<DisagreementCaseItem[]>([
    {
      id: 'DIS-2026-001',
      sapId: '91204',
      employeeName: 'Zahid Hussain',
      grade: 'OG I',
      group: 'Commercial Banking Group',
      publishedRating: 'Good',
      disagreementReason: 'My commercial loan recovery target of PKR 30M was fully met in Q3, but was not reflected in the final rating.',
      status: 'PendingGpmReview',
      raisedDate: '2026-07-28',
    },
    {
      id: 'DIS-2026-002',
      sapId: '88392',
      employeeName: 'Mariam Ali',
      grade: 'AVP',
      group: 'Consumer Banking Group',
      publishedRating: 'Needs Improvement',
      disagreementReason: 'Cross-functional project leadership contribution was omitted during First Appraiser review.',
      status: 'EscalatedPmw',
      raisedDate: '2026-07-25',
    },
    {
      id: 'DIS-2026-003',
      sapId: '76210',
      employeeName: 'Usman Farooq',
      grade: 'VP',
      group: 'Treasury & Global Markets',
      publishedRating: 'Good',
      disagreementReason: 'Disagreement regarding Risk Adjustment perspective score weighting.',
      status: 'Resolved',
      raisedDate: '2026-07-20',
    },
  ]);

  const handleResolve = () => {
    if (!selectedCase) return;
    setCases(
      cases.map((c) => (c.id === selectedCase.id ? { ...c, status: 'Resolved' } : c))
    );
    setSelectedCase(null);
    setResolutionNotes('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Mandatory Employee Feedback</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-purple-800 text-white">Disagreement Register</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Employee Disagreement Register</h1>
          <p className="text-slate-300 text-xs mt-1">
            Formal disagreement cases submitted with mandatory rationale following results publication.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="warning" className="text-xs font-bold">
            {cases.filter((c) => c.status !== 'Resolved').length} Active Cases
          </Badge>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full md:w-96">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search by SAP ID, Employee Name, or Group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Disagreement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Disagreement Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Case ID</th>
                  <th className="p-3">SAP ID & Employee</th>
                  <th className="p-3">Grade & Group</th>
                  <th className="p-3">Published Rating</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Raised Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.id}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div>{item.employeeName}</div>
                      <span className="text-[10px] text-slate-500 font-normal">SAP ID: {item.sapId}</span>
                    </td>
                    <td className="p-3 text-slate-700">
                      <div>{item.group}</div>
                      <span className="text-[10px] text-slate-500">{item.grade}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="font-bold">{item.publishedRating}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          item.status === 'Resolved'
                            ? 'success'
                            : item.status === 'EscalatedPmw'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500">{item.raisedDate}</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCase(item)}
                      >
                        Review Case
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Case Review Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white shadow-2xl">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Review Disagreement — {selectedCase.id}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedCase.employeeName} (SAP ID: {selectedCase.sapId}) | {selectedCase.group}
                  </CardDescription>
                </div>
                <Badge variant="warning">{selectedCase.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="font-bold text-amber-900 block">Mandatory Employee Disagreement Reason:</span>
                <p className="text-slate-800 leading-relaxed font-medium">"{selectedCase.disagreementReason}"</p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">GPM / PMW Resolution Rationale</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record formal resolution details or rating adjustment outcome..."
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2 rounded-b-xl">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCase(null)}>
                Close
              </Button>
              <Button variant="nbp" size="sm" onClick={handleResolve}>
                Mark Case Resolved
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
