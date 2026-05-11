export default function SettingsIntegrations() {
  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">API</span>
          <h1 className="hero-title">Integraciones</h1>
          <p className="hero-sub">Stripe, Sentry, webhooks externos y claves de API de terceros.</p>
        </div>
      </section>
      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Fase 2</span>
              <h2 className="card-title">Integraciones</h2>
            </div>
            <span className="tag t-info">Próximamente</span>
          </div>
          <p style={{ color: 'var(--t-muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Esta sección estará disponible en la Fase 2. La configuración se gestionará
            desde <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: 'var(--bg-muted)', padding: '1px 6px', borderRadius: 4 }}>POST /api/v1/admin/settings/integrations</code>.
          </p>
        </section>
      </div>
    </main>
  )
}
