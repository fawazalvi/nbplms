import React from 'react';
import { Bell, ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface NavbarProps {
  userRole: string;
  currentUser?: any;
  onRoleChange: (role: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userRole, currentUser, onRoleChange, onLogout }) => {
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-900/10 bg-white/95 backdrop-blur shadow-xs">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {/* Official NBP Header Logo */}
            <img
              src="/nbp-logo.png"
              alt="National Bank of Pakistan"
              className="h-10 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
            />
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">NATIONAL BANK OF PAKISTAN</span>
                <Badge variant="nbp" className="text-[10px] px-1.5 py-0">PMS 2.0</Badge>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">Performance Management System | Strategy & Rewards Division</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Role Selector */}
          <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-semibold text-slate-600">Role:</span>
            <select
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="EndUser">End User (Staff & Appraiser)</option>
              <option value="GroupPerformanceManager">Group Perf. Manager (GPM)</option>
              <option value="PmwAdmin">PMW Admin</option>
              <option value="PmwSuperAdmin">PMW Super Admin</option>
              <option value="Auditor">Auditor</option>
              <option value="SystemSupport">System Support</option>
            </select>
          </div>

          <button className="relative p-2 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
          </button>

          <div className="flex items-center space-x-3 border-l border-slate-200 pl-3">
            <div className="h-9 w-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {getInitials(currentUser?.fullName || 'User')}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">
                {currentUser?.fullName || (userRole === 'PmwSuperAdmin' ? 'System Administrator' : 'Fawaz Ahmed')}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                {currentUser?.sapId ? `SAP ID: ${currentUser.sapId}` : `User: ${currentUser?.username || 'admin'}`} | {userRole}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} title="Sign Out">
              <LogOut className="h-4 w-4 text-slate-500 hover:text-red-600" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
