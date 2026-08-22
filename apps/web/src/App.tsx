import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/auth/LoginPage';
import { EmployeeDashboard } from './pages/dashboard/EmployeeDashboard';
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

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('Employee');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

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

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    // PmwSuperAdmin restricted from Appraisal Cycles, Cycle Control Center, and Disagreements
    if (userRole === 'PmwSuperAdmin') {
      switch (activeTab) {
        case 'users':
          return <UserManagementPage />;
        case 'organization':
          return <OrganizationManagementPage />;
        case 'employees':
          return <EmployeeDataPage />;
        case 'security':
          return <SecurityKeyVaultPage />;
        case 'audit':
          return <AuditLogPage />;
        case 'dashboard':
        default:
          return <SuperAdminDashboard onNavigate={setActiveTab} />;
      }
    }

    switch (activeTab) {
      case 'cycles':
        return <AppraisalCyclesPage />;
      case 'organization':
        return <OrganizationManagementPage />;
      case 'users':
        return <UserManagementPage />;
      case 'employees':
        return <EmployeeDataPage />;
      case 'my-appraisal':
      case 'forms':
        return <ObjectiveFormPage formType={userRole === 'PmwAdmin' ? 'BSC' : 'KPI'} />;
      case 'team-reviews':
        return <TeamReviewInboxPage />;
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
      case 'help':
        return <HelpCircularsPage />;
      case 'dashboard':
      default:
        if (userRole === 'PmwAdmin') {
          return <PmwDashboard onNavigate={setActiveTab} />;
        }
        return <EmployeeDashboard onNavigate={setActiveTab} />;
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
      <div className="flex flex-1">
        <Sidebar
          currentRole={userRole}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
