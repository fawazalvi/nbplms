import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Calendar, Plus, Play, Pause, Lock, RefreshCw, CheckCircle2 } from 'lucide-react';

export const AppraisalCyclesPage: React.FC = () => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('Annual Appraisal Cycle 2027');
  const [newCircular, setNewCircular] = useState('NBP/HR/2027/001');
  const [message, setMessage] = useState<string | null>(null);

  const loadCycles = async () => {
    setLoading(true);
    try {
      const data = await api.getCycles();
      setCycles(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const handleCreate = async () => {
    try {
      await api.createCycle({
        title: newTitle,
        circularReference: newCircular,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        acknowledgementDeadline: new Date(new Date().setMonth(new Date().getMonth() + 11)),
        status: 100 // CycleDraft
      });
      setMessage('Cycle created successfully.');
      setShowCreateModal(false);
      loadCycles();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpen = async (id: string) => {
    await api.openCycle(id);
    setMessage('Cycle activated.');
    loadCycles();
  };

  const handleSuspend = async (id: string) => {
    await api.suspendCycle(id);
    setMessage('Cycle suspended.');
    loadCycles();
  };

  const handleClose = async (id: string) => {
    await api.closeCycle(id);
    setMessage('Cycle closed.');
    loadCycles();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Cycle Control & Stage Calendar</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-700 text-white">Database Driven</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Appraisal Cycles Management</h1>
          <p className="text-slate-300 text-xs mt-1">
            Configure annual appraisal cycles, circular references, and execution stages.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadCycles}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="gold" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create New Cycle
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Appraisal Cycles</CardTitle>
          <CardDescription className="text-xs">Active, draft, and historical appraisal cycles from SQL Server DB</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading cycles from database...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">Cycle Title</th>
                    <th className="p-3">Circular Ref</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Ack Deadline</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cycles.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{c.title}</td>
                      <td className="p-3 font-mono text-slate-600">{c.circularReference}</td>
                      <td className="p-3 text-slate-500">{new Date(c.startDate).toLocaleDateString()}</td>
                      <td className="p-3 text-slate-500">{new Date(c.endDate).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-amber-700">{new Date(c.acknowledgementDeadline).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge variant={c.status === 101 || c.status === 'CycleActive' ? 'success' : c.status === 102 ? 'warning' : 'secondary'}>
                          {c.status === 101 ? 'Active' : c.status === 102 ? 'Suspended' : c.status === 103 ? 'Closed' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleOpen(c.id)} title="Activate Cycle">
                          <Play className="h-3.5 w-3.5 text-emerald-700" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSuspend(c.id)} title="Suspend Cycle">
                          <Pause className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleClose(c.id)} title="Close Cycle">
                          <Lock className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Create Annual Appraisal Cycle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Cycle Title</label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div>
                <label className="font-bold text-slate-700">Circular Reference Number</label>
                <Input value={newCircular} onChange={(e) => setNewCircular(e.target.value)} />
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2 rounded-b-xl">
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleCreate}>Save & Create Cycle</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
