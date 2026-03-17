import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import PersoneList from './pages/PersoneList';
import PersonaForm from './pages/PersonaForm';
import PersonaDetails from './pages/PersonaDetails';

import VolunteersList from './pages/VolunteersList';
import MembersList from './pages/MembersList';
import AssembliesList from './pages/AssembliesList';
import AssemblyDetail from './pages/AssemblyDetail';
import ConvocationsList from './pages/ConvocationsList';
import TimelineView from './pages/TimelineView';
import ResignationsList from './pages/ResignationsList';
import BoardGenerationsList from './pages/BoardGenerationsList';
import SettingsPage from './pages/SettingsPage';
import CompliancePage from './pages/CompliancePage';

import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import { PERMISSIONS, type Permission } from './lib/permissions';

const AuthorizedRoute = ({ permission, element }: { permission: Permission; element: ReactElement }) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? element : <Navigate to="/" replace />;
};

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<AuthorizedRoute permission={PERMISSIONS.dashboardView} element={<Dashboard />} />} />
          <Route path="people" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<PersoneList />} />} />
          <Route path="people/nuova" element={<AuthorizedRoute permission={PERMISSIONS.peopleEdit} element={<PersonaForm />} />} />
          <Route path="people/:id" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<PersonaDetails />} />} />
          <Route path="volunteers" element={<AuthorizedRoute permission={PERMISSIONS.volunteersView} element={<VolunteersList />} />} />
          <Route path="members" element={<AuthorizedRoute permission={PERMISSIONS.membersView} element={<MembersList />} />} />
          <Route path="board" element={<AuthorizedRoute permission={PERMISSIONS.boardView} element={<BoardGenerationsList />} />} />
          <Route path="assemblies" element={<AuthorizedRoute permission={PERMISSIONS.assembliesView} element={<AssembliesList />} />} />
          <Route path="assemblies/:id" element={<AuthorizedRoute permission={PERMISSIONS.assembliesView} element={<AssemblyDetail />} />} />
          <Route path="convocations" element={<AuthorizedRoute permission={PERMISSIONS.convocationsView} element={<ConvocationsList />} />} />
          <Route path="timeline" element={<AuthorizedRoute permission={PERMISSIONS.timelineView} element={<TimelineView />} />} />
          <Route path="resignations" element={<AuthorizedRoute permission={PERMISSIONS.resignationsView} element={<ResignationsList />} />} />
          <Route path="compliance" element={<AuthorizedRoute permission={PERMISSIONS.peopleView} element={<CompliancePage />} />} />
          <Route path="settings" element={<AuthorizedRoute permission={PERMISSIONS.settingsView} element={<SettingsPage />} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
