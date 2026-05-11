// TODO: Connect to /api/v1/admin/stats when backend is ready

const recentOrgs = [
  { name: 'Iglesia Central Madrid',     plan: 'Pro',   users: 24, status: 'active', joined: 'hace 2 días' },
  { name: 'Comunidad Vida Nueva',        plan: 'Teams', users: 67, status: 'active', joined: 'hace 5 días' },
  { name: 'Iglesia Bethel Barcelona',    plan: 'Pro',   users: 18, status: 'active', joined: 'hace 1 semana' },
  { name: 'Nueva Creación Sevilla',      plan: 'Free',  users: 3,  status: 'trial',  joined: 'hace 2 semanas' },
  { name: 'Centro Cristiano Valencia',   plan: 'Pro',   users: 31, status: 'active', joined: 'hace 3 semanas' },
]

const planClass: Record<string, string> = { Free: 't-free', Pro: 't-pro', Teams: 't-teams' }
const statusClass: Record<string, string> = { active: 't-active', trial: 't-trial', suspended: 't-suspend' }
const statusLabel: Record<string, string> = { active: 'Activo', trial: 'Trial', suspended: 'Suspendido' }

export default function Dashboard() {
  return (
    <main className="content">

      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Vista general</span>
          <h1 className="hero-title">Estado de la <span className="accent">plataforma</span></h1>
          <p className="hero-sub">Métricas en tiempo real de todas las organizaciones activas en Worsyn.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn--ghost">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
            Exportar
          </button>
          <button className="btn btn--primary">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Nueva org
          </button>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="kpi-grid" aria-label="Métricas clave">
        <article className="kpi-card c-primary">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon primary">
                <svg viewBox="0 0 24 24"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 10v4M12 10v4M16 10v4"/></svg>
              </div>
              <div className="kpi-label">Organizaciones</div>
            </div>
            <span className="kpi-pill info">
              <svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
              total
            </span>
          </div>
          <div className="kpi-value">—</div>
          <div className="kpi-compare">
            conectar a <strong>/api/stats</strong> <span className="sep">·</span> fase 2
          </div>
        </article>

        <article className="kpi-card c-success">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon success">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="kpi-label">Suscripciones activas</div>
            </div>
            <span className="kpi-pill up">
              <svg viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"/></svg>
              Pro + Teams
            </span>
          </div>
          <div className="kpi-value">—</div>
          <div className="kpi-compare">
            <svg className="up" viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"/></svg>
            subiendo <span className="sep">·</span> pendiente backend
          </div>
        </article>

        <article className="kpi-card c-warning">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon warning">
                <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="kpi-label">MRR estimado</div>
            </div>
            <span className="kpi-pill flat">
              <svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
              ~ingresos
            </span>
          </div>
          <div className="kpi-value">$<sup>—</sup></div>
          <div className="kpi-compare">
            pendiente de <strong>Stripe</strong> <span className="sep">·</span> fase 2
          </div>
        </article>

        <article className="kpi-card c-purple">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon purple">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="kpi-label">Estado del sistema</div>
            </div>
            <span className="kpi-pill up">
              <svg viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"/></svg>
              online
            </span>
          </div>
          <div className="kpi-value">OK</div>
          <div className="kpi-compare">
            todos los servicios <span className="sep">·</span> operativos
          </div>
        </article>
      </section>

      {/* PANEL GRID */}
      <div className="grid">

        {/* Últimas organizaciones — full width */}
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Actividad reciente</span>
              <h2 className="card-title">Últimas incorporaciones</h2>
            </div>
            <a className="card-action" href="/organizations">
              Ver todas
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Plan</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th>Alta</th>
                </tr>
              </thead>
              <tbody>
                {recentOrgs.map((org, i) => (
                  <tr key={i}>
                    <td className="cell-name">{org.name}</td>
                    <td><span className={`tag ${planClass[org.plan]}`}>{org.plan}</span></td>
                    <td className="cell-num">{org.users}</td>
                    <td><span className={`tag ${statusClass[org.status]}`}>{statusLabel[org.status]}</span></td>
                    <td className="cell-date">{org.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Distribución de planes */}
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Planes</span>
              <h2 className="card-title">Distribución de planes</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Pro', pct: 60, color: 'var(--teal)' },
              { label: 'Teams', pct: 30, color: 'var(--primary)' },
              { label: 'Free', pct: 10, color: 'var(--t-light)' },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--t-muted)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--t-light)' }}>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-cell"><div className="stat-cell-label">Pro</div><div className="stat-cell-value">—</div></div>
            <div className="stat-cell"><div className="stat-cell-label">Teams</div><div className="stat-cell-value">—</div></div>
            <div className="stat-cell"><div className="stat-cell-label">Free</div><div className="stat-cell-value">—</div></div>
          </div>
        </section>

        {/* Fase 2 notice */}
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Roadmap</span>
              <h2 className="card-title">Fase 2 — Backend</h2>
            </div>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'API FastAPI + PostgreSQL', done: false },
              { label: 'Auth JWT / OAuth2', done: false },
              { label: 'Stripe webhooks (MRR real)', done: false },
              { label: 'Métricas en tiempo real', done: false },
              { label: 'Estructura React/Vite', done: true },
              { label: 'Diseño Adminator', done: true },
              { label: 'Docker multi-stage', done: true },
            ].map(({ label, done }) => (
              <li key={label} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr auto',
                gap: 12, alignItems: 'center',
                padding: '11px 0', borderBottom: '1px solid var(--border-soft)'
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 6,
                  background: done ? 'var(--primary)' : 'transparent',
                  border: done ? 'none' : '1.5px solid var(--t-light)',
                  display: 'grid', placeItems: 'center'
                }}>
                  {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize: 13.5, color: done ? 'var(--t-light)' : 'var(--t-base)', textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                <span className={`tag ${done ? 't-ok' : 't-info'}`}>{done ? 'DONE' : 'SOON'}</span>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </main>
  )
}
