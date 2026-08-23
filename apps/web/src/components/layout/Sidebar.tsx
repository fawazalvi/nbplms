import React from 'react';
import {
  LayoutDashboard,
  FileCheck,
  Users,
  UserCog,
  Building2,
  PieChart,
  Settings,
  Shield,
  HelpCircle,
  BarChart3,
  Mail,
  Lock,
  FileSpreadsheet,
  Calendar,
  Send,
  Scale,
  Sparkles,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  currentRole: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, activeTab, onTabChange }) => {
  const getNavSections = (): NavSection[] => {
    switch (currentRole) {
      case 'PmwSuperAdmin':
        return [
          {
            title: 'Control & Monitoring',
            items: [
              { id: 'dashboard', label: 'System Admin Center', icon: LayoutDashboard },
              { id: 'cycle-control', label: 'Cycle Control Center', icon: BarChart3 },
            ]
          },
          {
            title: 'Appraisal Cycles & Staff',
            items: [
              { id: 'cycles', label: 'Appraisal Cycles', icon: Calendar },
              { id: 'cycle-snapshots', label: 'Cycle Snapshot Workspace', icon: Layers },
              { id: 'employees', label: 'Master Employee Directory', icon: Users },
              { id: 'organization', label: 'Master Groups & Grades', icon: Building2 },
            ]
          },
          {
            title: 'Form & Calibration Engine',
            items: [
              { id: 'forms', label: 'Form Configurations', icon: FileSpreadsheet },
              { id: 'bellcurve', label: 'Bell Curve Calibration', icon: Scale },
              { id: 'reminders', label: 'Reminders & Notifications', icon: Send },
              { id: 'disagreements', label: 'Disagreement Register', icon: FileCheck },
            ]
          },
          {
            title: 'System & Security Governance',
            items: [
              { id: 'users', label: 'User & Role Management', icon: UserCog },
              { id: 'email-config', label: 'Email & Exchange Setup', icon: Mail },
              { id: 'security', label: 'Security & Key Vault', icon: Lock },
              { id: 'audit', label: 'Audit & Compliance Logs', icon: Shield },
            ]
          }
        ];

      case 'PmwAdmin':
        return [
          {
            title: 'Cycle Dashboard',
            items: [
              { id: 'dashboard', label: 'Cycle Control Center', icon: LayoutDashboard },
            ]
          },
          {
            title: 'Appraisal Cycles & Staff',
            items: [
              { id: 'cycles', label: 'Appraisal Cycles', icon: Calendar },
              { id: 'cycle-snapshots', label: 'Cycle Snapshot Workspace', icon: Layers },
              { id: 'employees', label: 'Staff Directory', icon: Users },
              { id: 'organization', label: 'Groups & Grade Hierarchy', icon: Building2 },
            ]
          },
          {
            title: 'Evaluation & Workflows',
            items: [
              { id: 'forms', label: 'Form Configurations', icon: FileSpreadsheet },
              { id: 'bellcurve', label: 'Bell Curve Calibration', icon: Scale },
              { id: 'reminders', label: 'Reminders & Notifications', icon: Send },
              { id: 'disagreements', label: 'Disagreement Register', icon: FileCheck },
            ]
          },
          {
            title: 'Governance',
            items: [
              { id: 'audit', label: 'Audit & Compliance Logs', icon: Shield },
            ]
          }
        ];

      case 'GroupPerformanceManager':
        return [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Group Overview', icon: LayoutDashboard },
            ]
          },
          {
            title: 'Group Performance',
            items: [
              { id: 'employees', label: 'Group Employee List', icon: Users },
              { id: 'bellcurve', label: 'Bell Curve Preview', icon: Scale },
              { id: 'reminders', label: 'Send Reminders', icon: Send },
              { id: 'disagreements', label: 'Group Disagreements', icon: FileCheck },
            ]
          },
          {
            title: 'Policy & Resources',
            items: [
              { id: 'help', label: 'Policy & FAQs', icon: HelpCircle },
            ]
          }
        ];

      case 'FirstAppraiser':
      case 'SecondAppraiser':
        return [
          {
            title: 'Appraiser Workspace',
            items: [
              { id: 'dashboard', label: 'Review Dashboard', icon: LayoutDashboard },
              { id: 'team-reviews', label: 'Team Reviews Inbox', icon: Users },
              { id: 'dev-reviews', label: 'Development Reviews', icon: BarChart3 },
            ]
          },
          {
            title: 'My Self-Assessment',
            items: [
              { id: 'my-appraisal', label: 'My Appraisal Form', icon: FileCheck },
            ]
          },
          {
            title: 'Guidance',
            items: [
              { id: 'help', label: 'Help & Policies', icon: HelpCircle },
            ]
          }
        ];

      default: // Employee
        return [
          {
            title: 'My Appraisal Portal',
            items: [
              { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
              { id: 'my-appraisal', label: 'My Appraisal Form', icon: FileCheck },
              { id: 'dev-review', label: 'Development Review', icon: BarChart3 },
            ]
          },
          {
            title: 'Resources',
            items: [
              { id: 'help', label: 'Help & Policy Circulars', icon: HelpCircle },
            ]
          }
        ];
    }
  };

  const navSections = getNavSections();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-3 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-5">
        {/* Workspace Role Header */}
        <div className="px-3 pt-2 pb-1 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider">
            {currentRole.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
            Active
          </span>
        </div>

        {/* Grouped Navigation Sections */}
        <div className="space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {section.title && (
                <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>{section.title}</span>
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "bg-emerald-800 text-white shadow-sm shadow-emerald-950/20 font-bold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-emerald-700")} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Security & Cryptography Badge Card */}
      <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-3.5 text-white space-y-1.5 border border-slate-800 shadow-sm">
        <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
          <Shield className="h-3.5 w-3.5" />
          <span>Field-Level Encryption</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          Scores, ratings & appraisal comments are AES-256-GCM encrypted in database.
        </p>
      </div>
    </aside>
  );
};
