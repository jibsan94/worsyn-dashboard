import { useState, useEffect } from 'react'
import { useToast, ToastContainer } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

interface GeneralConfig {
  platform_name: string
  support_email: string
  timezone: string
  maintenance_mode: boolean
  maintenance_message: string
  readonly: boolean
}

const DEFAULTS: GeneralConfig = {
  platform_name: 'Worsyn',
  support_email: '',
  timezone: 'UTC',
  maintenance_mode: false,
  maintenance_message: 'El sistema está en mantenimiento. Vuelve pronto.',
  readonly: false,
}

const TIMEZONES = [
  { value: 'UTC',                            label: 'UTC' },
  { value: 'Europe/Madrid',                  label: 'Europa/Madrid (CET/CEST)' },
  { value: 'America/Mexico_City',            label: 'México (CST/CDT)' },
  { value: 'America/Bogota',                 label: 'Colombia (COT)' },
  { value: 'America/Lima',                   label: 'Perú (PET)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (ART)' },
  { value: 'America/Santiago',               label: 'Chile (CLT/CLST)' },
  { value: 'America/Caracas',                label: 'Venezuela (VET)' },
  { value: 'America/Panama',                 label: 'Panamá (EST)' },
  { value: 'America/New_York',               label: 'Nueva York (EST/EDT)' },
  { value: 'America/Los_Angeles',            label: 'Los Ángeles (PST/PDT)' },
  { value: 'America/Chicago',                label: 'Chicago (CST/CDT)' },
  { value: 'Europe/London',                  label: 'Londres (GMT/BST)' },
]

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export default function SettingsGeneral() {
  const { token } = useAuth()
  const { show, toasts, dismiss } = useToast()
  const [cfg, setCfg] = useState<GeneralConfig>(DEFAULTS)
  const [saveState, setSaveState] = useState<SaveState>('loading')

  useEffect(() => {
    fetch('/api/v1/admin/settings/general', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setCfg(data); setSaveState('idle') })
      .catch(() => {
        show('danger', 'Error', 'No se pudo cargar la configuración general.')
        setSaveState('idle')
      })
  }, [token])

  const set = <K extends keyof GeneralConfig>(field: K, value: GeneralConfig[K]) =>
    setCfg(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaveState('saving')
    try {
      const r = await fetch('/api/v1/admin/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform_name:       cfg.platform_name,
          support_email:       cfg.support_email,
          timezone:            cfg.timezone,
          maintenance_mode:    cfg.maintenance_mode,
          maintenance_message: cfg.maintenance_message,
        }),
      })
      if (!r.ok) throw new Error()
      setSaveState('saved')
      show('success', 'Configuración guardada', 'Los cambios generales se aplicaron correctamente.')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
      show('danger', 'Error al guardar', 'No se pudo guardar la configuración general.')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const readOnly = cfg.readonly
  const isLoading = saveState === 'loading'

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Sistema</span>
          <h1 className="hero-title">General</h1>
          <p className="hero-sub">Nombre de la plataforma, zona horaria, correo de soporte y mantenimiento.</p>
        </div>
      </section>

      <div className="grid">

        {/* PLATAFORMA */}
        <section className="col-8 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Identidad</span>
              <h2 className="card-title">Plataforma</h2>
            </div>
            {saveState === 'saved' && <span className="tag t-ok">Guardado</span>}
            {readOnly && <span className="tag t-warn">Solo lectura</span>}
          </div>

          {readOnly && (
            <div className="form-notice" style={{ marginBottom: 20 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Solo el <strong>owner</strong> puede modificar la configuración general.</span>
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="platform-name">Nombre de la plataforma</label>
              <input
                id="platform-name"
                className="form-input"
                type="text"
                placeholder="Worsyn"
                value={cfg.platform_name}
                onChange={e => set('platform_name', e.target.value)}
                disabled={readOnly || isLoading}
                autoComplete="off"
              />
              <span className="form-hint">Aparece en correos, notificaciones y el título de la app</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="support-email">Correo de soporte</label>
              <input
                id="support-email"
                className="form-input"
                type="text"
                placeholder="soporte@worsyn.com"
                value={cfg.support_email}
                onChange={e => set('support_email', e.target.value)}
                disabled={readOnly || isLoading}
                autoComplete="off"
              />
              <span className="form-hint">Remitente y dirección de respuesta en correos del sistema</span>
            </div>
          </div>
        </section>

        {/* ZONA HORARIA */}
        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Localización</span>
              <h2 className="card-title">Zona horaria</h2>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="timezone">Zona horaria del sistema</label>
            <select
              id="timezone"
              className="form-input"
              value={cfg.timezone}
              onChange={e => set('timezone', e.target.value)}
              disabled={readOnly || isLoading}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <span className="form-hint">
              Actual: <strong>{cfg.timezone}</strong><br/>
              Afecta marcas de tiempo en registros, correos y exportaciones
            </span>
          </div>
        </section>

        {/* MANTENIMIENTO */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Operaciones</span>
              <h2 className="card-title">Modo mantenimiento</h2>
            </div>
            {cfg.maintenance_mode && (
              <span className="tag t-error" style={{ animation: 'pulse 2s infinite' }}>ACTIVO</span>
            )}
          </div>

          {cfg.maintenance_mode && (
            <div className="form-notice" style={{ marginBottom: 20, borderColor: 'var(--c-danger)', background: 'rgba(var(--danger-rgb),0.06)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-danger)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ color: 'var(--c-danger)' }}>
                <strong>El modo mantenimiento está activo.</strong> Solo los <strong>owners</strong> pueden acceder al sistema.
                El resto de usuarios verán el mensaje de mantenimiento.
              </span>
            </div>
          )}

          <div className="form-grid-2">
            <div>
              <div className="form-group">
                <label className="form-label">Activar modo mantenimiento</label>
                <div className="form-toggle-wrap">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cfg.maintenance_mode}
                    className={`form-toggle${cfg.maintenance_mode ? ' on' : ''}`}
                    onClick={() => !readOnly && set('maintenance_mode', !cfg.maintenance_mode)}
                    disabled={readOnly || isLoading}
                  >
                    <span className="form-toggle-thumb" />
                  </button>
                  <span className="form-toggle-label">
                    {cfg.maintenance_mode ? 'Activo — acceso restringido' : 'Inactivo — sistema operativo'}
                  </span>
                </div>
                <span className="form-hint">
                  Cuando está activo, solo los <strong>owners</strong> pueden iniciar sesión.
                  Admin y usuarios normales verán el mensaje de mantenimiento.
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="maintenance-msg">Mensaje de mantenimiento</label>
              <textarea
                id="maintenance-msg"
                className="form-input"
                rows={3}
                placeholder="El sistema está en mantenimiento. Vuelve pronto."
                value={cfg.maintenance_message}
                onChange={e => set('maintenance_message', e.target.value)}
                disabled={readOnly || isLoading}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
              <span className="form-hint">Texto que verán los usuarios cuando intenten acceder durante el mantenimiento</span>
            </div>
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
