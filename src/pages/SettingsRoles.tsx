import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

interface OrgRole {
  id: string; slug: string; name: string; description: string | null
  is_system: boolean; sort_order: number; member_count: number
  created_at: string; updated_at: string
}

export default function SettingsRoles() {
  const { token, hasRole, clearSession } = useAuth()
  const canWrite  = hasRole('admin', 'owner')
  const canDelete = hasRole('owner')

  const [roles, setRoles]     = useState<OrgRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Edit modal
  const [editTarget, setEditTarget] = useState<OrgRole | null>(null)
  const [editForm, setEditForm]     = useState({ name: '', description: '', sort_order: 0 })
  const [editErr, setEditErr]       = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ slug: '', name: '', description: '', sort_order: 10 })
  const [createErr, setCreateErr]   = useState<string | null>(null)
  const [creating, setCreating]     = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const fetchRoles = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/v1/org-roles/', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { clearSession(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRoles(await res.json())
      setError(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [token, clearSession])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  function openEdit(r: OrgRole) {
    setEditTarget(r)
    setEditForm({ name: r.name, description: r.description ?? '', sort_order: r.sort_order })
    setEditErr(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true); setEditErr(null)
    try {
      const res = await fetch(`/api/v1/org-roles/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editForm.name, description: editForm.description || null, sort_order: editForm.sort_order }),
      })
      if (res.status === 401) { clearSession(); return }
      const data = await res.json()
      if (!res.ok) { setEditErr(data.detail ?? 'Error'); return }
      setRoles(prev => prev.map(r => r.id === editTarget.id ? data : r).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))
      setEditTarget(null)
    } finally { setSaving(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.slug || !createForm.name) return
    setCreating(true); setCreateErr(null)
    try {
      const res = await fetch('/api/v1/org-roles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: createForm.slug, name: createForm.name, description: createForm.description || null, sort_order: createForm.sort_order }),
      })
      if (res.status === 401) { clearSession(); return }
      const data = await res.json()
      if (!res.ok) { setCreateErr(data.detail ?? 'Error'); return }
      setRoles(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))
      setShowCreate(false)
      setCreateForm({ slug: '', name: '', description: '', sort_order: 10 })
    } finally { setCreating(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/org-roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { clearSession(); return }
      if (res.ok) { setRoles(prev => prev.filter(r => r.id !== id)); setConfirmDelete(null) }
      else {
        const data = await res.json()
        setError(data.detail ?? 'No se pudo eliminar')
        setConfirmDelete(null)
      }
    } finally { setDeleting(false) }
  }

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Configuración</span>
          <h1 className="hero-title">Roles de organización</h1>
          <p className="hero-sub">Define los roles que pueden tener los miembros de las organizaciones cliente.</p>
        </div>
        <div className="hero-actions">
          {canWrite && (
            <button className="btn btn--primary" onClick={() => { setShowCreate(true); setCreateErr(null) }}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Nuevo rol
            </button>
          )}
        </div>
      </section>

      {error && <div className="banner banner--error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Permisos</span>
              <h2 className="card-title">Roles disponibles</h2>
            </div>
            <span className="tag tag--muted" style={{ fontSize: 12 }}>{loading ? '…' : `${roles.length} roles`}</span>
          </div>

          <div className="table-scroll">
            <table className="table">
              <thead><tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'center' }}>Tipo</th>
                <th style={{ textAlign: 'center' }}>Orden</th>
                <th style={{ textAlign: 'center' }}>Miembros</th>
                {canWrite && <th></th>}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canWrite ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Cargando…</td></tr>
                ) : roles.map(role => (
                  confirmDelete === role.id ? (
                    <tr key={role.id}>
                      <td colSpan={canWrite ? 7 : 6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                          <span style={{ fontSize: 13, color: 'var(--c-error)' }}>¿Eliminar el rol <strong>{role.name}</strong>?</span>
                          <button className="btn btn--danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDelete(role.id)} disabled={deleting}>{deleting ? '…' : 'Sí, eliminar'}</button>
                          <button className="btn btn--ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={role.id}>
                      <td style={{ fontWeight: 600, color: 'var(--t-base)' }}>{role.name}</td>
                      <td><code style={{ fontSize: 12, background: 'var(--bg-muted)', padding: '2px 7px', borderRadius: 5 }}>{role.slug}</code></td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>{role.description ?? <span style={{ fontStyle: 'italic' }}>—</span>}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`tag ${role.is_system ? 't-pro' : 't-teams'}`}>{role.is_system ? 'Sistema' : 'Personalizado'}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{role.sort_order}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`tag ${role.member_count > 0 ? 't-ok' : 'tag--muted'}`}>{role.member_count}</span>
                      </td>
                      {canWrite && (
                        <td style={{ textAlign: 'right', paddingRight: 8 }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="su-icon-btn" title="Editar" onClick={() => openEdit(role)}>
                              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            {canDelete && !role.is_system && (
                              <button className="su-icon-btn danger" title="Eliminar" onClick={() => setConfirmDelete(role.id)}>
                                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            )}
                            {role.is_system && (
                              <span title="Rol de sistema: no se puede eliminar" style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: 'var(--text-muted)', fontSize: 11 }}>
                                <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
            <span><span className="tag t-pro" style={{ fontSize: 10 }}>Sistema</span> · Roles base, no se pueden eliminar pero sí editar</span>
            <span><span className="tag t-teams" style={{ fontSize: 10 }}>Personalizado</span> · Roles creados por el operador, eliminables si no tienen miembros</span>
          </div>
        </section>
      </div>

      {/* EDIT MODAL */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">Editar rol — <code style={{ fontSize: 13 }}>{editTarget.slug}</code></h3>
              <button className="modal-close" onClick={() => setEditTarget(null)}>
                <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {editErr && <div className="banner banner--error" style={{ margin: '12px 20px 0' }}>{editErr}</div>}
            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-field">
                <label>Nombre <span style={{ color: 'var(--c-error)' }}>*</span></label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required disabled={saving} />
              </div>
              <div className="form-field">
                <label>Descripción</label>
                <textarea style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-muted))', color: 'var(--t-base)', fontSize: 13, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
                  value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} disabled={saving}
                  placeholder="Descripción del rol y sus responsabilidades…" />
              </div>
              <div className="form-field">
                <label>Orden de visualización</label>
                <input type="number" min={0} value={editForm.sort_order} onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))} disabled={saving} />
                <span>Menor número = aparece primero</span>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setEditTarget(null)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={saving || !editForm.name}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">Nuevo rol personalizado</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {createErr && <div className="banner banner--error" style={{ margin: '12px 20px 0' }}>{createErr}</div>}
            <form className="modal-body" onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field">
                  <label>Slug <span style={{ color: 'var(--c-error)' }}>*</span></label>
                  <input type="text" placeholder="worship_leader" value={createForm.slug}
                    onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                    required disabled={creating} />
                  <span>Solo letras minúsculas, guiones y _</span>
                </div>
                <div className="form-field">
                  <label>Nombre <span style={{ color: 'var(--c-error)' }}>*</span></label>
                  <input type="text" placeholder="Líder de Alabanza" value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    required disabled={creating} />
                </div>
              </div>
              <div className="form-field">
                <label>Descripción</label>
                <textarea style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-muted))', color: 'var(--t-base)', fontSize: 13, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
                  value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción del rol…" disabled={creating} />
              </div>
              <div className="form-field">
                <label>Orden de visualización</label>
                <input type="number" min={0} value={createForm.sort_order}
                  onChange={e => setCreateForm(f => ({ ...f, sort_order: Number(e.target.value) }))} disabled={creating} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={creating || !createForm.slug || !createForm.name}>{creating ? 'Creando…' : 'Crear rol'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
