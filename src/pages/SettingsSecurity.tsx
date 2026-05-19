import { useState, useEffect } from 'react'
import { useToast, ToastContainer } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

interface SecurityConfig {
  password_min_length: number
  password_require_uppercase: boolean
  password_require_numbers: boolean
  password_require_special: boolean
  password_max_age_days: number
  session_access_token_minutes: number
  session_refresh_token_days: number
  max_sessions_per_user: number
  require_2fa: boolean  // system-wide policy
  readonly: boolean
}

const DEFAULTS: SecurityConfig = {
  password_min_length: 8,
  password_require_uppercase: false,
  password_require_numbers: false,
  password_require_special: false,
  password_max_age_days: 0,
  session_access_token_minutes: 30,
  session_refresh_token_days: 7,
  max_sessions_per_user: 0,
  require_2fa: false,
  readonly: false,
}

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export default function SettingsSecurity() {
  const { token } = useAuth()
  const { show, toasts, dismiss } = useToast()
  const [cfg, setCfg] = useState<SecurityConfig>(DEFAULTS)
  const [saveState, setSaveState] = useState<SaveState>('loading')

  useEffect(() => {
    fetch('/api/v1/admin/settings/security', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setCfg(data); setSaveState('idle') })
      .catch(() => { show('danger', 'Error', 'No se pudo cargar la configuración de seguridad.'); setSaveState('idle') })
  }, [token])

  const set = <K extends keyof SecurityConfig>(field: K, value: SecurityConfig[K]) =>
    setCfg(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaveState('saving')
    try {
      const r = await fetch('/api/v1/admin/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          password_min_length: cfg.password_min_length,
          password_require_uppercase: cfg.password_require_uppercase,
          password_require_numbers: cfg.password_require_numbers,
          password_require_special: cfg.password_require_special,
          password_max_age_days: cfg.password_max_age_days,
          session_access_token_minutes: cfg.session_access_token_minutes,
          session_refresh_token_days: cfg.session_refresh_token_days,
          max_sessions_per_user: cfg.max_sessions_per_user,
          require_2fa: cfg.require_2fa,
        }),
      })
      if (!r.ok) throw new Error()
      setSaveState('saved')
      show('success', 'Configuración guardada', 'Los cambios de seguridad se aplicaron correctamente.')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
      show('danger', 'Error al guardar', 'No se pudo guardar la configuración de seguridad.')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const readOnly = cfg.readonly
  const isLoading = saveState === 'loading'

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Acceso</span>
          <h1 className="hero-title">Seguridad</h1>
          <p className="hero-sub">Políticas de contraseñas, sesiones y autenticación en dos pasos.</p>
        </div>
      </section>

      <div className="grid">

        {/* PASSWORD POLICY */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Contraseñas</span>
              <h2 className="card-title">Política de contraseñas</h2>
            </div>
            {saveState === 'saved' && <span className="tag t-ok">Guardado</span>}
            {readOnly && <span className="tag t-warn">Solo lectura</span>}
          </div>

          {readOnly && (
            <div className="form-notice" style={{ marginBottom: 20 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Solo el <strong>owner</strong> puede modificar la configuración de seguridad. Estás en modo lectura.</span>
            </div>
          )}

          <div className="form-grid-2">
            {/* Min length */}
            <div className="form-group">
              <label className="form-label" htmlFor="pwd-min-length">
                Longitud mínima
                <span className="form-hint" style={{ marginLeft: 8, display: 'inline' }}>{cfg.password_min_length} caracteres</span>
              </label>
              <input
                id="pwd-min-length"
                className="form-input"
                type="range"
                min={6} max={32} step={1}
                value={cfg.password_min_length}
                onChange={e => set('password_min_length', Number(e.target.value))}
                disabled={readOnly || isLoading}
                style={{ padding: '8px 0', cursor: readOnly ? 'not-allowed' : 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="form-hint">6</span>
                <span className="form-hint">32</span>
              </div>
            </div>

            {/* Max age */}
            <div className="form-group">
              <label className="form-label" htmlFor="pwd-max-age">Caducidad de contraseña</label>
              <input
                id="pwd-max-age"
                className="form-input"
                type="number"
                min={0} max={365}
                value={cfg.password_max_age_days}
                onChange={e => set('password_max_age_days', Number(e.target.value))}
                disabled={readOnly || isLoading}
              />
              <span className="form-hint">días · 0 = nunca caduca</span>
            </div>
          </div>

          <div className="form-section-label">Requisitos de complejidad</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Mayúsculas</label>
              <div className="form-toggle-wrap">
                <button
                  type="button" role="switch" aria-checked={cfg.password_require_uppercase}
                  className={`form-toggle${cfg.password_require_uppercase ? ' on' : ''}`}
                  onClick={() => !readOnly && set('password_require_uppercase', !cfg.password_require_uppercase)}
                  disabled={readOnly || isLoading}
                >
                  <span className="form-toggle-thumb" />
                </button>
                <span className="form-toggle-label">{cfg.password_require_uppercase ? 'Requerida' : 'Opcional'}</span>
              </div>
              <span className="form-hint">mínimo una letra A–Z</span>
            </div>

            <div className="form-group">
              <label className="form-label">Números</label>
              <div className="form-toggle-wrap">
                <button
                  type="button" role="switch" aria-checked={cfg.password_require_numbers}
                  className={`form-toggle${cfg.password_require_numbers ? ' on' : ''}`}
                  onClick={() => !readOnly && set('password_require_numbers', !cfg.password_require_numbers)}
                  disabled={readOnly || isLoading}
                >
                  <span className="form-toggle-thumb" />
                </button>
                <span className="form-toggle-label">{cfg.password_require_numbers ? 'Requerido' : 'Opcional'}</span>
              </div>
              <span className="form-hint">mínimo un dígito 0–9</span>
            </div>

            <div className="form-group">
              <label className="form-label">Caracteres especiales</label>
              <div className="form-toggle-wrap">
                <button
                  type="button" role="switch" aria-checked={cfg.password_require_special}
                  className={`form-toggle${cfg.password_require_special ? ' on' : ''}`}
                  onClick={() => !readOnly && set('password_require_special', !cfg.password_require_special)}
                  disabled={readOnly || isLoading}
                >
                  <span className="form-toggle-thumb" />
                </button>
                <span className="form-toggle-label">{cfg.password_require_special ? 'Requerido' : 'Opcional'}</span>
              </div>
              <span className="form-hint">mínimo un símbolo !@#$…</span>
            </div>
          </div>
        </section>

        {/* SESSIONS */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Autenticación</span>
              <h2 className="card-title">Sesiones</h2>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="access-token-min">Token de acceso</label>
              <input
                id="access-token-min"
                className="form-input"
                type="number"
                min={5} max={1440}
                value={cfg.session_access_token_minutes}
                onChange={e => set('session_access_token_minutes', Number(e.target.value))}
                disabled={readOnly || isLoading}
              />
              <span className="form-hint">minutos · actual: {cfg.session_access_token_minutes} min</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="refresh-token-days">Token de refresco</label>
              <input
                id="refresh-token-days"
                className="form-input"
                type="number"
                min={1} max={90}
                value={cfg.session_refresh_token_days}
                onChange={e => set('session_refresh_token_days', Number(e.target.value))}
                disabled={readOnly || isLoading}
              />
              <span className="form-hint">días · actual: {cfg.session_refresh_token_days} días</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="max-sessions">Sesiones concurrentes</label>
              <input
                id="max-sessions"
                className="form-input"
                type="number"
                min={0} max={20}
                value={cfg.max_sessions_per_user}
                onChange={e => set('max_sessions_per_user', Number(e.target.value))}
                disabled={readOnly || isLoading}
              />
              <span className="form-hint">por usuario · 0 = ilimitadas</span>
            </div>
          </div>
        </section>

        {/* TWO-FACTOR AUTH POLICY */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Política global</span>
              <h2 className="card-title">Autenticación en dos pasos (2FA)</h2>
            </div>
            <span className="tag t-info">Fase 2</span>
          </div>

          <div className="form-group" style={{ maxWidth: 400 }}>
            <label className="form-label">Requerir 2FA para todos los usuarios del sistema</label>
            <div className="form-toggle-wrap">
              <button
                type="button" role="switch" aria-checked={cfg.require_2fa}
                className={`form-toggle${cfg.require_2fa ? ' on' : ''}`}
                onClick={() => !readOnly && set('require_2fa', !cfg.require_2fa)}
                disabled={readOnly || isLoading}
              >
                <span className="form-toggle-thumb" />
              </button>
              <span className="form-toggle-label">{cfg.require_2fa ? 'Obligatorio' : 'Opcional'}</span>
            </div>
            <span className="form-hint">Cuando esté activo, ningún usuario podrá acceder sin tener 2FA configurado.</span>
          </div>

          <div className="form-notice" style={{ marginTop: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Cada usuario gestiona su propio 2FA desde su perfil o desde <strong>Usuarios del sistema → detalle de usuario</strong>. Solo un <strong>owner</strong> puede desactivar el 2FA de otro usuario.</span>
          </div>
        </section>

        {/* ACTIONS */}
        {!readOnly && (
          <section className="col-12">
            <div className="form-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={isLoading || saveState === 'saving'}
              >
                {saveState === 'saving'
                  ? <><span className="spinner light" /> Guardando...</>
                  : <>
                      <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Guardar configuración
                    </>
                }
              </button>
            </div>
          </section>
        )}

      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
