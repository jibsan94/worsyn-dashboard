import { useState } from 'react'
import { useToast, ToastContainer } from '../components/Toast'

type DbEngine = 'postgresql' | 'mysql' | 'mariadb'

interface DbConfig {
  engine: DbEngine
  host: string
  port: string
  database: string
  username: string
  password: string
  ssl: boolean
  poolMin: string
  poolMax: string
}

const engines: { value: DbEngine; label: string; logo: string; defaultPort: string; color: string }[] = [
  { value: 'postgresql', label: 'PostgreSQL',  logo: 'PG', defaultPort: '5432',  color: '#336791' },
  { value: 'mysql',      label: 'MySQL',       logo: 'My', defaultPort: '3306',  color: '#00758F' },
  { value: 'mariadb',    label: 'MariaDB',     logo: 'M',  defaultPort: '3306',  color: '#C0765A' },
]

const defaults: Record<DbEngine, Partial<DbConfig>> = {
  postgresql: { port: '5432',  ssl: true  },
  mysql:      { port: '3306',  ssl: false },
  mariadb:    { port: '3306',  ssl: false },
}

const placeholders: Record<DbEngine, { database: string; username: string }> = {
  postgresql: { database: 'worsyn',       username: 'worsyn_admin' },
  mysql:      { database: 'worsyn_db',    username: 'worsyn_user' },
  mariadb:    { database: 'worsyn_db',    username: 'worsyn_user' },
}

const connectionStrings: Record<DbEngine, (c: DbConfig) => string> = {
  postgresql: c => `postgresql+asyncpg://${c.username}:****@${c.host}:${c.port}/${c.database}`,
  mysql:      c => `mysql+pymysql://${c.username}:****@${c.host}:${c.port}/${c.database}`,
  mariadb:    c => `mysql+pymysql://${c.username}:****@${c.host}:${c.port}/${c.database}`,
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'testing' | 'test-ok' | 'test-fail'

export default function Settings() {
  const [db, setDb] = useState<DbConfig>({
    engine: 'postgresql', host: 'localhost', port: '5432', database: 'worsyn',
    username: 'worsyn', password: 'worsyn', ssl: false, poolMin: '2', poolMax: '10',
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showPassword, setShowPassword] = useState(false)
  const { show, toasts, dismiss } = useToast()

  const setEngine = (engine: DbEngine) => {
    setDb(prev => ({ ...prev, engine, ...defaults[engine] }))
    setSaveState('idle')
  }

  const set = (field: keyof DbConfig, value: string | boolean) =>
    setDb(prev => ({ ...prev, [field]: value }))

  const handleTest = () => {
    setSaveState('testing')
    const ok = !!(db.host && db.database && db.username)
    setTimeout(() => {
      const result = ok ? 'test-ok' : 'test-fail'
      setSaveState(result)
      if (ok) {
        show('success', 'Conexión exitosa', `${db.engine}://${db.host}:${db.port}/${db.database}`)
      } else {
        show('danger', 'Conexión fallida', 'Verifica el host, base de datos y credenciales.')
      }
      setTimeout(() => setSaveState('idle'), 3000)
    }, 1400)
  }

  const handleSave = () => {
    setSaveState('saving')
    // Simulate save — replace with POST /api/v1/admin/settings/database in phase 2
    setTimeout(() => {
      setSaveState('saved')
      show('success', 'Configuración guardada', 'Los cambios se aplicarán en el próximo reinicio.')
      setTimeout(() => setSaveState('idle'), 3000)
    }, 900)
  }

  const engine = engines.find(e => e.value === db.engine)!
  const ph = placeholders[db.engine]

  return (
    <main className="content">

      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Administración</span>
          <h1 className="hero-title">Configuración</h1>
          <p className="hero-sub">Parámetros del sistema Worsyn. Los cambios se aplican en el próximo reinicio del servicio.</p>
        </div>
      </section>

      {/* DATABASE CONFIG — full width */}
      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Conexión</span>
              <h2 className="card-title">Base de datos</h2>
            </div>
            {saveState === 'test-ok'   && <span className="tag t-ok">Conexión exitosa</span>}
            {saveState === 'test-fail' && <span className="tag t-error">Conexión fallida</span>}
            {saveState === 'saved'     && <span className="tag t-ok">Guardado</span>}
          </div>

          {/* Engine selector */}
          <div className="form-group">
            <label className="form-label">Motor de base de datos</label>
            <div className="engine-grid">
              {engines.map(e => (
                <button
                  key={e.value}
                  type="button"
                  className={`engine-card${db.engine === e.value ? ' selected' : ''}`}
                  onClick={() => setEngine(e.value)}
                >
                  <div className="engine-logo" style={{ background: e.color }}>{e.logo}</div>
                  <span className="engine-label">{e.label}</span>
                  <span className="engine-port">:{e.defaultPort}</span>
                  {db.engine === e.value && (
                    <div className="engine-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Connection string preview */}
          <div className="form-group">
            <label className="form-label">Connection string (SQLAlchemy)</label>
            <div className="conn-string">
              <code>{connectionStrings[db.engine](db) || `${db.engine}://<user>:****@<host>:<port>/<database>`}</code>
            </div>
          </div>

          {/* Form fields */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="db-host">Host / IP</label>
              <input
                id="db-host"
                className="form-input"
                type="text"
                placeholder="localhost o 192.168.1.100"
                value={db.host}
                onChange={e => set('host', e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="db-port">Puerto</label>
              <input
                id="db-port"
                className="form-input"
                type="text"
                placeholder={engine.defaultPort}
                value={db.port}
                onChange={e => set('port', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="db-name">Nombre de base de datos</label>
              <input
                id="db-name"
                className="form-input"
                type="text"
                placeholder={ph.database}
                value={db.database}
                onChange={e => set('database', e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="db-user">Usuario</label>
              <input
                id="db-user"
                className="form-input"
                type="text"
                placeholder={ph.username}
                value={db.username}
                onChange={e => set('username', e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" htmlFor="db-pass">Contraseña</label>
              <input
                id="db-pass"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={db.password}
                onChange={e => set('password', e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                className="form-eye"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Advanced options */}
          <div className="form-section-label">Opciones avanzadas</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="db-pool-min">Pool mínimo</label>
              <input
                id="db-pool-min"
                className="form-input"
                type="number"
                min={1} max={20}
                value={db.poolMin}
                onChange={e => set('poolMin', e.target.value)}
              />
              <span className="form-hint">conexiones siempre abiertas</span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="db-pool-max">Pool máximo</label>
              <input
                id="db-pool-max"
                className="form-input"
                type="number"
                min={1} max={100}
                value={db.poolMax}
                onChange={e => set('poolMax', e.target.value)}
              />
              <span className="form-hint">conexiones concurrentes máx</span>
            </div>
            <div className="form-group">
              <label className="form-label">SSL / TLS</label>
              <div className="form-toggle-wrap">
                <button
                  type="button"
                  role="switch"
                  aria-checked={db.ssl}
                  className={`form-toggle${db.ssl ? ' on' : ''}`}
                  onClick={() => set('ssl', !db.ssl)}
                >
                  <span className="form-toggle-thumb" />
                </button>
                <span className="form-toggle-label">{db.ssl ? 'Habilitado' : 'Deshabilitado'}</span>
              </div>
              <span className="form-hint">encriptación en tránsito</span>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleTest}
              disabled={saveState === 'testing' || saveState === 'saving'}
            >
              {saveState === 'testing'
                ? <><span className="spinner" /> Probando...</>
                : <>
                    <svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                    Probar conexión
                  </>
              }
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saveState === 'saving' || saveState === 'testing'}
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

          {/* Phase 2 note */}
          <div className="form-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              <strong>Fase 2:</strong> La configuración se enviará a{' '}
              <code>POST /api/v1/admin/settings/database</code> y se almacenará cifrada.
              Los valores actuales son solo de previsualización.
            </span>
          </div>
        </section>

      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
