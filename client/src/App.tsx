import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import PersoneList from './pages/PersoneList';
import PersonForm from './pages/PersonForm';
import PersonaDetails from './pages/PersonaDetails';

import AssembliesList from './pages/AssembliesList';
import AssemblyDetail from './pages/AssemblyDetail';
import TimelineView from './pages/TimelineView';
import BoardGenerationsList from './pages/BoardGenerationsList';
import SettingsPage from './pages/SettingsPage';
import CompliancePage from './pages/CompliancePage';
import RetentionPage from './pages/RetentionPage';
import DocumentiPage from './pages/DocumentiPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SetPasswordPage from './pages/SetPasswordPage';
import JoinInvitePage from './pages/JoinInvitePage';

import { useAuth } from './hooks/useAuth';
import { useSetupStatus } from './hooks/useSetupStatus';
import LoginPage from './pages/LoginPage';
import SetupWizardPage from './pages/SetupWizardPage';
import { PERMISSIONS, type Permission } from './lib/permissions';
import { BrandingProvider } from './hooks/useBranding';

const AuthorizedRoute = ({ permission, element }: { permission: Permission; element: ReactElement }) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? element : <Navigate to="/" replace />;
};

function App() {
  const { isAuthenticated } = useAuth();
  const { needsSetup, deploymentMode, allowOrgCreation, loading: setupLoading, error: setupError } = useSetupStatus();

  // Global server health check — block all routes if server is unreachable
  if (setupError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-2xl font-bold text-white">Server Unreachable</h1>
            <p className="text-slate-300">
              Unable to connect to the server. Please check your connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (setupLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    // In open/SaaS mode, show login first; user creates org after authenticating
    if (deploymentMode === 'open') {
      return (
        <BrowserRouter>
          <BrandingProvider>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage mode="login" />} />
              <Route path="/auth/drive-callback" element={<AuthCallbackPage mode="drive" />} />
              <Route path="/set-password" element={<SetPasswordPage />} />
              <Route path="/join" element={<JoinInvitePage />} />
              <Route path="/signup" element={<SetupWizardPage />} />
              <Route path="*" element={<LoginPage />} />
            </Routes>
          </BrandingProvider>
        </BrowserRouter>
      );
    }

    // For other modes (single_org, invite_only, closed), jump straight to setup
    return (
      <BrowserRouter>
        <BrandingProvider>
          <Routes>
            <Route path="*" element={<SetupWizardPage />} />
          </Routes>
        </BrandingProvider>
      </BrowserRouter>
    );
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <BrandingProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage mode="login" />} />
            <Route path="/auth/drive-callback" element={<AuthCallbackPage mode="drive" />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/join" element={<JoinInvitePage />} />
            {allowOrgCreation && <Route path="/signup" element={<SetupWizardPage />} />}
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </BrandingProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage mode="login" />} />
        <Route path="/auth/drive-callback" element={<AuthCallbackPage mode="drive" />} />
        {allowOrgCreation && <Route path="/signup" element={<SetupWizardPage />} />}
        <Route path="/" element={<BrandingProvider><MainLayout /></BrandingProvider>}>
          <Route index element={<AuthorizedRoute permission={PERMISSIONS.dashboardView} element={<Dashboard />} />} />
          <Route path="people" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<PersoneList />} />} />
          <Route path="people/nuova" element={<AuthorizedRoute permission={PERMISSIONS.peopleEdit} element={<PersonForm />} />} />
          <Route path="people/:id" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<PersonaDetails />} />} />
          <Route path="volunteers" element={<Navigate to="/people" replace />} />
          <Route path="members" element={<Navigate to="/people" replace />} />
          <Route path="board" element={<AuthorizedRoute permission={PERMISSIONS.boardView} element={<BoardGenerationsList />} />} />
          <Route path="assemblies" element={<AuthorizedRoute permission={PERMISSIONS.assembliesView} element={<AssembliesList />} />} />
          <Route path="assemblies/:id" element={<AuthorizedRoute permission={PERMISSIONS.assembliesView} element={<AssemblyDetail />} />} />
          <Route path="convocations" element={<Navigate to="/assemblies" replace />} />
          <Route path="timeline" element={<AuthorizedRoute permission={PERMISSIONS.timelineView} element={<TimelineView />} />} />
          <Route path="compliance" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<CompliancePage />} />} />
          <Route path="retention" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<RetentionPage />} />} />
          <Route path="documents" element={<AuthorizedRoute permission={PERMISSIONS.documentsView} element={<DocumentiPage />} />} />
          <Route path="settings" element={<AuthorizedRoute permission={PERMISSIONS.settingsView} element={<SettingsPage />} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
