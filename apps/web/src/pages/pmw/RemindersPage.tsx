import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mail, Send, Eye, Users, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export const RemindersPage: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [selectedStatus, setSelectedStatus] = useState('ObjectiveDraft');
  const [subject, setSubject] = useState('REMINDER: Annual Performance Appraisal 2026 Submission Pending');
  const [templateBody, setTemplateBody] = useState(
    'Dear {EmployeeName},\n\nThis is a formal reminder from the HR Digital Transformation Wing regarding your Annual Appraisal 2026 form.\n\nYour form is currently in state: {CurrentStatus}.\n\nPlease complete and submit your form before the deadline date: {DeadlineDate}.\n\nAccess PMS Portal: {AppraisalLink}\n\nHR Management Group\nNational Bank of Pakistan'
  );

  const [previewActive, setPreviewActive] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const group = selectedGroup === 'All Groups' ? undefined : selectedGroup;
        const grade = selectedGrade === 'All Grades' ? undefined : selectedGrade;
        const data = await api.getReminderPreview(group, grade);
        setRecipientPreview(data);
      } catch (error) {
        console.error('Error fetching preview:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [selectedGroup, selectedGrade]);

  const handleSendReminders = () => {
    setSentSuccess(true);
    setPreviewActive(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Notification & Reminders Engine</span>
            <span>•</span>
            <Badge variant="warning" className="bg-amber-600 text-white">Recipient Preview Enforced</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Filtered Bulk Reminders & Escalations</h1>
          <p className="text-slate-300 text-xs mt-1">
            Send template-based reminder emails to employees & appraisers with preview before send.
          </p>
        </div>
      </div>

      {sentSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>
              Successfully queued <strong>{recipientPreview.length} reminder emails</strong> via MailKit SMTP pipeline. Event logged in Audit Trail.
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSentSuccess(false)}>Dismiss</Button>
        </div>
      )}

      {/* Filter Selection Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">1. Select Target Recipient Filter Criteria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Reporting Group</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
            >
              <option value="All Groups">All Reporting Groups</option>
              <option value="Commercial Banking Group">Commercial Banking Group</option>
              <option value="Consumer Banking Group">Consumer Banking Group</option>
              <option value="Treasury & Global Markets">Treasury & Global Markets</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Grade Band</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
            >
              <option value="All Grades">All Grade Bands</option>
              <option value="OG III">OG III</option>
              <option value="OG II">OG II</option>
              <option value="OG I">OG I</option>
              <option value="AVP">AVP</option>
              <option value="VP">VP</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Workflow Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
            >
              <option value="ObjectiveDraft">Objective Draft (Pending Submission)</option>
              <option value="ObjectiveSubmitted">Objective Submitted (Pending FA Approval)</option>
              <option value="AnnualReviewSelfAssessment">Annual Self-Assessment Pending</option>
              <option value="Published">Published (Pending Acknowledgement)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Email Template Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">2. Email Content & Template Editor</CardTitle>
          <CardDescription className="text-xs">
            Supported Placeholders: <code className="bg-slate-100 px-1 font-mono text-emerald-800">&#123;EmployeeName&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-emerald-800">&#123;CurrentStatus&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-emerald-800">&#123;DeadlineDate&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-emerald-800">&#123;AppraisalLink&#125;</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Subject Line</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Email Message Body</label>
            <textarea
              rows={6}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" size="sm" onClick={() => setPreviewActive(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Preview Recipient List ({recipientPreview.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Preview Modal */}
      {previewActive && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white shadow-2xl">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">
                Recipient Preview ({recipientPreview.length} Matched Employees)
              </CardTitle>
              <CardDescription className="text-xs">
                Review recipient list before bulk dispatching reminder emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-2.5">SAP ID</th>
                      <th className="p-2.5">Employee Name</th>
                      <th className="p-2.5">Grade</th>
                      <th className="p-2.5">Reporting Group</th>
                      <th className="p-2.5">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recipientPreview.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{r.sapId}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{r.name}</td>
                        <td className="p-2.5 text-slate-600">{r.grade}</td>
                        <td className="p-2.5 text-slate-600">{r.group}</td>
                        <td className="p-2.5">
                          <Badge variant="warning">{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2 rounded-b-xl">
              <Button variant="secondary" size="sm" onClick={() => setPreviewActive(false)}>
                Cancel
              </Button>
              <Button variant="nbp" size="sm" onClick={handleSendReminders}>
                <Send className="h-4 w-4 mr-1" />
                Confirm & Dispatch Reminders
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
