import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

interface OrgInfo { id: string; name: string; slug: string; alias: string | null; plan: string }

type Screen = 'loading' | 'not-found' | 'login' | 'dashboard'

export default function TenantPortal() {
  const { slug } = useParams<{ slug: string }>()
  const [org, setOrg]         = useState<OrgInfo | null>(null)
  const [screen, setScreen]   = useState<Screen>('loading')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (!slug) { setScreen('not-found'); return }
    fetch(`/api/v1/organizations/slug/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setScreen('not-found'); return }
        setOrg(data)
        setScreen('login')
      })
      .catch(() => setScreen('not-found'))
  }, [slug])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoggingIn(true); setLoginErr(null)
    // Simulated login — real auth will be added in a future iteration
    setTimeout(() => {
      if (password.length < 6) {
        setLoginErr('Credenciales incorrectas')
        setLoggingIn(false)
        return
      }
      setUserName(email.split('@')[0])
      setScreen('dashboard')
      setLoggingIn(false)
    }, 800)
  }

  // ── Loading
  if (screen === 'loading') {
    return (
      <div style={styles.fullPage}>
        <p style={{ color: '#9ca3af' }}>Cargando…</p>
      </div>
    )
  }

  // ── Not found
  if (screen === 'not-found' || !org) {
    return (
      <div style={styles.fullPage}>
        <div style={styles.card}>
          <div style={styles.logo}>W</div>
          <h2 style={styles.title}>Portal no encontrado</h2>
          <p style={styles.subtitle}>La organización <code style={styles.code}>{slug}</code> no existe o no está activa.</p>
        </div>
      </div>
    )
  }

  // ── Login
  if (screen === 'login') {
    return (
      <div style={styles.fullPage}>
        <div style={styles.card}>
          <div style={styles.logo}>W</div>
          <p style={styles.eyebrow}>Portal de acceso</p>
          <h2 style={styles.title}>{org.name}</h2>
          {org.alias && <p style={styles.subtitle}>@{org.alias}</p>}
          {loginErr && (
            <div style={styles.errorBanner}>{loginErr}</div>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <div style={styles.field}>
              <label style={styles.label}>Correo electrónico</label>
              <input style={styles.input} type="email" value={email} autoComplete="email"
                onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contraseña</label>
              <input style={styles.input} type="password" value={password} autoComplete="current-password"
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" style={loggingIn ? { ...styles.btn, opacity: 0.7, cursor: 'not-allowed' } : styles.btn} disabled={loggingIn}>
              {loggingIn ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>
          <p style={styles.footer}>Powered by <strong style={{ color: '#6366f1' }}>Worsyn</strong></p>
        </div>
      </div>
    )
  }

  // ── Dashboard (mock)
  return (
    <div style={styles.dashWrap}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={styles.logo}>W</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{org.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>@{org.alias ?? org.slug}</div>
          </div>
        </div>
        <nav style={styles.nav}>
          {[
            { icon: '⊞', label: 'Panel' },
            { icon: '👥', label: 'Miembros' },
            { icon: '📅', label: 'Eventos' },
            { icon: '📢', label: 'Comunicados' },
            { icon: '⚙️', label: 'Configuración' },
          ].map(item => (
            <div key={item.label} style={styles.navItem}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={styles.sidebarUser}>
          <div style={styles.avatar}>{userName.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Owner</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.dashMain}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Bienvenido</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '4px 0 0' }}>Hola, {userName} 👋</h1>
        </div>

        {/* KPIs */}
        <div style={styles.kpiRow}>
          {[
            { label: 'Miembros', value: '—', sub: 'registrados' },
            { label: 'Eventos este mes', value: '—', sub: 'próximos' },
            { label: 'Comunicados', value: '—', sub: 'enviados' },
            { label: 'Plan activo', value: org.plan, sub: 'suscripción' },
          ].map(k => (
            <div key={k.label} style={styles.kpiCard}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: '6px 0 2px' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Placeholder panels */}
        <div style={styles.panelRow}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Próximos eventos</h3>
            <p style={styles.placeholder}>No hay eventos programados todavía.<br/>Esta sección estará disponible próximamente.</p>
          </div>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Miembros recientes</h3>
            <p style={styles.placeholder}>Los nuevos miembros aparecerán aquí.<br/>Esta sección estará disponible próximamente.</p>
          </div>
        </div>

        <p style={{ marginTop: 32, fontSize: 11, color: '#334155', textAlign: 'center' }}>
          Portal en construcción · Powered by <strong style={{ color: '#6366f1' }}>Worsyn</strong>
        </p>
      </main>
    </div>
  )
}

// ── Inline styles (scoped, no global CSS pollution) ───────────────────────────

const styles = {
  fullPage: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  } as React.CSSProperties,
  card: {
    background: '#1e293b', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  } as React.CSSProperties,
  logo: {
    width: 52, height: 52, borderRadius: 14, background: '#6366f1', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, marginBottom: 12,
  } as React.CSSProperties,
  eyebrow: { fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 2, margin: 0 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '6px 0 2px', textAlign: 'center' } as React.CSSProperties,
  subtitle: { fontSize: 13, color: '#64748b', margin: '0 0 8px', textAlign: 'center' } as React.CSSProperties,
  code: { background: '#0f172a', padding: '1px 6px', borderRadius: 4, fontSize: 12 },
  errorBanner: {
    background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8,
    color: '#fca5a5', fontSize: 13, padding: '8px 14px', width: '100%', boxSizing: 'border-box', textAlign: 'center',
  } as React.CSSProperties,
  field: { display: 'flex', flexDirection: 'column', gap: 5, width: '100%' } as React.CSSProperties,
  label: { fontSize: 12, color: '#94a3b8', fontWeight: 500 } as React.CSSProperties,
  input: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9',
    padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  } as React.CSSProperties,
  btn: {
    background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4,
  } as React.CSSProperties,
  footer: { fontSize: 11, color: '#334155', marginTop: 20 } as React.CSSProperties,
  // Dashboard
  dashWrap: { display: 'flex', minHeight: '100vh', background: '#0f172a' } as React.CSSProperties,
  sidebar: {
    width: 220, background: '#1e293b', borderRight: '1px solid #334155',
    display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
  } as React.CSSProperties,
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 20px', borderBottom: '1px solid #334155' } as React.CSSProperties,
  nav: { flex: 1, padding: '16px 0' } as React.CSSProperties,
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
    color: '#94a3b8', fontSize: 13, cursor: 'pointer',
  } as React.CSSProperties,
  sidebarUser: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderTop: '1px solid #334155' } as React.CSSProperties,
  avatar: {
    width: 32, height: 32, borderRadius: 8, background: '#6366f1', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
  } as React.CSSProperties,
  dashMain: { flex: 1, padding: '32px 36px', overflowY: 'auto' } as React.CSSProperties,
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 } as React.CSSProperties,
  kpiCard: { background: '#1e293b', borderRadius: 12, padding: '18px 20px', border: '1px solid #334155' } as React.CSSProperties,
  panelRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
  panel: { background: '#1e293b', borderRadius: 12, padding: '20px 22px', border: '1px solid #334155' } as React.CSSProperties,
  panelTitle: { fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: '0 0 12px' } as React.CSSProperties,
  placeholder: { fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 } as React.CSSProperties,
}
