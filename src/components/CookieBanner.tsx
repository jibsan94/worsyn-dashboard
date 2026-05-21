import { useState, useEffect } from 'react'

const CONSENT_KEY = 'worsyn-cookie-consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9000,
      background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      flexWrap: 'wrap',
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ width: 20, height: 20, color: 'var(--primary)', flexShrink: 0 }}>
        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
        <path d="M8.5 8.5v.01M16 15.5v.01M12 12v.01"/>
      </svg>
      <p style={{
        flex: 1, margin: 0, fontSize: 13, color: 'var(--t-muted)', lineHeight: 1.5,
        minWidth: 220,
      }}>
        Usamos cookies propias para mantener tu sesión segura y recordar tus preferencias.
        Al continuar usando Worsyn, aceptas el uso de estas cookies.
      </p>
      <button
        onClick={accept}
        style={{
          padding: '8px 20px', borderRadius: 8, background: 'var(--primary)', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
          whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'background 160ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-dark)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)')}
      >
        Aceptar y continuar
      </button>
    </div>
  )
}
