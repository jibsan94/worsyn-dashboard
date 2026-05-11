import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import DashboardPage from './pages/Dashboard'
import OrganizationsPage from './pages/Organizations'
import UsersPage from './pages/Users'
import BillingPage from './pages/Billing'
import SystemPage from './pages/System'

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
