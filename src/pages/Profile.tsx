import { useState, FormEvent, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

type PwdState     = 'idle' | 'saving' | 'saved' | 'error'
type ProfileState = 'idle' | 'saving' | 'saved' | 'error'
type AvatarState  = 'idle' | 'saving' | 'saved' | 'error'

const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const EyeOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', user: 'Usuario' }
const ROLE_TAG:   Record<string, string> = { owner: 't-error', admin: 't-warn', user: 't-info' }

export default function Profile() {
  const { user, token, setSession } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'owner'

  // Profile fields
  const [profUsername, setProfUsername] = useState(user?.username ?? '')
  const [profEmail,    setProfEmail]    = useState(user?.email ?? '')
  const [profFullName, setProfFullName] = useState(user?.full_name ?? '')
  const [profState,    setProfState]    = useState<ProfileState>('idle')
  const [profError,    setProfError]    = useState<string | null>(null)

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null)
  const [avatarState,   setAvatarState]   = useState<AvatarState>('idle')
  const [avatarError,   setAvatarError]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password fields
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [pwdState,    setPwdState]    = useState<PwdState>('idle')
  const [pwdError,    setPwdError]    = useState<string | null>(null)

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfError(null); setProfState('saving')
    try {
      const r = await fetch(`/api/v1/admin/users/${user!.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:  profUsername || undefined,
          email:     profEmail    || undefined,
          full_name: profFullName || null,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setProfError(data.detail ?? 'Error al guardar.'); setProfState('error'); return }
      if (user) {
        setSession(token!, {
          ...user,
          username:  data.username  ?? user.username,
          email:     data.email     ?? user.email,
          full_name: data.full_name ?? user.full_name,
        })
      }
      setProfState('saved')
    } catch {
      setProfError('No se pudo conectar con el servidor.'); setProfState('error')
    }
  }

  const handleChangePwd = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    if (newPwd.length < 8) { setPwdError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Las contraseñas no coinciden.'); return }
    setPwdState('saving')
    try {
      const r = await fetch('/api/v1/auth/change-credentials', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setPwdError(data.detail ?? 'Error al cambiar la contraseña.'); setPwdState('error'); return }
      if (user) setSession(token!, { ...user, must_change_password: false })
      setPwdState('saved')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch {
      setPwdError('No se pudo conectar con el servidor.'); setPwdState('error')
    }
  }

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarError('Solo se permiten imágenes.'); return }
    if (file.size > 10 * 1024 * 1024) { setAvatarError('La imagen no puede superar los 10 MB.'); e.target.value = ''; return }

    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const MAX = 256
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setAvatarPreview(canvas.toDataURL('image/jpeg', 0.82))
        setAvatarError(null)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveAvatar = async () => {
    setAvatarError(null); setAvatarState('saving')
    try {
      const r = await fetch(`/api/v1/admin/users/${user!.id}/avatar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarPreview }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setAvatarError(data.detail ?? 'Error al guardar.'); setAvatarState('error'); return }
      if (user) setSession(token!, { ...user, avatar: data.avatar ?? null })
      setAvatarState('saved')
    } catch {
      setAvatarError('No se pudo conectar con el servidor.'); setAvatarState('error')
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarError(null); setAvatarState('saving')
    try {
      const r = await fetch(`/api/v1/admin/users/${user!.id}/avatar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null }),
      })
      if (!r.ok) { setAvatarError('Error al eliminar.'); setAvatarState('error'); return }
      setAvatarPreview(null)
      if (user) setSession(token!, { ...user, avatar: null })
      setAvatarState('saved')
    } catch {
      setAvatarError('No se pudo conectar con el servidor.'); setAvatarState('error')
    }
  }

  const initials = user
    ? (user.full_name
        ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : user.username.slice(0, 2).toUpperCase())
    : '?'

  const avatarChanged = avatarPreview !== (user?.avatar ?? null)

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

        {/* ── Tu cuenta ─────────────────────────────────────────── */}
        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Identidad</span>
              <h2 className="card-title">Tu cuenta</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {profState === 'saved' && <span className="tag t-ok">Guardado</span>}
              <span className={`tag ${ROLE_TAG[user?.role ?? 'user']}`}>
                {ROLE_LABEL[user?.role ?? 'user']}
              </span>
            </div>
          </div>

          <div className="profile-avatar-wrap">
            <div className="profile-avatar-container">
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" className="profile-avatar profile-avatar--img" />
                : <div className="profile-avatar">{initials}</div>
              }
              <button
                type="button"
                className="profile-avatar-overlay"
                onClick={() => fileInputRef.current?.click()}
                title="Cambiar foto"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
            </div>
            {avatarError && <p className="su-form-error" style={{ marginTop: 8, textAlign: 'center' }}>{avatarError}</p>}
            <div className="profile-avatar-actions">
              {avatarChanged && (
                <button type="button" className="btn btn--primary btn--sm" onClick={handleSaveAvatar} disabled={avatarState === 'saving'}>
                  {avatarState === 'saving' ? <><span className="spinner light" /> Guardando...</> : 'Guardar foto'}
                </button>
              )}
              {avatarPreview && !avatarChanged && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={handleRemoveAvatar} disabled={avatarState === 'saving'}>
                  Eliminar foto
                </button>
              )}
              {avatarState === 'saved' && !avatarChanged && (
                <span className="tag t-ok" style={{ marginTop: 4 }}>Guardado</span>
              )}
            </div>
          </div>

          {canEdit ? (
            <form onSubmit={handleSaveProfile} style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="prof-username">Usuario</label>
                <input id="prof-username" className="form-input" type="text"
                  value={profUsername} onChange={e => setProfUsername(e.target.value)}
                  autoComplete="username" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prof-fullname">Nombre completo</label>
                <input id="prof-fullname" className="form-input" type="text"
                  value={profFullName} onChange={e => setProfFullName(e.target.value)}
                  placeholder="Opcional" autoComplete="name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prof-email">Email</label>
                <input id="prof-email" className="form-input" type="email"
                  value={profEmail} onChange={e => setProfEmail(e.target.value)}
                  autoComplete="email" required />
              </div>

              {profError && <p className="su-form-error" style={{ marginBottom: 12 }}>{profError}</p>}

              <button type="submit" className="btn btn--primary" style={{ width: '100%' }}
                disabled={profState === 'saving'}>
                {profState === 'saving'
                  ? <><span className="spinner light" /> Guardando...</>
                  : 'Guardar cambios'
                }
              </button>
            </form>
          ) : (
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
            </div>
          )}

          {user?.must_change_password && (
            <div className="pwd-alert" style={{ marginTop: 16 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Cambia tu contraseña para continuar.</span>
            </div>
          )}
        </section>

        {/* ── Cambiar contraseña ─────────────────────────────────── */}
        <section className="col-8 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Seguridad</span>
              <h2 className="card-title">Cambiar contraseña</h2>
            </div>
            {pwdState === 'saved' && <span className="tag t-ok">Contraseña actualizada</span>}
          </div>

          <form onSubmit={handleChangePwd}>
            <div className="form-group">
              <label className="form-label" htmlFor="cur-pwd">Contraseña actual</label>
              <div style={{ position: 'relative' }}>
                <input id="cur-pwd" className="form-input"
                  type={showCurrent ? 'text' : 'password'} placeholder="••••••••"
                  value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                  required autoComplete="current-password" style={{ paddingRight: 42 }} />
                <button type="button" className="form-eye"
                  onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
                  {showCurrent ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: 0 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-pwd">Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input id="new-pwd" className="form-input"
                    type={showNew ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                    value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    required autoComplete="new-password" style={{ paddingRight: 42 }} />
                  <button type="button" className="form-eye"
                    onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                    {showNew ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-pwd">Confirmar contraseña</label>
                <input id="confirm-pwd" className="form-input"
                  type="password" placeholder="Repite la contraseña"
                  value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  required autoComplete="new-password" />
              </div>
            </div>

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

            {pwdError && <p className="su-form-error" style={{ marginBottom: 12 }}>{pwdError}</p>}

            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={pwdState === 'saving'}>
                {pwdState === 'saving'
                  ? <><span className="spinner light" /> Guardando...</>
                  : <>
                      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
