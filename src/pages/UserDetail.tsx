import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Member {
  id: string; org_id: string; org_name: string | null; org_slug: string | null
  email: string; full_name: string | null; phone: string | null
  role: string; is_active: boolean; joined_at: string; updated_at: string
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin org', leader: 'Líder', member: 'Miembro' }
const ROLE_CLASS: Record<string, string> = { admin: 't-pro', leader: 't-teams', member: 't-free' }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function initials(m: Member) {
  const n = m.full_name ?? m.email
  return n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token, hasRole, clearSession } = useAuth()
  const canWrite = hasRole('admin', 'owner')

  const [member, setMember]   = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '', role: 'leader', is_active: true, password: '' })
  const [editErr, setEditErr] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const fetchMember = useCallback(async () => {
    if (!token || !id) return
    try {
      const res = await fetch(`/api/v1/members/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { clearSession(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMember(data)
      setEditForm({ full_name: data.full_name ?? '', email: data.email, phone: data.phone ?? '', role: data.role, is_active: data.is_active, password: '' })
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setLoading(false) }
  }, [token, id, clearSession])

  useEffect(() => { fetchMember() }, [fetchMember])

  async function handleSave() {
    if (!member) return
    setSaving(true); setEditErr(null)
    const body: Record<string, unknown> = {
      full_name: editForm.full_name || null,
      email: editForm.email,
      phone: editForm.phone || null,
      role: editForm.role,
      is_active: editForm.is_active,
    }
    if (editForm.password) body.password = editForm.password
    try {
      const res = await fetch(`/api/v1/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.status === 401) { clearSession(); return }
      const data = await res.json()
      if (!res.ok) { setEditErr(data.detail ?? 'Error'); return }
      setMember(data)
      setEditing(false)
      setEditForm(f => ({ ...f, password: '' }))
    } catch { setEditErr('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/members/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { clearSession(); return }
      if (res.ok) navigate('/users')
    } finally { setDeleting(false) }
  }

  if (loading) return <main className="content"><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando…</div></main>
  if (error || !member) return (
    <main className="content">
      <div className="banner banner--error">{error ?? 'Miembro no encontrado'}</div>
      <button className="btn btn--ghost" style={{ marginTop: 16 }} onClick={() => navigate('/users')}>← Volver</button>
    </main>
  )

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow" style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>← Usuarios</span>
          <h1 className="hero-title">{member.full_name ?? member.email}</h1>
          <p className="hero-sub" style={{ fontFamily: 'monospace', fontSize: 13 }}>{member.email}</p>
        </div>
        <div className="hero-actions" style={{ alignItems: 'center' }}>
          <span className={`tag ${ROLE_CLASS[member.role] ?? ''}`} style={{ fontSize: 13 }}>{ROLE_LABEL[member.role] ?? member.role}</span>
          <span className={`tag ${member.is_active ? 't-ok' : 'tag--muted'}`} style={{ fontSize: 13 }}>{member.is_active ? 'Activo' : 'Inactivo'}</span>
          {canWrite && !editing && (
            <button className="btn btn--ghost" onClick={() => { setEditForm({ full_name: member.full_name ?? '', email: member.email, phone: member.phone ?? '', role: member.role, is_active: member.is_active, password: '' }); setEditing(true); setEditErr(null) }}>
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
          )}
          {editing && (
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </>
          )}
          {canWrite && !editing && (
            confirmDelete ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--c-error)' }}>¿Eliminar?</span>
                <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>{deleting ? '…' : 'Sí'}</button>
                <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>No</button>
              </>
            ) : (
              <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Eliminar
              </button>
            )
          )}
        </div>
      </section>

      {editErr && <div className="banner banner--error" style={{ marginBottom: 16 }}>{editErr}</div>}

      <div className="grid" style={{ marginTop: 8 }}>

        {/* Avatar + resumen */}
        <section className="col-4 card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>
            {initials(member)}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t-base)' }}>{member.full_name ?? '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{member.email}</div>
          </div>
          <span className={`tag ${ROLE_CLASS[member.role] ?? ''}`}>{ROLE_LABEL[member.role] ?? member.role}</span>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            <div>Org: <strong style={{ color: 'var(--t-base)' }}>{member.org_name ?? '—'}</strong></div>
          </div>
        </section>

        {/* Detalle */}
        <section className="col-8 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Perfil</span>
              <h2 className="card-title">Información del miembro</h2>
            </div>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', width: '35%' }}>Nombre completo</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre Apellido" />
                  : member.full_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Email</td>
                <td>{editing
                  ? <input className="inline-input" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
                  : member.email}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Teléfono</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 600 000 000" />
                  : member.phone ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Rol</td>
                <td>{editing
                  ? <select className="inline-input" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="admin">Admin org</option>
                      <option value="leader">Líder</option>
                    <option value="member">Miembro</option>
                    </select>
                  : <span className={`tag ${ROLE_CLASS[member.role] ?? ''}`}>{ROLE_LABEL[member.role] ?? member.role}</span>}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Estado</td>
                <td>{editing
                  ? <select className="inline-input" value={editForm.is_active ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  : <span className={`tag ${member.is_active ? 't-ok' : 'tag--muted'}`}>{member.is_active ? 'Activo' : 'Inactivo'}</span>}</td>
              </tr>
              {editing && (
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Nueva contraseña</td>
                  <td><input className="inline-input" type="password" placeholder="Dejar vacío para no cambiar" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} /></td>
                </tr>
              )}
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Organización</td>
                <td style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/organizations/${member.org_id}`)}>
                  {member.org_name ?? '—'} ↗
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Alta</td>
                <td style={{ fontSize: 12 }}>{fmtDate(member.joined_at)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Última actualización</td>
                <td style={{ fontSize: 12 }}>{fmtDate(member.updated_at)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
