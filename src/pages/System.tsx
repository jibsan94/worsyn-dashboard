const services = [
  { name: 'API Gateway',       status: 'ok',  latency: '12ms',  uptime: '99.98%' },
  { name: 'PostgreSQL',        status: 'ok',  latency: '2ms',   uptime: '99.99%' },
  { name: 'Redis Cache',       status: 'ok',  latency: '0.4ms', uptime: '99.99%' },
  { name: 'Auth Service',      status: 'ok',  latency: '8ms',   uptime: '99.95%' },
  { name: 'File Storage (S3)', status: 'warn', latency: '230ms', uptime: '99.80%' },
  { name: 'Email (Resend)',    status: 'ok',  latency: '45ms',  uptime: '99.90%' },
]

const statusClass: Record<string, string> = { ok: 't-ok', warn: 't-warn', error: 't-error' }
const statusLabel: Record<string, string> = { ok: 'OK', warn: 'Alerta', error: 'Error' }

export default function System() {
  const allOk = services.every(s => s.status === 'ok')
  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Infraestructura</span>
          <h1 className="hero-title">Estado del <span className="accent">sistema</span></h1>
          <p className="hero-sub">Monitorización de servicios y estado de infraestructura.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn--ghost">
            <svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Actualizar
          </button>
        </div>
      </section>

      <section className="kpi-grid">
        <article className={`kpi-card ${allOk ? 'c-success' : 'c-warning'}`}>
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className={`kpi-icon ${allOk ? 'success' : 'warning'}`}>
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="kpi-label">Estado global</div>
            </div>
          </div>
          <div className="kpi-value">{allOk ? 'OK' : 'Alerta'}</div>
          <div className="kpi-compare">{allOk ? 'todos los servicios operativos' : 'revisar servicios con alerta'}</div>
        </article>

        <article className="kpi-card c-primary">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon primary">
                <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div className="kpi-label">Servicios</div>
            </div>
          </div>
          <div className="kpi-value">{services.length}</div>
          <div className="kpi-compare">monitorizados en tiempo real</div>
        </article>

        <article className="kpi-card c-success">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon success">
                <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div className="kpi-label">Disponibilidad</div>
            </div>
            <span className="kpi-pill up">
              <svg viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"/></svg>
              SLA
            </span>
          </div>
          <div className="kpi-value">99<sup>%</sup></div>
          <div className="kpi-compare">uptime promedio <span className="sep">·</span> 30 días</div>
        </article>

        <article className="kpi-card c-info">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon info">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="kpi-label">Latencia API</div>
            </div>
          </div>
          <div className="kpi-value">12<sup>ms</sup></div>
          <div className="kpi-compare">p50 <span className="sep">·</span> últimas 24h</div>
        </article>
      </section>

      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Servicios</span>
              <h2 className="card-title">Estado de infraestructura</h2>
            </div>
            <span className={`tag ${allOk ? 't-ok' : 't-warn'}`}>{allOk ? 'Todo operativo' : 'Revisar'}</span>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Latencia</th>
                  <th>Uptime</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc, i) => (
                  <tr key={i}>
                    <td className="cell-name">{svc.name}</td>
                    <td><span className={`tag ${statusClass[svc.status]}`}>{statusLabel[svc.status]}</span></td>
                    <td className="cell-num">{svc.latency}</td>
                    <td className="cell-num">{svc.uptime}</td>
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
