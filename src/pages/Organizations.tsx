import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Org {
  id: string; name: string; slug: string; plan: string; status: string
  country: string | null; city: string | null; email: string | null
  alias: string | null; member_count: number; created_at: string
}

const FEATURED_COUNTRIES = [
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'ES', name: 'España',         flag: '🇪🇸' },
  { code: 'CA', name: 'Canadá',         flag: '🇨🇦' },
  { code: 'MX', name: 'México',         flag: '🇲🇽' },
]
const ALL_COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' }, { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' }, { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' }, { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' }, { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' }, { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' }, { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' }, { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' }, { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' }, { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' }, { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' }, { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' }, { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'CH', name: 'Suiza', flag: '🇨🇭' }, { code: 'AU', name: 'Australia', flag: '🇦🇺' },
]

const planClass:   Record<string, string> = { free: 't-free', pro: 't-pro', teams: 't-teams' }
const statusClass: Record<string, string> = { active: 't-ok', trial: 't-warn', suspended: 't-error', cancelled: 't-error' }
const statusLabel: Record<string, string> = { active: 'Activo', trial: 'Trial', suspended: 'Suspendido', cancelled: 'Cancelado' }
const planPrice:   Record<string, number> = { free: 0, pro: 12, teams: 29 }

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Organizations() {
  const { token, hasRole, clearSession } = useAuth()
  const navigate = useNavigate()

  const [orgs, setOrgs]       = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting]           = useState(false)

  // Create modal
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', slug: '', alias: '', plan: 'free', email: '', country: '', city: '',
  })
  const [showUserSection, setShowUserSection] = useState(false)
  const [initUser, setInitUser] = useState({ full_name: '', email: '', password: '' })

  const canWrite = hasRole('admin', 'owner')

  const fetchOrgs = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/v1/organizations/', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { clearSession(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOrgs(await res.json())
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setLoading(false) }
  }, [token, clearSession])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const active = orgs.filter(o => o.status === 'active').length
  const trial  = orgs.filter(o => o.status === 'trial').length
  const mrr    = orgs.filter(o => o.status === 'active').reduce((s, o) => s + planPrice[o.plan], 0)

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/organizations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { clearSession(); return }
      if (res.ok) {
        setOrgs(prev => prev.filter(o => o.id !== id))
        setConfirmDelete(null)
      }
    } finally { setDeleting(false) }
  }

  function openModal() {
    setForm({ name: '', slug: '', alias: '', plan: 'free', email: '', country: '', city: '' })
    setInitUser({ full_name: '', email: '', password: '' })
    setShowUserSection(false)
    setCreateErr(null)
    setShowModal(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug) return
    setCreating(true); setCreateErr(null)
    try {
      const res = await fetch('/api/v1/organizations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name, slug: form.slug,
          alias: form.alias || null,
          plan: form.plan, status: 'active',
          email: form.email || null,
          country: form.country || null,
          city: form.city || null,
        }),
      })
      const data = await res.json()
      if (res.status === 401) { clearSession(); return }
      if (!res.ok) { setCreateErr(data.detail ?? 'Error'); return }

      // Create initial user if provided
      if (showUserSection && initUser.email && initUser.password && initUser.full_name) {
        await fetch(`/api/v1/organizations/${data.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...initUser, role: 'owner' }),
        })
      }

      setOrgs(prev => [data, ...prev])
      setShowModal(false)
    } catch { setCreateErr('No se pudo conectar con el servidor') }
    finally { setCreating(false) }
  }

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Gestión</span>
          <h1 className="hero-title"><span className="accent">Organizaciones</span></h1>
          <p className="hero-sub">{loading ? '…' : `${orgs.length} organizaciones registradas.`}</p>
        </div>
        <div className="hero-actions">
          {canWrite && (
            <button className="btn btn--primary" onClick={openModal}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Añadir org
            </button>
          )}
        </div>
      </section>

      {error && <div className="banner banner--error" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="kpi-grid">
        <article className="kpi-card c-primary"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon primary"><svg viewBox="0 0 24 24"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 10v4M12 10v4M16 10v4"/></svg></div>
          <div className="kpi-label">Total orgs</div></div></div>
          <div className="kpi-value">{loading ? '…' : orgs.length}</div>
          <div className="kpi-compare">registradas en la plataforma</div>
        </article>
        <article className="kpi-card c-success"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon success"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div className="kpi-label">Activas</div></div></div>
          <div className="kpi-value">{loading ? '…' : active}</div>
          <div className="kpi-compare">pagando suscripción</div>
        </article>
        <article className="kpi-card c-warning"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon warning"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div className="kpi-label">En trial</div></div></div>
          <div className="kpi-value">{loading ? '…' : trial}</div>
          <div className="kpi-compare">periodo de prueba activo</div>
        </article>
        <article className="kpi-card c-info"><div className="kpi-top"><div className="kpi-identity">
          <div className="kpi-icon info"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div className="kpi-label">MRR total</div></div></div>
          <div className="kpi-value">${loading ? '…' : mrr}</div>
          <div className="kpi-compare">ingresos mensuales recurrentes</div>
        </article>
      </section>

      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Directorio</span>
              <h2 className="card-title">Todas las organizaciones</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead><tr>
                <th>Nombre</th><th>Alias</th><th>Plan</th><th>Miembros</th><th>Estado</th><th>Alta</th>
                {canWrite && <th></th>}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando…</td></tr>
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay organizaciones aún</td></tr>
                ) : orgs.map(org => (
                  <tr key={org.id}>
                    {confirmDelete === org.id ? (
                      <td colSpan={canWrite ? 7 : 6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                          <span style={{ fontSize: 13, color: 'var(--c-error)' }}>¿Eliminar <strong>{org.name}</strong> y su tenant?</span>
                          <button className="btn btn--danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDelete(org.id)} disabled={deleting}>{deleting ? '…' : 'Sí, eliminar'}</button>
                          <button className="btn btn--ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="cell-name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/organizations/${org.id}`)}>{org.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{org.alias ?? org.slug}</td>
                        <td><span className={`tag ${planClass[org.plan] ?? ''}`}>{org.plan}</span></td>
                        <td className="cell-num">{org.member_count}</td>
                        <td><span className={`tag ${statusClass[org.status] ?? ''}`}>{statusLabel[org.status] ?? org.status}</span></td>
                        <td className="cell-date">{fmtDate(org.created_at)}</td>
                        {canWrite && (
                          <td style={{ textAlign: 'right', paddingRight: 8 }}>
                            <button className="su-icon-btn danger" title="Eliminar" onClick={e => { e.stopPropagation(); setConfirmDelete(org.id) }}>
                              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">Nueva organización</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {createErr && <div className="banner banner--error" style={{ margin: '12px 20px 0' }}>{createErr}</div>}
            <form className="modal-body" onSubmit={handleCreate}>

              <div className="form-field">
                <label>Nombre <span style={{ color: 'var(--c-error)' }}>*</span></label>
                <input type="text" placeholder="Iglesia Central Madrid" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value), alias: toSlug(e.target.value).slice(0,20) }))}
                  required disabled={creating} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field">
                  <label>Slug (ID único) <span style={{ color: 'var(--c-error)' }}>*</span></label>
                  <input type="text" value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
                    required disabled={creating} />
                  <span>Para el contenedor Docker</span>
                </div>
                <div className="form-field">
                  <label>Alias (acceso tenant)</label>
                  <input type="text" placeholder="bethel" value={form.alias}
                    onChange={e => setForm(f => ({ ...f, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') }))}
                    disabled={creating} />
                  <span>Nombre corto que usarán los usuarios</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field">
                  <label>Plan</label>
                  <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} disabled={creating}>
                    <option value="free">Free — $0/mes</option>
                    <option value="pro">Pro — $12/mes</option>
                    <option value="teams">Teams — $29/mes</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Email de contacto</label>
                  <input type="email" placeholder="iglesia@ejemplo.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={creating} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field">
                  <label>País</label>
                  <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} disabled={creating}>
                    <option value="">— Sin especificar —</option>
                    <optgroup label="Destacados">
                      {FEATURED_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                    </optgroup>
                    <optgroup label="Otros países">
                      {ALL_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="form-field">
                  <label>Ciudad</label>
                  <input type="text" placeholder="Madrid" value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} disabled={creating} />
                </div>
              </div>

              {/* Initial user section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '5px 10px' }}
                  onClick={() => setShowUserSection(s => !s)}>
                  {showUserSection ? '▾' : '▸'} Usuario administrador inicial (opcional)
                </button>
                {showUserSection && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    <div className="form-field">
                      <label>Nombre completo</label>
                      <input type="text" placeholder="Pastor Juan García" value={initUser.full_name}
                        onChange={e => setInitUser(u => ({ ...u, full_name: e.target.value }))} disabled={creating} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-field">
                        <label>Email</label>
                        <input type="email" placeholder="pastor@iglesia.com" value={initUser.email}
                          onChange={e => setInitUser(u => ({ ...u, email: e.target.value }))} disabled={creating} />
                      </div>
                      <div className="form-field">
                        <label>Contraseña (mín. 8 car.)</label>
                        <input type="password" value={initUser.password}
                          onChange={e => setInitUser(u => ({ ...u, password: e.target.value }))} disabled={creating} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Se creará con rol <strong>owner</strong> en la organización</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)} disabled={creating}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={creating || !form.name || !form.slug}>
                  {creating ? 'Creando…' : 'Crear organización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
