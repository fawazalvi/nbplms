import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { PmwDashboard } from './pages/dashboard/PmwDashboard';
import { SuperAdminDashboard } from './pages/dashboard/SuperAdminDashboard';
import { ObjectiveFormPage } from './pages/forms/ObjectiveFormPage';
import { DevelopmentReviewPage } from './pages/forms/DevelopmentReviewPage';
import { BellCurvePage } from './pages/pmw/BellCurvePage';
import { DisagreementRegisterPage } from './pages/pmw/DisagreementRegisterPage';
import { RemindersPage } from './pages/pmw/RemindersPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { AppraisalCyclesPage } from './pages/pmw/AppraisalCyclesPage';
import { EmployeeDataPage } from './pages/pmw/EmployeeDataPage';
import { TeamReviewInboxPage } from './pages/appraiser/TeamReviewInboxPage';
import { SecurityKeyVaultPage } from './pages/admin/SecurityKeyVaultPage';
import { HelpCircularsPage } from './pages/help/HelpCircularsPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { OrganizationManagementPage } from './pages/admin/OrganizationManagementPage';
import { EmailConfigurationPage } from './pages/admin/EmailConfigurationPage';
import { CycleSnapshotManagerPage } from './pages/pmw/CycleSnapshotManagerPage';
import { DatabaseToolsPage } from './pages/admin/DatabaseToolsPage';
import { WorkflowManagementPage } from './pages/admin/WorkflowManagementPage';
import { AppraiserSetupPage } from './pages/forms/AppraiserSetupPage';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('EndUser');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setUserRole(user.roles && user.roles.length > 0 ? user.roles[0] : 'Employee');
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleSelectCycle = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setActiveTab(userRole === 'PmwSuperAdmin' ? 'cycle-control' : 'dashboard');
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
      </Routes>
    );
  }

  const renderContent = () => {
    // PmwSuperAdmin: Master Data Management (Employees, Groups, Grades, CSV Uploads) & System Governance
    if (userRole === 'PmwSuperAdmin') {
      switch (activeTab) {
        case 'employees':
          return <EmployeeDataPage userRole={userRole} />;
        case 'organization':
          return <OrganizationManagementPage userRole={userRole} />;
        case 'users':
          return <UserManagementPage />;
        case 'email-config':
          return <EmailConfigurationPage />;
        case 'security':
          return <SecurityKeyVaultPage />;
        case 'audit':
          return <AuditLogPage />;
        case 'db-tools':
          return <DatabaseToolsPage userRole={userRole} />;
        case 'workflow-management':
          return <WorkflowManagementPage userRole={userRole} />;
        case 'dashboard':
        default:
          return <SuperAdminDashboard onSelectCycle={handleSelectCycle} onNavigate={setActiveTab} />;
      }
    }

    switch (activeTab) {
      case 'cycles':
        return <AppraisalCyclesPage userRole={userRole} onSelectCycle={handleSelectCycle} onNavigate={setActiveTab} />;
      case 'cycle-control':
        return (
          <PmwDashboard
            userRole={userRole}
            selectedCycleId={selectedCycleId}
            onSelectCycle={setSelectedCycleId}
            onNavigate={setActiveTab}
          />
        );
      case 'cycle-snapshots':
      case 'cycle-roster':
        return (
          <CycleSnapshotManagerPage
            userRole={userRole}
            selectedCycleId={selectedCycleId}
            onSelectCycle={setSelectedCycleId}
            onNavigate={setActiveTab}
          />
        );
      case 'organization':
      case 'employees':
        if (userRole === 'PmwAdmin') {
          return (
            <CycleSnapshotManagerPage
              userRole={userRole}
              selectedCycleId={selectedCycleId}
              onSelectCycle={setSelectedCycleId}
              onNavigate={setActiveTab}
            />
          );
        }
        return <EmployeeDataPage userRole={userRole} />;
      case 'my-appraisal':
      case 'forms':
        return <ObjectiveFormPage formType={userRole === 'PmwAdmin' ? 'BSC' : 'KPI'} />;
      case 'appraiser-setup':
        return <AppraiserSetupPage userRole={userRole} onNavigate={setActiveTab} />;
      case 'team-reviews':
        return <TeamReviewInboxPage currentUser={currentUser} userRole={userRole} />;
      case 'my-dev-review':
      case 'dev-review':
      case 'dev-reviews':
        return <DevelopmentReviewPage userRole={userRole} />;
      case 'bellcurve':
        return <BellCurvePage />;
      case 'disagreements':
        return <DisagreementRegisterPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'audit':
        return <AuditLogPage />;
      case 'security':
        return <SecurityKeyVaultPage />;
      case 'db-tools':
        return <DatabaseToolsPage userRole={userRole} />;
      case 'workflow-management':
        return <WorkflowManagementPage userRole={userRole} />;
      case 'help':
        return <HelpCircularsPage />;
      case 'dashboard':
      default:
        if (userRole === 'PmwAdmin') {
          return (
            <PmwDashboard
              userRole={userRole}
              selectedCycleId={selectedCycleId}
              onSelectCycle={setSelectedCycleId}
              onNavigate={setActiveTab}
            />
          );
        }
        return <ObjectiveFormPage formType={userRole === 'GroupPerformanceManager' ? 'BSC' : 'KPI'} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        userRole={userRole}
        currentUser={currentUser}
        onRoleChange={(role) => {
          setUserRole(role);
          setActiveTab('dashboard');
        }}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentRole={userRole}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="flex-1 p-6 overflow-y-auto pb-24">
          {renderContent()}
        </main>
      </div>

      {/* Global Persistent Footer */}
      <div className="w-full bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-t border-emerald-800 p-2 text-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 fixed bottom-0 left-0 flex items-center justify-center space-x-2">
        <svg className="h-4 w-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        <p className="text-[10px] sm:text-xs text-emerald-100 font-medium tracking-wide">
          Designed & Developed by <strong className="font-bold text-white uppercase tracking-wider">HR Digital Transformation Team</strong> — SPB&DTW, SP&RD, HRMG
        </p>
      </div>
    </div>
  );
}

export default App;
