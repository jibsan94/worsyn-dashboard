import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

interface AuditLog {
  id: string
  actor_id: string | null
  actor_username: string
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  details: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inicio de sesión',
  'auth.2fa.complete': 'Login 2FA',
  'auth.credentials.change': 'Credenciales cambiadas',
  'auth.2fa.enable': '2FA activado',
  'auth.2fa.disable': '2FA desactivado',
  'user.create': 'Usuario creado',
  'user.update': 'Usuario actualizado',
  'user.delete': 'Usuario eliminado',
  'user.2fa.reset': '2FA reseteado',
  'org.create': 'Org. creada',
  'org.update': 'Org. actualizada',
  'org.delete': 'Org. eliminada',
  'tenant.start': 'Tenant iniciado',
  'tenant.stop': 'Tenant detenido',
  'tenant.destroy': 'Tenant destruido',
  'tenant.provision': 'Tenant aprovisionado',
  'settings.general.save': 'Config. general',
  'settings.security.save': 'Config. seguridad',
}

const ACTION_TAG: Record<string, string> = {
  'auth.login': 't-info',
  'auth.2fa.complete': 't-info',
  'auth.credentials.change': 't-warn',
  'auth.2fa.enable': 't-ok',
  'auth.2fa.disable': 't-warn',
  'user.create': 't-ok',
  'user.update': 't-warn',
  'user.delete': 't-error',
  'user.2fa.reset': 't-warn',
  'org.create': 't-ok',
  'org.update': 't-warn',
  'org.delete': 't-error',
  'tenant.start': 't-ok',
  'tenant.stop': 't-warn',
  'tenant.destroy': 't-error',
  'tenant.provision': 't-warn',
  'settings.general.save': 't-info',
  'settings.security.save': 't-info',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtDetails(raw: string | null): string {
  if (!raw) return '—'
  try {
    const obj = JSON.parse(raw)
    return Object.entries(obj).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' · ')
  } catch {
    return raw
  }
}

const PAGE_SIZE = 50

export default function SystemLogs() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [filterActor, setFilterActor] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (filterAction) params.set('action', filterAction)
      if (filterResource) params.set('resource_type', filterResource)
      if (filterActor) params.set('actor_username', filterActor)

      const [dataRes, countRes] = await Promise.all([
        fetch(`/api/v1/admin/logs?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/v1/admin/logs/count`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (!dataRes.ok) throw new Error('Error al cargar logs')
      setLogs(await dataRes.json())
      setTotal((await countRes.json()).total ?? 0)
    } catch (e: any) {
      setError(e.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [page, filterAction, filterResource, filterActor, token])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function applyFilter() { setPage(0); fetchLogs() }
  function clearFilter() { setFilterAction(''); setFilterResource(''); setFilterActor(''); setPage(0) }

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Auditoría</span>
          <h1 className="hero-title"><span className="accent">Logs del Sistema</span></h1>
          <p className="hero-sub">Registro de todas las acciones realizadas en el panel de administración.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn--ghost" onClick={fetchLogs} title="Refrescar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refrescar
          </button>
        </div>
      </section>

      <div className="grid">
        {/* Filter bar */}
        <section className="col-12 card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="su-field" style={{ flex: '1 1 200px' }}>
              <label>Acción</label>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                <option value="">Todas las acciones</option>
                {Object.entries(ACTION_LABELS).map(([a, l]) => (
                  <option key={a} value={a}>{l}</option>
                ))}
              </select>
            </div>
            <div className="su-field" style={{ flex: '1 1 160px' }}>
              <label>Recurso</label>
              <select value={filterResource} onChange={e => setFilterResource(e.target.value)}>
                <option value="">Todos</option>
                <option value="session">Sesión</option>
                <option value="user">Usuario</option>
                <option value="org">Organización</option>
                <option value="tenant">Tenant</option>
                <option value="settings">Configuración</option>
              </select>
            </div>
            <div className="su-field" style={{ flex: '1 1 180px' }}>
              <label>Actor</label>
              <input
                placeholder="nombre de usuario..."
                value={filterActor}
                onChange={e => setFilterActor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilter()}
              />
            </div>
            <button className="btn btn--primary" style={{ alignSelf: 'flex-end' }} onClick={applyFilter}>
              Filtrar
            </button>
            {(filterAction || filterResource || filterActor) && (
              <button className="btn btn--ghost" style={{ alignSelf: 'flex-end' }} onClick={clearFilter}>
                Limpiar
              </button>
            )}
          </div>
        </section>

        {/* Logs table */}
        <section className="col-12 card" style={{ padding: 0 }}>
          <div className="card-head" style={{ padding: '16px 20px 14px', marginBottom: 0 }}>
            <div className="card-title-wrap">
              <span className="eyebrow">audit_logs</span>
              <h2 className="card-title">Historial de acciones</h2>
            </div>
            {!loading && (
              <span className="tag t-info">{total.toLocaleString('es-ES')} entrada{total !== 1 ? 's' : ''}</span>
            )}
          </div>

          {error && (
            <div style={{ padding: '0 20px 14px' }}>
              <p className="su-form-error">{error}</p>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="su-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  {['Fecha', 'Actor', 'Acción', 'Recurso', 'Nombre', 'Detalles'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--t-muted)' }}>
                      Cargando…
                    </td>
                  </tr>
                )}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--t-muted)' }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
                {!loading && logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} className="su-muted">
                      <span style={{ fontSize: 12 }}>{fmtDate(log.created_at)}</span>
                    </td>
                    <td className="su-cell-bold">{log.actor_username}</td>
                    <td>
                      <span className={`tag ${ACTION_TAG[log.action] ?? 't-info'}`} style={{ fontSize: 11 }}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="su-muted" style={{ fontSize: 12 }}>{log.resource_type}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.resource_name ?? log.resource_id ?? '—'}
                    </td>
                    <td
                      className="su-muted"
                      style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}
                      title={fmtDetails(log.details)}
                    >
                      {fmtDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderTop: '1px solid var(--border-soft)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>
                Página {page + 1} de {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  ← Anterior
                </button>
                <button className="btn btn--ghost btn--sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
