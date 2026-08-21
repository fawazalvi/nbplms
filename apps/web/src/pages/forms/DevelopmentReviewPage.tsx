import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, FileCheck2, Send, Lock } from 'lucide-react';

interface DevReviewProps {
  userRole?: string;
}

export const DevelopmentReviewPage: React.FC<DevReviewProps> = ({ userRole = 'Employee' }) => {
  const isAppraiser = userRole === 'FirstAppraiser' || userRole === 'SecondAppraiser' || userRole === 'PmwAdmin';

  const [strengths, setStrengths] = useState(
    'Demonstrates exceptional credit risk evaluation skills, leadership in commercial banking, and strong adherence to NBP compliance standards.'
  );
  const [developmentAreas, setDevelopmentAreas] = useState(
    'Advanced structured trade finance products, cross-functional team delegation, and digital treasury portal operations.'
  );
  const [actionPlan, setActionPlan] = useState(
    '1. Enroll in NBP Staff College Advanced Credit Certification.\n2. Cross-training attachment with Treasury & Global Markets Division for 2 weeks.'
  );
  const [supervisorComments, setSupervisorComments] = useState(
    'Recommended for high-potential leadership track within Commercial Banking Group.'
  );

  const [isSubmitted, setIsSubmitted] = useState(true);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white border-0">
        <CardHeader className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Separate Form</span>
                <span>•</span>
                <Badge variant="nbp" className="text-white bg-emerald-700">Annual Appraisal 2026</Badge>
              </div>
              <h1 className="text-2xl font-black tracking-tight">Employee Development Review</h1>
              <p className="text-slate-300 text-xs mt-1">
                Target Employee: Fawaz Ahmed (SAP ID: 84920) | AVP — Commercial Banking Group
              </p>
            </div>
            <div className="text-right">
              <Badge variant={isSubmitted ? 'success' : 'warning'} className="text-xs">
                {isSubmitted ? 'Submitted (Read-Only for Employee)' : 'Draft (Appraiser Editing)'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!isAppraiser && isSubmitted && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
          <FileCheck2 className="h-5 w-5 text-emerald-700 shrink-0" />
          <span>
            This Development Review has been completed by your First Appraiser & Supervisor. It is available to you in read-only mode.
          </span>
        </div>
      )}

      {/* Form Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 text-base font-bold">1. Key Strengths & Demonstrated Competencies</CardTitle>
          <CardDescription className="text-xs">Highlighted technical, managerial, and behavioral strengths during the evaluation period.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAppraiser && !isSubmitted ? (
            <textarea
              rows={3}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
              {strengths}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 text-base font-bold">2. Development & Growth Areas</CardTitle>
          <CardDescription className="text-xs">Specific skills or operational competencies targeted for improvement.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAppraiser && !isSubmitted ? (
            <textarea
              rows={3}
              value={developmentAreas}
              onChange={(e) => setDevelopmentAreas(e.target.value)}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
              {developmentAreas}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 text-base font-bold">3. Training & Action Plan</CardTitle>
          <CardDescription className="text-xs">Recommended NBP Staff College courses, certifications, or job attachments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAppraiser && !isSubmitted ? (
            <textarea
              rows={3}
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line">
              {actionPlan}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 text-base font-bold">4. Supervisor / Second Appraiser Comments</CardTitle>
          <CardDescription className="text-xs">Final narrative recommendation by senior leadership.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAppraiser && !isSubmitted ? (
            <textarea
              rows={2}
              value={supervisorComments}
              onChange={(e) => setSupervisorComments(e.target.value)}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
              {supervisorComments}
            </div>
          )}
        </CardContent>
      </Card>

      {isAppraiser && !isSubmitted && (
        <div className="flex justify-end space-x-3">
          <Button variant="nbp" onClick={() => setIsSubmitted(true)}>
            <Send className="h-4 w-4 mr-1" />
            Submit Development Review to Employee
          </Button>
        </div>
      )}
    </div>
  );
};
