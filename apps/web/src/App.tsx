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
import { EmailConfigurationPage } from './pages/admin/EmailConfigurationPage';
import { CycleSnapshotManagerPage } from './pages/pmw/CycleSnapshotManagerPage';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('Employee');
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
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    // PmwSuperAdmin full management capabilities (Cycles, Users, Employees, Security, Email, Audit)
    if (userRole === 'PmwSuperAdmin') {
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
        case 'users':
          return <UserManagementPage />;
        case 'organization':
          return <OrganizationManagementPage userRole={userRole} />;
        case 'employees':
          return <EmployeeDataPage userRole={userRole} />;
        case 'forms':
          return <ObjectiveFormPage formType="BSC" />;
        case 'bellcurve':
          return <BellCurvePage />;
        case 'reminders':
          return <RemindersPage />;
        case 'disagreements':
          return <DisagreementRegisterPage />;
        case 'email-config':
          return <EmailConfigurationPage />;
        case 'security':
          return <SecurityKeyVaultPage />;
        case 'audit':
          return <AuditLogPage />;
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
          return (
            <PmwDashboard
              userRole={userRole}
              selectedCycleId={selectedCycleId}
              onSelectCycle={setSelectedCycleId}
              onNavigate={setActiveTab}
            />
          );
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
