import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Org {
  id: string; name: string; slug: string; plan: string; status: string
  country: string | null; city: string | null; phone: string | null
  website: string | null; email: string | null; alias: string | null
  member_count: number; created_at: string; updated_at: string
}

interface Tenant {
  org_id: string; status: string; db_port: number | null
  container_name: string | null; compose_dir: string | null
  provisioned_at: string | null; error_msg: string | null; updated_at: string
}

const planClass:   Record<string, string> = { free: 't-free', pro: 't-pro', teams: 't-teams' }
const statusClass: Record<string, string> = { active: 't-ok', trial: 't-warn', suspended: 't-error', cancelled: 't-error' }
const statusLabel: Record<string, string> = { active: 'Activo', trial: 'Trial', suspended: 'Suspendido', cancelled: 'Cancelado' }
const tenantStatusClass: Record<string, string> = {
  provisioning: 't-warn', running: 't-ok', stopped: 'tag--muted', error: 't-error',
}
const tenantStatusLabel: Record<string, string> = {
  provisioning: 'Aprovisionando…', running: 'Activo', stopped: 'Detenido', error: 'Error',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token, hasRole, clearSession } = useAuth()

  const [org, setOrg]         = useState<Org | null>(null)
  const [tenant, setTenant]   = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editForm, setEditForm] = useState<Partial<Org>>({})

  const [tenantBusy, setTenantBusy]             = useState(false)
  const [confirmDestroy, setConfirmDestroy]     = useState(false)

  const canWrite = hasRole('admin', 'owner')

  const fetchOrg = useCallback(async () => {
    if (!token || !id) return
    try {
      const [orgRes, tenantRes] = await Promise.all([
        fetch(`/api/v1/organizations/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/v1/organizations/${id}/tenant`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (!orgRes.ok) {
        if (orgRes.status === 401) { clearSession(); return }
        throw new Error(`HTTP ${orgRes.status}`)
      }
      const orgData = await orgRes.json()
      setOrg(orgData)
      setEditForm(orgData)
      if (tenantRes.ok) setTenant(await tenantRes.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [token, id, clearSession])

  useEffect(() => { fetchOrg() }, [fetchOrg])

  async function handleSave() {
    if (!org) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:    editForm.name,
          plan:    editForm.plan,
          status:  editForm.status,
          country: editForm.country || null,
          city:    editForm.city    || null,
          phone:   editForm.phone   || null,
          website: editForm.website || null,
          email:   editForm.email   || null,
          alias:   editForm.alias   || null,
        }),
      })
      if (res.status === 401) { clearSession(); return }
      if (!res.ok) throw new Error((await res.json()).detail)
      const updated = await res.json()
      setOrg(updated)
      setEditing(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function doTenantAction(action: 'start' | 'stop' | 'refresh' | 'provision') {
    setTenantBusy(true)
    try {
      const method = 'POST'
      const url = action === 'provision'
        ? `/api/v1/organizations/${id}/tenant/provision`
        : `/api/v1/organizations/${id}/tenant/${action}`
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { clearSession(); return }
      if (res.ok) setTenant(await res.json())
    } finally { setTenantBusy(false) }
  }

  async function destroyTenant() {
    setTenantBusy(true)
    try {
      const res = await fetch(`/api/v1/organizations/${id}/tenant`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { clearSession(); return }
      if (res.ok) {
        setTenant(prev => prev ? { ...prev, status: 'stopped', provisioned_at: null } : prev)
        setConfirmDestroy(false)
      }
    } finally { setTenantBusy(false) }
  }

  if (loading) return <main className="content"><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando…</div></main>
  if (error || !org) return (
    <main className="content">
      <div className="banner banner--error">{error ?? 'Organización no encontrada'}</div>
      <button className="btn btn--ghost" style={{ marginTop: 16 }} onClick={() => navigate('/organizations')}>← Volver</button>
    </main>
  )

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow" style={{ cursor: 'pointer' }} onClick={() => navigate('/organizations')}>← Organizaciones</span>
          <h1 className="hero-title">{org.name}</h1>
          <p className="hero-sub" style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {org.slug}{org.alias ? <> · <span style={{ color: 'var(--c-primary)' }}>@{org.alias}</span></> : null}
          </p>
        </div>
        <div className="hero-actions">
          <span className={`tag ${statusClass[org.status] ?? ''}`} style={{ alignSelf: 'center', fontSize: 13 }}>{statusLabel[org.status] ?? org.status}</span>
          <span className={`tag ${planClass[org.plan] ?? ''}`} style={{ alignSelf: 'center', fontSize: 13 }}>{org.plan}</span>
          <button className="btn btn--ghost" onClick={() => window.open(`/portal/${org.slug}`, '_blank')}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Ver portal
          </button>
          {canWrite && !editing && (
            <button className="btn btn--ghost" onClick={() => { setEditForm(org); setEditing(true) }}>
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
        </div>
      </section>

      <div className="grid" style={{ marginTop: 8 }}>

        {/* Org details */}
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Organización</span>
              <h2 className="card-title">Información general</h2>
            </div>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', width: '35%' }}>Nombre</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  : org.name}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Slug</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{org.slug}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Alias</td>
                <td>{editing
                  ? <input className="inline-input" placeholder="bethel" value={editForm.alias ?? ''} onChange={e => setEditForm(f => ({ ...f, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') }))} />
                  : org.alias ? <span style={{ fontFamily: 'monospace', color: 'var(--c-primary)' }}>@{org.alias}</span> : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Email</td>
                <td>{editing
                  ? <input className="inline-input" type="email" placeholder="iglesia@ejemplo.com" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  : org.email ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Plan</td>
                <td>{editing
                  ? <select className="inline-input" value={editForm.plan ?? 'free'} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}>
                      <option value="free">Free</option><option value="pro">Pro</option><option value="teams">Teams</option>
                    </select>
                  : <span className={`tag ${planClass[org.plan] ?? ''}`}>{org.plan}</span>}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Estado</td>
                <td>{editing
                  ? <select className="inline-input" value={editForm.status ?? 'active'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Activo</option><option value="trial">Trial</option>
                      <option value="suspended">Suspendido</option><option value="cancelled">Cancelado</option>
                    </select>
                  : <span className={`tag ${statusClass[org.status] ?? ''}`}>{statusLabel[org.status] ?? org.status}</span>}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>País</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.country ?? ''} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} />
                  : org.country ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Ciudad</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.city ?? ''} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
                  : org.city ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Teléfono</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  : org.phone ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Web</td>
                <td>{editing
                  ? <input className="inline-input" value={editForm.website ?? ''} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
                  : org.website ? <a href={org.website} target="_blank" rel="noreferrer">{org.website}</a> : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Miembros</td>
                <td className="cell-num">{org.member_count}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Alta</td>
                <td style={{ fontSize: 12 }}>{fmtDate(org.created_at)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Tenant */}
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Infraestructura</span>
              <h2 className="card-title">Tenant Docker</h2>
            </div>
            {tenant && (
              <span className={`tag ${tenantStatusClass[tenant.status] ?? ''}`}>
                {tenantStatusLabel[tenant.status] ?? tenant.status}
              </span>
            )}
          </div>

          {!tenant ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Sin tenant asignado</div>
          ) : (
            <>
              <table className="table">
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', width: '40%' }}>Estado</td>
                    <td><span className={`tag ${tenantStatusClass[tenant.status] ?? ''}`}>{tenantStatusLabel[tenant.status] ?? tenant.status}</span></td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Contenedor</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tenant.container_name ?? '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Puerto DB</td>
                    <td className="cell-num">{tenant.db_port ?? '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Ruta compose</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{tenant.compose_dir ?? '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Aprovisionado</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(tenant.provisioned_at)}</td>
                  </tr>
                  {tenant.error_msg && (
                    <tr>
                      <td style={{ color: 'var(--c-error)' }}>Error</td>
                      <td style={{ fontSize: 12, color: 'var(--c-error)' }}>{tenant.error_msg}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {canWrite && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {tenant.status === 'running' && (
                    <button className="btn btn--ghost" onClick={() => doTenantAction('stop')} disabled={tenantBusy}>
                      {tenantBusy ? '…' : '⏹ Detener'}
                    </button>
                  )}
                  {tenant.status === 'stopped' && tenant.container_name && (
                    <button className="btn btn--primary" onClick={() => doTenantAction('start')} disabled={tenantBusy}>
                      {tenantBusy ? '…' : '▶ Iniciar'}
                    </button>
                  )}
                  {tenant.status === 'stopped' && (
                    <button className="btn btn--ghost" onClick={() => doTenantAction('provision')} disabled={tenantBusy}>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      {tenantBusy ? '…' : 'Aprovisionar'}
                    </button>
                  )}
                  <button className="btn btn--ghost" onClick={() => doTenantAction('refresh')} disabled={tenantBusy}>
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    {tenantBusy ? '…' : 'Sincronizar'}
                  </button>
                  {tenant.status === 'running' && (
                    confirmDestroy ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--c-error)' }}>¿Destruir el contenedor?</span>
                        <button className="btn btn--danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={destroyTenant} disabled={tenantBusy}>{tenantBusy ? '…' : 'Sí, destruir'}</button>
                        <button className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDestroy(false)} disabled={tenantBusy}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="btn btn--danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirmDestroy(true)} disabled={tenantBusy}>
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        Destruir tenant
                      </button>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
