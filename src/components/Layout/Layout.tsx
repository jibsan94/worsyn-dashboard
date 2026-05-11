import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const { user } = useAuth()

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Navbar />
        {user?.must_change_password && (
          <div className="pwd-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Debes cambiar tu contrase&ntilde;a antes de continuar. Ve a <strong>Configuraci&oacute;n &rsaquo; Seguridad</strong>.</span>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  )
}
