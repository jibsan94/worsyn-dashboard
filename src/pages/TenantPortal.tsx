import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgInfo { id: string; name: string; slug: string; alias: string | null; plan: string }
type Screen   = 'loading' | 'not-found' | 'login' | 'app'
type TModule  = 'principal' | 'servicios' | 'personas' | 'equipos' | 'partituras' | 'eventos' | 'ensayos' | 'calendario' | 'finanzas'

interface Person {
  id: string; name: string; initials: string; color: string
  ministry: string; role: string; phone: string; email: string
  status: 'active' | 'inactive'; joined: string
}

// ── Token palette ──────────────────────────────────────────────────────────────

const C = {
  bg:      '#F8FAFC',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  soft:    '#F1F5F9',
  text:    '#0F172A',
  muted:   '#64748B',
  light:   '#94A3B8',
  primary: '#4F46E5',
  success: '#10B981',
  danger:  '#EF4444',
} as const

// ── Module config ─────────────────────────────────────────────────────────────

const MODULES: { id: TModule; label: string; color: string; icon: React.ReactNode }[] = [
  {
    id: 'principal', label: 'Principal', color: '#4F46E5',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
      </svg>
    ),
  },
  {
    id: 'servicios', label: 'Servicios', color: '#DC2626',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path fillRule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 4a1 1 0 10-2 0v3H6a1 1 0 000 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V6z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    id: 'personas', label: 'Personas', color: '#2563EB',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    id: 'equipos', label: 'Equipos', color: '#7C3AED',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z"/>
      </svg>
    ),
  },
  {
    id: 'partituras', label: 'Partituras', color: '#059669',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
      </svg>
    ),
  },
  {
    id: 'eventos', label: 'Eventos', color: '#D97706',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
    ),
  },
  {
    id: 'ensayos', label: 'Ensayos', color: '#0891B2',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    id: 'calendario', label: 'Calendario', color: '#0284C7',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm-2 5h12v7H4V7zm2 2a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm6 0a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1zm-6 4a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm6 0a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    id: 'finanzas', label: 'Finanzas', color: '#065F46',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
      </svg>
    ),
  },
]

// ── Mock people ───────────────────────────────────────────────────────────────

const MOCK_PEOPLE: Person[] = [
  { id: '1', name: 'María García Ruiz',     initials: 'MG', color: '#6366f1', ministry: 'Alabanza',        role: 'Worship Leader',     phone: '+34 612 345 678', email: 'maria@iglesia.com',   status: 'active',   joined: 'Ene 2022' },
  { id: '2', name: 'Carlos Pérez López',    initials: 'CP', color: '#0ea5e9', ministry: 'Técnica',          role: 'Técnico de Sonido',  phone: '+34 622 456 789', email: 'carlos@iglesia.com',  status: 'active',   joined: 'Mar 2021' },
  { id: '3', name: 'Ana Martínez Silva',    initials: 'AM', color: '#10b981', ministry: 'Alabanza',        role: 'Vocalista',          phone: '+34 633 567 890', email: 'ana@iglesia.com',     status: 'active',   joined: 'Jun 2023' },
  { id: '4', name: 'Pedro Sánchez Vega',    initials: 'PS', color: '#f59e0b', ministry: 'Jóvenes',         role: 'Líder de Jóvenes',   phone: '+34 644 678 901', email: 'pedro@iglesia.com',   status: 'active',   joined: 'Sep 2020' },
  { id: '5', name: 'Laura Jiménez Torres',  initials: 'LJ', color: '#ef4444', ministry: 'Alabanza',        role: 'Pianista',           phone: '+34 655 789 012', email: 'laura@iglesia.com',   status: 'inactive', joined: 'Dic 2022' },
  { id: '6', name: 'Javier Moreno Díaz',    initials: 'JM', color: '#8b5cf6', ministry: 'Técnica',          role: 'Proyección',         phone: '+34 666 890 123', email: 'javier@iglesia.com',  status: 'active',   joined: 'Feb 2023' },
  { id: '7', name: 'Isabel Castro Fuentes', initials: 'IC', color: '#ec4899', ministry: 'Administración',  role: 'Secretaria',         phone: '+34 677 901 234', email: 'isabel@iglesia.com',  status: 'active',   joined: 'Ago 2021' },
  { id: '8', name: 'Roberto Navarro Gil',   initials: 'RN', color: '#14b8a6', ministry: 'Alabanza',        role: 'Guitarrista',        phone: '+34 688 012 345', email: 'roberto@iglesia.com', status: 'active',   joined: 'May 2022' },
  { id: '9', name: 'Sofía López Mendoza',   initials: 'SL', color: '#f97316', ministry: 'Niños',           role: 'Coordinadora',       phone: '+34 699 123 456', email: 'sofia@iglesia.com',   status: 'active',   joined: 'Oct 2023' },
  { id: '10', name: 'Diego Ruiz Herrera',   initials: 'DR', color: '#6d28d9', ministry: 'Alabanza',        role: 'Bajista',            phone: '+34 611 234 567', email: 'diego@iglesia.com',   status: 'inactive', joined: 'Jul 2021' },
]

// ── Sub-views for Personas ────────────────────────────────────────────────────
type PersonasView = 'todas' | 'ministerio' | 'nuevos'

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantPortal() {
  const { slug } = useParams<{ slug: string }>()
  const [org, setOrg]         = useState<OrgInfo | null>(null)
  const [screen, setScreen]   = useState<Screen>('loading')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [module, setModule]   = useState<TModule>('personas')
  const [dropOpen, setDropOpen] = useState(false)
  const [personasView, setPersonasView] = useState<PersonasView>('todas')
  const [search, setSearch]   = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) { setScreen('not-found'); return }
    fetch(`/api/v1/organizations/slug/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!data) { setScreen('not-found'); return }; setOrg(data); setScreen('login') })
      .catch(() => setScreen('not-found'))
  }, [slug])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoggingIn(true); setLoginErr(null)
    setTimeout(() => {
      if (password.length < 6) { setLoginErr('Credenciales incorrectas'); setLoggingIn(false); return }
      setUserName(email.split('@')[0])
      setScreen('app')
      setLoggingIn(false)
    }, 700)
  }

  function switchModule(m: TModule) { setModule(m); setDropOpen(false) }

  const currentMod = MODULES.find(m => m.id === module)!

  // ── Loading ────────────────────────────────────────────────────────────────
  if (screen === 'loading') return (
    <div style={s.fullPage}>
      <div style={{ ...s.spinner }} />
    </div>
  )

  // ── Not found ──────────────────────────────────────────────────────────────
  if (screen === 'not-found' || !org) return (
    <div style={s.fullPage}>
      <div style={s.loginCard}>
        <div style={s.wLogo}>
            <svg viewBox="0 0 44 32" xmlns="http://www.w3.org/2000/svg" aria-label="Worsyn" style={{ width: 28, height: 20 }}>
              <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="white"/>
              <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="white"/>
              <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="white"/>
              <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="white"/>
              <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="white"/>
            </svg>
          </div>
        <h2 style={s.loginTitle}>Portal no encontrado</h2>
        <p style={s.loginSub}>La organización <code style={s.code}>{slug}</code> no existe o no está activa.</p>
      </div>
    </div>
  )

  // ── Login ──────────────────────────────────────────────────────────────────
  if (screen === 'login') return (
    <div style={s.fullPage}>
      <div style={s.loginCard}>
        <div style={s.wLogo}>
            <svg viewBox="0 0 44 32" xmlns="http://www.w3.org/2000/svg" aria-label="Worsyn" style={{ width: 28, height: 20 }}>
              <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="white"/>
              <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="white"/>
              <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="white"/>
              <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="white"/>
              <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="white"/>
            </svg>
          </div>
        <p style={s.eyebrow}>Portal de acceso</p>
        <h2 style={s.loginTitle}>{org.name}</h2>
        {org.alias && <p style={s.loginSub}>@{org.alias}</p>}

        {loginErr && <div style={s.loginError}>{loginErr}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 10, width: '100%' }}>
          <div style={s.field}>
            <label style={s.label}>Correo electrónico</label>
            <input style={s.input} type="email" value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Contraseña</label>
            <input style={s.input} type="password" value={password} autoComplete="current-password"
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loggingIn}
            style={{ ...s.loginBtn, ...(loggingIn ? { opacity: 0.65, cursor: 'not-allowed' } : {}) }}>
            {loggingIn ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={s.powered}>Powered by <strong style={{ color: C.primary }}>Worsyn</strong></p>
      </div>
    </div>
  )

  // ── App shell ──────────────────────────────────────────────────────────────
  const filteredPeople = MOCK_PEOPLE.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.ministry.toLowerCase().includes(q)
  })
  const displayPeople = personasView === 'nuevos'
    ? filteredPeople.slice(0, 3)
    : personasView === 'ministerio'
      ? filteredPeople.sort((a, b) => a.ministry.localeCompare(b.ministry))
      : filteredPeople

  const ministries = [...new Set(MOCK_PEOPLE.map(p => p.ministry))].sort()

  return (
    <div style={s.appWrap}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header style={s.topBar}>
        {/* Left: logo + module switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }} ref={dropRef}>
          {/* Logo W */}
          <div style={s.topLogo}>
            <svg viewBox="0 0 44 32" xmlns="http://www.w3.org/2000/svg" aria-label="Worsyn" style={{ width: 26, height: 19 }}>
              <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="white"/>
              <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="white"/>
              <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="white"/>
              <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="white"/>
              <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="white"/>
            </svg>
          </div>

          {/* Module switcher button */}
          <button style={s.modBtn} onClick={() => setDropOpen(o => !o)}>
            <span style={{ ...s.modIcon, background: currentMod.color }}>
              {currentMod.icon}
            </span>
            <span style={s.orgName}>{org.name}</span>
            <span style={s.modSep}>·</span>
            <span style={s.modLabel}>{currentMod.label}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}
              style={{ color: C.muted, marginLeft: 2, flexShrink: 0, transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
            </svg>
          </button>

          {/* Module dropdown */}
          {dropOpen && (
            <div style={s.dropdown}>
              <div style={s.dropSection}>
                {MODULES.map(m => (
                  <button key={m.id} style={{ ...s.dropItem, ...(m.id === module ? s.dropItemActive : {}) }}
                    onClick={() => switchModule(m.id)}>
                    <span style={{ ...s.dropIcon, background: m.color }}>{m.icon}</span>
                    <span style={s.dropLabel}>{m.label}</span>
                    {m.id === module && (
                      <svg viewBox="0 0 20 20" fill={C.primary} width={14} height={14} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div style={s.dropDivider} />
              <div style={s.dropSection}>
                <button style={s.dropItem} onClick={() => setDropOpen(false)}>
                  <span style={{ ...s.dropIcon, background: '#64748B' }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                    </svg>
                  </span>
                  <span style={s.dropLabel}>Opciones de la cuenta</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: user */}
        <div style={s.topUser}>
          <div style={s.userAvatar}>
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <span style={s.userName}>{userName}</span>
          <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14} style={{ color: C.light }}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>
      </header>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div style={s.contentWrap}>

        {/* Personas module */}
        {module === 'personas' && (
          <>
            {/* Sidebar */}
            <aside style={s.sidebar}>
              <div style={s.sidebarHead}>
                <span style={{ ...s.sidebarModIcon, background: '#2563EB' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width={13} height={13}><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                </span>
                <span style={s.sidebarHeadText}>Personas</span>
              </div>

              <nav style={s.sidebarNav}>
                <p style={s.sidebarSection}>Filtrar</p>
                {([
                  { id: 'todas',      label: 'Todas las personas', count: MOCK_PEOPLE.length },
                  { id: 'ministerio', label: 'Por ministerio',     count: ministries.length },
                  { id: 'nuevos',     label: 'Nuevos',             count: 3 },
                ] as { id: PersonasView; label: string; count: number }[]).map(item => (
                  <button key={item.id}
                    style={{ ...s.sidebarItem, ...(personasView === item.id ? s.sidebarItemActive : {}) }}
                    onClick={() => setPersonasView(item.id)}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    <span style={s.sidebarBadge}>{item.count}</span>
                  </button>
                ))}

                <p style={{ ...s.sidebarSection, marginTop: 20 }}>Ministerios</p>
                {ministries.map(m => (
                  <button key={m} style={s.sidebarItem}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{m}</span>
                    <span style={s.sidebarBadge}>{MOCK_PEOPLE.filter(p => p.ministry === m).length}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* People main */}
            <main style={s.main}>
              {/* Header */}
              <div style={s.mainHead}>
                <div>
                  <h1 style={s.mainTitle}>
                    {personasView === 'todas' ? 'Todas las personas' : personasView === 'ministerio' ? 'Por ministerio' : 'Nuevos miembros'}
                  </h1>
                  <p style={s.mainSub}>{displayPeople.length} persona{displayPeople.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btnPrimary}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                    Nuevo
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={s.searchWrap}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={15} height={15} style={{ color: C.light, flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input style={s.searchInput} placeholder="Buscar por nombre, email o ministerio…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Table */}
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Persona', 'Ministerio', 'Rol', 'Contacto', 'Ingresó', 'Estado'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayPeople.map(p => (
                      <tr key={p.id} style={s.tr}
                        onMouseEnter={e => (e.currentTarget.style.background = C.soft)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {/* Persona */}
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ ...s.avatar, background: p.color }}>{p.initials}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: C.light }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        {/* Ministerio */}
                        <td style={s.td}>
                          <span style={s.ministryTag}>{p.ministry}</span>
                        </td>
                        {/* Rol */}
                        <td style={{ ...s.td, color: C.muted, fontSize: 13 }}>{p.role}</td>
                        {/* Contacto */}
                        <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{p.phone}</td>
                        {/* Ingresó */}
                        <td style={{ ...s.td, color: C.light, fontSize: 12 }}>{p.joined}</td>
                        {/* Estado */}
                        <td style={s.td}>
                          <span style={{ ...s.statusTag, ...(p.status === 'active' ? s.statusActive : s.statusInactive) }}>
                            {p.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {displayPeople.length === 0 && (
                  <div style={s.empty}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth={1.5} width={40} height={40}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                    </svg>
                    <p style={{ color: C.light, fontSize: 14, marginTop: 12 }}>Sin resultados para "{search}"</p>
                  </div>
                )}
              </div>
            </main>
          </>
        )}

        {/* Placeholder for all other modules */}
        {module !== 'personas' && (
          <main style={{ ...s.main, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <div style={s.placeholder}>
              <div style={{ ...s.placeholderIcon, background: currentMod.color }}>
                {currentMod.icon}
              </div>
              <h2 style={s.placeholderTitle}>{currentMod.label}</h2>
              <p style={s.placeholderSub}>
                Este módulo estará disponible próximamente.<br />
                Estamos construyendo algo increíble para tu iglesia.
              </p>
              <span style={s.comingBadge}>Próximamente</span>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

// ── Styles (scoped — no CSS class pollution) ──────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  // ── Full-page (login/loading)
  fullPage: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  spinner: {
    width: 32, height: 32, border: '3px solid rgba(255,255,255,.1)',
    borderTop: `3px solid ${C.primary}`, borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  // ── Login card
  loginCard: {
    background: '#1e293b', borderRadius: 18, padding: '44px 40px 36px',
    width: '100%', maxWidth: 400,
    boxShadow: '0 24px 64px rgba(0,0,0,.55)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  wLogo: {
    width: 54, height: 54, borderRadius: 15, background: C.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 800, marginBottom: 14, flexShrink: 0,
  },
  eyebrow: { fontSize: 10, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0, fontWeight: 700 },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '6px 0 2px', textAlign: 'center' },
  loginSub: { fontSize: 13, color: '#64748b', margin: '0 0 8px', textAlign: 'center' },
  code: { background: '#0f172a', padding: '1px 6px', borderRadius: 4, fontSize: 12, color: '#94a3b8' },
  loginError: {
    background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.28)',
    borderRadius: 8, color: '#fca5a5', fontSize: 13, padding: '8px 14px',
    width: '100%', boxSizing: 'border-box', textAlign: 'center', marginTop: 4,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5, width: '100%' },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  input: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9',
    padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  loginBtn: {
    background: C.primary, color: '#fff', border: 'none', borderRadius: 8,
    padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4,
  },
  powered: { fontSize: 11, color: '#334155', marginTop: 22 },

  // ── App shell
  appWrap: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: C.bg, fontFamily: "'Inter', system-ui, sans-serif",
  },
  // ── Top bar
  topBar: {
    height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px 0 0', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
  },
  topLogo: {
    width: 52, height: 52, background: C.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 800, flexShrink: 0,
  },
  modBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 12px',
    background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8,
    transition: 'background 140ms',
  },
  modIcon: {
    width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
  },
  orgName: { fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' },
  modSep: { fontSize: 13, color: C.light },
  modLabel: { fontSize: 14, fontWeight: 500, color: C.muted, whiteSpace: 'nowrap' },
  // ── Dropdown
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.12)',
    minWidth: 240, zIndex: 200, overflow: 'hidden',
    animation: 'fadeIn 120ms ease',
  },
  dropSection: { padding: '6px 6px' },
  dropDivider: { height: 1, background: C.border, margin: '0 6px' },
  dropItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer',
    borderRadius: 8, transition: 'background 120ms',
    fontSize: 13, color: C.text,
  },
  dropItemActive: { background: '#EEF2FF' },
  dropIcon: {
    width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
  },
  dropLabel: { flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500 },
  // ── Top user
  topUser: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  userAvatar: {
    width: 30, height: 30, borderRadius: 8, background: C.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
  },
  userName: { fontSize: 13, fontWeight: 500, color: C.text },
  // ── Content wrap
  contentWrap: { flex: 1, display: 'flex', overflow: 'hidden' },
  // ── Sidebar
  sidebar: {
    width: 210, background: C.surface, borderRight: `1px solid ${C.border}`,
    flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto',
  },
  sidebarHead: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '16px 16px 12px',
    borderBottom: `1px solid ${C.border}`,
  },
  sidebarModIcon: {
    width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
  },
  sidebarHeadText: { fontSize: 14, fontWeight: 700, color: C.text },
  sidebarNav: { padding: '10px 8px', flex: 1 },
  sidebarSection: {
    fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase',
    letterSpacing: '0.08em', padding: '0 8px', margin: '8px 0 4px',
  },
  sidebarItem: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer',
    borderRadius: 7, fontSize: 13, color: C.muted, transition: 'background 120ms',
  },
  sidebarItemActive: { background: '#EEF2FF', color: C.primary, fontWeight: 600 },
  sidebarBadge: {
    fontSize: 11, fontWeight: 600, color: C.light,
    background: C.soft, borderRadius: 999, padding: '1px 7px',
  },
  // ── Main
  main: { flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
  mainHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  mainTitle: { fontSize: 20, fontWeight: 700, color: C.text, margin: 0 },
  mainSub: { fontSize: 13, color: C.light, margin: '3px 0 0' },
  btnPrimary: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: C.primary, color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  // ── Search
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9,
    padding: '0 12px', height: 38,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', fontSize: 13, color: C.text, background: 'transparent',
  },
  // ── Table
  tableWrap: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: C.light, textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: `1px solid ${C.border}`, background: C.soft,
    whiteSpace: 'nowrap',
  },
  tr: { transition: 'background 100ms', cursor: 'pointer' },
  td: { padding: '11px 14px', borderBottom: `1px solid #F1F5F9`, verticalAlign: 'middle' },
  avatar: {
    width: 34, height: 34, borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ministryTag: {
    display: 'inline-block', padding: '2px 9px', borderRadius: 999,
    fontSize: 11, fontWeight: 600, background: '#EEF2FF', color: '#4F46E5',
  },
  statusTag: {
    display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
  },
  statusActive: { background: '#ECFDF5', color: '#059669' },
  statusInactive: { background: '#F1F5F9', color: '#94A3B8' },
  empty: { padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  // ── Placeholder
  placeholder: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    padding: 40, textAlign: 'center', maxWidth: 360,
  },
  placeholderIcon: {
    width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff',
  },
  placeholderTitle: { fontSize: 22, fontWeight: 700, color: C.text, margin: 0 },
  placeholderSub: { fontSize: 14, color: C.muted, lineHeight: 1.6, margin: 0 },
  comingBadge: {
    fontSize: 11, fontWeight: 700, background: '#EEF2FF', color: C.primary,
    borderRadius: 999, padding: '4px 14px', letterSpacing: '0.06em', textTransform: 'uppercase',
  },
}
