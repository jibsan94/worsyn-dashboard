import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = '/api/v1'

type LoginStep = 'credentials' | 'totp'

const BrandBlock = () => (
  <div className="login-brand">
    <div className="login-brand-icon">
      <svg viewBox="0 0 44 32" xmlns="http://www.w3.org/2000/svg" aria-label="Worsyn">
        <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="white"/>
        <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="white"/>
        <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="white"/>
        <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="white"/>
        <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="white"/>
      </svg>
    </div>
    <div>
      <div className="login-brand-name">Worsyn</div>
      <div className="login-brand-tag">ADMIN PANEL</div>
    </div>
  </div>
)

const ErrorAlert = ({ msg }: { msg: string }) => (
  <div className="login-error">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    {msg}
  </div>
)

export default function Login() {
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]                 = useState<LoginStep>('credentials')
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [partialToken, setPartialToken] = useState('')
  const [totpCode, setTotpCode]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function completeLogin(accessToken: string, mustChangePwd: boolean) {
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
    const me = await meRes.json()
    setSession(accessToken, {
      id: me.id,
      username: me.username,
      email: me.email,
      full_name: me.full_name,
      role: me.role,
      must_change_password: mustChangePwd,
      two_factor_enabled: me.two_factor_enabled ?? false,
      avatar: me.avatar ?? null,
    })
    navigate('/', { replace: true })
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }).toString(),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail ?? 'Error al iniciar sesión'); return }

      if (data.requires_2fa) {
        setPartialToken(data.partial_token)
        setStep('totp')
        return
      }

      await completeLogin(data.access_token, data.must_change_password)
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/2fa/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partial_token: partialToken, totp_code: totpCode }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail ?? 'Código incorrecto'); return }
      await completeLogin(data.access_token, data.must_change_password)
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'totp') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <BrandBlock />

          <h2 className="login-title">Verificación en dos pasos</h2>
          <p className="login-sub">
            Introduce el código de 6 dígitos de tu app de autenticación
            (Google Authenticator o 2FAS Auth).
          </p>

          <form className="login-form" onSubmit={handleTotp} autoComplete="off">
            <div className="login-field">
              <label htmlFor="totp-code">Código de verificación</label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={loading}
                autoComplete="one-time-code"
                autoFocus
                style={{ letterSpacing: '0.35em', textAlign: 'center', fontSize: 22 }}
              />
            </div>

            {error && <ErrorAlert msg={error} />}

            <button type="submit" className="login-btn" disabled={loading || totpCode.length !== 6}>
              {loading ? 'Verificando…' : 'Verificar'}
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => { setStep('credentials'); setTotpCode(''); setPartialToken(''); setError(null) }}
              disabled={loading}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <BrandBlock />

        <h2 className="login-title">Iniciar sesión</h2>
        <p className="login-sub">Accede con tus credenciales de operador</p>

        <form className="login-form" onSubmit={handleCredentials} autoComplete="off">
          <div className="login-field">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="nombre de usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <ErrorAlert msg={error} />}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Autenticando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
