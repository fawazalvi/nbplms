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
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentRole: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, activeTab, onTabChange }) => {
  const getNavItems = () => {
    switch (currentRole) {
      case 'PmwSuperAdmin':
        return [
          { id: 'dashboard', label: 'System Admin Center', icon: LayoutDashboard },
          { id: 'cycles', label: 'Appraisal Cycles', icon: Settings },
          { id: 'cycle-control', label: 'Cycle Control Center', icon: LayoutDashboard },
          { id: 'users', label: 'User & Role Management', icon: UserCog },
          { id: 'organization', label: 'Groups & Grade Hierarchy', icon: Building2 },
          { id: 'employees', label: 'Employee & Cycle Rosters', icon: Users },
          { id: 'forms', label: 'Form Configurations', icon: FileSpreadsheet },
          { id: 'bellcurve', label: 'Bell Curve Calibration', icon: PieChart },
          { id: 'reminders', label: 'Reminders & Notifications', icon: Mail },
          { id: 'disagreements', label: 'Disagreement Register', icon: FileCheck },
          { id: 'email-config', label: 'Email & Exchange Setup', icon: Mail },
          { id: 'security', label: 'Security & Key Vault', icon: Lock },
          { id: 'audit', label: 'Audit & Compliance Logs', icon: Shield },
        ];
      case 'PmwAdmin':
        return [
          { id: 'dashboard', label: 'Cycle Control Center', icon: LayoutDashboard },
          { id: 'cycles', label: 'Appraisal Cycles', icon: Settings },
          { id: 'organization', label: 'Groups & Grade Hierarchy', icon: Building2 },
          { id: 'employees', label: 'Employee Import & Data', icon: Users },
          { id: 'forms', label: 'Form Configurations', icon: FileSpreadsheet },
          { id: 'bellcurve', label: 'Bell Curve Calibration', icon: PieChart },
          { id: 'reminders', label: 'Reminders & Notifications', icon: Mail },
          { id: 'disagreements', label: 'Disagreement Register', icon: FileCheck },
          { id: 'audit', label: 'Audit & Compliance Logs', icon: Shield },
        ];
      case 'GroupPerformanceManager':
        return [
          { id: 'dashboard', label: 'Group Overview', icon: LayoutDashboard },
          { id: 'employees', label: 'Group Employee List', icon: Users },
          { id: 'bellcurve', label: 'Bell Curve Preview', icon: PieChart },
          { id: 'reminders', label: 'Send Reminders', icon: Mail },
          { id: 'disagreements', label: 'Group Disagreements', icon: FileCheck },
          { id: 'help', label: 'Policy & FAQs', icon: HelpCircle },
        ];
      case 'FirstAppraiser':
      case 'SecondAppraiser':
        return [
          { id: 'dashboard', label: 'Review Dashboard', icon: LayoutDashboard },
          { id: 'my-appraisal', label: 'My Appraisal Form', icon: FileCheck },
          { id: 'team-reviews', label: 'Team Reviews Inbox', icon: Users },
          { id: 'dev-reviews', label: 'Development Reviews', icon: BarChart3 },
          { id: 'help', label: 'Help & Policies', icon: HelpCircle },
        ];
      default: // Employee
        return [
          { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
          { id: 'my-appraisal', label: 'My Appraisal Form', icon: FileCheck },
          { id: 'dev-review', label: 'Development Review', icon: BarChart3 },
          { id: 'help', label: 'Help & Policy Circulars', icon: HelpCircle },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          {currentRole.replace(/([A-Z])/g, ' $1').trim()} Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150",
                isActive
                  ? "bg-emerald-800 text-white shadow-sm shadow-emerald-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-emerald-700")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl bg-gradient-to-br from-slate-900 to-emerald-950 p-4 text-white space-y-2">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
          <Shield className="h-4 w-4" />
          <span>Field Encryption Active</span>
        </div>
        <p className="text-[11px] text-slate-300">
          Scores & comments are AES-256-GCM encrypted in database.
        </p>
      </div>
    </aside>
  );
};
