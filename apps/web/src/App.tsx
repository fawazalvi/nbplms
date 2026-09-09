import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { WorkflowSwimlanePage } from './pages/help/WorkflowSwimlanePage';
import { GpmOperationsDashboard } from './pages/gpm/GpmOperationsDashboard';
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
import { LocationManagementPage } from './pages/admin/LocationManagementPage';
import { EmployeeProfilePage } from './pages/profile/EmployeeProfilePage';
import { EmployeeProfileModal } from './pages/profile/EmployeeProfileModal';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('EndUser');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
        <Route path="/workflow-swimlane" element={<WorkflowSwimlanePage />} />
        <Route path="/workflow" element={<WorkflowSwimlanePage />} />
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
        case 'locations':
          return <LocationManagementPage userRole={userRole} />;
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
        case 'workflow-swimlane':
        case 'workflow-guide':
          return <WorkflowSwimlanePage />;
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
      case 'gpm-reports':
      case 'gpm-operations':
      case 'gpm-supervisors':
        return (
          <GpmOperationsDashboard
            userRole={userRole}
            currentUser={currentUser}
            onNavigate={setActiveTab}
            defaultView={activeTab === 'gpm-supervisors' ? 'supervisors' : 'overview'}
          />
        );
      case 'organization':
      case 'employees':
        if (userRole === 'GroupPerformanceManager') {
          return (
            <GpmOperationsDashboard
              userRole={userRole}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              defaultView="roster"
            />
          );
        }
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
      case 'locations':
        return <LocationManagementPage userRole={userRole} />;
      case 'profile':
      case 'my-profile':
        return <EmployeeProfilePage currentUser={currentUser} userRole={userRole} />;
      case 'my-appraisal':
      case 'forms':
        return <ObjectiveFormPage currentUser={currentUser} userRole={userRole} formType={userRole === 'PmwAdmin' ? 'BSC' : 'KPI'} />;
      case 'appraiser-setup':
        return <AppraiserSetupPage currentUser={currentUser} userRole={userRole} onNavigate={setActiveTab} />;
      case 'team-reviews':
        return <TeamReviewInboxPage currentUser={currentUser} userRole={userRole} />;
      case 'my-dev-review':
      case 'dev-review':
      case 'dev-reviews':
        return <DevelopmentReviewPage currentUser={currentUser} userRole={userRole} />;
      case 'bellcurve':
        if (userRole === 'GroupPerformanceManager') {
          return (
            <GpmOperationsDashboard
              userRole={userRole}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              defaultView="bellcurve"
            />
          );
        }
        return <BellCurvePage />;
      case 'disagreements':
        if (userRole === 'GroupPerformanceManager') {
          return (
            <GpmOperationsDashboard
              userRole={userRole}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              defaultView="disputes"
            />
          );
        }
        return <DisagreementRegisterPage />;
      case 'reminders':
        if (userRole === 'GroupPerformanceManager') {
          return (
            <GpmOperationsDashboard
              userRole={userRole}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              defaultView="supervisors"
            />
          );
        }
        return <RemindersPage />;
      case 'audit':
        return <AuditLogPage />;
      case 'security':
        return <SecurityKeyVaultPage />;
      case 'db-tools':
        return <DatabaseToolsPage userRole={userRole} />;
      case 'workflow-management':
        return <WorkflowManagementPage userRole={userRole} />;
      case 'workflow-swimlane':
      case 'workflow-guide':
        return <WorkflowSwimlanePage />;
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
        if (userRole === 'GroupPerformanceManager') {
          return (
            <GpmOperationsDashboard
              userRole={userRole}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              defaultView="overview"
            />
          );
        }
        return <ObjectiveFormPage currentUser={currentUser} formType="KPI" />;
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
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentRole={userRole}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>

      {/* Global Employee Profile Modal (Mounted via React Portal) */}
      <EmployeeProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        sapId={currentUser?.sapId || currentUser?.username}
        currentUser={currentUser}
      />
    </div>
  );
}

export default App;
