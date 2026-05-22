/**
 * Servicios module — Planning Center-style.
 *
 * Tabs: 'mi-planificacion' | 'servicios' | 'canciones' | 'media' | 'personas'.
 * 'servicios' tab is fully implemented:
 *   - ListView with one card per ServiceType (recurrence, times, teams, upcoming)
 *   - CreateWizard (3 steps: name+recurrence → times → teams)
 *   - MiniCalendar with day-dots from projected occurrences
 *   - MasterCalendarModal (month grid + occurrence list)
 * 'personas' tab implements Teams CRUD + add/remove team memberships.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

export type ServiciosTab = 'mi-planificacion' | 'servicios' | 'canciones' | 'media' | 'personas'

const C = {
  bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0', soft: '#F1F5F9',
  text: '#0F172A', muted: '#64748B', light: '#94A3B8',
  primary: '#4F46E5', primaryLight: '#EEF2FF', primaryMid: '#6366F1',
  success: '#10B981', successLight: '#ECFDF5',
  danger: '#EF4444', dangerLight: '#FEF2F2',
  warning: '#F59E0B',
}

const s: Record<string, React.CSSProperties> = {
  main:        { flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 },
  mainTitle:   { fontSize: 17, fontWeight: 700, color: C.text, margin: 0 },
  btnPrimary:  { display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGhost:    { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnDanger:   { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.danger, border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  iconBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: C.muted, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600 },
  layout:      { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:     { width: 240, background: C.surface, borderRight: `1px solid ${C.border}`, flexShrink: 0, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 18 },
  typeCard:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 },
  typeHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.soft, cursor: 'pointer' },
  typeName:    { fontSize: 14, fontWeight: 600, color: C.text },
  planTable:   { width: '100%', borderCollapse: 'collapse' as const },
  planTh:      { fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase' as const, letterSpacing: '0.07em', padding: '8px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' as const },
  planTd:      { fontSize: 13, color: C.text, padding: '9px 16px', borderBottom: `1px solid ${C.border}` },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:       { background: C.surface, borderRadius: 14, padding: '24px 28px 20px', width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 8px 40px rgba(0,0,0,.18)', overflow: 'hidden' },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: C.text, margin: 0 },
  label:       { fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', flexDirection: 'column', gap: 6 },
  input:       { border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box' as const, background: '#fff' },
  select:      { border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: C.text, outline: 'none', background: '#fff', cursor: 'pointer' },
  modalActions:{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 },
  errorText:   { fontSize: 12, color: C.danger },
  pill:        { fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 10px', display: 'inline-block' },
  stepDot:     { width: 24, height: 24, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
}

// ── Types ────────────────────────────────────────────────────────────────────
type Recurrence = 'none' | 'random' | 'daily' | 'weekly' | 'weekdays' | 'biweekly' | 'monthly'

interface ServiceTime {
  id?: string
  starts_on: string   // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  weekday?: number
  sort_order?: number
}
interface ServiceType {
  id: string
  name: string
  color: string | null
  sort_order: number
  recurrence: Recurrence
  description: string | null
  times: ServiceTime[]
  team_ids: string[]
}
interface ServicePlan { id: string; title: string; status: string; scheduled_at: string | null; service_type_id: string | null }
interface Team { id: string; name: string; color: string | null; description: string | null; member_count: number }
interface Occurrence {
  service_type_id: string
  service_type_name: string
  color: string | null
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
}

const RECUR_OPTIONS: { v: Recurrence; label: string; hint: string }[] = [
  { v: 'weekly',   label: 'Semanal',         hint: 'Cada semana en el mismo día' },
  { v: 'biweekly', label: 'Cada 2 semanas',  hint: 'Quincenal' },
  { v: 'monthly',  label: 'Mensual',         hint: 'Una vez al mes' },
  { v: 'weekdays', label: 'Días laborables', hint: 'Lunes a viernes' },
  { v: 'daily',    label: 'Diario',          hint: 'Todos los días' },
  { v: 'random',   label: 'Aleatorio',       hint: 'Fecha única, sin repetición' },
  { v: 'none',     label: 'Sin repetición',  hint: 'Un solo servicio' },
]

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// ── Helpers ──────────────────────────────────────────────────────────────────
function nextSundayISO(): string {
  const d = new Date()
  const dow = d.getDay()           // 0=Sun … 6=Sat
  const add = dow === 0 ? 7 : 7 - dow
  d.setDate(d.getDate() + add)
  return d.toISOString().slice(0, 10)
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
function recurLabel(r: Recurrence): string {
  return RECUR_OPTIONS.find(o => o.v === r)?.label ?? r
}
function typeColor(t: ServiceType): string { return t.color || C.primary }

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { credentials: 'include', ...init })
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateTypeWizard — multi-step modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateTypeWizard({ slug, teams, onCreated, onClose }: {
  slug: string
  teams: Team[]
  onCreated: (t: ServiceType) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4F46E5')
  const [recurrence, setRecurrence] = useState<Recurrence>('weekly')
  const [times, setTimes] = useState<ServiceTime[]>([
    { starts_on: nextSundayISO(), start_time: '11:00', end_time: '12:30', sort_order: 0 },
  ])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function next() {
    setErr('')
    if (step === 1) {
      if (!name.trim()) { setErr('Indica un nombre'); return }
      setStep(2)
    } else if (step === 2) {
      if (times.length === 0) { setErr('Añade al menos un horario'); return }
      for (const t of times) {
        if (!t.starts_on || !t.start_time || !t.end_time) { setErr('Completa todos los horarios'); return }
        if (t.end_time <= t.start_time) { setErr('La hora de fin debe ser posterior'); return }
      }
      setStep(3)
    }
  }
  function back() { setErr(''); if (step > 1) setStep((step - 1) as 1 | 2) }

  async function submit() {
    setBusy(true); setErr('')
    try {
      const res = await api(`/api/v1/tenant/${slug}/services/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color, recurrence, times, team_ids: teamIds }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || 'Error al crear') }
      onCreated(await res.json())
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  function updateTime(i: number, patch: Partial<ServiceTime>) {
    setTimes(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }
  function addTime() {
    const last = times[times.length - 1]
    setTimes(prev => [...prev, { starts_on: last?.starts_on || nextSundayISO(), start_time: '08:00', end_time: '09:00', sort_order: prev.length }])
  }
  function removeTime(i: number) {
    setTimes(prev => prev.filter((_, idx) => idx !== i))
  }
  function toggleTeam(id: string) {
    setTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const StepDot = ({ n, label }: { n: number; label: string }) => {
    const active = step === n
    const done = step > n
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: done || active ? 1 : 0.5 }}>
        <span style={{ ...s.stepDot, background: active ? C.primary : done ? C.success : C.soft, color: active || done ? '#fff' : C.muted }}>
          {done ? '✓' : n}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: active ? C.text : C.muted }}>{label}</span>
      </div>
    )
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={s.modalTitle}>Nuevo tipo de servicio</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0 8px', borderBottom: `1px solid ${C.border}` }}>
          <StepDot n={1} label="Detalles" />
          <span style={{ flex: 1, height: 1, background: C.border }} />
          <StepDot n={2} label="Horarios" />
          <span style={{ flex: 1, height: 1, background: C.border }} />
          <StepDot n={3} label="Equipos" />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 1 && (
            <>
              <label style={s.label}>
                Nombre del servicio
                <input style={s.input} autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Servicio Dominical" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={s.label}>
                  ¿Cuándo ocurre?
                  <select style={s.select} value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)}>
                    {RECUR_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                  </select>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{RECUR_OPTIONS.find(o => o.v === recurrence)?.hint}</span>
                </label>
                <label style={s.label}>
                  Color
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)}
                      style={{ width: 44, height: 38, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2, cursor: 'pointer' }} />
                    <span style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{color}</span>
                  </div>
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                Selecciona el día y la franja horaria. Por defecto comenzamos el <strong style={{ color: C.text }}>próximo domingo</strong>.
                Puedes añadir varios horarios para el mismo día o para días distintos.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {times.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: C.soft, borderRadius: 10 }}>
                    <input type="date" value={t.starts_on}
                      onChange={e => updateTime(i, { starts_on: e.target.value })}
                      style={{ ...s.input, flex: 1, minWidth: 0 }} />
                    <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>de</span>
                    <input type="time" value={t.start_time}
                      onChange={e => updateTime(i, { start_time: e.target.value })}
                      style={{ ...s.input, width: 100, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>a</span>
                    <input type="time" value={t.end_time}
                      onChange={e => updateTime(i, { end_time: e.target.value })}
                      style={{ ...s.input, width: 100, flexShrink: 0 }} />
                    {times.length > 1 && (
                      <button onClick={() => removeTime(i)} title="Quitar"
                        style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1, flexShrink: 0 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addTime} style={{ ...s.btnGhost, alignSelf: 'flex-start' }}>+ Añadir otro horario</button>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, fontStyle: 'italic' }}>
                * Si tu iglesia tiene dos servicios el mismo día (p. ej. 9 h y 11 h), añade ambos.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                Selecciona los equipos que participarán en este servicio. Puedes crearlos en{' '}
                <strong style={{ color: C.text }}>Personas → Equipos</strong>.
              </p>
              {teams.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13 }}>
                  No has creado equipos todavía.<br/>
                  Puedes crearlos más tarde en la pestaña Personas.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {teams.map(t => {
                    const checked = teamIds.includes(t.id)
                    return (
                      <button key={t.id} onClick={() => toggleTeam(t.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          border: `1.5px solid ${checked ? C.primary : C.border}`,
                          borderRadius: 10, background: checked ? C.primaryLight : '#fff',
                          cursor: 'pointer', textAlign: 'left',
                        }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color || C.primary, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{t.member_count} miembro{t.member_count === 1 ? '' : 's'}</div>
                        </div>
                        {checked && <span style={{ color: C.primary, fontWeight: 700 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
          {err && <p style={s.errorText}>{err}</p>}
        </div>

        <div style={s.modalActions}>
          <button onClick={step === 1 ? onClose : back} style={s.btnGhost}>
            {step === 1 ? 'Cancelar' : '‹ Atrás'}
          </button>
          {step < 3
            ? <button onClick={next} style={s.btnPrimary}>Siguiente ›</button>
            : <button onClick={submit} disabled={busy} style={s.btnPrimary}>{busy ? 'Creando…' : 'Crear servicio'}</button>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniCalendar — sidebar, highlights service days
// ─────────────────────────────────────────────────────────────────────────────
function MiniCalendar({ occurrences, onSelect }: { occurrences: Occurrence[]; onSelect?: (iso: string) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const yr = cursor.getFullYear(), mo = cursor.getMonth()
  const today = new Date(); const todayISO = today.toISOString().slice(0, 10)
  const firstDOW = new Date(yr, mo, 1).getDay()
  const offset = firstDOW === 0 ? 6 : firstDOW - 1
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]
  const moName = cursor.toLocaleString('es-ES', { month: 'long' })
  const moLabel = `${moName.charAt(0).toUpperCase() + moName.slice(1)} ${yr}`

  const occByDate = useMemo(() => {
    const m = new Map<string, Occurrence[]>()
    for (const o of occurrences) {
      const arr = m.get(o.date) || []
      arr.push(o)
      m.set(o.date, arr)
    }
    return m
  }, [occurrences])

  function shift(dir: -1 | 1) {
    setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() + dir); return n })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{moLabel}</span>
        <div style={{ display: 'flex', gap: 1 }}>
          <button style={s.iconBtn} onClick={() => shift(-1)}>‹</button>
          <button style={s.iconBtn} onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); return d })}>•</button>
          <button style={s.iconBtn} onClick={() => shift(1)}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <span key={d} style={{ fontSize: 10, fontWeight: 700, color: C.light, padding: '2px 0' }}>{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <span key={i} />
          const iso = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = iso === todayISO
          const occs = occByDate.get(iso) || []
          const hasOcc = occs.length > 0
          const dotColor = occs[0]?.color || C.primary
          return (
            <button key={i} onClick={() => onSelect?.(iso)}
              title={hasOcc ? occs.map(o => `${o.service_type_name} ${o.start_time}`).join(', ') : ''}
              style={{
                position: 'relative', fontSize: 12, padding: '5px 2px 8px', borderRadius: 5,
                cursor: 'pointer', border: 'none',
                background: isToday ? C.primary : 'transparent',
                color: isToday ? '#fff' : C.text,
                fontWeight: isToday ? 700 : 400,
              }}>
              {day}
              {hasOcc && !isToday && (
                <span style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: 999, background: dotColor,
                }} />
              )}
              {hasOcc && isToday && (
                <span style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: 999, background: '#fff',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MasterCalendarModal — full-month grid with detail per day
// ─────────────────────────────────────────────────────────────────────────────
function MasterCalendarModal({ occurrences, onClose }: { occurrences: Occurrence[]; onClose: () => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const yr = cursor.getFullYear(), mo = cursor.getMonth()
  const firstDOW = new Date(yr, mo, 1).getDay()
  const offset = firstDOW === 0 ? 6 : firstDOW - 1
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]
  const today = new Date(); const todayISO = today.toISOString().slice(0, 10)
  const moName = cursor.toLocaleString('es-ES', { month: 'long' })
  const moLabel = `${moName.charAt(0).toUpperCase() + moName.slice(1)} ${yr}`

  const occByDate = useMemo(() => {
    const m = new Map<string, Occurrence[]>()
    for (const o of occurrences) {
      const a = m.get(o.date) || []; a.push(o); m.set(o.date, a)
    }
    return m
  }, [occurrences])

  const selectedOccs = selectedDay ? occByDate.get(selectedDay) || [] : []

  function shift(dir: -1 | 1) {
    setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() + dir); return n })
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, width: 940, maxWidth: '95vw', maxHeight: '92vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={s.modalTitle}>Calendario maestro</h3>
            <span style={{ fontSize: 13, color: C.muted }}>{occurrences.length} ocurrencia{occurrences.length === 1 ? '' : 's'} en el rango</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={s.iconBtn} onClick={() => shift(-1)}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, minWidth: 160 }}>{moLabel}</span>
            <button style={s.iconBtn} onClick={() => shift(1)}>›</button>
          </div>
          <button style={s.btnGhost} onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); return d })}>Hoy</button>
        </div>

        <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center', marginBottom: 4 }}>
              {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                <span key={d} style={{ fontSize: 11, fontWeight: 700, color: C.light, padding: '4px 0', letterSpacing: '0.06em' }}>{d}</span>
              ))}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, overflow: 'auto' }}>
              {cells.map((day, i) => {
                if (day == null) return <div key={i} />
                const iso = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isToday = iso === todayISO
                const isSel = iso === selectedDay
                const occs = occByDate.get(iso) || []
                return (
                  <button key={i} onClick={() => setSelectedDay(iso)}
                    style={{
                      minHeight: 70, padding: '6px 8px', textAlign: 'left',
                      background: isSel ? C.primaryLight : '#fff',
                      border: `1.5px solid ${isSel ? C.primary : isToday ? C.primaryMid : C.border}`,
                      borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? C.primary : C.text }}>{day}</span>
                    {occs.slice(0, 2).map((o, idx) => (
                      <span key={idx} style={{
                        fontSize: 10, fontWeight: 600, color: '#fff',
                        background: o.color || C.primary, borderRadius: 4,
                        padding: '2px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {o.start_time} {o.service_type_name}
                      </span>
                    ))}
                    {occs.length > 2 && (
                      <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>+{occs.length - 2} más</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${C.border}`, paddingLeft: 16, overflow: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {selectedDay ? fmtDate(selectedDay) : 'Selecciona un día'}
            </div>
            {selectedDay && selectedOccs.length === 0 && (
              <div style={{ fontSize: 13, color: C.muted, padding: '20px 0', textAlign: 'center' }}>
                Sin servicios este día
              </div>
            )}
            {selectedOccs.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.soft}` }}>
                <div style={{ width: 6, borderRadius: 3, background: o.color || C.primary, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{o.service_type_name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{o.start_time} – {o.end_time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceTypeCard — collapsible card per service in ListView
// ─────────────────────────────────────────────────────────────────────────────
function ServiceTypeCard({ type, plans, occurrences, onDelete, onAddPlan }: {
  type: ServiceType
  plans: ServicePlan[]
  occurrences: Occurrence[]
  onDelete: () => void
  onAddPlan: () => void
}) {
  const [open, setOpen] = useState(true)
  const color = typeColor(type)
  const next5 = occurrences.filter(o => o.service_type_id === type.id).slice(0, 5)

  return (
    <div style={s.typeCard}>
      <div style={{ ...s.typeHeader, borderRadius: open ? '10px 10px 0 0' : 10 }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
          <svg viewBox="0 0 20 20" fill="currentColor" width={12} height={12}
            style={{ color: C.muted, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}>
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span style={s.typeName}>{type.name}</span>
          <span style={{ ...s.pill, background: C.soft, color: C.muted }}>{recurLabel(type.recurrence)}</span>
          {type.times.length > 0 && (
            <span style={{ fontSize: 12, color: C.muted }}>
              {type.times.length === 1
                ? `${WEEKDAYS[type.times[0].weekday ?? 0]} · ${type.times[0].start_time}–${type.times[0].end_time}`
                : `${type.times.length} horarios`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
          <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12 }} onClick={onAddPlan}>+ Plan</button>
          <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, color: C.danger, borderColor: 'rgba(239,68,68,.3)' }}
            onClick={() => { if (confirm(`¿Eliminar "${type.name}"?`)) onDelete() }}>Eliminar</button>
        </div>
      </div>

      {open && (
        <div style={{ padding: '8px 0' }}>
          {type.times.length > 0 && (
            <div style={{ padding: '8px 16px 4px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {type.times.map((t, i) => (
                <span key={i} style={{ ...s.pill, background: C.primaryLight, color: C.primary }}>
                  {WEEKDAYS[t.weekday ?? 0]} · {t.start_time}–{t.end_time}
                </span>
              ))}
            </div>
          )}

          <table style={s.planTable}>
            <thead>
              <tr>
                <th style={s.planTh}>Próximas ocurrencias</th>
                <th style={s.planTh}>Hora</th>
              </tr>
            </thead>
            <tbody>
              {next5.length === 0 && (
                <tr><td colSpan={2} style={{ ...s.planTd, color: C.muted, fontSize: 12, textAlign: 'center', padding: '16px' }}>
                  No hay ocurrencias futuras
                </td></tr>
              )}
              {next5.map((o, i) => (
                <tr key={i}>
                  <td style={{ ...s.planTd, color: C.text, fontSize: 13 }}>{fmtDate(o.date)}</td>
                  <td style={{ ...s.planTd, color: C.muted, fontSize: 12 }}>{o.start_time} – {o.end_time}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {plans.length > 0 && (
            <>
              <div style={{ padding: '12px 16px 4px', fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Planes guardados</div>
              <table style={s.planTable}>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...s.planTd, color: C.muted, fontSize: 12 }}>{fmtDate(p.scheduled_at)}</td>
                      <td style={s.planTd}>{p.title}</td>
                      <td style={s.planTd}>
                        <span style={{
                          ...s.pill,
                          background: p.status === 'published' ? C.successLight : C.soft,
                          color: p.status === 'published' ? C.success : C.muted,
                        }}>
                          {p.status === 'draft' ? 'Borrador' : p.status === 'published' ? 'Publicado' : p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AddPlanModal — quick add of a one-off plan instance
// ─────────────────────────────────────────────────────────────────────────────
function AddPlanModal({ slug, typeId, onCreated, onClose }: {
  slug: string; typeId: string | null
  onCreated: (p: ServicePlan) => void; onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(nextSundayISO())
  const [time, setTime] = useState('11:00')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setErr('Título requerido'); return }
    setBusy(true); setErr('')
    try {
      const res = await api(`/api/v1/tenant/${slug}/services/plans`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), scheduled_at: `${date}T${time}:00`, service_type_id: typeId }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || 'Error') }
      onCreated(await res.json())
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...s.modal, width: 420 }} onSubmit={submit}>
        <h3 style={s.modalTitle}>Añadir plan</h3>
        <label style={s.label}>
          Título
          <input style={s.input} autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="p. ej. Servicio 24 mayo" />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={s.label}>Fecha<input type="date" style={s.input} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label style={s.label}>Hora<input type="time" style={s.input} value={time} onChange={e => setTime(e.target.value)} /></label>
        </div>
        {err && <p style={s.errorText}>{err}</p>}
        <div style={s.modalActions}>
          <button type="button" style={s.btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={busy} style={s.btnPrimary}>{busy ? '…' : 'Crear'}</button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ListView — main Servicios screen
// ─────────────────────────────────────────────────────────────────────────────
function ListView({ slug, types, setTypes, teams }: {
  slug: string
  types: ServiceType[]
  setTypes: React.Dispatch<React.SetStateAction<ServiceType[]>>
  teams: Team[]
}) {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [planForType, setPlanForType] = useState<string | null>(null)
  const [masterOpen, setMasterOpen] = useState(false)

  const refresh = useCallback(async () => {
    const [p, o] = await Promise.all([
      api(`/api/v1/tenant/${slug}/services/plans`).then(r => r.ok ? r.json() : []).catch(() => []),
      api(`/api/v1/tenant/${slug}/services/occurrences`).then(r => r.ok ? r.json() : []).catch(() => []),
    ])
    setPlans(p); setOccurrences(o)
  }, [slug])

  useEffect(() => { refresh() }, [refresh])

  async function deleteType(id: string) {
    const res = await api(`/api/v1/tenant/${slug}/services/types/${id}`, { method: 'DELETE' })
    if (res.ok) { setTypes(prev => prev.filter(t => t.id !== id)); refresh() }
  }

  function plansFor(typeId: string) { return plans.filter(p => p.service_type_id === typeId) }

  return (
    <>
      <div style={s.layout}>
        <div style={s.sidebar}>
          <MiniCalendar occurrences={occurrences} />
          <button style={{ ...s.btnPrimary, justifyContent: 'center', width: '100%' }} onClick={() => setMasterOpen(true)}>
            Calendario maestro
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Próximos</div>
            {occurrences.slice(0, 6).length === 0
              ? <p style={{ fontSize: 12, color: C.light, margin: 0, lineHeight: 1.6 }}>Sin ocurrencias próximas.</p>
              : occurrences.slice(0, 6).map((o, i) => (
                  <div key={i} style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
                    <div style={{ width: 3, background: o.color || C.primary, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{fmtDateShort(o.date)} · {o.start_time}</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{o.service_type_name}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        <main style={s.main}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={s.mainTitle}>Tipos de servicio</h2>
            <button style={s.btnPrimary} onClick={() => setWizardOpen(true)}>+ Nuevo servicio</button>
          </div>
          {types.map(t => (
            <ServiceTypeCard key={t.id}
              type={t}
              plans={plansFor(t.id)}
              occurrences={occurrences}
              onDelete={() => deleteType(t.id)}
              onAddPlan={() => setPlanForType(t.id)}
            />
          ))}
        </main>
      </div>

      {wizardOpen && (
        <CreateTypeWizard slug={slug} teams={teams}
          onCreated={t => { setTypes(prev => [...prev, t]); setWizardOpen(false); refresh() }}
          onClose={() => setWizardOpen(false)} />
      )}
      {planForType && (
        <AddPlanModal slug={slug} typeId={planForType}
          onCreated={p => { setPlans(prev => [p, ...prev]); setPlanForType(null) }}
          onClose={() => setPlanForType(null)} />
      )}
      {masterOpen && (
        <MasterCalendarModal occurrences={occurrences} onClose={() => setMasterOpen(false)} />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WelcomeView — empty state for Servicios tab
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeView({ onCreate }: { onCreate: () => void }) {
  return (
    <main style={{ ...s.main, padding: 0, overflow: 'hidden', flex: 1 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '48px 40px', maxWidth: 580, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 40 40" fill="none" width={36} height={36}>
              <path d="M20 4L6 12v4h28v-4L20 4z" fill={C.primary} opacity=".9" />
              <rect x="9" y="18" width="5" height="12" rx="1" fill={C.primaryMid} />
              <rect x="18" y="18" width="5" height="12" rx="1" fill={C.primaryMid} />
              <rect x="27" y="18" width="5" height="12" rx="1" fill={C.primaryMid} />
              <rect x="6" y="30" width="29" height="3" rx="1" fill={C.primary} />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Bienvenido a Servicios</h2>
            <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7, maxWidth: 420 }}>
              Organiza y planifica cada servicio de tu iglesia. Empieza creando tu primer tipo de servicio.
            </p>
          </div>
          <button style={{ ...s.btnPrimary, padding: '12px 24px', fontSize: 14 }} onClick={onCreate}>+ Crear primer servicio</button>
        </div>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Personas — Teams CRUD section
// ─────────────────────────────────────────────────────────────────────────────
function TeamFormModal({ slug, initial, onSaved, onClose }: {
  slug: string
  initial?: Team | null
  onSaved: (t: Team) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || '#4F46E5')
  const [description, setDescription] = useState(initial?.description || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Nombre requerido'); return }
    setBusy(true); setErr('')
    try {
      const url = initial
        ? `/api/v1/tenant/${slug}/teams/${initial.id}`
        : `/api/v1/tenant/${slug}/teams`
      const res = await api(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color, description }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || 'Error') }
      onSaved(await res.json())
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...s.modal, width: 420 }} onSubmit={submit}>
        <h3 style={s.modalTitle}>{initial ? 'Editar equipo' : 'Nuevo equipo'}</h3>
        <label style={s.label}>
          Nombre
          <input style={s.input} autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Equipo de Adoración" />
        </label>
        <label style={s.label}>
          Color
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: 44, height: 38, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2, cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{color}</span>
          </div>
        </label>
        <label style={s.label}>
          Descripción
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Opcional: rol del equipo en el servicio"
            style={{ ...s.input, minHeight: 70, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </label>
        {err && <p style={s.errorText}>{err}</p>}
        <div style={s.modalActions}>
          <button type="button" style={s.btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={busy} style={s.btnPrimary}>{busy ? '…' : initial ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  )
}

// ── Service People types ────────────────────────────────────────────────────
type ServiceRole = 'administrator' | 'editor' | 'coordinator' | 'viewer' | 'scheduled_viewer'
type AreaRole = 'administrator' | 'editor' | 'viewer' | 'scheduled_viewer'

interface OrgMemberLite { id: string; full_name: string | null; email: string; avatar?: string | null; role?: string }
interface TypePerm { service_type_id: string; role: ServiceRole | null }
interface ServicePerson {
  id: string
  member_id: string
  full_name: string | null
  email: string
  avatar: string | null
  org_role: string
  service_role: ServiceRole
  songs_role: AreaRole | null
  media_role: AreaRole | null
  file_access: { plans: boolean; songs: boolean; media: boolean }
  type_permissions: TypePerm[]
  welcomed_at: string | null
  password_set: boolean
  temp_password?: string
  debug_password?: string | null   // TEST-ONLY — remove before prod
}

const SERVICE_ROLE_LABEL: Record<ServiceRole, string> = {
  administrator: 'Administrador',
  editor: 'Editor',
  coordinator: 'Coordinador',
  viewer: 'Visualizador',
  scheduled_viewer: 'Visualizador Agendado',
}
const AREA_ROLE_LABEL: Record<AreaRole, string> = {
  administrator: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
  scheduled_viewer: 'Visualizador Agendado',
}
const SERVICE_ROLE_DESC: Record<ServiceRole, string> = {
  administrator: 'Control total: añadir, editar y eliminar personas, tipos y planes.',
  editor: 'Edita servicios y planes. No puede eliminar personas ni añadir nuevas.',
  coordinator: 'Coordina los planes de un tipo de servicio. No crea ni elimina tipos.',
  viewer: 'Solo lectura. Ve todos los servicios sin realizar cambios.',
  scheduled_viewer: 'Solo lectura de los servicios que le hayan sido asignados.',
}

// ─────────────────────────────────────────────────────────────────────────────
// AddPersonWizard — multi-step modal (person → permissions → welcome)
// ─────────────────────────────────────────────────────────────────────────────
function AddPersonWizard({ slug, types, orgMembers, existingMemberIds, onCreated, onClose }: {
  slug: string
  types: ServiceType[]
  orgMembers: OrgMemberLite[]
  existingMemberIds: Set<string>
  onCreated: (p: ServicePerson) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [serviceRole, setServiceRole] = useState<ServiceRole>('viewer')
  const [songsRole, setSongsRole] = useState<AreaRole>('viewer')
  const [mediaRole, setMediaRole] = useState<AreaRole>('viewer')
  const [filePlans, setFilePlans] = useState(true)
  const [fileSongs, setFileSongs] = useState(true)
  const [fileMedia, setFileMedia] = useState(true)
  const [typeOverrides, setTypeOverrides] = useState<Record<string, ServiceRole | null>>({})
  const [sendWelcome, setSendWelcome] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null)

  const availableMembers = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    return orgMembers
      .filter(m => !existingMemberIds.has(m.id))
      .filter(m => !q || (m.full_name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 40)
  }, [orgMembers, existingMemberIds, pickerSearch])

  // Picked org member's role (only meaningful in 'existing' mode)
  const pickedRole = useMemo(() => {
    if (mode !== 'existing' || !pickedId) return undefined
    return orgMembers.find(m => m.id === pickedId)?.role
  }, [mode, pickedId, orgMembers])
  const pickedIsAdmin = pickedRole === 'admin'

  function next() {
    setErr('')
    if (step === 1) {
      if (mode === 'existing' && !pickedId) { setErr('Selecciona una persona'); return }
      if (mode === 'new') {
        if (!newName.trim()) { setErr('Indica el nombre'); return }
        if (!newEmail.trim() || !newEmail.includes('@')) { setErr('Email inválido'); return }
      }
      setDirection('forward'); setStep(2)
    } else if (step === 2) {
      setDirection('forward'); setStep(3)
    }
  }
  function back() { setErr(''); if (step > 1) { setDirection('back'); setStep((step - 1) as 1 | 2) } }

  async function submit() {
    setBusy(true); setErr('')
    try {
      const type_permissions = Object.entries(typeOverrides)
        .map(([service_type_id, role]) => ({ service_type_id, role }))
      const body: any = {
        service_role: serviceRole, songs_role: songsRole, media_role: mediaRole,
        file_access: { plans: filePlans, songs: fileSongs, media: fileMedia },
        type_permissions,
        send_welcome: sendWelcome,
      }
      if (mode === 'existing') body.member_id = pickedId
      else body.new_member = { full_name: newName.trim(), email: newEmail.trim().toLowerCase(), phone: newPhone.trim() || null }

      const res = await api(`/api/v1/tenant/${slug}/services/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || 'Error') }
      const created = await res.json() as ServicePerson
      onCreated(created)
      // Always show a final screen so the admin sees the temp password (test-mode)
      // or at least confirmation. Falls back to debug_password if temp wasn't returned
      // (e.g. existing member who already had a password — admin can reset later).
      const pw = created.temp_password || created.debug_password
      if (pw) setCreatedTempPassword(pw)
      else onClose()
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  // Inject slide keyframes once (cheap & contained to this module).
  useEffect(() => {
    const id = 'worsyn-wizard-slide'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
@keyframes worsyn-slide-fwd { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes worsyn-slide-bwd { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
`
    document.head.appendChild(el)
  }, [])

  // When the picked person is an org admin, disable welcome (they use the
  // tenant-level password). Reset the toggle as soon as that becomes true.
  useEffect(() => { if (pickedIsAdmin) setSendWelcome(false) }, [pickedIsAdmin])

  const StepDot = ({ n, label }: { n: number; label: string }) => {
    const active = step === n; const done = step > n
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: done || active ? 1 : 0.5 }}>
        <span style={{ ...s.stepDot, background: active ? C.primary : done ? C.success : C.soft, color: active || done ? '#fff' : C.muted }}>
          {done ? '✓' : n}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: active ? C.text : C.muted }}>{label}</span>
      </div>
    )
  }

  const stepAnim: React.CSSProperties = {
    animation: `${direction === 'forward' ? 'worsyn-slide-fwd' : 'worsyn-slide-bwd'} 220ms ease`,
    display: 'flex', flexDirection: 'column', gap: 14,
  }

  if (createdTempPassword) {
    return (
      <div style={s.overlay}>
        <div style={{ ...s.modal, width: 460 }}>
          <h3 style={s.modalTitle}>Persona añadida</h3>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Se ha generado una contraseña temporal. <strong style={{ color: C.text }}>Cópiala ahora</strong> y compártela con la persona — no se mostrará otra vez.
            <br/><em>Próximamente: envío automático por email.</em>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.primaryLight, border: `1.5px solid ${C.primary}`, borderRadius: 10, padding: '14px 16px' }}>
            <code style={{ flex: 1, fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: C.primary, letterSpacing: '0.08em' }}>{createdTempPassword}</code>
            <button style={{ ...s.btnPrimary, padding: '6px 12px', fontSize: 12 }}
              onClick={() => navigator.clipboard?.writeText(createdTempPassword)}>Copiar</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={s.btnPrimary} onClick={onClose}>Listo</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, width: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={s.modalTitle}>Añadir persona</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0 8px', borderBottom: `1px solid ${C.border}` }}>
          <StepDot n={1} label="Persona" />
          <span style={{ flex: 1, height: 1, background: C.border }} />
          <StepDot n={2} label="Permisos" />
          <span style={{ flex: 1, height: 1, background: C.border }} />
          <StepDot n={3} label="Bienvenida" />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px 0', overflowX: 'hidden' }}>
        <div key={step} style={stepAnim}>
          {step === 1 && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setMode('existing')}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${mode === 'existing' ? C.primary : C.border}`,
                    background: mode === 'existing' ? C.primaryLight : '#fff',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Persona existente</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Elige a alguien del módulo Miembros</div>
                </button>
                <button onClick={() => setMode('new')}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${mode === 'new' ? C.primary : C.border}`,
                    background: mode === 'new' ? C.primaryLight : '#fff',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Crear nueva</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Se añade también a Miembros</div>
                </button>
              </div>

              {mode === 'existing' && (
                <>
                  <input style={s.input} placeholder="Buscar por nombre o email…"
                    value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} autoFocus />
                  <div style={{ maxHeight: 280, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    {availableMembers.length === 0 && (
                      <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                        {orgMembers.length === existingMemberIds.size
                          ? 'Todos los miembros ya están en Servicios. Crea uno nuevo.'
                          : 'Sin resultados.'}
                      </div>
                    )}
                    {availableMembers.map(m => {
                      const selected = pickedId === m.id
                      return (
                        <button key={m.id} onClick={() => setPickedId(m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%',
                            background: selected ? C.primaryLight : 'transparent',
                            border: 'none', borderBottom: `1px solid ${C.soft}`,
                            cursor: 'pointer', textAlign: 'left',
                          }}>
                          <div style={{ width: 32, height: 32, borderRadius: 999, background: m.avatar ? `url(${m.avatar}) center/cover` : C.soft, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {!m.avatar && (m.full_name?.[0]?.toUpperCase() || m.email[0]?.toUpperCase())}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name || '—'}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{m.email}</div>
                          </div>
                          {selected && <span style={{ color: C.primary, fontWeight: 700 }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {mode === 'new' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={s.label}>Nombre completo<input style={s.input} value={newName} onChange={e => setNewName(e.target.value)} autoFocus /></label>
                  <label style={s.label}>Email<input style={s.input} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="persona@iglesia.com" /></label>
                  <label style={s.label}>Teléfono <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span>
                    <input style={s.input} value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+34 612 345 678" /></label>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0, fontStyle: 'italic' }}>
                    * Se crea también un miembro en el módulo Miembros con rol "Miembro".
                  </p>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Personas y Planes</div>
                <select style={s.select} value={serviceRole} onChange={e => setServiceRole(e.target.value as ServiceRole)}>
                  {(['administrator', 'editor', 'coordinator', 'viewer', 'scheduled_viewer'] as ServiceRole[]).map(r => (
                    <option key={r} value={r}>{SERVICE_ROLE_LABEL[r]}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0', lineHeight: 1.5 }}>{SERVICE_ROLE_DESC[serviceRole]}</p>
              </div>

              {types.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Acceso por tipo de servicio</div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    {types.map(t => {
                      const current = typeOverrides[t.id]
                      const sel = current === undefined ? '__inherit__' : (current === null ? '__same__' : current)
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: `1px solid ${C.soft}` }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color || C.primary, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{t.name}</div>
                          <select style={{ ...s.select, padding: '5px 8px', fontSize: 12 }}
                            value={sel}
                            onChange={e => {
                              const v = e.target.value
                              setTypeOverrides(prev => {
                                const n = { ...prev }
                                if (v === '__inherit__') delete n[t.id]
                                else if (v === '__same__') n[t.id] = null
                                else n[t.id] = v as ServiceRole
                                return n
                              })
                            }}>
                            <option value="__inherit__">Mismo que arriba</option>
                            {(['administrator', 'editor', 'coordinator', 'viewer', 'scheduled_viewer'] as ServiceRole[]).map(r => (
                              <option key={r} value={r}>{SERVICE_ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Canciones</div>
                  <select style={s.select} value={songsRole} onChange={e => setSongsRole(e.target.value as AreaRole)}>
                    {(['administrator', 'editor', 'viewer', 'scheduled_viewer'] as AreaRole[]).map(r => (
                      <option key={r} value={r}>{AREA_ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Media</div>
                  <select style={s.select} value={mediaRole} onChange={e => setMediaRole(e.target.value as AreaRole)}>
                    {(['administrator', 'editor', 'viewer', 'scheduled_viewer'] as AreaRole[]).map(r => (
                      <option key={r} value={r}>{AREA_ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Acceso a Ficheros</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { v: filePlans, set: setFilePlans, label: 'Planes (servicios)' },
                    { v: fileSongs, set: setFileSongs, label: 'Canciones' },
                    { v: fileMedia, set: setFileMedia, label: 'Media' },
                  ].map((it, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text, cursor: 'pointer' }}>
                      <input type="checkbox" checked={it.v} onChange={e => it.set(e.target.checked)} />
                      {it.label}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0', lineHeight: 1.5 }}>
                  Permite ver y descargar los archivos adjuntos correspondientes a cada sección.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {pickedIsAdmin ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.successLight }}>
                  <svg viewBox="0 0 20 20" fill={C.success} width={22} height={22} style={{ flexShrink: 0, marginTop: 1 }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>No requiere bienvenida</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
                      Esta persona es <strong style={{ color: C.text }}>Administrador de la organización</strong>.
                      Ya tiene una contraseña a nivel de tenant y accede al portal con ella.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                    Las personas dadas de alta en Servicios necesitan una contraseña para entrar al portal.
                    Activa el envío de bienvenida para generar una contraseña temporal automáticamente.
                  </p>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                    border: `1.5px solid ${sendWelcome ? C.primary : C.border}`, borderRadius: 10,
                    background: sendWelcome ? C.primaryLight : '#fff', cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={sendWelcome} onChange={e => setSendWelcome(e.target.checked)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Enviar mensaje de bienvenida</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Genera una contraseña temporal y marca como "bienvenida enviada".
                      </div>
                    </div>
                  </label>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0, fontStyle: 'italic' }}>
                    * Email SMTP aún no conectado. La contraseña se mostrará en pantalla para compartirla manualmente.
                  </p>
                </>
              )}
            </>
          )}
          {err && <p style={s.errorText}>{err}</p>}
        </div>
        </div>

        <div style={s.modalActions}>
          <button onClick={step === 1 ? onClose : back} style={s.btnGhost}>
            {step === 1 ? 'Cancelar' : '‹ Atrás'}
          </button>
          {step < 3
            ? <button onClick={next} style={s.btnPrimary}>Siguiente ›</button>
            : <button onClick={submit} disabled={busy} style={s.btnPrimary}>{busy ? 'Guardando…' : 'Añadir persona'}</button>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonasView — full People / Teams management
// ─────────────────────────────────────────────────────────────────────────────
function PersonasView({ slug, teams, setTeams, types }: {
  slug: string
  teams: Team[]
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>
  types: ServiceType[]
}) {
  const [tab, setTab] = useState<'personas' | 'equipos'>('personas')
  const [editingTeam, setEditingTeam] = useState<Team | null | undefined>(undefined)
  const [people, setPeople] = useState<ServicePerson[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberLite[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  const reloadPeople = useCallback(async () => {
    setLoading(true)
    try {
      const [p, om, me] = await Promise.all([
        api(`/api/v1/tenant/${slug}/services/people`).then(r => r.ok ? r.json() : []).catch(() => []),
        api(`/api/v1/tenant/${slug}/members`).then(r => r.ok ? r.json() : []).catch(() => []),
        api(`/api/v1/tenant/${slug}/auth/me`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      setPeople(p); setOrgMembers(om); setCurrentMemberId(me?.id ?? null)
    } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { reloadPeople() }, [reloadPeople])

  const existingMemberIds = useMemo(() => new Set(people.map(p => p.member_id)), [people])

  async function deleteTeam(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return
    const res = await api(`/api/v1/tenant/${slug}/teams/${id}`, { method: 'DELETE' })
    if (res.ok) setTeams(prev => prev.filter(t => t.id !== id))
  }
  async function deletePerson(p: ServicePerson) {
    if (!confirm(`¿Eliminar a ${p.full_name || p.email} del módulo Servicios?\nNo se elimina del módulo Miembros.`)) return
    const res = await api(`/api/v1/tenant/${slug}/services/people/${p.id}`, { method: 'DELETE' })
    if (res.ok) { setPeople(prev => prev.filter(x => x.id !== p.id)); return }
    const j = await res.json().catch(() => ({}))
    alert(j.detail || 'Error al eliminar')
  }
  async function changeRole(p: ServicePerson, role: ServiceRole) {
    const res = await api(`/api/v1/tenant/${slug}/services/people/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_role: role }),
    })
    if (res.ok) {
      const updated = await res.json() as ServicePerson
      setPeople(prev => prev.map(x => x.id === p.id ? updated : x))
    }
  }
  async function resendWelcome(p: ServicePerson) {
    const res = await api(`/api/v1/tenant/${slug}/services/people/${p.id}/welcome`, { method: 'POST' })
    if (!res.ok) { alert('Error al enviar bienvenida'); return }
    const j = await res.json()
    if (j.temp_password) {
      alert(`Contraseña temporal para ${j.email}:\n\n${j.temp_password}\n\nCópiala y compártela ahora — no se mostrará otra vez.`)
    } else {
      alert(`Bienvenida marcada. ${j.email} ya tiene contraseña configurada.`)
    }
    reloadPeople()
  }
  // TEST-ONLY: force-reset password and pop the new one for manual login testing
  async function resetPasswordDebug(p: ServicePerson) {
    if (!confirm(`(Test) Regenerar contraseña para ${p.full_name || p.email}?`)) return
    const res = await api(`/api/v1/tenant/${slug}/services/people/${p.id}/reset-password`, { method: 'POST' })
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.detail || 'Error'); return }
    const j = await res.json()
    alert(`Nueva contraseña para ${j.email}:\n\n${j.debug_password}`)
    reloadPeople()
  }

  return (
    <main style={s.main}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={s.mainTitle}>Personas</h2>
        {tab === 'equipos'
          ? <button style={s.btnPrimary} onClick={() => setEditingTeam(null)}>+ Nuevo equipo</button>
          : <button style={s.btnPrimary} onClick={() => setWizardOpen(true)}>+ Añadir persona</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}` }}>
        {(['personas', 'equipos'] as const).map(t => {
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                color: active ? C.primary : C.muted,
                borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
                marginBottom: -1,
              }}>
              {t === 'personas' ? 'Personas' : 'Equipos'}
            </button>
          )
        })}
      </div>

      {tab === 'personas' && (
        <>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>
          ) : people.length === 0 ? (
            <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Aún no hay personas en Servicios</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Añade voluntarios y líderes para gestionar sus permisos en el módulo.
              </div>
              <button style={s.btnPrimary} onClick={() => setWizardOpen(true)}>+ Añadir primera persona</button>
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={s.planTable}>
                <thead>
                  <tr>
                    <th style={s.planTh}>Nombre</th>
                    <th style={s.planTh}>Email</th>
                    <th style={s.planTh}>Permisos en Servicios</th>
                    <th style={s.planTh}>Estado</th>
                    <th style={{ ...s.planTh, background: '#FEF3C7', color: '#92400E' }}>Contraseña (test)</th>
                    <th style={s.planTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {people.map(p => (
                    <tr key={p.id}>
                      <td style={s.planTd}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 999, background: p.avatar ? `url(${p.avatar}) center/cover` : C.soft, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {!p.avatar && (p.full_name?.[0]?.toUpperCase() || p.email[0]?.toUpperCase())}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: C.text }}>{p.full_name || '—'}</div>
                            {p.org_role === 'admin' && <div style={{ ...s.pill, background: C.successLight, color: C.success, fontSize: 10, padding: '1px 7px', marginTop: 2 }}>Admin de org</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...s.planTd, color: C.muted, fontSize: 12 }}>{p.email}</td>
                      <td style={s.planTd}>
                        <select value={p.service_role} onChange={e => changeRole(p, e.target.value as ServiceRole)}
                          style={{ ...s.select, padding: '4px 8px', fontSize: 12 }}>
                          {(['administrator', 'editor', 'coordinator', 'viewer', 'scheduled_viewer'] as ServiceRole[]).map(r => (
                            <option key={r} value={r}>{SERVICE_ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      </td>
                      <td style={s.planTd}>
                        {p.welcomed_at
                          ? <span style={{ ...s.pill, background: C.successLight, color: C.success }}>Bienvenido</span>
                          : <span style={{ ...s.pill, background: C.soft, color: C.muted }}>Pendiente</span>}
                      </td>
                      <td style={{ ...s.planTd, background: '#FFFBEB', whiteSpace: 'nowrap' }}>
                        {p.org_role === 'admin'
                          ? <span style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>contraseña del tenant</span>
                          : p.debug_password
                            ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <code style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>{p.debug_password}</code>
                                  <button onClick={() => navigator.clipboard?.writeText(p.debug_password!)}
                                    title="Copiar contraseña"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, lineHeight: 1 }}>
                                    <svg viewBox="0 0 16 16" fill="currentColor" width={12} height={12}><path d="M4 1.5A1.5 1.5 0 015.5 0h5A1.5 1.5 0 0112 1.5V2h.5A1.5 1.5 0 0114 3.5v11A1.5 1.5 0 0112.5 16h-9A1.5 1.5 0 012 14.5v-11A1.5 1.5 0 013.5 2H4v-.5zM5 2h6v-.5a.5.5 0 00-.5-.5h-5a.5.5 0 00-.5.5V2z"/></svg>
                                  </button>
                                </div>
                              )
                            : <span style={{ fontSize: 11, color: C.muted }}>—</span>}
                      </td>
                      <td style={{ ...s.planTd, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {p.org_role !== 'admin' && (
                          <>
                            <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resendWelcome(p)}>
                              {p.welcomed_at ? 'Reenviar bienvenida' : 'Enviar bienvenida'}
                            </button>
                            <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, marginRight: 6, color: '#92400E', borderColor: '#FCD34D', background: '#FFFBEB' }}
                              onClick={() => resetPasswordDebug(p)}
                              title="(Test) Genera nueva contraseña y la muestra">Reset pw</button>
                          </>
                        )}
                        {(() => {
                          const isSelfAdmin = p.org_role === 'admin' && p.member_id === currentMemberId
                          return (
                            <button
                              style={{
                                ...s.btnGhost, padding: '4px 10px', fontSize: 12,
                                color: isSelfAdmin ? C.light : C.danger,
                                borderColor: isSelfAdmin ? C.border : 'rgba(239,68,68,.3)',
                                cursor: isSelfAdmin ? 'not-allowed' : 'pointer',
                                opacity: isSelfAdmin ? 0.55 : 1,
                              }}
                              disabled={isSelfAdmin}
                              title={isSelfAdmin ? 'No puedes eliminarte a ti mismo. Otro administrador debe hacerlo.' : ''}
                              onClick={() => !isSelfAdmin && deletePerson(p)}>
                              Eliminar
                            </button>
                          )
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'equipos' && (
        <>
          {teams.length === 0 ? (
            <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Aún no hay equipos</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Crea equipos como Adoración, Audio/Visual o Recibo para asignarlos a tus servicios.
              </div>
              <button style={s.btnPrimary} onClick={() => setEditingTeam(null)}>+ Crear primer equipo</button>
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={s.planTable}>
                <thead>
                  <tr>
                    <th style={s.planTh}>Equipo</th>
                    <th style={s.planTh}>Descripción</th>
                    <th style={s.planTh}>Miembros</th>
                    <th style={s.planTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.id}>
                      <td style={s.planTd}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color || C.primary, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{t.name}</span>
                        </div>
                      </td>
                      <td style={{ ...s.planTd, color: C.muted, fontSize: 12 }}>{t.description || '—'}</td>
                      <td style={{ ...s.planTd, color: C.muted, fontSize: 12 }}>{t.member_count}</td>
                      <td style={{ ...s.planTd, textAlign: 'right' }}>
                        <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => setEditingTeam(t)}>Editar</button>
                        <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, color: C.danger, borderColor: 'rgba(239,68,68,.3)' }} onClick={() => deleteTeam(t.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editingTeam !== undefined && (
        <TeamFormModal slug={slug} initial={editingTeam}
          onSaved={t => {
            setTeams(prev => editingTeam ? prev.map(x => x.id === t.id ? t : x) : [...prev, t])
            setEditingTeam(undefined)
          }}
          onClose={() => setEditingTeam(undefined)} />
      )}

      {wizardOpen && (
        <AddPersonWizard slug={slug} types={types} orgMembers={orgMembers} existingMemberIds={existingMemberIds}
          onCreated={p => { setPeople(prev => [p, ...prev]) }}
          onClose={() => { setWizardOpen(false); reloadPeople() }} />
      )}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder for tabs not yet implemented
// ─────────────────────────────────────────────────────────────────────────────
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
        <span style={{ ...s.pill, background: C.primaryLight, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 14px' }}>Próximamente</span>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────
export default function Servicios({ tab }: { tab: ServiciosTab }) {
  const { slug } = useParams<{ slug: string }>()
  const [types, setTypes] = useState<ServiceType[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const [ts, tm] = await Promise.all([
        api(`/api/v1/tenant/${slug}/services/types`).then(r => r.ok ? r.json() : []).catch(() => []),
        api(`/api/v1/tenant/${slug}/teams`).then(r => r.ok ? r.json() : []).catch(() => []),
      ])
      setTypes(ts); setTeams(tm)
    } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { refresh() }, [refresh])

  if (tab === 'personas') {
    return <PersonasView slug={slug!} teams={teams} setTeams={setTeams} types={types} />
  }

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

  if (types.length === 0) {
    return (
      <>
        <WelcomeView onCreate={() => setCreateOpen(true)} />
        {createOpen && slug && (
          <CreateTypeWizard slug={slug} teams={teams}
            onCreated={t => { setTypes([t]); setCreateOpen(false) }}
            onClose={() => setCreateOpen(false)} />
        )}
      </>
    )
  }

  return <ListView slug={slug!} types={types} setTypes={setTypes} teams={teams} />
}
