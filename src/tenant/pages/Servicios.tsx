/**
 * Servicios module — Planning Center-style view.
 * Real data from GET /tenant/{slug}/services/types and /services/plans.
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

export type ServiciosTab = 'mi-planificacion' | 'servicios' | 'canciones' | 'media' | 'personas'

const C = {
  bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0', soft: '#F1F5F9',
  text: '#0F172A', muted: '#64748B', light: '#94A3B8',
  primary: '#4F46E5', primaryLight: '#EEF2FF', primaryMid: '#6366F1',
  success: '#10B981', danger: '#EF4444',
}

const s: Record<string, React.CSSProperties> = {
  main:         { flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 },
  mainTitle:    { fontSize: 17, fontWeight: 700, color: C.text, margin: 0 },
  btnPrimary:   { display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGhost:     { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  iconBtn:      { background: 'none', border: 'none', cursor: 'pointer', color: C.muted, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600 },
  // Welcome screen
  welcomeWrap:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  welcomeCard:  { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '48px 40px', maxWidth: 580, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  welcomeIcon:  { width: 72, height: 72, borderRadius: 20, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { fontSize: 24, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' },
  welcomeSub:   { fontSize: 14, color: C.muted, margin: 0, textAlign: 'center', lineHeight: 1.7, maxWidth: 420 },
  cardsRow:     { display: 'flex', gap: 16, width: '100%', marginTop: 8 },
  actionCard:   { flex: 1, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s', background: C.surface },
  actionCardIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionCardTitle: { fontSize: 14, fontWeight: 700, color: C.text, margin: 0 },
  actionCardSub:   { fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 },
  // Main layout
  layout:       { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:      { width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, flexShrink: 0, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 20 },
  // Service type card
  typeCard:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 },
  typeHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: C.soft, cursor: 'pointer', borderRadius: 10 },
  typeHeaderL:  { display: 'flex', alignItems: 'center', gap: 8 },
  typeName:     { fontSize: 14, fontWeight: 600, color: C.text },
  planTable:    { width: '100%', borderCollapse: 'collapse' as const },
  planTh:       { fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase' as const, letterSpacing: '0.07em', padding: '8px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' as const },
  planTd:       { fontSize: 13, color: C.text, padding: '9px 16px', borderBottom: `1px solid ${C.border}` },
  planEmpty:    { padding: '28px 16px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 10 },
  // Modal
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: C.surface, borderRadius: 14, padding: '28px 28px 24px', width: 400, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 8px 40px rgba(0,0,0,.18)' },
  modalTitle:   { fontSize: 17, fontWeight: 700, color: C.text, margin: 0 },
  label:        { fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', flexDirection: 'column', gap: 6 },
  input:        { border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  errorText:    { fontSize: 12, color: C.danger },
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceType { id: string; name: string; color: string | null; sort_order: number }
interface ServicePlan { id: string; title: string; status: string; scheduled_at: string | null; service_type_id: string | null }

// ── Helper ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function typeColor(color: string | null): string {
  return color || C.primary
}

// ── Mini calendar ────────────────────────────────────────────────────────────

function MiniCalendar() {
  const now = new Date()
  const yr = now.getFullYear(), mo = now.getMonth(), td = now.getDate()
  const firstDOW = new Date(yr, mo, 1).getDay()
  const offset = firstDOW === 0 ? 6 : firstDOW - 1
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]
  const moName = now.toLocaleString('es-ES', { month: 'long' })
  const moLabel = `${moName.charAt(0).toUpperCase() + moName.slice(1)} ${yr}`
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{moLabel}</span>
        <div style={{ display: 'flex', gap: 1 }}>
          <button style={s.iconBtn}>‹</button>
          <button style={s.iconBtn}>•</button>
          <button style={s.iconBtn}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <span key={d} style={{ fontSize: 10, fontWeight: 700, color: C.light, padding: '2px 0' }}>{d}</span>
        ))}
        {cells.map((day, i) => (
          <span key={i} style={{
            fontSize: 12, padding: '4px 2px', borderRadius: 5, cursor: day ? 'pointer' : 'default',
            background: day === td ? C.primary : 'transparent',
            color: day === td ? '#fff' : day ? C.text : 'transparent',
            fontWeight: day === td ? 700 : 400,
          }}>{day ?? ''}</span>
        ))}
      </div>
    </div>
  )
}

// ── Create-type modal ────────────────────────────────────────────────────────

function CreateTypeModal({
  slug, onCreated, onClose,
}: { slug: string; onCreated: (t: ServiceType) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4F46E5')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('El nombre es obligatorio'); return }
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/v1/tenant/${slug}/services/types`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail || 'Error'); }
      const created = await res.json()
      onCreated(created)
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={s.modal} onSubmit={submit}>
        <h3 style={s.modalTitle}>Nuevo tipo de servicio</h3>
        <label style={s.label}>
          Nombre
          <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Servicio Dominical" autoFocus />
        </label>
        <label style={s.label}>
          Color
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 40, height: 36, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2, cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: C.muted }}>{color}</span>
          </div>
        </label>
        {err && <p style={s.errorText}>{err}</p>}
        <div style={s.modalActions}>
          <button type="button" style={s.btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" style={s.btnPrimary} disabled={busy}>{busy ? 'Guardando…' : 'Crear'}</button>
        </div>
      </form>
    </div>
  )
}

// ── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeView({ onCreateType }: { onCreateType: () => void }) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  return (
    <main style={{ ...s.main, padding: 0, overflow: 'hidden', flex: 1 }}>
      <div style={s.welcomeWrap}>
        <div style={s.welcomeCard}>
          <div style={s.welcomeIcon}>
            <svg viewBox="0 0 40 40" fill="none" width={36} height={36}>
              <path d="M20 4L6 12v4h28v-4L20 4z" fill={C.primary} opacity=".9" />
              <rect x="9" y="18" width="5" height="12" rx="1" fill={C.primaryMid} />
              <rect x="18" y="18" width="5" height="12" rx="1" fill={C.primaryMid} />
              <rect x="27" y="18" width="5" height="12" rx="1" fill={C.primaryMid} />
              <rect x="6" y="30" width="29" height="3" rx="1" fill={C.primary} />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <h2 style={s.welcomeTitle}>Bienvenido a Servicios</h2>
            <p style={s.welcomeSub}>
              Organiza y planifica cada servicio de tu iglesia en un solo lugar.
              Empieza creando un tipo de servicio o añadiendo a tu equipo.
            </p>
          </div>
          <div style={s.cardsRow}>
            {[
              {
                key: 'type',
                icon: (
                  <svg viewBox="0 0 20 20" fill={C.primary} width={18} height={18}>
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
                  </svg>
                ),
                iconBg: C.primaryLight,
                title: 'Crear tipo de servicio',
                sub: 'Define los tipos de servicios que celebra tu iglesia: dominical, especiales, eventos…',
                action: onCreateType,
              },
              {
                key: 'team',
                icon: (
                  <svg viewBox="0 0 20 20" fill="#059669" width={18} height={18}>
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                ),
                iconBg: '#ECFDF5',
                title: 'Crear equipo',
                sub: 'Añade voluntarios y líderes para asignarlos a los planes de cada servicio.',
                action: undefined,
              },
            ].map(card => (
              <div
                key={card.key}
                style={{
                  ...s.actionCard,
                  borderColor: hoveredCard === card.key ? C.primary : C.border,
                  boxShadow: hoveredCard === card.key ? `0 0 0 3px ${C.primaryLight}` : 'none',
                }}
                onMouseEnter={() => setHoveredCard(card.key)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={{ ...s.actionCardIcon, background: card.iconBg }}>{card.icon}</div>
                <p style={s.actionCardTitle}>{card.title}</p>
                <p style={s.actionCardSub}>{card.sub}</p>
                <button
                  style={card.key === 'type' ? s.btnPrimary : s.btnGhost}
                  onClick={card.action}
                  disabled={card.key === 'team'}
                >
                  {card.key === 'type' ? 'Empezar' : 'Próximamente'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ trigger, items, align = 'right' }: {
  trigger: React.ReactNode
  items: { label: string; icon?: React.ReactNode; onClick?: () => void }[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', [align]: 0, zIndex: 50,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: 160, overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <button key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: C.text, textAlign: 'left',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = C.soft)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { setOpen(false); item.onClick?.() }}
            >
              {item.icon && <span style={{ color: C.muted, flexShrink: 0 }}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const GEAR_ITEMS = [
  {
    label: 'Ajustes',
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M6.5 1.5a1 1 0 011-1h1a1 1 0 011 1v.39a5.5 5.5 0 011.17.68l.34-.2a1 1 0 011.36.37l.5.86a1 1 0 01-.37 1.37l-.34.2c.04.26.06.52.06.79s-.02.53-.06.79l.34.2a1 1 0 01.37 1.36l-.5.87a1 1 0 01-1.36.36l-.34-.2a5.5 5.5 0 01-1.17.68v.39a1 1 0 01-1 1h-1a1 1 0 01-1-1v-.39a5.5 5.5 0 01-1.17-.68l-.34.2a1 1 0 01-1.36-.36l-.5-.87a1 1 0 01.37-1.36l.34-.2A5.56 5.56 0 014 8c0-.27.02-.53.06-.79l-.34-.2a1 1 0 01-.37-1.37l.5-.86a1 1 0 011.36-.37l.34.2A5.5 5.5 0 016.5 4.89V1.5zM8 10a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>,
  },
  {
    label: 'Equipos',
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width={14} height={14}><path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14 13a7 7 0 10-14 0h14z"/></svg>,
  },
  {
    label: 'Plantillas',
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 3a1 1 0 000 2h6a1 1 0 100-2H5zm0 4a1 1 0 000 2h4a1 1 0 100-2H5z" clipRule="evenodd"/></svg>,
  },
  {
    label: 'Reportes',
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M2 2a1 1 0 011-1h10a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V2zm9 1H5v2h6V3zm0 4H5v2h6V7zm-6 4h4v2H5v-2z" clipRule="evenodd"/></svg>,
  },
]

// ── Service type card (collapsed / expanded) ─────────────────────────────────

function ServiceTypeCard({
  type, plans, onAddPlan,
}: { type: ServiceType; plans: ServicePlan[]; onAddPlan: (typeId: string) => void }) {
  const [open, setOpen] = useState(true)
  const color = typeColor(type.color)

  const chevronDown = (
    <svg viewBox="0 0 12 12" fill="currentColor" width={10} height={10}>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <div style={s.typeCard}>
      <div style={{ ...s.typeHeader, borderRadius: open ? '10px 10px 0 0' : 10 }} onClick={() => setOpen(o => !o)}>
        <div style={s.typeHeaderL}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          <svg viewBox="0 0 20 20" fill="currentColor" width={12} height={12}
            style={{ color: C.muted, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}>
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span style={s.typeName}>{type.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12 }}
            onClick={e => e.stopPropagation()}
          >
            Cuadrante
          </button>
          <Dropdown
            align="right"
            trigger={
              <button style={{ ...s.btnGhost, padding: '4px 9px', gap: 4, fontSize: 12 }}>
                <svg viewBox="0 0 16 16" fill="currentColor" width={13} height={13}>
                  <path fillRule="evenodd" d="M7.002 1.5a1 1 0 011-1h.006a1 1 0 011 1v.39a5.5 5.5 0 011.17.68l.34-.2a1 1 0 011.36.37l.5.86a1 1 0 01-.37 1.37l-.34.2c.04.26.06.52.06.79s-.02.53-.06.79l.34.2a1 1 0 01.37 1.36l-.5.87a1 1 0 01-1.36.36l-.34-.2a5.5 5.5 0 01-1.17.68v.39a1 1 0 01-1 1h-.006a1 1 0 01-1-1v-.39a5.5 5.5 0 01-1.17-.68l-.34.2a1 1 0 01-1.36-.36l-.5-.87a1 1 0 01.37-1.36l.34-.2A5.56 5.56 0 013.5 8c0-.27.02-.53.06-.79l-.34-.2a1 1 0 01-.37-1.37l.5-.86a1 1 0 011.36-.37l.34.2A5.5 5.5 0 017.002 4.89V1.5zM8.005 10a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                {chevronDown}
              </button>
            }
            items={GEAR_ITEMS}
          />
        </div>
      </div>

      {open && (
        <>
          {plans.length > 0 ? (
            <table style={s.planTable}>
              <thead>
                <tr>
                  <th style={s.planTh}>Fecha</th>
                  <th style={s.planTh}>Título</th>
                  <th style={s.planTh}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} style={{ cursor: 'pointer' }}>
                    <td style={{ ...s.planTd, color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(plan.scheduled_at)}</td>
                    <td style={s.planTd}>{plan.title}</td>
                    <td style={s.planTd}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '2px 10px',
                        background: plan.status === 'draft' ? C.soft : plan.status === 'published' ? '#ECFDF5' : C.soft,
                        color: plan.status === 'draft' ? C.muted : plan.status === 'published' ? '#059669' : C.muted,
                      }}>
                        {plan.status === 'draft' ? 'Borrador' : plan.status === 'published' ? 'Publicado' : plan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={s.planEmpty}>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>No hay planes para este tipo de servicio.</p>
            </div>
          )}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
            <button style={s.btnPrimary} onClick={() => onAddPlan(type.id)}>+ Añadir plan</button>
            <button style={s.btnGhost}>Cambiar fechas</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main list view ───────────────────────────────────────────────────────────

function ListView({
  slug, serviceTypes, setServiceTypes,
}: { slug: string; serviceTypes: ServiceType[]; setServiceTypes: React.Dispatch<React.SetStateAction<ServiceType[]>> }) {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [addTypeOpen, setAddTypeOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/tenant/${slug}/services/plans`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setPlans)
      .catch(() => {})
  }, [slug])

  function plansFor(typeId: string) {
    return plans.filter(p => p.service_type_id === typeId)
  }

  return (
    <>
      <div style={s.layout}>
        <div style={s.sidebar}>
          <MiniCalendar />
          <button style={{ ...s.btnGhost, justifyContent: 'center', fontSize: 12, padding: '7px 10px' }}>
            Ver calendario maestro
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Próximos</div>
            {plans.filter(p => p.scheduled_at && new Date(p.scheduled_at) >= new Date()).slice(0, 5).length === 0
              ? <p style={{ fontSize: 12, color: C.light, margin: 0, lineHeight: 1.6 }}>No hay planes próximos.</p>
              : plans
                  .filter(p => p.scheduled_at && new Date(p.scheduled_at) >= new Date())
                  .sort((a, b) => (a.scheduled_at || '') < (b.scheduled_at || '') ? -1 : 1)
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{fmtDate(p.scheduled_at)}</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{p.title}</div>
                    </div>
                  ))
            }
          </div>
        </div>

        <main style={s.main}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={s.mainTitle}>Tipos de servicio</h2>
            <button style={s.btnPrimary} onClick={() => setAddTypeOpen(true)}>+ Añadir</button>
          </div>
          {serviceTypes.map(type => (
            <ServiceTypeCard
              key={type.id}
              type={type}
              plans={plansFor(type.id)}
              onAddPlan={() => {/* TODO: plan creation modal */}}
            />
          ))}
        </main>
      </div>

      {addTypeOpen && (
        <CreateTypeModal
          slug={slug}
          onCreated={t => { setServiceTypes(prev => [...prev, t]); setAddTypeOpen(false) }}
          onClose={() => setAddTypeOpen(false)}
        />
      )}
    </>
  )
}

// ── Placeholder ──────────────────────────────────────────────────────────────

function PlaceholderView({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main style={{ ...s.main, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 40, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#DC2626', color: '#fff' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" width={26} height={26}>
            <path fillRule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 4a1 1 0 10-2 0v3H6a1 1 0 000 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V6z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: 0 }}>{subtitle}</p>
        <span style={{ fontSize: 11, fontWeight: 700, background: C.primaryLight, color: C.primary, borderRadius: 999, padding: '4px 14px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Próximamente</span>
      </div>
    </main>
  )
}

// ── Public entry point ───────────────────────────────────────────────────────

export default function Servicios({ tab }: { tab: ServiciosTab }) {
  const { slug } = useParams<{ slug: string }>()
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [createTypeOpen, setCreateTypeOpen] = useState(false)

  const fetchTypes = useCallback(async () => {
    if (!slug) return
    try {
      const res = await fetch(`/api/v1/tenant/${slug}/services/types`, { credentials: 'include' })
      if (res.ok) setServiceTypes(await res.json())
    } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  if (tab !== 'servicios') {
    const META: Record<ServiciosTab, { title: string; sub: string }> = {
      'mi-planificacion': { title: 'Mi Planificación', sub: 'Ve y gestiona tu planificación personal de servicios y ensayos.' },
      'servicios':        { title: 'Servicios', sub: '' },
      'canciones':        { title: 'Canciones', sub: 'Biblioteca de canciones con acordes, letras y partituras para tu equipo.' },
      'media':            { title: 'Media', sub: 'Gestiona imágenes, vídeos y archivos multimedia para tus servicios.' },
      'personas':         { title: 'Personas', sub: 'Gestiona los voluntarios y líderes que participan en los servicios.' },
    }
    return <PlaceholderView title={META[tab].title} subtitle={META[tab].sub} />
  }

  if (loading) {
    return (
      <main style={{ ...s.main, alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14 }}>
        Cargando…
      </main>
    )
  }

  if (serviceTypes.length === 0) {
    return (
      <>
        <WelcomeView onCreateType={() => setCreateTypeOpen(true)} />
        {createTypeOpen && slug && (
          <CreateTypeModal
            slug={slug}
            onCreated={t => { setServiceTypes([t]); setCreateTypeOpen(false) }}
            onClose={() => setCreateTypeOpen(false)}
          />
        )}
      </>
    )
  }

  return <ListView slug={slug!} serviceTypes={serviceTypes} setServiceTypes={setServiceTypes} />
}
