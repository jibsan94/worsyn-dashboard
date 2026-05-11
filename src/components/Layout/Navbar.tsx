import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const THEME_KEY = 'worsyn-theme'

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
  </svg>
)

const titles: Record<string, { label: string; parent: string }> = {
  '/':              { label: 'Dashboard',      parent: 'Worsyn Admin' },
  '/organizations': { label: 'Organizaciones', parent: 'Gestión' },
  '/users':         { label: 'Usuarios',       parent: 'Gestión' },
  '/billing':       { label: 'Facturación',    parent: 'Finanzas' },
  '/system':        { label: 'Sistema',        parent: 'Infraestructura' },
  '/system-users':  { label: 'Usuarios del Sistema', parent: 'Principal' },
  '/profile':               { label: 'Mi Perfil',      parent: 'Cuenta' },
  '/settings':              { label: 'Configuración',  parent: 'Sistema' },
  '/settings/database':     { label: 'Base de datos',   parent: 'Configuración' },
  '/settings/general':      { label: 'General',          parent: 'Configuración' },
  '/settings/security':     { label: 'Seguridad',        parent: 'Configuración' },
  '/settings/email':        { label: 'Correo SMTP',      parent: 'Configuración' },
  '/settings/integrations': { label: 'Integraciones',    parent: 'Configuración' },
}

export default function Navbar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, clearSession } = useAuth()
  const page = titles[location.pathname] ?? { label: 'Worsyn', parent: 'Admin' }

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light' } catch { return 'light' }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ }
  }, [theme])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  // Avatar initials from username or full_name
  const initials = user
    ? (user.full_name
        ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : user.username.slice(0, 2).toUpperCase())
    : 'W'

  return (
    <header className="d-topbar">
      <div className="crumbs">
        <span>{page.parent}</span>
        <span className="sep">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </span>
        <span className="current">{page.label}</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" title="Notificaciones">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          aria-label="Alternar tema"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>

        {/* User avatar + dropdown */}
        <div className="user-menu-wrap" ref={menuRef}>
          <div
            className="topbar-avatar"
            onClick={() => setMenuOpen(o => !o)}
            title={user?.username ?? 'Usuario'}
            role="button"
            aria-expanded={menuOpen}
          >
            {initials}
          </div>

          {menuOpen && (
            <div className="user-menu-dropdown">
              <div className="user-menu-header">
                <div className="user-menu-name">{user?.full_name ?? user?.username ?? '—'}</div>
                <div className="user-menu-role">{user?.role ?? ''}</div>
              </div>

              <button className="user-menu-item" onClick={() => { setMenuOpen(false); navigate('/profile') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Perfil
              </button>

              <div className="user-menu-divider" />

              <button className="user-menu-item danger" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
