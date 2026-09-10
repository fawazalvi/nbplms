import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api, getAuthToken } from './lib/api';
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onResetTab?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold border border-red-200">
            !
          </div>
          <h2 className="text-base font-bold text-slate-900">Module Display Notice</h2>
          <p className="text-xs text-slate-600 font-medium">
            {this.state.error?.message || 'The selected module encountered an unexpected error during loading.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onResetTab) this.props.onResetTab();
                else window.location.reload();
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getAuthToken());
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    return api.getCachedUser();
  });
  const [userRole, setUserRole] = useState<string>(() => {
    const cached = api.getCachedUser();
    const savedRole = typeof window !== 'undefined' ? sessionStorage.getItem('nbp_pms_user_role') : null;
    if (savedRole) {
      const isAdmin = cached?.roles?.some((r: string) => r === 'PmwSuperAdmin' || r === 'PmwAdmin');
      if (isAdmin || cached?.roles?.includes(savedRole)) {
        return savedRole;
      }
    }
    return cached?.roles?.[0] || 'Employee';
  });
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return (typeof window !== 'undefined' ? sessionStorage.getItem('nbp_pms_active_tab') : null) || 'dashboard';
  });
  const [selectedCycleId, setSelectedCycleIdState] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('nbp_pms_selected_cycle_id') : null;
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nbp_pms_active_tab', tab);
    }
  };

  const setSelectedCycleId = (cycleId: string | null) => {
    setSelectedCycleIdState(cycleId);
    if (typeof window !== 'undefined') {
      if (cycleId) sessionStorage.setItem('nbp_pms_selected_cycle_id', cycleId);
      else sessionStorage.removeItem('nbp_pms_selected_cycle_id');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const token = getAuthToken();
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const user = await api.getMe();
        if (!isMounted) return;

        if (user && user.username) {
          setCurrentUser(user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('nbp_pms_user', JSON.stringify(user));
          }
          const savedRole = typeof window !== 'undefined' ? sessionStorage.getItem('nbp_pms_user_role') : null;
          const isAdmin = user.roles?.some((r: string) => r === 'PmwSuperAdmin' || r === 'PmwAdmin');
          const effectiveRole = (savedRole && (isAdmin || user.roles?.includes(savedRole)))
            ? savedRole
            : (user.roles?.[0] || 'Employee');
          setUserRole(effectiveRole);
          setIsAuthenticated(true);
        } else {
          api.logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Session restoration verification:', err);
        const errMsg = (err?.message || '').toLowerCase();
        // ONLY log out if the backend explicitly responded with 401 Unauthorized
        if (errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('not authenticated')) {
          api.logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else {
          // Keep session active for transient network errors, rate limiting, 500s, etc.
          console.warn('Transient error during session restoration, preserving existing session.');
          setIsAuthenticated(true);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    const initialRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'Employee';
    setUserRole(initialRole);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nbp_pms_user_role', initialRole);
      if (window.location.pathname === '/login' || window.location.pathname.startsWith('/reset-password')) {
        window.history.replaceState(null, '', '/');
      }
    }
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  const handleRoleChange = (role: string) => {
    setUserRole(role);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nbp_pms_user_role', role);
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nbp_pms_active_tab');
      sessionStorage.removeItem('nbp_pms_user_role');
      sessionStorage.removeItem('nbp_pms_selected_cycle_id');
    }
  };

  const handleSelectCycle = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setActiveTab(userRole === 'PmwSuperAdmin' ? 'cycle-control' : 'dashboard');
  };

  if (isCheckingAuth && !currentUser && Boolean(getAuthToken())) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-2xl shadow-2xl shadow-emerald-900/60 animate-pulse border border-emerald-400/20">
            NBP
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold text-slate-100 tracking-tight">National Bank of Pakistan</h2>
            <p className="text-xs text-emerald-400 font-medium tracking-wide">Restoring secure session...</p>
          </div>
          <div className="w-40 h-1 bg-emerald-950/60 rounded-full overflow-hidden mt-1 border border-emerald-800/40">
            <div className="w-full h-full bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

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
    switch (activeTab) {
      // ─── Dashboard ───
      case 'dashboard':
        if (userRole === 'PmwSuperAdmin') {
          return <SuperAdminDashboard onSelectCycle={handleSelectCycle} onNavigate={setActiveTab} />;
        }
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
        return <ObjectiveFormPage currentUser={currentUser} userRole={userRole} formType="KPI" />;

      // ─── Appraisal Cycles & Cycle Control ───
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

      // ─── Cycle Snapshots & Rosters ───
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

      // ─── GPM Operations & HRBP Hub ───
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

      // ─── Organization & Employees Master Data ───
      case 'organization':
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
        return <OrganizationManagementPage userRole={userRole} />;

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

      // ─── Hierarchical Locations ───
      case 'locations':
        return <LocationManagementPage userRole={userRole} />;

      // ─── Appraiser Hierarchy Setup ───
      case 'appraiser-setup':
        return <AppraiserSetupPage currentUser={currentUser} userRole={userRole} onNavigate={setActiveTab} />;

      // ─── User & Role Management ───
      case 'users':
        return <UserManagementPage />;

      // ─── Email & Exchange Configuration ───
      case 'email-config':
        return <EmailConfigurationPage />;

      // ─── Security Key Vault ───
      case 'security':
        return <SecurityKeyVaultPage />;

      // ─── Audit & Compliance Logs ───
      case 'audit':
        return <AuditLogPage />;

      // ─── Database Admin Tools ───
      case 'db-tools':
        return <DatabaseToolsPage userRole={userRole} />;

      // ─── Workflow Engine Console & Guides ───
      case 'workflow-management':
        return <WorkflowManagementPage userRole={userRole} />;

      case 'workflow-swimlane':
      case 'workflow-guide':
        return <WorkflowSwimlanePage />;

      // ─── Employee Profiles ───
      case 'profile':
      case 'my-profile':
        return <EmployeeProfilePage currentUser={currentUser} userRole={userRole} />;

      // ─── Appraisal Forms ───
      case 'my-appraisal':
      case 'forms':
        return (
          <ObjectiveFormPage
            currentUser={currentUser}
            userRole={userRole}
            formType={userRole === 'PmwAdmin' ? 'BSC' : 'KPI'}
          />
        );

      // ─── Appraiser Team Reviews Inbox ───
      case 'team-reviews':
        return <TeamReviewInboxPage currentUser={currentUser} userRole={userRole} />;

      // ─── Development Review Form ───
      case 'my-dev-review':
      case 'dev-review':
      case 'dev-reviews':
        return <DevelopmentReviewPage currentUser={currentUser} userRole={userRole} />;

      // ─── Bell Curve Calibration ───
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

      // ─── Disagreement Register ───
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

      // ─── Reminders & Notifications ───
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

      // ─── Policy & Circulars ───
      case 'help':
        return <HelpCircularsPage />;

      default:
        if (userRole === 'PmwSuperAdmin') {
          return <SuperAdminDashboard onSelectCycle={handleSelectCycle} onNavigate={setActiveTab} />;
        }
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
        return <ObjectiveFormPage currentUser={currentUser} userRole={userRole} formType="KPI" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        userRole={userRole}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
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
          <ErrorBoundary onResetTab={() => setActiveTab('dashboard')}>
            {renderContent()}
          </ErrorBoundary>
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
