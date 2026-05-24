import { useState, useEffect } from 'react'
import { useToast, ToastContainer } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

interface EmailConfig {
  enabled: boolean
  host: string
  port: number
  username: string
  password: string      // masked '••••••••' when set
  has_password: boolean
  use_tls: boolean
  use_ssl: boolean
  from_email: string
  from_name: string
  provider: 'gmail' | 'workspace' | 'sendgrid' | 'mailgun' | 'outlook' | 'custom'
  reply_to: string
  timeout: number
  readonly: boolean
}

const DEFAULTS: EmailConfig = {
  enabled: false,
  host: '', port: 587, username: '', password: '', has_password: false,
  use_tls: true, use_ssl: false,
  from_email: '', from_name: 'Worsyn',
  provider: 'custom', reply_to: '', timeout: 20,
  readonly: false,
}

// Provider presets. Selecting one prefills host/port/use_tls/use_ssl.
const PRESETS: Record<EmailConfig['provider'], Partial<EmailConfig>> = {
  gmail:     { host: 'smtp.gmail.com',         port: 587, use_tls: true,  use_ssl: false },
  workspace: { host: 'smtp.gmail.com',         port: 587, use_tls: true,  use_ssl: false },
  outlook:   { host: 'smtp-mail.outlook.com',  port: 587, use_tls: true,  use_ssl: false },
  sendgrid:  { host: 'smtp.sendgrid.net',      port: 587, use_tls: true,  use_ssl: false },
  mailgun:   { host: 'smtp.mailgun.org',       port: 587, use_tls: true,  use_ssl: false },
  custom:    {},
}

const PROVIDER_LABEL: Record<EmailConfig['provider'], string> = {
  gmail:     'Gmail (cuenta personal)',
  workspace: 'Google Workspace',
  outlook:   'Outlook / Office 365',
  sendgrid:  'SendGrid',
  mailgun:   'Mailgun',
  custom:    'Otro / personalizado',
}

const PROVIDER_HINTS: Record<EmailConfig['provider'], string> = {
  gmail:     'Usa una contraseña de aplicación de Gmail (con 2FA activado). Más info: myaccount.google.com → Seguridad → Contraseñas de aplicaciones.',
  workspace: 'Usa el correo de Google Workspace + una contraseña de aplicación. Asegúrate de que SMTP esté habilitado en el panel de admin de Workspace.',
  outlook:   'Usa una contraseña de aplicación generada en account.live.com → Seguridad → Opciones avanzadas.',
  sendgrid:  'El usuario es literalmente "apikey", y la contraseña es la API key generada en app.sendgrid.com.',
  mailgun:   'Credenciales SMTP en el panel de Mailgun (Sending → Domain Settings → SMTP credentials).',
  custom:    'Introduce host, puerto y credenciales de tu servidor SMTP.',
}

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export default function SettingsEmail() {
  const { token } = useAuth()
  const { show, toasts, dismiss } = useToast()
  const [cfg, setCfg] = useState<EmailConfig>(DEFAULTS)
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/api/v1/admin/settings/email', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setCfg(data); setSaveState('idle') })
      .catch(() => {
        show('danger', 'Error', 'No se pudo cargar la configuración SMTP.')
        setSaveState('idle')
      })
  }, [token])

  const set = <K extends keyof EmailConfig>(field: K, value: EmailConfig[K]) =>
    setCfg(prev => ({ ...prev, [field]: value }))

  function applyProvider(p: EmailConfig['provider']) {
    const preset = PRESETS[p]
    setCfg(prev => ({ ...prev, provider: p, ...preset }))
  }

  function toggleTransport(kind: 'tls' | 'ssl') {
    if (kind === 'tls') setCfg(prev => ({ ...prev, use_tls: !prev.use_tls, use_ssl: !prev.use_tls ? false : prev.use_ssl, port: !prev.use_tls ? 587 : prev.port }))
    else                setCfg(prev => ({ ...prev, use_ssl: !prev.use_ssl, use_tls: !prev.use_ssl ? false : prev.use_tls, port: !prev.use_ssl ? 465 : prev.port }))
  }

  const handleSave = async () => {
    setSaveState('saving')
    try {
      // Send everything verbatim. Backend rules for `password`:
      //   "••••••••" (mask) → keep existing encrypted value
      //   ""                → explicit clear
      //   anything else     → encrypt + replace
      // (Used to delete the key on mask which was wrongly interpreted as "clear".)
      const body: any = { ...cfg }
      const r = await fetch('/api/v1/admin/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.detail || 'Error desconocido')
      }
      setSaveState('saved')
      show('success', 'SMTP guardado', 'La configuración se aplicará a todos los envíos del tenant.')
      // Re-fetch so password gets masked again
      const fresh = await fetch('/api/v1/admin/settings/email', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      setCfg(fresh)
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (e: any) {
      setSaveState('error')
      show('danger', 'Error al guardar', e.message || 'No se pudo guardar la configuración SMTP.')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const handleTest = async () => {
    if (!testTo.trim() || !testTo.includes('@')) {
      show('warning', 'Email destino requerido', 'Indica una dirección válida para enviar la prueba.')
      return
    }
    setTesting(true)
    try {
      // Always test the form-state values (not saved) so the user can iterate
      const override: any = {
        host: cfg.host, port: cfg.port, username: cfg.username,
        use_tls: cfg.use_tls, use_ssl: cfg.use_ssl,
        from_email: cfg.from_email, from_name: cfg.from_name,
      }
      // Only send password if user typed a new one
      if (cfg.password && cfg.password !== '••••••••') override.password = cfg.password
      else if (cfg.has_password) override.password = '••••••••'
      const r = await fetch('/api/v1/admin/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testTo.trim(), override }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.detail || 'Fallo el envío')
      show('success', 'Email de prueba enviado', `Revisa la bandeja de entrada de ${j.to}.`)
    } catch (e: any) {
      show('danger', 'Error en la prueba', e.message)
    } finally { setTesting(false) }
  }

  const readOnly = cfg.readonly
  const isLoading = saveState === 'loading'

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Notificaciones</span>
          <h1 className="hero-title">Correo SMTP</h1>
          <p className="hero-sub">Servidor SMTP compartido por todos los tenants. Se usa cuando los miembros envían correos desde el módulo Servicios.</p>
        </div>
      </section>

      <div className="grid">
        {/* PROVEEDOR */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Identidad</span>
              <h2 className="card-title">Proveedor + remitente</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={cfg.enabled} onChange={e => set('enabled', e.target.checked)} disabled={readOnly || isLoading} />
                <span style={{ fontWeight: 600 }}>Activado</span>
              </label>
              {saveState === 'saved' && <span className="tag t-ok">Guardado</span>}
              {readOnly && <span className="tag t-warn">Solo lectura</span>}
            </div>
          </div>

          {readOnly && (
            <div className="form-notice" style={{ marginBottom: 20 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Solo el <strong>owner</strong> puede modificar el SMTP.</span>
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Proveedor</label>
              <select className="form-input" value={cfg.provider}
                onChange={e => applyProvider(e.target.value as EmailConfig['provider'])}
                disabled={readOnly || isLoading}>
                {(['gmail','workspace','outlook','sendgrid','mailgun','custom'] as EmailConfig['provider'][]).map(p => (
                  <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
                ))}
              </select>
              <span className="form-hint">{PROVIDER_HINTS[cfg.provider]}</span>
            </div>
            <div />
            <div className="form-group">
              <label className="form-label">From — nombre visible</label>
              <input className="form-input" type="text" value={cfg.from_name}
                onChange={e => set('from_name', e.target.value)}
                disabled={readOnly || isLoading} placeholder="Worsyn / Iglesia X" />
              <span className="form-hint">Lo que verán los destinatarios como remitente.</span>
            </div>
            <div className="form-group">
              <label className="form-label">From — email</label>
              <input className="form-input" type="email" value={cfg.from_email}
                onChange={e => set('from_email', e.target.value)}
                disabled={readOnly || isLoading} placeholder="notificaciones@worsyn.com" />
              <span className="form-hint">Debe coincidir con el usuario SMTP en muchos proveedores (Gmail exige que sean el mismo).</span>
            </div>
            <div className="form-group">
              <label className="form-label">Reply-To (opcional)</label>
              <input className="form-input" type="email" value={cfg.reply_to}
                onChange={e => set('reply_to', e.target.value)}
                disabled={readOnly || isLoading} placeholder="(opcional — por defecto, email del miembro tenant)" />
              <span className="form-hint">Si se deja vacío, las respuestas van al miembro tenant que envió el correo.</span>
            </div>
          </div>
        </section>

        {/* SERVIDOR */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Conexión</span>
              <h2 className="card-title">Servidor SMTP</h2>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Host</label>
              <input className="form-input" type="text" value={cfg.host}
                onChange={e => set('host', e.target.value)}
                disabled={readOnly || isLoading} placeholder="smtp.gmail.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Puerto</label>
              <input className="form-input" type="number" value={cfg.port}
                onChange={e => set('port', parseInt(e.target.value) || 587)}
                disabled={readOnly || isLoading} />
              <span className="form-hint">587 para STARTTLS · 465 para SSL implícito · 25 sin cifrado (no recomendado).</span>
            </div>
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <input className="form-input" type="text" value={cfg.username}
                onChange={e => set('username', e.target.value)}
                disabled={readOnly || isLoading} placeholder="cuenta@gmail.com" autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña {cfg.has_password && <span style={{ color: 'var(--t-muted)', fontWeight: 400 }}>(guardada cifrada)</span>}</label>
              <input className="form-input" type="password" value={cfg.password}
                onChange={e => set('password', e.target.value)}
                onFocus={() => { if (cfg.password === '••••••••') set('password', '') }}
                disabled={readOnly || isLoading}
                placeholder={cfg.has_password ? '••••••••  (focus para reemplazar)' : 'Contraseña de aplicación'}
                autoComplete="new-password" />
              <span className="form-hint">Cifrada con Fernet (AES-128 + HMAC). Solo el owner puede leerla en claro al enviar.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={cfg.use_tls} onChange={() => toggleTransport('tls')} disabled={readOnly || isLoading} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>STARTTLS (puerto 587)</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={cfg.use_ssl} onChange={() => toggleTransport('ssl')} disabled={readOnly || isLoading} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>SSL implícito (puerto 465)</span>
            </label>
          </div>
        </section>

        {/* PROBAR */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Diagnóstico</span>
              <h2 className="card-title">Enviar correo de prueba</h2>
            </div>
          </div>
          <p style={{ color: 'var(--t-muted)', fontSize: 13, margin: '0 0 12px' }}>
            Usa los valores del formulario (incluso sin guardar). Si el envío falla, el error SMTP aparece tal cual lo devuelve el servidor.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 240 }}>
              <label className="form-label">Email destino</label>
              <input className="form-input" type="email" value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder="tu-cuenta@ejemplo.com" disabled={testing} />
            </div>
            <button className="btn btn-secondary" onClick={handleTest} disabled={testing || readOnly}>
              {testing ? 'Enviando…' : 'Probar envío'}
            </button>
          </div>
        </section>

        {/* SAVE */}
        <section className="col-12" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={readOnly || isLoading || saveState === 'saving'}>
            {saveState === 'saving' ? 'Guardando…' : 'Guardar SMTP'}
          </button>
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
