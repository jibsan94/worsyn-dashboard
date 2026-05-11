import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface AdminUser {
  id: string
  username: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'owner'
  is_active: boolean
  must_change_password: boolean
  created_at: string
  last_login_at: string | null
}

interface UserForm {
  username: string
  email: string
  full_name: string
  password: string
  role: 'user' | 'admin' | 'owner'
  is_active: boolean
}

const EMPTY_FORM: UserForm = {
  username: '', email: '', full_name: '', password: '', role: 'user', is_active: true,
}

const ROLE_TAG: Record<string, string> = { owner: 't-error', admin: 't-warn', user: 't-info' }
const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', user: 'Usuario' }

// ── Icon components ──────────────────────────────────────────────────────────
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SystemUsers() {
  const { token, user: me, hasRole, clearSession, setSession } = useAuth()
  const navigate = useNavigate()
  const isOwner = hasRole('owner')
  const isAdmin = hasRole('admin')
  const canWrite = isOwner || isAdmin

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadUsers = () => {
    if (!token) { setLoading(false); return }
    setLoading(true); setError(null)
    fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json()
        if (r.status === 401) { clearSession(); navigate('/login'); return }
        if (!r.ok) { setError(data.detail ?? 'Error al cargar usuarios.'); setLoading(false); return }
        if (!Array.isArray(data)) { setError('Respuesta inesperada del servidor.'); setLoading(false); return }
        setUsers(data); setLoading(false)
      })
      .catch(() => { setError('No se pudo conectar con el servidor.'); setLoading(false) })
  }

  useEffect(() => { loadUsers() }, [token]) // eslint-disable-line

  // ── Permission helpers ─────────────────────────────────────────────────────
  const canEdit   = (u: AdminUser) => isOwner || (isAdmin && u.role !== 'owner')
  const canDelete = (u: AdminUser) => u.id !== me?.id && (isOwner || (isAdmin && u.role !== 'owner'))

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM); setFormError(null); setEditTarget(null); setModal('create')
  }
  const openEdit = (u: AdminUser) => {
    setForm({ username: u.username, email: u.email, full_name: u.full_name ?? '', password: '', role: u.role, is_active: u.is_active })
    setFormError(null); setEditTarget(u); setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditTarget(null) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(null); setSubmitting(true)
    try {
      const isEdit = modal === 'edit' && editTarget
      const url    = isEdit ? `/api/v1/admin/users/${editTarget!.id}` : '/api/v1/admin/users'
      const method = isEdit ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        username: form.username, email: form.email,
        full_name: form.full_name || null, role: form.role, is_active: form.is_active,
      }
      if (form.password) body.password = form.password
      if (!isEdit && !form.password) { setFormError('La contraseña es obligatoria.'); setSubmitting(false); return }

      const r = await fetch(url, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.status === 401) { clearSession(); navigate('/login'); return }
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        setFormError(err.detail ?? 'Error al guardar.'); setSubmitting(false); return
      }
      // If editing ourselves, refresh the session so role/username update immediately
      if (isEdit && editTarget!.id === me?.id && token) {
        const updated = await r.clone().json().catch(() => null)
        if (updated && me) {
          setSession(token, {
            ...me,
            username: updated.username ?? me.username,
            email: updated.email ?? me.email,
            full_name: updated.full_name ?? me.full_name,
            role: updated.role ?? me.role,
            must_change_password: updated.must_change_password ?? me.must_change_password,
          })
        }
      }
      closeModal(); loadUsers()
    } catch { setFormError('Error de conexión.')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try {
      const r = await fetch(`/api/v1/admin/users/${deleteTarget.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (r.status === 401) { clearSession(); navigate('/login'); return }
      if (r.ok || r.status === 204) { setDeleteTarget(null); loadUsers() }
      else { const err = await r.json().catch(() => ({})); setDeleteError(err.detail ?? 'Error al eliminar.') }
    } catch { setDeleteError('Error de conexión.')
    } finally { setDeleting(false) }
  }

  const availableRoles: Array<'user' | 'admin' | 'owner'> = isOwner ? ['user', 'admin', 'owner'] : ['user', 'admin']

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Gestión</span>
          <h1 className="hero-title"><span className="accent">Usuarios del Sistema</span></h1>
          <p className="hero-sub">Operadores de la plataforma Worsyn con acceso al panel de administración.</p>
        </div>
        {canWrite && (
          <div className="hero-actions">
            <button className="btn btn--primary" onClick={openCreate}>+ Nuevo usuario</button>
          </div>
        )}
      </section>

      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">system_users</span>
              <h2 className="card-title">Usuarios del panel</h2>
            </div>
            {!loading && !error && (
              <span className="tag t-ok">{users.length} usuario{users.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading && <p style={{ color: 'var(--t-muted)', fontSize: 14, margin: 0 }}>Cargando…</p>}
          {error && <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>{error}</p>}

          {!loading && !error && (
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="su-table">
                <thead>
                  <tr>
                    {['Usuario', 'Email', 'Nombre', 'Rol', 'Estado', 'Último acceso', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="su-cell-bold">
                        {u.username}
                        {u.id === me?.id && <span className="tag t-info" style={{ marginLeft: 6, fontSize: 10 }}>Tú</span>}
                        {u.must_change_password && <span className="tag t-warn" style={{ marginLeft: 6, fontSize: 10 }}>Cred. pendiente</span>}
                      </td>
                      <td className="su-muted">{u.email}</td>
                      <td className="su-muted">{u.full_name ?? '—'}</td>
                      <td><span className={`tag ${ROLE_TAG[u.role] ?? 't-info'}`}>{ROLE_LABEL[u.role] ?? u.role}</span></td>
                      <td><span className={`tag ${u.is_active ? 't-ok' : 't-free'}`}>{u.is_active ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="su-muted su-nowrap">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                      <td className="su-actions">
                        <button
                          className="su-icon-btn"
                          title={canEdit(u) ? 'Editar' : 'Sin permisos para editar este usuario'}
                          disabled={!canEdit(u)}
                          onClick={() => openEdit(u)}
                        ><IconEdit /></button>
                        <button
                          className="su-icon-btn danger"
                          title={!canDelete(u) ? (u.id === me?.id ? 'No puedes eliminar tu propia cuenta' : 'Sin permisos') : 'Eliminar'}
                          disabled={!canDelete(u)}
                          onClick={() => { setDeleteError(null); setDeleteTarget(u) }}
                        ><IconTrash /></button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '20px 12px', color: 'var(--t-muted)', textAlign: 'center' }}>
                        Sin usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ color: 'var(--t-muted)', fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Tabla <code>system_users</code>. Los miembros de organizaciones se gestionan desde la sección Organizaciones.
          </p>
        </section>
      </div>

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {modal && (
        <div className="su-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="su-modal">
            <div className="su-modal-head">
              <h3>{modal === 'create' ? 'Nuevo usuario' : `Editar · ${editTarget?.username}`}</h3>
              <button className="su-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="su-modal-body" onSubmit={handleSubmit}>
              <div className="su-field">
                <label>Nombre de usuario *</label>
                <input required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="johndoe" />
              </div>
              <div className="su-field">
                <label>Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@worsyn.local" />
              </div>
              <div className="su-field">
                <label>Nombre completo</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="su-field">
                <label>{modal === 'create' ? 'Contraseña *' : 'Nueva contraseña (vacío = sin cambio)'}</label>
                <input
                  type="password"
                  required={modal === 'create'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={modal === 'create' ? '••••••••' : 'Sin cambio'}
                />
              </div>
              <div className="su-field-row">
                <div className="su-field">
                  <label>Rol *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserForm['role'] }))}>
                    {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <div className="su-field">
                  <label>Estado</label>
                  <select value={String(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              {formError && <p className="su-form-error">{formError}</p>}
              <div className="su-modal-foot">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Guardando…' : modal === 'create' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="su-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="su-modal su-modal-sm">
            <div className="su-modal-head">
              <h3>Eliminar usuario</h3>
              <button className="su-modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="su-modal-body">
              <p style={{ margin: '0 0 16px', color: 'var(--t-base)', lineHeight: 1.6 }}>
                ¿Seguro que quieres eliminar a <strong>{deleteTarget.username}</strong>?
                Esta acción no se puede deshacer.
              </p>
              {deleteError && <p className="su-form-error">{deleteError}</p>}
              <div className="su-modal-foot">
                <button className="btn btn--ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                <button className="btn btn--danger" disabled={deleting} onClick={handleDelete}>
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
