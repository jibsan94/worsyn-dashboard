import { NavLink, useLocation } from 'react-router-dom'

const nav = [
  {
    label: 'Dashboard',
    path: '/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Organizaciones',
    path: '/organizations',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 10v4m0 3v1M12 10v4m0 3v1M16 10v4m0 3v1"/>
      </svg>
    ),
  },
  {
    label: 'Usuarios',
    path: '/users',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Facturación',
    path: '/billing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    label: 'Sistema',
    path: '/system',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const location = useLocation()
  return (
    <aside className="d-sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-logo">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div className="brand-text">
          <div className="brand-name">Worsyn</div>
          <div className="brand-tag">ADMIN PANEL</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-section">
        <div className="nav-label">Principal</div>
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={`nav-link${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? ' is-active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="workspace">
          <div className="workspace-avatar">W</div>
          <div className="workspace-text">
            <div className="workspace-name">Operador</div>
            <div className="workspace-role">admin@worsyn.app</div>
          </div>
          <div className="workspace-chev">
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </aside>
  )
}
