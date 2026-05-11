import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import DashboardPage from './pages/Dashboard'
import OrganizationsPage from './pages/Organizations'
import UsersPage from './pages/Users'
import BillingPage from './pages/Billing'
import SystemPage from './pages/System'
import SystemUsersPage from './pages/SystemUsers'
import SettingsPage from './pages/Settings'
import SettingsGeneralPage from './pages/SettingsGeneral'
import SettingsSecurityPage from './pages/SettingsSecurity'
import SettingsEmailPage from './pages/SettingsEmail'
import SettingsIntegrationsPage from './pages/SettingsIntegrations'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/system-users" element={<SystemUsersPage />} />
          <Route path="/settings" element={<Navigate to="/settings/database" replace />} />
          <Route path="/settings/database" element={<SettingsPage />} />
          <Route path="/settings/general" element={<SettingsGeneralPage />} />
          <Route path="/settings/security" element={<SettingsSecurityPage />} />
          <Route path="/settings/email" element={<SettingsEmailPage />} />
          <Route path="/settings/integrations" element={<SettingsIntegrationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
