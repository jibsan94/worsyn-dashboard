/**
 * Public page reached from the welcome email's magic link:
 *   /set-password/:token
 *
 * GET  /api/v1/tenant/auth/reset-password/:token  → fetches member + org info
 * POST /api/v1/tenant/auth/reset-password/:token  → sets the new password
 *
 * On success shows a "Ir a Servicios" button that takes the user to
 * /portal/:slug (tenant unified login).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

interface TokenInfo { email: string; full_name: string | null; org_name: string; org_slug: string; expires_at: string | null }

const C = {
  bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  card: '#1e293b', border: '#334155', input: '#0f172a',
  text: '#f1f5f9', muted: '#94a3b8', soft: '#64748B',
  primary: '#4F46E5', primaryHover: '#4338CA',
  danger: '#EF4444', success: '#10B981',
}

const s: Record<string, React.CSSProperties> = {
  page:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 20, fontFamily: "'Inter', system-ui, sans-serif" },
  card:   { background: C.card, borderRadius: 18, padding: '44px 40px 36px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', gap: 16 },
  logo:   { width: 54, height: 54, borderRadius: 15, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  eyebrow:{ fontSize: 10, color: C.primary, textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: 0, fontWeight: 700, textAlign: 'center' as const },
  title:  { fontSize: 22, fontWeight: 700, color: C.text, margin: '6px 0 2px', textAlign: 'center' as const },
  sub:    { fontSize: 13, color: C.muted, margin: '0 0 8px', textAlign: 'center' as const, lineHeight: 1.6 },
  field:  { display: 'flex', flexDirection: 'column' as const, gap: 6, width: '100%' },
  label:  { fontSize: 12, color: C.muted, fontWeight: 500 },
  input:  { background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '11px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  btn:    { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4, transition: 'background 140ms' },
  err:    { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.28)', borderRadius: 8, color: '#fca5a5', fontSize: 13, padding: '10px 14px', textAlign: 'center' as const },
  ok:     { background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.28)', borderRadius: 8, color: '#86efac', fontSize: 13, padding: '10px 14px', textAlign: 'center' as const },
  meterBar:{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' as const },
  meterFill:{ height: '100%', transition: 'width 200ms, background 200ms' },
}

function strength(pwd: string): { score: number; label: string; color: string } {
  let n = 0
  if (pwd.length >= 8) n++
  if (pwd.length >= 12) n++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) n++
  if (/[0-9]/.test(pwd)) n++
  if (/[^A-Za-z0-9]/.test(pwd)) n++
  const map = [
    { label: 'Demasiado corta', color: '#EF4444' },
    { label: 'Débil',           color: '#F97316' },
    { label: 'Aceptable',       color: '#F59E0B' },
    { label: 'Buena',           color: '#10B981' },
    { label: 'Excelente',       color: '#10B981' },
    { label: 'Fortaleza máxima',color: '#10B981' },
  ]
  return { score: n, ...map[Math.min(n, 5)] }
}

// MUST live at module scope — defined inside the parent it would be a new
// component type on every render, remounting the inputs and stealing focus
// after each keystroke. See napkin rule #35.
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <svg viewBox="0 0 44 32" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 20 }} aria-label="Worsyn">
            <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="white"/>
            <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="white"/>
            <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="white"/>
            <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="white"/>
            <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="white"/>
          </svg>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [info, setInfo] = useState<TokenInfo | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ org_slug: string } | null>(null)

  useEffect(() => {
    if (!token) { setLoadErr('Enlace inválido.'); return }
    fetch(`/api/v1/tenant/auth/reset-password/${token}`)
      .then(async r => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.detail || 'Enlace inválido')
        }
        return r.json()
      })
      .then(setInfo)
      .catch(e => setLoadErr(e.message))
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pwd !== pwd2) { setErr('Las contraseñas no coinciden'); return }
    if (pwd.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/v1/tenant/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.detail || 'No se pudo establecer la contraseña')
      }
      const j = await r.json()
      setDone({ org_slug: j.org_slug })
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  if (loadErr) return (
    <Card>
      <p style={s.eyebrow}>Worsyn · Acceso</p>
      <h1 style={s.title}>Enlace no disponible</h1>
      <p style={s.sub}>{loadErr}</p>
      <p style={{ ...s.sub, fontSize: 12 }}>
        Los enlaces de bienvenida caducan en 7 días. Pide a tu administrador que reenvíe la invitación desde el panel.
      </p>
    </Card>
  )

  if (!info) return (
    <Card>
      <p style={s.eyebrow}>Worsyn</p>
      <p style={s.sub}>Cargando…</p>
    </Card>
  )

  if (done) return (
    <Card>
      <p style={s.eyebrow}>¡Listo!</p>
      <h1 style={s.title}>Contraseña establecida</h1>
      <p style={s.sub}>Tu cuenta de <strong style={{ color: C.text }}>{info.org_name}</strong> ya está activa.</p>
      <button style={s.btn}
        onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
        onMouseLeave={e => e.currentTarget.style.background = C.primary}
        onClick={() => navigate(`/portal/${done.org_slug}`)}>
        Ir a Servicios →
      </button>
      <p style={{ ...s.sub, marginTop: 8, fontSize: 11 }}>Iniciarás sesión con <code style={{ color: C.text }}>{info.email}</code></p>
    </Card>
  )

  const st = strength(pwd)
  const pct = Math.min(100, (st.score / 5) * 100)

  return (
    <Card>
      <p style={s.eyebrow}>Worsyn · {info.org_name}</p>
      <h1 style={s.title}>Establece tu contraseña</h1>
      <p style={s.sub}>
        ¡Hola {info.full_name?.split(' ')[0] || info.email.split('@')[0]}! Elige una contraseña para acceder al portal.
      </p>
      <div style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.muted }}>
        <strong style={{ color: C.text }}>{info.email}</strong>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={s.field}>
          <label style={s.label}>Nueva contraseña</label>
          <input style={s.input} type="password" autoFocus minLength={8}
            value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
          {pwd && (
            <>
              <div style={s.meterBar}>
                <div style={{ ...s.meterFill, width: `${pct}%`, background: st.color }} />
              </div>
              <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
            </>
          )}
        </div>
        <div style={s.field}>
          <label style={s.label}>Repite la contraseña</label>
          <input style={s.input} type="password" minLength={8}
            value={pwd2} onChange={e => setPwd2(e.target.value)}
            placeholder="Vuelve a escribirla" autoComplete="new-password" required />
          {pwd2 && pwd2 !== pwd && <span style={{ fontSize: 11, color: C.danger }}>No coinciden</span>}
        </div>
        {err && <div style={s.err}>{err}</div>}
        <button type="submit" style={{ ...s.btn, opacity: busy || pwd.length < 8 || pwd !== pwd2 ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
          disabled={busy || pwd.length < 8 || pwd !== pwd2}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.background = C.primaryHover }}
          onMouseLeave={e => e.currentTarget.style.background = C.primary}>
          {busy ? 'Estableciendo…' : 'Establecer contraseña'}
        </button>
      </form>
      <p style={{ ...s.sub, fontSize: 11, marginTop: 4 }}>
        Recuerda: nunca compartas tu contraseña con nadie. Worsyn no te la pedirá jamás.
      </p>
    </Card>
  )
}
