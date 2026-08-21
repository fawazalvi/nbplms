import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, FileText, Download, ExternalLink, BookOpen } from 'lucide-react';

export const HelpCircularsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>HR Policy & Circular Guidelines</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-800 text-white">Strategy & Rewards Division</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Help Center, FAQs & Circulars</h1>
          <p className="text-slate-300 text-xs mt-1">
            Official NBP HR policy guidelines, circular references, and appraisal form writing SMART objectives guides.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-emerald-700/50 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">HR Circular Ref: NBP/HR/2026/041</CardTitle>
            <CardDescription className="text-xs">Annual Appraisal Cycle 2026 Guidelines & Execution Timelines</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600">
            <p>Issued by Strategy & Rewards Division, HR Management Group. Outlines eligibility criteria, appraiser roles, and acknowledgement deadlines.</p>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-700/50 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">SMART Objectives Writing Guide</CardTitle>
            <CardDescription className="text-xs">How to write Specific, Measurable, Achievable, Relevant, and Time-bound KPIs</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600">
            <p>Step-by-step guidance for employees and appraisers on setting commercial, operational, and digital banking targets.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Frequently Asked Questions (FAQs)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {[
            {
              q: "What is the weightage breakdown for AVP & Below grades?",
              a: "For OG III, OG II, OG I, and AVP grades, the KPI form consists of 70% Annual Objectives + 30% Fixed Behavioural Traits (5 traits at 6% each)."
            },
            {
              q: "How does form assignment work for VP & Above grades?",
              a: "VP, SVP, EVP, SEVP, and President/CEO receive the 4-Perspective Balanced Scorecard (Financial, Customer, Internal Process, Learning & Growth)."
            },
            {
              q: "What form is assigned to Material Risk Takers / Controllers (MRT/MRC)?",
              a: "Selected MRT/MRC staff receive the 5-Perspective Risk-Adjusted Balanced Scorecard, which includes a dedicated 5th Risk Adjustment perspective."
            },
            {
              q: "Can I record a disagreement with my published appraisal rating?",
              a: "Yes. After PMW publishes results, you can select 'Disagree' on your form. Providing detailed justification comments is mandatory. The case will be reviewed by your Group Performance Manager (GPM)."
            }
          ].map((faq, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">Q: {faq.q}</h4>
              <p className="text-slate-600 leading-relaxed font-medium">A: {faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
