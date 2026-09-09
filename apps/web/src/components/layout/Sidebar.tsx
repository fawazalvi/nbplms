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
  Layers,
  Database,
  GraduationCap,
  UserCheck,
  MapPin
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
            title: 'System Administration',
            items: [
              { id: 'dashboard', label: 'System Admin Center', icon: LayoutDashboard },
              { id: 'workflow-management', label: 'Workflow Engine Console', icon: Settings },
            ]
          },
          {
            title: 'Master Data Governance',
            items: [
              { id: 'employees', label: 'Master Employee Directory', icon: Users },
              { id: 'organization', label: 'Master Groups & Grades', icon: Building2 },
              { id: 'locations', label: 'Hierarchical Locations', icon: MapPin },
              { id: 'appraiser-setup', label: 'Appraiser Hierarchy Setup', icon: UserCog },
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
          },
          {
            title: 'Database & Maintenance',
            items: [
              { id: 'db-tools', label: 'Database Admin Tools', icon: Database },
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
            title: 'Cycle & Snapshot Management',
            items: [
              { id: 'cycles', label: 'Appraisal Cycles', icon: Calendar },
              { id: 'cycle-snapshots', label: 'Cycle Snapshot & Rosters', icon: Layers },
              { id: 'locations', label: 'Hierarchical Locations', icon: MapPin },
              { id: 'gpm-reports', label: 'Group HRBP Operations', icon: Building2 },
            ]
          },
          {
            title: 'Evaluation & Workflows',
            items: [
              { id: 'workflow-management', label: 'Workflow Engine Console', icon: Settings },
              { id: 'appraiser-setup', label: 'Appraiser Hierarchy Setup', icon: UserCog },
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
            title: 'HRBP Operations & Coordination',
            items: [
              { id: 'dashboard', label: 'Operations Pipeline Hub', icon: LayoutDashboard },
              { id: 'gpm-supervisors', label: 'Supervisor Action List', icon: UserCheck },
              { id: 'employees', label: 'Group Appraisal Roster', icon: Users },
            ]
          },
          {
            title: 'Governance & Calibration',
            items: [
              { id: 'bellcurve', label: 'Bell Curve Calibration', icon: Scale },
              { id: 'disagreements', label: 'Disagreement Register', icon: FileCheck },
              { id: 'reminders', label: 'Send Reminders & Nudges', icon: Send },
            ]
          },
          {
            title: 'Policy & Resources',
            items: [
              { id: 'workflow-swimlane', label: 'Workflow Guide & Slideshow', icon: Layers },
              { id: 'help', label: 'Policy & FAQs', icon: HelpCircle },
            ]
          }
        ];

      case 'EndUser':
      case 'Employee':
      case 'FirstAppraiser':
      case 'SecondAppraiser':
      default:
        return [
          {
            title: 'My Performance & Goals',
            items: [
              { id: 'dashboard', label: 'My Performance Center', icon: LayoutDashboard },
              { id: 'profile', label: 'My Employee Profile', icon: UserCheck },
            ]
          },
          {
            title: 'Appraisals to Conduct (Team / Peers)',
            items: [
              { id: 'team-reviews', label: 'Team Reviews Inbox', icon: Users },
            ]
          },
          {
            title: 'Support & Policy',
            items: [
              { id: 'help', label: 'Policy, Circulars & FAQs', icon: HelpCircle },
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

    </aside>
  );
};
