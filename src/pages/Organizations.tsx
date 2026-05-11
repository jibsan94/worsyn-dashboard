const organizations = [
  { name: 'Iglesia Central Madrid',   plan: 'Pro',   users: 24, status: 'active',    mrr: '$288',  joined: '15 Mar 2026' },
  { name: 'Comunidad Vida Nueva',      plan: 'Teams', users: 67, status: 'active',    mrr: '$804',  joined: '10 Mar 2026' },
  { name: 'Iglesia Bethel Barcelona',  plan: 'Pro',   users: 18, status: 'active',    mrr: '$216',  joined: '2 Mar 2026' },
  { name: 'Nueva Creación Sevilla',    plan: 'Free',  users: 3,  status: 'trial',     mrr: '$0',    joined: '28 Feb 2026' },
  { name: 'Centro Cristiano Valencia', plan: 'Pro',   users: 31, status: 'active',    mrr: '$372',  joined: '20 Feb 2026' },
  { name: 'Comunidad Fe Bilbao',       plan: 'Free',  users: 7,  status: 'trial',     mrr: '$0',    joined: '15 Feb 2026' },
  { name: 'Iglesia Roca Viva',         plan: 'Teams', users: 45, status: 'active',    mrr: '$540',  joined: '1 Feb 2026' },
  { name: 'Casa de Oración Málaga',    plan: 'Pro',   users: 12, status: 'suspended', mrr: '$0',    joined: '10 Ene 2026' },
]

const planClass: Record<string, string>   = { Free: 't-free', Pro: 't-pro', Teams: 't-teams' }
const statusClass: Record<string, string> = { active: 't-active', trial: 't-trial', suspended: 't-suspend' }
const statusLabel: Record<string, string> = { active: 'Activo', trial: 'Trial', suspended: 'Suspendido' }

const active = organizations.filter(o => o.status === 'active').length
const trial  = organizations.filter(o => o.status === 'trial').length
const mrr    = organizations.filter(o => o.mrr !== '$0').reduce((s, o) => s + parseInt(o.mrr.replace('$', '').replace(',', '')), 0)

export default function Organizations() {
  return (
    <main className="content">

      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Gestión</span>
          <h1 className="hero-title"><span className="accent">Organizaciones</span></h1>
          <p className="hero-sub">{organizations.length} organizaciones registradas en la plataforma.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn--ghost">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
            Exportar
          </button>
          <button className="btn btn--primary">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Añadir org
          </button>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="kpi-grid">
        <article className="kpi-card c-primary">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon primary">
                <svg viewBox="0 0 24 24"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 10v4M12 10v4M16 10v4"/></svg>
              </div>
              <div className="kpi-label">Total orgs</div>
            </div>
          </div>
          <div className="kpi-value">{organizations.length}</div>
          <div className="kpi-compare">registradas en la plataforma</div>
        </article>

        <article className="kpi-card c-success">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon success">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="kpi-label">Activas</div>
            </div>
            <span className="kpi-pill up">
              <svg viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"/></svg>
              activas
            </span>
          </div>
          <div className="kpi-value">{active}</div>
          <div className="kpi-compare">pagando suscripción</div>
        </article>

        <article className="kpi-card c-warning">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon warning">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="kpi-label">En trial</div>
            </div>
          </div>
          <div className="kpi-value">{trial}</div>
          <div className="kpi-compare">periodo de prueba activo</div>
        </article>

        <article className="kpi-card c-info">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon info">
                <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="kpi-label">MRR total</div>
            </div>
            <span className="kpi-pill up">
              <svg viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"/></svg>
              mes
            </span>
          </div>
          <div className="kpi-value">${mrr}</div>
          <div className="kpi-compare">ingresos mensuales recurrentes</div>
        </article>
      </section>

      {/* TABLE CARD */}
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
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th>MRR</th>
                  <th>Alta</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org, i) => (
                  <tr key={i}>
                    <td className="cell-name">{org.name}</td>
                    <td><span className={`tag ${planClass[org.plan]}`}>{org.plan}</span></td>
                    <td className="cell-num">{org.users}</td>
                    <td><span className={`tag ${statusClass[org.status]}`}>{statusLabel[org.status]}</span></td>
                    <td className="cell-num">{org.mrr}</td>
                    <td className="cell-date">{org.joined}</td>
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
