import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api/v1'

interface OrgOption { slug: string; name: string; icon: string | null }

const ORG_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6']

function OrgAvatar({ org, size = 44 }: { org: OrgOption; size?: number }) {
  const color = ORG_COLORS[org.name.charCodeAt(0) % ORG_COLORS.length]
  if (org.icon) return (
    <img src={org.icon} alt={org.name}
      style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, background: color,
      color: '#fff', display: 'grid', placeItems: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, letterSpacing: '-.02em',
    }}>
      {org.name.slice(0, 2).toUpperCase()}
    </div>
  )
}

const WorsynMark = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 44 32" width={size} height={size * 0.73} aria-label="Worsyn">
    <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="currentColor"/>
    <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="currentColor"/>
    <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="currentColor"/>
    <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="currentColor"/>
    <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="currentColor"/>
  </svg>
)

const InputIcon = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: '#94A3B8', display: 'flex',
  }}>{children}</div>
)

const ErrorBox = ({ msg }: { msg: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderRadius: 8, fontSize: 13,
    background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5',
  }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    {msg}
  </div>
)

export default function TenantLogin() {
  const navigate = useNavigate()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPass, setShowPass]         = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [orgs, setOrgs]                 = useState<OrgOption[]>([])
  const [partialToken, setPartialToken] = useState('')
  const [selecting, setSelecting]       = useState(false)

  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/tenant/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail ?? 'Credenciales incorrectas'); return }

      setPartialToken(data.partial_token)

      if (data.orgs.length === 1) {
        await selectOrg(data.orgs[0].slug, data.partial_token)
      } else {
        setOrgs(data.orgs)
        setSelecting(true)
      }
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  async function selectOrg(slug: string, token?: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/tenant/auth/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partial_token: token ?? partialToken, slug }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail ?? 'Error al acceder'); return }

      const member = data.member
      localStorage.setItem(`tenant-session-${slug}`, JSON.stringify({
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        role: member.role,
        org_name: member.org_name,
        org_slug: slug,
        avatar: member.avatar ?? null,
      }))
      localStorage.setItem(`tenant-token-${slug}`, data.access_token)
      navigate(`/portal/${slug}`)
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared layout shell (split-screen)
  const shell: React.CSSProperties = {
    display: 'flex', minHeight: '100vh', background: '#fff',
  }
  const leftPanel: React.CSSProperties = {
    flex: '1 1 60%', display: 'flex', flexDirection: 'column',
    padding: '32px 48px',
  }
  const rightPanel: React.CSSProperties = {
    flex: '0 0 40%',
    background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #7C3AED 100%)',
    position: 'relative', overflow: 'hidden',
  }
  const formArea: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const formInner: React.CSSProperties = {
    width: '100%', maxWidth: 380,
  }

  const responsiveCss = (
    <style>{`
      @media (max-width: 900px) {
        .worsyn-tenant-login-right { display: none !important; }
        .worsyn-tenant-login-left { flex: 1 1 100% !important; padding: 24px !important; }
      }
    `}</style>
  )

  const RightPanelArt = () => (
    <div className="worsyn-tenant-login-right" style={rightPanel}>
      <svg viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
        <defs>
          <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M0,200 Q300,80 600,260 L600,520 Q300,400 0,560 Z" fill="url(#wave1)"/>
        <path d="M0,520 Q300,640 600,500 L600,900 L0,900 Z" fill="url(#wave1)"/>
        <circle cx="480" cy="180" r="3" fill="#fff" opacity="0.5"/>
        <circle cx="120" cy="380" r="2" fill="#fff" opacity="0.4"/>
        <circle cx="540" cy="720" r="4" fill="#fff" opacity="0.5"/>
        <circle cx="80"  cy="700" r="2" fill="#fff" opacity="0.3"/>
      </svg>
      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '48px', color: '#fff',
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', maxWidth: 340, lineHeight: 1.2 }}>
          Gestiona tu iglesia desde un único lugar.
        </div>
        <div style={{ marginTop: 14, fontSize: 14, opacity: 0.85, maxWidth: 320, lineHeight: 1.55 }}>
          Servicios, equipos, partituras y miembros. Todo conectado en Worsyn.
        </div>
      </div>
    </div>
  )

  if (selecting) {
    return (
      <div style={shell}>
        {responsiveCss}
        <div className="worsyn-tenant-login-left" style={leftPanel}>
          <div style={{ color: '#2563EB', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#2563EB',
              display: 'grid', placeItems: 'center', color: '#fff',
            }}><WorsynMark size={18} /></div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Worsyn</span>
          </div>

          <div style={formArea}>
            <div style={{ ...formInner, maxWidth: 460 }}>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-.02em' }}>
                Elige tu organización
              </h1>
              <p style={{ fontSize: 14, color: '#64748B', marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
                Tienes acceso a {orgs.length} organizaciones con este correo. Selecciona en cuál quieres trabajar.
              </p>

              {error && <div style={{ marginBottom: 14 }}><ErrorBox msg={error} /></div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orgs.map(org => (
                  <button
                    key={org.slug}
                    type="button"
                    disabled={loading}
                    onClick={() => selectOrg(org.slug)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12,
                      border: '1.5px solid #E2E8F0',
                      background: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 160ms',
                      textAlign: 'left', opacity: loading ? 0.6 : 1, width: '100%',
                    }}
                    onMouseEnter={e => {
                      if (loading) return
                      e.currentTarget.style.borderColor = '#2563EB'
                      e.currentTarget.style.background = '#F8FAFF'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#E2E8F0'
                      e.currentTarget.style.background = '#fff'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <OrgAvatar org={org} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {org.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>/{org.slug}</div>
                    </div>
                    <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14} style={{ color: '#94A3B8', flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
                    </svg>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => { setSelecting(false); setOrgs([]); setPartialToken(''); setError(null) }}
                disabled={loading}
                style={{
                  background: 'transparent', color: '#2563EB', fontWeight: 600,
                  fontSize: 13, marginTop: 18, padding: 0, cursor: 'pointer',
                }}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#94A3B8' }}>© Worsyn · Plataforma para iglesias</div>
        </div>
        <RightPanelArt />
      </div>
    )
  }

  return (
    <div style={shell}>
      {responsiveCss}
      <div className="worsyn-tenant-login-left" style={leftPanel}>
        {/* Brand top-left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#2563EB',
            display: 'grid', placeItems: 'center', color: '#fff',
          }}><WorsynMark size={18} /></div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Worsyn</span>
        </div>

        <div style={formArea}>
          <div style={formInner}>
            <h1 style={{ fontSize: 34, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-.025em' }}>
              Inicio de sesión
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 8, marginBottom: 28, lineHeight: 1.55 }}>
              Accede a tu portal de organización con tu correo y contraseña.
            </p>

            <form onSubmit={handleCredentials} autoComplete="off">
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <InputIcon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </InputIcon>
                  <input
                    id="email" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="tucorreo@iglesia.com"
                    style={{
                      width: '100%', height: 46, padding: '0 14px 0 42px',
                      borderRadius: 10, border: '1.5px solid #E2E8F0',
                      background: '#fff', color: '#0F172A', fontSize: 14,
                      outline: 'none', transition: 'border-color 160ms, box-shadow 160ms',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <InputIcon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </InputIcon>
                  <input
                    id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="••••••••"
                    style={{
                      width: '100%', height: 46, padding: '0 42px 0 42px',
                      borderRadius: 10, border: '1.5px solid #E2E8F0',
                      background: '#fff', color: '#0F172A', fontSize: 14,
                      outline: 'none', transition: 'border-color 160ms, box-shadow 160ms',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', color: '#94A3B8', cursor: 'pointer',
                      display: 'grid', placeItems: 'center',
                    }}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 18, lineHeight: 1.5 }}>
                Al iniciar sesión aceptas los <a href="#" style={{ color: '#2563EB', textDecoration: 'underline' }}>Términos del servicio</a> y la <a href="#" style={{ color: '#2563EB', textDecoration: 'underline' }}>Política de privacidad</a>.
              </div>

              {error && <div style={{ marginBottom: 14 }}><ErrorBox msg={error} /></div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 46, borderRadius: 10,
                  background: loading ? '#93C5FD' : '#2563EB', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 160ms, transform 80ms',
                  border: 'none',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1D4ED8' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2563EB' }}
              >
                {loading ? 'Verificando…' : 'Iniciar sesión'}
              </button>
            </form>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#94A3B8' }}>© Worsyn · Plataforma para iglesias</div>
      </div>

      <RightPanelArt />
    </div>
  )
}
