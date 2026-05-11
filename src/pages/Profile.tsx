import { useState, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function Profile() {
  const { user, token, setSession, clearSession } = useAuth()

  // Change password form
  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [saveState, setSaveState]     = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (newPwd.length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPwd !== confirmPwd) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setSaveState('saving')
    try {
      const r = await fetch('/api/v1/auth/change-credentials', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setErrorMsg(data.detail ?? 'Error al cambiar la contraseña.')
        setSaveState('error')
        return
      }
      // Update session — must_change_password is now false
      if (user) {
        setSession(token!, { ...user, must_change_password: false })
      }
      setSaveState('saved')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch {
      setErrorMsg('No se pudo conectar con el servidor.')
      setSaveState('error')
    }
  }

  const initials = user
    ? (user.full_name
        ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : user.username.slice(0, 2).toUpperCase())
    : '?'

  const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', user: 'Usuario' }
  const ROLE_TAG:   Record<string, string> = { owner: 't-error', admin: 't-warn', user: 't-info' }

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Cuenta</span>
          <h1 className="hero-title"><span className="accent">Mi Perfil</span></h1>
          <p className="hero-sub">Información de tu cuenta y configuración de seguridad personal.</p>
        </div>
      </section>

      <div className="grid">

        {/* ── User info card ─────────────────────────────────────────── */}
        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Identidad</span>
              <h2 className="card-title">Tu cuenta</h2>
            </div>
            <span className={`tag ${ROLE_TAG[user?.role ?? 'user']}`}>
              {ROLE_LABEL[user?.role ?? 'user']}
            </span>
          </div>

          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{initials}</div>
          </div>

          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="profile-info-label">Usuario</span>
              <span className="profile-info-value">{user?.username}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Nombre</span>
              <span className="profile-info-value">{user?.full_name ?? '—'}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{user?.email}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Rol</span>
              <span className="profile-info-value">{ROLE_LABEL[user?.role ?? 'user']}</span>
            </div>
          </div>

          {user?.must_change_password && (
            <div className="pwd-alert" style={{ marginTop: 16 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Cambia tu contraseña para continuar.</span>
            </div>
          )}
        </section>

        {/* ── Change password card ───────────────────────────────────── */}
        <section className="col-8 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Seguridad</span>
              <h2 className="card-title">Cambiar contraseña</h2>
            </div>
            {saveState === 'saved' && <span className="tag t-ok">Contraseña actualizada</span>}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="cur-pwd">Contraseña actual</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="cur-pwd"
                  className="form-input"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button type="button" className="form-eye" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
                  {showCurrent
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: 0 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-pwd">Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-pwd"
                    className="form-input"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 42 }}
                  />
                  <button type="button" className="form-eye" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                    {showNew
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-pwd">Confirmar contraseña</label>
                <input
                  id="confirm-pwd"
                  className="form-input"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Password strength hint */}
            {newPwd.length > 0 && (
              <div className="form-hint" style={{ marginTop: -8, marginBottom: 8 }}>
                {newPwd.length < 8
                  ? <span style={{ color: 'var(--danger)' }}>Muy corta — mínimo 8 caracteres</span>
                  : newPwd.length < 12
                    ? <span style={{ color: 'var(--warning)' }}>Contraseña aceptable</span>
                    : <span style={{ color: 'var(--success)' }}>Contraseña fuerte</span>
                }
              </div>
            )}

            {errorMsg && (
              <div className="su-form-error" style={{ marginBottom: 16 }}>{errorMsg}</div>
            )}

            {saveState === 'saved' && (
              <div className="form-notice" style={{ marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Contraseña cambiada correctamente.</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving'
                  ? <><span className="spinner light" /> Guardando...</>
                  : <>
                      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Cambiar contraseña
                    </>
                }
              </button>
            </div>
          </form>
        </section>

      </div>
    </main>
  )
}
