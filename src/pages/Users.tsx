import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Org { id: string; name: string }

interface Member {
  id: string; org_id: string; org_name: string | null; org_slug: string | null
  email: string; full_name: string | null; phone: string | null
  role: string; is_active: boolean; joined_at: string; updated_at: string
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin org', leader: 'Líder', member: 'Miembro' }
const ROLE_CLASS: Record<string, string> = { admin: 't-pro', leader: 't-teams', member: 't-free' }

function initials(m: Member) {
  const n = m.full_name ?? m.email
  return n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Users() {
  const { token, hasRole, clearSession } = useAuth()
  const navigate = useNavigate()
  const canWrite = hasRole('admin', 'owner')

  const [members, setMembers] = useState<Member[]>([])
  const [orgs, setOrgs]       = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Filters
  const [search, setSearch]       = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState('')

  // Edit modal
  const [editTarget, setEditTarget] = useState<Member | null>(null)
  const [editForm, setEditForm]     = useState({ full_name: '', email: '', phone: '', role: 'leader', is_active: true })
  const [saving, setSaving]         = useState(false)
  const [editErr, setEditErr]       = useState<string | null>(null)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const fetchAll = useCallback(async () => {
    if (!token) return
    try {
      const [membersRes, orgsRes] = await Promise.all([
        fetch('/api/v1/members/', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/organizations/', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (membersRes.status === 401 || orgsRes.status === 401) { clearSession(); return }
      if (!membersRes.ok) throw new Error(`HTTP ${membersRes.status}`)
      setMembers(await membersRes.json())
      if (orgsRes.ok) setOrgs(await orgsRes.json())
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setLoading(false) }
  }, [token, clearSession])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Derived filters
  const filtered = members.filter(m => {
    if (filterOrg && m.org_id !== filterOrg) return false
    if (filterRole && m.role !== filterRole) return false
    if (filterActive === 'active' && !m.is_active) return false
    if (filterActive === 'inactive' && m.is_active) return false
    if (search) {
      const s = search.toLowerCase()
      if (!m.email.toLowerCase().includes(s) && !(m.full_name ?? '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const totalAdmins  = members.filter(m => m.role === 'admin').length
  const totalLeaders = members.filter(m => m.role === 'leader').length
  const totalOrgs    = new Set(members.map(m => m.org_id)).size

  function openEdit(m: Member, e: React.MouseEvent) {
    e.stopPropagation()
    setEditTarget(m)
    setEditForm({ full_name: m.full_name ?? '', email: m.email, phone: m.phone ?? '', role: m.role, is_active: m.is_active })
    setEditErr(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true); setEditErr(null)
    try {
      const res = await fetch(`/api/v1/members/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: editForm.full_name || null,
          email: editForm.email,
          phone: editForm.phone || null,
          role: editForm.role,
          is_active: editForm.is_active,
        }),
      })
      if (res.status === 401) { clearSession(); return }
      const data = await res.json()
      if (!res.ok) { setEditErr(data.detail ?? 'Error'); return }
      setMembers(prev => prev.map(m => m.id === editTarget.id ? { ...m, ...data } : m))
      setEditTarget(null)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/members/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { clearSession(); return }
      if (res.ok) { setMembers(prev => prev.filter(m => m.id !== id)); setConfirmDelete(null) }
    } finally { setDeleting(false) }
  }

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Directorio</span>
          <h1 className="hero-title"><span className="accent">Usuarios</span></h1>
          <p className="hero-sub">{loading ? '…' : `${members.length} miembros en ${totalOrgs} organización${totalOrgs !== 1 ? 'es' : ''}.`}</p>
        </div>
      </section>

      {error && <div className="banner banner--error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* KPIs */}
      <section className="kpi-grid">
        <article className="kpi-card c-primary"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon primary"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div className="kpi-label">Total miembros</div></div></div>
          <div className="kpi-value">{loading ? '…' : members.length}</div>
          <div className="kpi-compare">en todas las organizaciones</div>
        </article>
        <article className="kpi-card c-info"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon info"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <div className="kpi-label">Admins org</div></div></div>
          <div className="kpi-value">{loading ? '…' : totalAdmins}</div>
          <div className="kpi-compare">administradores</div>
        </article>
        <article className="kpi-card c-success"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon success"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
          <div className="kpi-label">Líderes</div></div></div>
          <div className="kpi-value">{loading ? '…' : totalLeaders}</div>
          <div className="kpi-compare">con rol líder</div>
        </article>
        <article className="kpi-card c-warning"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon warning"><svg viewBox="0 0 24 24"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 10v4M12 10v4M16 10v4"/></svg></div>
          <div className="kpi-label">Organizaciones</div></div></div>
          <div className="kpi-value">{loading ? '…' : totalOrgs}</div>
          <div className="kpi-compare">con miembros registrados</div>
        </article>
      </section>

      {/* Filters */}
      <div className="grid">
        <section className="col-12 card">
          <div className="card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title-wrap">
              <span className="eyebrow">Filtros</span>
              <h2 className="card-title">Todos los miembros</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
              <input type="text" placeholder="Buscar por nombre o email…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-muted))', color: 'var(--t-base)', fontSize: 13, minWidth: 220 }} />
              <select value={filterOrg} onChange={e => setFilterOrg(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-muted))', color: 'var(--t-base)', fontSize: 13 }}>
                <option value="">Todas las orgs</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-muted))', color: 'var(--t-base)', fontSize: 13 }}>
                <option value="">Todos los roles</option>
                <option value="admin">Admin org</option>
                <option value="leader">Líder</option>
                    <option value="member">Miembro</option>
              </select>
              <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-muted))', color: 'var(--t-base)', fontSize: 13 }}>
                <option value="">Cualquier estado</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              {(search || filterOrg || filterRole || filterActive) && (
                <button className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => { setSearch(''); setFilterOrg(''); setFilterRole(''); setFilterActive('') }}>
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="table-scroll">
            <table className="table">
              <thead><tr>
                <th style={{ width: 36 }}></th>
                <th>Nombre / Email</th>
                <th>Organización</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Alta</th>
                {canWrite && <th></th>}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canWrite ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Cargando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={canWrite ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No se encontraron miembros</td></tr>
                ) : filtered.map(m => (
                  confirmDelete === m.id ? (
                    <tr key={m.id}>
                      <td colSpan={canWrite ? 7 : 6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                          <span style={{ fontSize: 13, color: 'var(--c-error)' }}>¿Eliminar <strong>{m.full_name ?? m.email}</strong>?</span>
                          <button className="btn btn--danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDelete(m.id)} disabled={deleting}>{deleting ? '…' : 'Sí, eliminar'}</button>
                          <button className="btn btn--ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${m.id}`)}>
                      <td>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                          {initials(m)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--t-base)', fontSize: 13 }}>{m.full_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{m.org_name ?? '—'}</td>
                      <td><span className={`tag ${ROLE_CLASS[m.role] ?? ''}`}>{ROLE_LABEL[m.role] ?? m.role}</span></td>
                      <td><span className={`tag ${m.is_active ? 't-ok' : 'tag--muted'}`}>{m.is_active ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="cell-date" style={{ fontSize: 12 }}>{fmtDate(m.joined_at)}</td>
                      {canWrite && (
                        <td style={{ textAlign: 'right', paddingRight: 8 }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="su-icon-btn" title="Editar" onClick={e => openEdit(m, e)}>
                              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="su-icon-btn danger" title="Eliminar" onClick={e => { e.stopPropagation(); setConfirmDelete(m.id) }}>
                              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}{filtered.length !== members.length ? ` de ${members.length} total` : ''}
            </div>
          )}
        </section>
      </div>

      {/* EDIT MODAL */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">Editar miembro</h3>
              <button className="modal-close" onClick={() => setEditTarget(null)}>
                <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {editErr && <div className="banner banner--error" style={{ margin: '12px 20px 0' }}>{editErr}</div>}
            <form className="modal-body" onSubmit={handleSave}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Org: <strong>{editTarget.org_name}</strong>
              </div>
              <div className="form-field">
                <label>Nombre completo</label>
                <input type="text" value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} disabled={saving} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} disabled={saving} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field">
                  <label>Teléfono</label>
                  <input type="text" value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} disabled={saving} />
                </div>
                <div className="form-field">
                  <label>Rol</label>
                  <select value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} disabled={saving}>
                    <option value="admin">Admin org</option>
                    <option value="leader">Líder</option>
                    <option value="member">Miembro</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Estado</label>
                <select value={editForm.is_active ? 'true' : 'false'}
                  onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))} disabled={saving}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setEditTarget(null)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
