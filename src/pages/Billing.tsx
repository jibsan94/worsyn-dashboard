export default function Billing() {
  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Finanzas</span>
          <h1 className="hero-title"><span className="accent">Facturación</span></h1>
          <p className="hero-sub">Suscripciones, pagos e integración con Stripe.</p>
        </div>
      </section>
      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Fase 2</span>
              <h2 className="card-title">Módulo de facturación</h2>
            </div>
            <span className="tag t-warn">Pendiente Stripe</span>
          </div>
          <p style={{ color: 'var(--t-muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            La integración con Stripe webhooks y la gestión de suscripciones estará disponible
            en la Fase 2. Incluirá MRR real, historial de pagos y gestión de planes por organización.
          </p>
        </section>
      </div>
    </main>
  )
}
