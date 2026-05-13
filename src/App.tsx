import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import OrganizationsPage from './pages/Organizations'
import OrganizationDetailPage from './pages/OrganizationDetail'
import UsersPage from './pages/Users'
import BillingPage from './pages/Billing'
import SystemPage from './pages/System'
import SystemUsersPage from './pages/SystemUsers'
import ProfilePage from './pages/Profile'
import SettingsPage from './pages/Settings'
import SettingsGeneralPage from './pages/SettingsGeneral'
import SettingsSecurityPage from './pages/SettingsSecurity'
import SettingsEmailPage from './pages/SettingsEmail'
import SettingsIntegrationsPage from './pages/SettingsIntegrations'
import TenantPortalPage from './pages/TenantPortal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/:slug" element={<TenantPortalPage />} />

        {/* Protected — requires auth */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Settings — admin + owner only */}
            <Route element={<RoleRoute roles={['admin', 'owner']} />}>
              <Route path="/settings" element={<Navigate to="/settings/database" replace />} />
              <Route path="/settings/database" element={<SettingsPage />} />
              <Route path="/settings/general" element={<SettingsGeneralPage />} />
              <Route path="/settings/security" element={<SettingsSecurityPage />} />
              <Route path="/settings/email" element={<SettingsEmailPage />} />
              <Route path="/settings/integrations" element={<SettingsIntegrationsPage />} />
            </Route>
            {/* System users — admin + owner only */}
            <Route element={<RoleRoute roles={['admin', 'owner']} />}>
              <Route path="/system-users" element={<SystemUsersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
