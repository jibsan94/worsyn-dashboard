export default function Users() {
  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Gestión</span>
          <h1 className="hero-title"><span className="accent">Usuarios</span></h1>
          <p className="hero-sub">Gestión de usuarios individuales en todas las organizaciones.</p>
        </div>
      </section>
      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Fase 2</span>
              <h2 className="card-title">Módulo de usuarios</h2>
            </div>
            <span className="tag t-info">Próximamente</span>
          </div>
          <p style={{ color: 'var(--t-muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Este módulo estará disponible en la Fase 2 del proyecto, junto con el backend FastAPI
            y la base de datos PostgreSQL. Permitirá gestionar usuarios, roles y permisos por organización.
          </p>
        </section>
      </div>
    </main>
  )
}
