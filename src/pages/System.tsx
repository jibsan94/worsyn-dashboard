import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HostInfo {
  hostname: string
  os: string
  kernel: string
  uptime_seconds: number
  boot_time: string
}

interface CpuInfo {
  percent: number
  cores_physical: number
  cores_logical: number
  freq_mhz: number | null
}

interface RamInfo {
  total_gb: number
  used_gb: number
  free_gb: number
  percent: number
}

interface DiskInfo {
  total_gb: number
  used_gb: number
  free_gb: number
  percent: number
}

interface ServiceStatus {
  name: string
  status: string
  latency_ms: number
}

interface Metrics {
  host: HostInfo
  cpu: CpuInfo
  ram: RamInfo
  disk: DiskInfo
  services: ServiceStatus[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusClass: Record<string, string> = { ok: 't-ok', error: 't-error' }
const statusLabel: Record<string, string> = { ok: 'OK', error: 'Error' }

function fmtUptime(secs: number): string {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const parts = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function GaugeBar({ percent, color }: { percent: number; color: string }) {
  const clamp = Math.min(100, Math.max(0, percent))
  return (
    <div style={{ background: 'var(--bg-muted)', borderRadius: 6, height: 8, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${clamp}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function gaugeColor(pct: number): string {
  if (pct >= 90) return 'var(--c-error)'
  if (pct >= 70) return 'var(--c-warning)'
  return 'var(--c-success)'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function System() {
  const { token, clearSession } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/v1/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        clearSession()
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Metrics = await res.json()
      setMetrics(data)
      setLastUpdate(new Date())
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al obtener métricas')
    } finally {
      setLoading(false)
    }
  }, [token, clearSession])

  useEffect(() => {
    fetchMetrics()
    const id = setInterval(fetchMetrics, 10_000)
    return () => clearInterval(id)
  }, [fetchMetrics])

  const allOk = metrics?.services.every(s => s.status === 'ok') ?? true

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Infraestructura</span>
          <h1 className="hero-title">Estado del <span className="accent">sistema</span></h1>
          <p className="hero-sub">Monitorización de servicios y estado de infraestructura.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn--ghost" onClick={fetchMetrics} disabled={loading}>
            <svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Actualizar
          </button>
          {lastUpdate && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
              Actualizado: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="banner banner--error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── KPI Row ── */}
      <section className="kpi-grid">
        <article className={`kpi-card ${allOk ? 'c-success' : 'c-error'}`}>
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className={`kpi-icon ${allOk ? 'success' : 'error'}`}>
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="kpi-label">Estado global</div>
            </div>
          </div>
          <div className="kpi-value">{loading ? '…' : allOk ? 'OK' : 'Error'}</div>
          <div className="kpi-compare">{allOk ? 'todos los servicios operativos' : 'revisar servicios con error'}</div>
        </article>

        <article className="kpi-card c-primary">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon primary">
                <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div className="kpi-label">Hostname</div>
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{loading ? '…' : metrics?.host.hostname ?? '—'}</div>
          <div className="kpi-compare">{loading ? '' : metrics?.host.os ?? ''}</div>
        </article>

        <article className="kpi-card c-info">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon info">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="kpi-label">Uptime</div>
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
            {loading ? '…' : metrics ? fmtUptime(metrics.host.uptime_seconds) : '—'}
          </div>
          <div className="kpi-compare">desde el último arranque</div>
        </article>

        <article className="kpi-card c-success">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon success">
                <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div className="kpi-label">CPU</div>
            </div>
          </div>
          <div className="kpi-value">
            {loading ? '…' : `${metrics?.cpu.percent ?? 0}`}<sup>%</sup>
          </div>
          <div className="kpi-compare">
            {loading ? '' : `${metrics?.cpu.cores_logical} cores${metrics?.cpu.freq_mhz ? ` · ${(metrics.cpu.freq_mhz / 1000).toFixed(1)} GHz` : ''}`}
          </div>
        </article>
      </section>

      {/* ── Resource gauges ── */}
      <div className="grid">
        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Procesador</span>
              <h2 className="card-title">CPU</h2>
            </div>
            <span className="tag t-ok">{loading ? '…' : `${metrics?.cpu.percent ?? 0}%`}</span>
          </div>
          <div style={{ padding: '0 0 8px' }}>
            <GaugeBar percent={metrics?.cpu.percent ?? 0} color={gaugeColor(metrics?.cpu.percent ?? 0)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Núcleos físicos: <strong>{metrics?.cpu.cores_physical ?? '—'}</strong></span>
              <span>Lógicos: <strong>{metrics?.cpu.cores_logical ?? '—'}</strong></span>
            </div>
            {metrics?.cpu.freq_mhz && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Frecuencia: <strong>{(metrics.cpu.freq_mhz / 1000).toFixed(2)} GHz</strong>
              </div>
            )}
          </div>
        </section>

        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Memoria</span>
              <h2 className="card-title">RAM</h2>
            </div>
            <span className="tag t-ok">{loading ? '…' : `${metrics?.ram.percent ?? 0}%`}</span>
          </div>
          <div style={{ padding: '0 0 8px' }}>
            <GaugeBar percent={metrics?.ram.percent ?? 0} color={gaugeColor(metrics?.ram.percent ?? 0)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Usado: <strong>{metrics?.ram.used_gb ?? '—'} GB</strong></span>
              <span>Total: <strong>{metrics?.ram.total_gb ?? '—'} GB</strong></span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Disponible: <strong>{metrics?.ram.free_gb ?? '—'} GB</strong>
            </div>
          </div>
        </section>

        <section className="col-4 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Almacenamiento</span>
              <h2 className="card-title">Disco</h2>
            </div>
            <span className="tag t-ok">{loading ? '…' : `${metrics?.disk.percent ?? 0}%`}</span>
          </div>
          <div style={{ padding: '0 0 8px' }}>
            <GaugeBar percent={metrics?.disk.percent ?? 0} color={gaugeColor(metrics?.disk.percent ?? 0)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Usado: <strong>{metrics?.disk.used_gb ?? '—'} GB</strong></span>
              <span>Total: <strong>{metrics?.disk.total_gb ?? '—'} GB</strong></span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Libre: <strong>{metrics?.disk.free_gb ?? '—'} GB</strong>
            </div>
          </div>
        </section>
      </div>

      {/* ── VM info + Services ── */}
      <div className="grid" style={{ marginTop: 24 }}>
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Máquina virtual</span>
              <h2 className="card-title">Información del host</h2>
            </div>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', width: '40%' }}>Hostname</td>
                <td className="cell-name">{loading ? '…' : metrics?.host.hostname ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Sistema operativo</td>
                <td className="cell-name">{loading ? '…' : metrics?.host.os ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Kernel</td>
                <td className="cell-name" style={{ fontSize: 12, wordBreak: 'break-all' }}>{loading ? '…' : metrics?.host.kernel ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Uptime</td>
                <td className="cell-name">{loading ? '…' : metrics ? fmtUptime(metrics.host.uptime_seconds) : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Último arranque</td>
                <td className="cell-name" style={{ fontSize: 12 }}>
                  {loading ? '…' : metrics ? new Date(metrics.host.boot_time).toLocaleString('es-ES') : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Servicios</span>
              <h2 className="card-title">Estado de infraestructura</h2>
            </div>
            <span className={`tag ${allOk ? 't-ok' : 't-error'}`}>{allOk ? 'Todo operativo' : 'Revisar'}</span>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Latencia</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando…</td></tr>
                ) : metrics?.services.map((svc, i) => (
                  <tr key={i}>
                    <td className="cell-name">{svc.name}</td>
                    <td><span className={`tag ${statusClass[svc.status] ?? 't-warn'}`}>{statusLabel[svc.status] ?? svc.status}</span></td>
                    <td className="cell-num">{svc.latency_ms > 0 ? `${svc.latency_ms} ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
