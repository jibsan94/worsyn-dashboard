import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

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
  '/settings':              { label: 'Configuración',  parent: 'Sistema' },
  '/settings/database':     { label: 'Base de datos',   parent: 'Configuración' },
  '/settings/general':      { label: 'General',          parent: 'Configuración' },
  '/settings/security':     { label: 'Seguridad',        parent: 'Configuración' },
  '/settings/email':        { label: 'Correo SMTP',      parent: 'Configuración' },
  '/settings/integrations': { label: 'Integraciones',    parent: 'Configuración' },
}

export default function Navbar() {
  const location = useLocation()
  const page = titles[location.pathname] ?? { label: 'Worsyn', parent: 'Admin' }

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ }
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

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
        <div className="topbar-avatar">W</div>
      </div>
    </header>
  )
}
