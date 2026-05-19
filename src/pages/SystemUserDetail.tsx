import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast, ToastContainer } from '../components/Toast'

interface AdminUser {
  id: string
  username: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'owner'
  is_active: boolean
  must_change_password: boolean
  two_factor_enabled: boolean
  avatar: string | null
  created_at: string
  last_login_at: string | null
}

const ROLE_TAG: Record<string, string> = { owner: 't-error', admin: 't-warn', user: 't-info' }
const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', user: 'Usuario' }

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

function initials(u: AdminUser) {
  if (u.full_name) return u.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return u.username.slice(0, 2).toUpperCase()
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function SystemUserDetail() {
  const { id } = useParams<{ id: string }>()
  const { token, user: me, hasRole, setSession } = useAuth()
  const navigate = useNavigate()
  const { show, toasts, dismiss } = useToast()

  const isOwner = hasRole('owner')
  const isAdmin = hasRole('admin')

  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit form
  const [form, setForm] = useState({ username: '', email: '', full_name: '', role: 'user' as AdminUser['role'], is_active: true })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showPwdField, setShowPwdField] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [pwdState, setPwdState] = useState<SaveState>('idle')

  // 2FA
  const [twoFaState, setTwoFaState] = useState<'idle' | 'resetting'>('idle')
  // Confirm reset 2FA dialog
  const [confirmReset2FA, setConfirmReset2FA] = useState(false)

  const isSelf = me?.id === id
  const canEdit = isOwner || (isAdmin && user?.role !== 'owner')
  const canResetPwd = canEdit
  const canToggle2FA = isSelf // self can toggle own
  const canReset2FAOwner = isOwner && !isSelf // owner can reset others

  useEffect(() => {
    if (!token || !id) return
    fetch(`/api/v1/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: AdminUser) => {
        setUser(data)
        setForm({ username: data.username, email: data.email, full_name: data.full_name ?? '', role: data.role, is_active: data.is_active })
        setLoading(false)
      })
      .catch(() => { setError('No se pudo cargar el usuario.'); setLoading(false) })
  }, [token, id])

  const set = <K extends keyof typeof form>(field: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!user) return
    setSaveState('saving')
    const body: Record<string, unknown> = { username: form.username, email: form.email, full_name: form.full_name || null, is_active: form.is_active }
    if (isOwner && !isSelf) body.role = form.role
    try {
      const r = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Error') }
      const updated: AdminUser = await r.json()
      setUser(updated)
      setForm({ username: updated.username, email: updated.email, full_name: updated.full_name ?? '', role: updated.role, is_active: updated.is_active })
      if (isSelf) setSession(token!, { ...me!, username: updated.username, email: updated.email, full_name: updated.full_name, role: updated.role })
      setSaveState('saved')
      show('success', 'Usuario actualizado', `${updated.username} actualizado correctamente.`)
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err: any) {
      setSaveState('error')
      show('danger', 'Error al guardar', err.message ?? 'Inténtalo de nuevo.')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const handleResetPassword = async () => {
    if (!user || !newPassword) return
    setPwdState('saving')
    try {
      const r = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Error') }
      setNewPassword('')
      setShowPwdField(false)
      setPwdState('saved')
      show('success', 'Contraseña restablecida', 'El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.')
      setTimeout(() => setPwdState('idle'), 3000)
    } catch (err: any) {
      setPwdState('error')
      show('danger', 'Error', err.message ?? 'No se pudo restablecer la contraseña.')
      setTimeout(() => setPwdState('idle'), 3000)
    }
  }

  const handleToggleOwn2FA = async () => {
    if (!user) return
    setTwoFaState('resetting')
    try {
      const r = await fetch(`/api/v1/admin/users/${user.id}/2fa`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error()
      const updated: AdminUser = await r.json()
      setUser(updated)
      show('success', updated.two_factor_enabled ? '2FA activado' : '2FA desactivado', updated.two_factor_enabled ? 'La autenticación en dos pasos está activa en tu cuenta.' : 'La autenticación en dos pasos ha sido desactivada.')
    } catch {
      show('danger', 'Error', 'No se pudo actualizar el estado del 2FA.')
    } finally {
      setTwoFaState('idle')
    }
  }

  const handleReset2FA = async () => {
    if (!user) return
    setConfirmReset2FA(false)
    setTwoFaState('resetting')
    try {
      const r = await fetch(`/api/v1/admin/users/${user.id}/2fa`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error()
      setUser(prev => prev ? { ...prev, two_factor_enabled: false } : prev)
      show('success', '2FA restablecido', `El 2FA de ${user.username} ha sido desactivado.`)
    } catch {
      show('danger', 'Error', 'No se pudo restablecer el 2FA.')
    } finally {
      setTwoFaState('idle')
    }
  }

  if (loading) return (
    <main className="content">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-muted)' }}>Cargando usuario…</div>
    </main>
  )

  if (error || !user) return (
    <main className="content">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-danger)' }}>{error ?? 'Usuario no encontrado.'}</div>
    </main>
  )

  const readOnly = !canEdit

  return (
    <main className="content">
      {/* HERO */}
      <section className="hero">
        <div className="hero-text" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
            {user.avatar
              ? <img src={user.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
              : initials(user)}
          </div>
          <div>
            <span className="eyebrow">Usuarios del sistema</span>
            <h1 className="hero-title" style={{ margin: 0 }}>
              {user.full_name ?? user.username}
              {isSelf && <span className="tag t-info" style={{ marginLeft: 10, fontSize: 11, verticalAlign: 'middle' }}>Tú</span>}
            </h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className={`tag ${ROLE_TAG[user.role]}`}>{ROLE_LABEL[user.role]}</span>
              <span className={`tag ${user.is_active ? 't-ok' : 't-free'}`}>{user.is_active ? 'Activo' : 'Inactivo'}</span>
              {user.two_factor_enabled && <span className="tag t-ok">2FA activo</span>}
              {user.must_change_password && <span className="tag t-warn">Cred. pendiente</span>}
            </div>
          </div>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate('/system-users')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}><polyline points="15 18 9 12 15 6"/></svg>
          Volver
        </button>
      </section>

      <div className="grid">

        {/* INFO CARD */}
        <section className="col-8 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Cuenta</span>
              <h2 className="card-title">Información del usuario</h2>
            </div>
            {saveState === 'saved' && <span className="tag t-ok">Guardado</span>}
            {readOnly && <span className="tag t-warn">Solo lectura</span>}
          </div>

          {readOnly && (
            <div className="form-notice" style={{ marginBottom: 20 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>No tienes permisos para editar este usuario.</span>
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="ud-username">Usuario</label>
              <input id="ud-username" className="form-input" type="text" value={form.username}
                onChange={e => set('username', e.target.value)} disabled={readOnly} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ud-email">Email</label>
              <input id="ud-email" className="form-input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} disabled={readOnly} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ud-name">Nombre completo</label>
              <input id="ud-name" className="form-input" type="text" value={form.full_name}
                onChange={e => set('full_name', e.target.value)} disabled={readOnly} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              {isOwner && !isSelf
                ? (
                  <select className="form-input" value={form.role} onChange={e => set('role', e.target.value as AdminUser['role'])}>
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <div className="form-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-muted)', cursor: 'default' }}>
                    <span className={`tag ${ROLE_TAG[user.role]}`}>{ROLE_LABEL[user.role]}</span>
                  </div>
                )
              }
            </div>
          </div>

          <div className="form-section-label">Estado de la cuenta</div>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label className="form-label">Cuenta activa</label>
            <div className="form-toggle-wrap">
              <button type="button" role="switch" aria-checked={form.is_active}
                className={`form-toggle${form.is_active ? ' on' : ''}`}
                onClick={() => !readOnly && !isSelf && set('is_active', !form.is_active)}
                disabled={readOnly || isSelf}
              >
                <span className="form-toggle-thumb" />
              </button>
              <span className="form-toggle-label">{form.is_active ? 'Activa' : 'Desactivada'}</span>
            </div>
            {isSelf && <span className="form-hint">No puedes desactivar tu propia cuenta.</span>}
          </div>

          {!readOnly && (
            <div className="form-actions">
              <button className="btn btn--primary" onClick={handleSave} disabled={saveState === 'saving'}>
                {saveState === 'saving'
                  ? <><span className="spinner light" /> Guardando...</>
                  : <>
                      <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Guardar cambios
                    </>
                }
              </button>
            </div>
          )}
        </section>

        {/* META CARD */}
        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Info</span>
              <h2 className="card-title">Registro</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="form-hint" style={{ marginBottom: 2 }}>Creado</div>
              <div style={{ fontSize: 13 }}>{fmtDate(user.created_at)}</div>
            </div>
            <div>
              <div className="form-hint" style={{ marginBottom: 2 }}>Último acceso</div>
              <div style={{ fontSize: 13 }}>{fmtDate(user.last_login_at)}</div>
            </div>
            <div>
              <div className="form-hint" style={{ marginBottom: 2 }}>ID</div>
              <code style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--t-muted)' }}>{user.id}</code>
            </div>
          </div>
        </section>

        {/* SECURITY CARD */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Acceso</span>
              <h2 className="card-title">Seguridad</h2>
            </div>
          </div>

          <div className="form-grid-2" style={{ gap: 24 }}>

            {/* Reset password */}
            <div>
              <div className="form-section-label">Contraseña</div>
              {canResetPwd && (
                <>
                  {!showPwdField ? (
                    <button className="btn btn--ghost btn--sm" onClick={() => setShowPwdField(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Restablecer contraseña
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Nueva contraseña (mín. 8 caracteres)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn--primary btn--sm" onClick={handleResetPassword}
                          disabled={newPassword.length < 8 || pwdState === 'saving'}>
                          {pwdState === 'saving' ? <><span className="spinner light" /> Guardando...</> : 'Confirmar'}
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => { setShowPwdField(false); setNewPassword('') }}>Cancelar</button>
                      </div>
                      <span className="form-hint">El usuario deberá cambiarla en su próximo acceso.</span>
                    </div>
                  )}
                </>
              )}
              {!canResetPwd && <span className="form-hint">Sin permisos para restablecer contraseña.</span>}
            </div>

            {/* 2FA */}
            <div>
              <div className="form-section-label">Autenticación en dos pasos (2FA)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className={`tag ${user.two_factor_enabled ? 't-ok' : 't-free'}`}>
                  {user.two_factor_enabled ? '2FA activo' : '2FA inactivo'}
                </span>
              </div>

              {/* Self: toggle own 2FA */}
              {canToggle2FA && (
                <div style={{ marginBottom: 8 }}>
                  <button className="btn btn--ghost btn--sm" onClick={handleToggleOwn2FA}
                    disabled={twoFaState === 'resetting'}>
                    {twoFaState === 'resetting'
                      ? <><span className="spinner" /> Actualizando...</>
                      : user.two_factor_enabled ? 'Desactivar mi 2FA' : 'Activar mi 2FA'
                    }
                  </button>
                  <div className="form-hint" style={{ marginTop: 4 }}>La configuración de apps TOTP se implementará en Fase 2.</div>
                </div>
              )}

              {/* Owner: reset 2FA of another user */}
              {canReset2FAOwner && user.two_factor_enabled && (
                <>
                  {!confirmReset2FA ? (
                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirmReset2FA(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      Restablecer 2FA del usuario
                    </button>
                  ) : (
                    <div className="form-notice" style={{ marginTop: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                      <span>¿Desactivar el 2FA de <strong>{user.username}</strong>? El usuario deberá volver a activarlo manualmente.</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn--danger btn--sm" onClick={handleReset2FA}
                          disabled={twoFaState === 'resetting'}>
                          {twoFaState === 'resetting' ? <><span className="spinner light" /> Restableciendo...</> : 'Sí, restablecer'}
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setConfirmReset2FA(false)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {canReset2FAOwner && !user.two_factor_enabled && (
                <span className="form-hint">Este usuario no tiene 2FA activo.</span>
              )}
              {!canToggle2FA && !canReset2FAOwner && (
                <span className="form-hint">Solo el owner puede restablecer el 2FA de otro usuario.</span>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* Confirm reset 2FA overlay handled inline above */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
