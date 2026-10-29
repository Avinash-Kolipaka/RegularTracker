import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { AppLayout } from './components/AppLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PasswordResetPage } from './pages/PasswordResetPage';

// Workspace & Protected Pages
import { OnboardingWizardPage } from './pages/OnboardingWizardPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegulatoryLibraryPage } from './pages/RegulatoryLibraryPage';
import { RequirementDetailPage } from './pages/RequirementDetailPage';
import { ApplicabilityReviewPage } from './pages/ApplicabilityReviewPage';
import { RegulatoryUpdatesPage } from './pages/RegulatoryUpdatesPage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { DocumentVaultPage } from './pages/DocumentVaultPage';
import { TeamManagementPage } from './pages/TeamManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SourceMonitoringAdminPage } from './pages/SourceMonitoringAdminPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

// Error Pages
import { NotFoundPage } from './pages/NotFoundPage';
import { ForbiddenPage } from './pages/ForbiddenPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />

              {/* Protected App Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/onboarding" element={<OnboardingWizardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/requirements" element={<RegulatoryLibraryPage />} />
                <Route path="/requirements/:requirementId" element={<RequirementDetailPage />} />
                <Route path="/applicability" element={<ApplicabilityReviewPage />} />
                <Route path="/updates" element={<RegulatoryUpdatesPage />} />
                <Route path="/tasks" element={<TaskBoardPage />} />
                <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/vault" element={<DocumentVaultPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/team" element={<TeamManagementPage />} />
                <Route path="/settings" element={<ProfileSettingsPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
                <Route path="/monitoring" element={<SourceMonitoringAdminPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
