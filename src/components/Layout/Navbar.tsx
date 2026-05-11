import { useLocation } from 'react-router-dom'

const titles: Record<string, { label: string; parent: string }> = {
  '/':              { label: 'Dashboard',      parent: 'Worsyn Admin' },
  '/organizations': { label: 'Organizaciones', parent: 'Gestión' },
  '/users':         { label: 'Usuarios',       parent: 'Gestión' },
  '/billing':       { label: 'Facturación',    parent: 'Finanzas' },
  '/system':        { label: 'Sistema',        parent: 'Infraestructura' },
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
        <button className="icon-btn" title="Configuración">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <div className="topbar-avatar">W</div>
      </div>
    </header>
  )
}
