import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, AdminRole } from '../context/AuthContext'

interface Props {
  roles: AdminRole[]
}

/** Redirects to / if the current user doesn't have one of the required roles. */
export default function RoleRoute({ roles }: Props) {
  const { hasRole } = useAuth()
  if (!hasRole(...roles)) return <Navigate to="/" replace />
  return <Outlet />
}
