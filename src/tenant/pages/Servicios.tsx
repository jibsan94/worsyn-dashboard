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
import ReactDOM from 'react-dom'
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
  useEscape(onClose)

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
      <div data-tp="cal-modal" style={{ ...s.modal, width: 940, maxWidth: '95vw', maxHeight: '92vh' }}>
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

        <div data-tp="cal-modal-body" style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
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

          <div data-tp="cal-modal-side" style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${C.border}`, paddingLeft: 16, overflow: 'auto' }}>
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
      <div data-tp="content" style={s.layout}>
        <div data-tp="sidebar" style={s.sidebar}>
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
  scheduling?: { max_per_month: number | null; max_per_day: number | null }
  signature?: { text: string | null; image: string | null }
  preferred_notif_app?: 'servicios' | 'worsyn'
  temp_password?: string
  debug_password?: string | null   // TEST-ONLY — remove before prod
}

type EmailKind = 'general' | 'schedule' | 'signup' | 'welcome'
interface EmailTemplate {
  id: string; kind: EmailKind; name: string; subject: string; body: string;
  is_default: boolean; created_at: string; updated_at: string | null
}
interface EmailMessage {
  id: string; direction: 'sent' | 'received'; status: string;
  subject: string; body: string;
  recipient_email: string; sender_email: string | null;
  recipient_member_id: string | null; sender_member_id: string | null;
  template_id: string | null;
  sent_at: string | null; created_at: string; error: string | null;
  counterparty_name: string | null;
}

const KIND_LABEL: Record<EmailKind, string> = {
  general: 'General', schedule: 'Programación', signup: 'Hojas de inscripción', welcome: 'Bienvenida',
}
const KIND_HINT: Record<EmailKind, string> = {
  general: 'Mensajes generales (no asociados a un plan o fecha).',
  schedule: 'Asociados a planes o al cuadrante. Llevan botones de Aceptar / Rechazar.',
  signup: 'Para hojas de inscripción y reclutamiento.',
  welcome: 'Bienvenida al portal — se envía al añadir una persona nueva.',
}

// Common variables exposed by the picker. Full catalog → artifacts/EMAIL-VARIABLES.md
const VARIABLE_GROUPS: { label: string; vars: { token: string; hint: string }[] }[] = [
  { label: 'Destinatario', vars: [
    { token: '{{ to.name }}', hint: 'Nombre completo de la persona' },
    { token: '{{ to.first_name }}', hint: 'Solo el primer nombre' },
    { token: '{{ to.last_name }}', hint: 'Primer apellido' },
    { token: '{{ to.email }}', hint: 'Correo electrónico' },
    { token: '{{ to.service_role }}', hint: 'Rol en Servicios (texto en ES)' },
    { token: '{{ to.max_plan_permissions_s }}', hint: 'Alias compatible PCO (= service_role)' },
    { token: '{{ to.login_method }}', hint: 'Método de inicio de sesión' },
  ]},
  { label: 'Remitente', vars: [
    { token: '{{ from.name }}', hint: 'Nombre del remitente' },
    { token: '{{ from.first_name }}', hint: 'Primer nombre del remitente' },
    { token: '{{ from.signature }}', hint: 'Firma configurada del remitente' },
  ]},
  { label: 'Organización', vars: [
    { token: '{{ organization.name }}', hint: 'Nombre de la iglesia' },
    { token: '{{ organization.alias }}', hint: 'Alias del portal' },
    { token: '{{ organization.email }}', hint: 'Email de contacto de la organización' },
  ]},
  { label: 'Condicionales', vars: [
    { token: '{% if to.has_password %}...{% else %}...{% endif %}', hint: 'Bloque solo si la persona ya tiene contraseña' },
    { token: '{% if to.scheduler_at_all? %}...{% endif %}', hint: 'Bloque solo si puede coordinar/programar' },
  ]},
]

interface PersonTeam { membership_id: string; team_id: string; team_name: string; team_color: string | null; role: string | null }

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
  useEscape(onClose)

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
// Blockouts — types + modal + projection
// ─────────────────────────────────────────────────────────────────────────────
type RepeatKind = 'none' | 'day' | 'week' | 'month' | 'year'
interface Blockout {
  id: string
  start_date: string  // YYYY-MM-DD
  end_date: string
  all_day: boolean
  repeat_kind: RepeatKind
  repeat_interval: number
  repeat_until: string | null  // null = forever
  reason: string | null
}

const REPEAT_KIND_LABEL: Record<RepeatKind, string> = {
  none: 'No se repite', day: 'día', week: 'semana', month: 'mes', year: 'año',
}
// "Cada" / "Cada dos" / "Cada tres" … up to "Cada doce". Index 0 unused.
const CADA_LABEL = [
  '—', 'Cada', 'Cada dos', 'Cada tres', 'Cada cuatro', 'Cada cinco',
  'Cada seis', 'Cada siete', 'Cada ocho', 'Cada nueve', 'Cada diez',
  'Cada once', 'Cada doce',
]

function blockoutLabel(b: Blockout): string {
  const same = b.start_date === b.end_date
  const range = same ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} — ${fmtDate(b.end_date)}`
  if (b.repeat_kind === 'none') return range
  const cada = CADA_LABEL[b.repeat_interval] || 'Cada'
  const unit = REPEAT_KIND_LABEL[b.repeat_kind]
  const tail = b.repeat_until ? `hasta ${fmtDate(b.repeat_until)}` : 'siempre'
  return `${range} · ${cada} ${unit} ${tail}`
}

function BlockoutModal({ slug, smId, initial, onSaved, onClose }: {
  slug: string
  smId: string
  initial?: Blockout
  onSaved: (b: Blockout) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(initial?.start_date || today)
  const [endDate, setEndDate]     = useState(initial?.end_date   || today)
  const [allDay, setAllDay]       = useState(initial?.all_day ?? true)
  const [repeatKind, setRepeatKind]         = useState<RepeatKind>(initial?.repeat_kind || 'none')
  const [repeatInterval, setRepeatInterval] = useState<number>(initial?.repeat_interval || 1)
  const [untilMode, setUntilMode] = useState<'forever' | 'until'>(initial?.repeat_until ? 'until' : 'forever')
  const [repeatUntil, setRepeatUntil] = useState<string>(initial?.repeat_until || today)
  const [reason, setReason] = useState(initial?.reason || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')
  useEscape(onClose)

  // Selection during calendar interaction
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const yr = cursor.getFullYear(), mo = cursor.getMonth()
  const firstDOW = new Date(yr, mo, 1).getDay()
  const offset = firstDOW === 0 ? 6 : firstDOW - 1
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]
  const moName = cursor.toLocaleString('es-ES', { month: 'long' })
  const moLabel = `${moName.charAt(0).toUpperCase() + moName.slice(1)} ${yr}`

  function shift(dir: -1 | 1) {
    setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() + dir); return n })
  }
  function pickDay(iso: string) {
    // Click sets start (and end if before current start), shift-extend isn't
    // available without modifier — second click after start extends end.
    if (iso < startDate) { setStartDate(iso); return }
    if (iso > endDate)   { setEndDate(iso); return }
    // Click inside range → reset to single day
    setStartDate(iso); setEndDate(iso)
  }

  function isInRange(iso: string) { return iso >= startDate && iso <= endDate }

  async function submit() {
    if (endDate < startDate) { setErr('La fecha de fin debe ser igual o posterior'); return }
    setBusy(true); setErr('')
    const payload = {
      start_date: startDate, end_date: endDate, all_day: allDay,
      repeat_kind: repeatKind, repeat_interval: repeatKind === 'none' ? 1 : repeatInterval,
      repeat_until: repeatKind === 'none' ? null : (untilMode === 'until' ? repeatUntil : null),
      reason: reason.trim() || null,
    }
    const url = initial
      ? `/api/v1/tenant/${slug}/services/people/${smId}/blockouts/${initial.id}`
      : `/api/v1/tenant/${slug}/services/people/${smId}/blockouts`
    const res = await api(url, {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.detail || 'Error'); setBusy(false); return
    }
    onSaved(await res.json())
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, width: 820, maxWidth: '95vw', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h3 style={s.modalTitle}>Fechas de bloqueo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>
        <div data-tp="cal-modal-body" style={{ display: 'flex', minHeight: 420 }}>
          {/* Calendar */}
          <div style={{ flex: 1, padding: '20px 24px', borderRight: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{moLabel}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12 }}
                  onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setStartDate(today); setEndDate(today) }}>
                  Hoy
                </button>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button style={s.iconBtn} onClick={() => shift(-1)} title="Mes anterior">‹</button>
                  <button style={s.iconBtn} onClick={() => shift(1)} title="Mes siguiente">›</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center', marginBottom: 6 }}>
              {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                <span key={d} style={{ fontSize: 10, fontWeight: 700, color: C.light, padding: '4px 0', letterSpacing: '0.06em' }}>{d}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, i) => {
                if (day == null) return <div key={i} style={{ height: 38 }} />
                const iso = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const inRange = isInRange(iso)
                const isStart = iso === startDate
                const isEnd = iso === endDate
                const isToday = iso === today
                return (
                  <button key={i} onClick={() => pickDay(iso)}
                    style={{
                      height: 38, borderRadius: 8, cursor: 'pointer',
                      border: isToday && !inRange ? `1.5px solid ${C.primary}` : 'none',
                      background: inRange ? (isStart || isEnd ? C.danger : '#FECACA') : (isToday ? C.primaryLight : 'transparent'),
                      color: inRange ? (isStart || isEnd ? '#fff' : '#7F1D1D') : (isToday ? C.primary : C.text),
                      fontSize: 13, fontWeight: inRange || isToday ? 700 : 500,
                      transition: 'background 120ms',
                    }}>{day}</button>
                )
              })}
            </div>
          </div>
          {/* Form */}
          <div style={{ width: 340, padding: '20px 22px', background: C.bg, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Todo el día</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={s.label}>Fecha inicio<input type="date" style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
              <label style={s.label}>Fecha fin<input type="date" style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Repetir</div>
              {repeatKind === 'none' ? (
                <select style={s.select} value="none" onChange={e => setRepeatKind(e.target.value as RepeatKind)}>
                  <option value="none">No se repite</option>
                  <option value="day">Cada día</option>
                  <option value="week">Cada semana</option>
                  <option value="month">Cada mes</option>
                  <option value="year">Cada año</option>
                </select>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 6 }}>
                    <select style={{ ...s.select, fontSize: 12, padding: '6px 8px' }}
                      value={repeatInterval} onChange={e => setRepeatInterval(parseInt(e.target.value))}>
                      {CADA_LABEL.slice(1).map((label, i) => (
                        <option key={i + 1} value={i + 1}>{label}</option>
                      ))}
                    </select>
                    <select style={{ ...s.select, fontSize: 12, padding: '6px 8px' }}
                      value={repeatKind} onChange={e => setRepeatKind(e.target.value as RepeatKind)}>
                      <option value="day">día{repeatInterval > 1 ? 's' : ''}</option>
                      <option value="week">semana{repeatInterval > 1 ? 's' : ''}</option>
                      <option value="month">mes{repeatInterval > 1 ? 'es' : ''}</option>
                      <option value="year">año{repeatInterval > 1 ? 's' : ''}</option>
                    </select>
                    <select style={{ ...s.select, fontSize: 12, padding: '6px 8px' }}
                      value={untilMode} onChange={e => setUntilMode(e.target.value as 'forever' | 'until')}>
                      <option value="forever">siempre</option>
                      <option value="until">hasta</option>
                    </select>
                  </div>
                  {untilMode === 'until' && (
                    <input type="date" style={{ ...s.input, marginTop: 6 }}
                      value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} />
                  )}
                  <button onClick={() => setRepeatKind('none')}
                    style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, cursor: 'pointer', marginTop: 4, padding: 0, textDecoration: 'underline' }}>
                    No repetir
                  </button>
                </>
              )}
            </div>

            <label style={s.label}>
              Motivo <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span>
              <input style={s.input} value={reason} onChange={e => setReason(e.target.value)} placeholder="p. ej. Vacaciones" />
            </label>

            {err && <p style={s.errorText}>{err}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: `1px solid ${C.border}`, background: C.surface }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            <svg viewBox="0 0 16 16" fill={C.muted} width={12} height={12} style={{ verticalAlign: 'middle', marginRight: 4 }}>
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 4a1 1 0 110 2 1 1 0 010-2zm1 8H7v-5h2v5z"/>
            </svg>
            Haz clic en otra fecha del calendario para extender el rango.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.btnGhost} onClick={onClose}>Cancelar</button>
            <button style={s.btnPrimary} onClick={submit} disabled={busy}>{busy ? '…' : initial ? 'Guardar' : 'Guardar bloqueo'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared presentational primitives. MUST be module-level (not defined inside
// a parent component) — otherwise React sees a new component type on every
// render and unmounts/remounts the subtree (steals focus from inputs).
// ─────────────────────────────────────────────────────────────────────────────
function SectionTitle({ children, hint, right }: { children: React.ReactNode; hint?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
        {hint && <span title={hint} style={{ color: C.light, cursor: 'help', fontSize: 12 }}>ⓘ</span>}
      </h3>
      {right}
    </div>
  )
}
function Card({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: padded ? '16px 18px' : 0 }}>{children}</div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Email helpers: variable picker, compose modal, templates manager
// ─────────────────────────────────────────────────────────────────────────────
function VariablePicker({ onInsert, anchorRight = false, allowedGroups }: {
  onInsert: (tok: string) => void
  anchorRight?: boolean   // Anchor dropdown to the right edge of the trigger
  allowedGroups?: string[]  // restrict to these group labels (e.g. ['Destinatario', 'Organización'])
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const popRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)

  // Position the popover next to the trigger using fixed coords so it escapes
  // any ancestor `overflow: hidden` (e.g. the email modal).
  function placePopover() {
    const b = btnRef.current?.getBoundingClientRect()
    if (!b) return
    const W = 340, H = 420
    let left = anchorRight ? b.right - W : b.left
    let top = b.bottom + 4
    // Clamp into viewport
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8
    if (left < 8) left = 8
    if (top + H > window.innerHeight - 8) top = b.top - H - 4
    if (top < 8) top = 8
    setPos({ top, left })
  }
  useEffect(() => {
    if (!open) return
    placePopover()
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current && popRef.current.contains(t)) return
      if (btnRef.current && btnRef.current.contains(t)) return
      setOpen(false)
    }
    const onScroll = () => placePopover()
    document.addEventListener('mousedown', h)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', h)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, anchorRight])
  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 30) }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return VARIABLE_GROUPS
      .filter(g => !allowedGroups || allowedGroups.includes(g.label))
      .map(g => ({
        ...g,
        vars: g.vars.filter(v => !q || v.token.toLowerCase().includes(q) || v.hint.toLowerCase().includes(q)),
      }))
      .filter(g => g.vars.length > 0)
  }, [search, allowedGroups])
  const totalShown = filtered.reduce((n, g) => n + g.vars.length, 0)

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        style={{ ...s.btnGhost, fontSize: 12, padding: '4px 10px', display: 'inline-flex', gap: 4 }}>
        {'{}'} Variable
      </button>
      {open && pos && ReactDOM.createPortal(
        <div ref={popRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          width: 340, maxHeight: 420, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 8px 6px', borderBottom: `1px solid ${C.border}` }}>
            <input ref={searchRef} type="text" placeholder="Buscar variable…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...s.input, padding: '6px 10px', fontSize: 12 }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: 6 }}>
            {totalShown === 0 && (
              <div style={{ padding: '20px 10px', fontSize: 12, color: C.muted, textAlign: 'center' }}>
                Sin resultados. Prueba con <code>to</code>, <code>org</code> o <code>signature</code>.
              </div>
            )}
            {filtered.map(g => (
              <div key={g.label} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 10px 4px' }}>{g.label}</div>
                {g.vars.map(v => (
                  <button key={v.token} onClick={() => { onInsert(v.token); setOpen(false); setSearch('') }}
                    style={{ display: 'block', width: '100%', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = C.soft}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <code style={{ fontSize: 12, fontFamily: 'monospace', color: C.primary }}>{v.token}</code>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{v.hint}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 10px', fontSize: 11, color: C.muted }}>
            Catálogo completo en <code>artifacts/EMAIL-VARIABLES.md</code>.
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RichTextEditor — contentEditable + toolbar. Output is HTML stored in DB.
// Uses execCommand (deprecated but supported everywhere). For sanitization:
// only admin/leader/coordinator/svc-editor can compose, so we trust the markup.
// ─────────────────────────────────────────────────────────────────────────────
const RICH_SEP: React.CSSProperties = { width: 1, alignSelf: 'stretch', background: C.border, margin: '4px 4px' }

// Global stylesheet for the rich editor — injected once. Covers:
//   • Lists (default UA marker is fine but `outline: none` on the editor + some
//     resets hide them in some setups; force list-style explicitly).
//   • Links (blue + underline so they look like links inside the editor + view).
//   • Toolbar button hover/active states.
//   • Placeholder via :empty + data-placeholder.
function useRichEditorStyles() {
  useEffect(() => {
    const id = 'worsyn-rich-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
.worsyn-rich { position: relative; }
.worsyn-rich ul { list-style: disc outside; padding-left: 1.4em; margin: 6px 0; }
.worsyn-rich ol { list-style: decimal outside; padding-left: 1.4em; margin: 6px 0; }
.worsyn-rich li { margin: 2px 0; }
.worsyn-rich a { color: #4F46E5; text-decoration: underline; cursor: pointer; }
.worsyn-rich h2 { font-size: 18px; font-weight: 700; margin: 10px 0 6px; }
.worsyn-rich h3 { font-size: 15px; font-weight: 700; margin: 8px 0 4px; color: #334155; }
.worsyn-rich p  { margin: 4px 0; }
.worsyn-rich img { max-width: 100%; height: auto; border-radius: 4px; display: inline-block; vertical-align: middle; }
.worsyn-rich hr { border: none; border-top: 1px solid #CBD5E1; margin: 14px 0; }
.worsyn-rich:empty::before {
  content: attr(data-placeholder); color: #94A3B8; pointer-events: none;
}
.worsyn-rich-btn { background: none; border: none; cursor: pointer; color: #64748B;
  padding: 4px 8px; font-size: 13px; border-radius: 5px; min-width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 100ms, color 100ms; }
.worsyn-rich-btn:hover { background: #E2E8F0; color: #0F172A; }
.worsyn-rich-btn[aria-pressed="true"] { background: #EEF2FF; color: #4F46E5; }
/* HTML rendered in view modals/previews */
.worsyn-rich-render ul { list-style: disc outside; padding-left: 1.4em; margin: 6px 0; }
.worsyn-rich-render ol { list-style: decimal outside; padding-left: 1.4em; margin: 6px 0; }
.worsyn-rich-render a  { color: #4F46E5; text-decoration: underline; }
.worsyn-rich-render h2 { font-size: 17px; font-weight: 700; margin: 8px 0 4px; }
.worsyn-rich-render h3 { font-size: 14px; font-weight: 700; margin: 6px 0 3px; color: #334155; }
.worsyn-rich-render img { max-width: 100%; height: auto; border-radius: 4px; display: inline-block; vertical-align: middle; }
.worsyn-rich-render hr  { border: none; border-top: 1px solid #CBD5E1; margin: 14px 0; }
`
    document.head.appendChild(el)
  }, [])
}

// Closes the wrapping modal when the user hits Escape. Use in every modal that
// has an onClose. Skips if the active element is contenteditable or input —
// Escape should clear typing context first (browsers handle that), then close.
function useEscape(handler: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); handler() } }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [handler])
}

export interface RichTextEditorHandle { insert: (html: string) => void; focus: () => void }

const RichTextEditor = React.forwardRef<RichTextEditorHandle, {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  extraToolbar?: React.ReactNode  // e.g. the VariablePicker
  minHeight?: number
}>(function RichTextEditor({ value, onChange, placeholder, extraToolbar, minHeight = 200 }, ref) {
  useRichEditorStyles()
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRangeRef = React.useRef<Range | null>(null)
  // Track which commands are currently active at the caret.
  const [active, setActive] = useState<{ [k: string]: boolean }>({})

  // Mount-only innerHTML so React doesn't fight the caret on every keystroke.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function refreshActive() {
    const sel = window.getSelection()
    if (!sel || !editorRef.current) return
    if (sel.rangeCount > 0 && !editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) return
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
      })
    } catch { /* queryCommandState can throw in some browsers; ignore */ }
  }

  function saveSelection() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const r = sel.getRangeAt(0)
    if (editorRef.current && editorRef.current.contains(r.commonAncestorContainer)) {
      savedRangeRef.current = r.cloneRange()
    }
    refreshActive()
  }
  function restoreSelection() {
    const r = savedRangeRef.current
    const sel = window.getSelection()
    if (!r || !sel) return
    sel.removeAllRanges()
    sel.addRange(r)
  }
  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(cmd, false, arg)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
    saveSelection()
  }
  function onInput(e: React.FormEvent<HTMLDivElement>) {
    onChange((e.target as HTMLDivElement).innerHTML)
    saveSelection()
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const meta = e.metaKey || e.ctrlKey
    if (meta) {
      // Force-handle B/I/U — relying on the browser default leaves them
      // unresponsive in some setups (Chromium + complex React trees skip them).
      const k = e.key.toLowerCase()
      if (k === 'b') { e.preventDefault(); exec('bold');      return }
      if (k === 'i') { e.preventDefault(); exec('italic');    return }
      if (k === 'u') { e.preventDefault(); exec('underline'); return }
      if (k === 'k') { e.preventDefault(); promptLink();      return }
    }
    // Tab → nest (esp. inside lists). Shift+Tab → un-nest. Always indent
    // even outside a list so we don't trap focus inside the editor.
    if (e.key === 'Tab') {
      e.preventDefault()
      exec(e.shiftKey ? 'outdent' : 'indent')
      return
    }
  }
  function promptLink() {
    saveSelection()
    const url = window.prompt('URL del enlace (https://…)')
    if (!url) return
    exec('createLink', url)
    // Default <a> rendering in contentEditable inherits color/decoration from
    // the editor — our .worsyn-rich CSS forces blue + underline so they look
    // like real links both inside the editor and in the rendered output.
  }
  function insertHTML(html: string) {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand('insertHTML', false, html)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
    saveSelection()
  }
  // ── Images ────────────────────────────────────────────────────────────────
  const IMG_MAX = 1 * 1024 * 1024  // 1 MB
  const imgFileRef = React.useRef<HTMLInputElement>(null)
  function handleImageFile(file: File): boolean {
    if (!file.type.startsWith('image/')) {
      alert('Solo se admiten imágenes (JPG, PNG, WebP, GIF…).')
      return false
    }
    if (file.size > IMG_MAX) {
      alert(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(2)} MB y el máximo permitido es 1 MB.\nReduce su tamaño antes de insertarla.`)
      return false
    }
    const r = new FileReader()
    r.onload = () => {
      if (typeof r.result !== 'string') return
      const safeAlt = (file.name || 'imagen').replace(/"/g, '')
      insertHTML(`<img src="${r.result}" alt="${safeAlt}" />`)
    }
    r.onerror = () => alert('No se pudo leer la imagen.')
    r.readAsDataURL(file)
    return true
  }
  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // Look for an image in the clipboard — if found, intercept and insert.
    // Plain text/HTML paste falls through to the browser default.
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) {
          e.preventDefault()
          handleImageFile(f)
          return
        }
      }
    }
  }

  React.useImperativeHandle(ref, () => ({
    insert: insertHTML,
    focus: () => { editorRef.current?.focus(); restoreSelection() },
  }), [])

  function btn(cmd: string, label: React.ReactNode, title: string, extra?: React.CSSProperties) {
    const pressed = !!active[cmd]
    return (
      <button type="button" title={title} aria-pressed={pressed}
        className="worsyn-rich-btn"
        onClick={() => exec(cmd)}
        style={extra}>{label}</button>
    )
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', padding: 4, borderBottom: `1px solid ${C.border}`, gap: 1, background: C.bg, borderRadius: '8px 8px 0 0' }}
        // Prevent toolbar buttons from stealing focus (and losing the selection).
        onMouseDown={e => { saveSelection(); e.preventDefault() }}>
        {btn('bold',      <b>B</b>,                          'Negrita (⌘/Ctrl + B)')}
        {btn('italic',    <i style={{ fontFamily: 'Georgia, serif' }}>I</i>, 'Cursiva (⌘/Ctrl + I)')}
        {btn('underline', <u>U</u>,                          'Subrayado (⌘/Ctrl + U)')}
        <span style={RICH_SEP} />
        <select title="Estilo de bloque"
          className="worsyn-rich-btn"
          onChange={e => { if (e.target.value) { exec('formatBlock', e.target.value); e.target.value = '' } }}
          style={{ padding: '4px 6px', minWidth: 78, cursor: 'pointer' }}>
          <option value="">Estilo</option>
          <option value="h2">Título</option>
          <option value="h3">Subtítulo</option>
          <option value="p">Párrafo</option>
        </select>
        <span style={RICH_SEP} />
        {btn('insertUnorderedList', '• ≡', 'Lista con viñetas')}
        {btn('insertOrderedList',   '1.',  'Lista numerada')}
        <button type="button" title="Aumentar sangría (Tab)" className="worsyn-rich-btn"
          onClick={() => exec('indent')}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor"><path d="M0 2h16v1.4H0zM5 6h11v1.4H5zM5 9h11v1.4H5zM0 12.6h16V14H0zM0 6.7l3 2.3-3 2.3z"/></svg>
        </button>
        <button type="button" title="Reducir sangría (Shift+Tab)" className="worsyn-rich-btn"
          onClick={() => exec('outdent')}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor"><path d="M0 2h16v1.4H0zM0 6h11v1.4H0zM0 9h11v1.4H0zM0 12.6h16V14H0zM16 6.7l-3 2.3 3 2.3z"/></svg>
        </button>
        <span style={RICH_SEP} />
        {btn('justifyLeft',   '⇤', 'Alinear izquierda')}
        {btn('justifyCenter', '↔', 'Centrar')}
        {btn('justifyRight',  '⇥', 'Alinear derecha')}
        <button type="button" title="Línea horizontal" className="worsyn-rich-btn"
          onClick={() => exec('insertHorizontalRule')}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor"><path d="M1 7.6h14v1.2H1z"/></svg>
        </button>
        <span style={RICH_SEP} />
        <label title="Color del texto"
          className="worsyn-rich-btn"
          style={{ padding: 0, cursor: 'pointer', position: 'relative' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.primary, padding: '0 6px' }}>A</span>
          <input type="color" onChange={e => exec('foreColor', e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </label>
        <button type="button" title="Insertar enlace (⌘/Ctrl + K)" className="worsyn-rich-btn" onClick={promptLink}>🔗</button>
        <button type="button" title="Insertar imagen (máx. 1 MB · o pega desde el portapapeles)"
          className="worsyn-rich-btn" onClick={() => imgFileRef.current?.click()}>🖼️</button>
        <input ref={imgFileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />
        <button type="button" title="Quitar formato" className="worsyn-rich-btn" onClick={() => exec('removeFormat')}>Tₓ</button>
        {extraToolbar && (<><span style={RICH_SEP} />{extraToolbar}</>)}
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        className="worsyn-rich"
        onInput={onInput} onBlur={saveSelection} onKeyUp={saveSelection} onMouseUp={saveSelection}
        onKeyDown={onKeyDown} onPaste={onPaste}
        data-placeholder={placeholder}
        style={{
          minHeight, padding: '12px 14px', outline: 'none', fontSize: 14, lineHeight: 1.6, color: C.text,
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
})

function ComposeEmailModal({ slug, defaultRecipient, onClose, onSent }: {
  slug: string
  defaultRecipient: ServicePerson
  onClose: () => void
  onSent: (sent: EmailMessage[]) => void
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [tplId, setTplId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const bodyRef = React.useRef<RichTextEditorHandle>(null)
  const subjectRef = React.useRef<HTMLInputElement>(null)
  const [bodyKey, setBodyKey] = useState(0)   // bumps to remount editor when template applied
  useEscape(onClose)

  const reloadTemplates = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/email/templates`)
    setTemplates(r.ok ? await r.json() : [])
  }, [slug])
  useEffect(() => { reloadTemplates() }, [reloadTemplates])

  function applyTemplate(id: string) {
    setTplId(id)
    const t = templates.find(x => x.id === id)
    if (t) { setSubject(t.subject); setBody(t.body); setBodyKey(k => k + 1) }
  }
  function insertIntoBody(tok: string) { bodyRef.current?.insert(tok) }
  function insertIntoSubject(tok: string) {
    const el = subjectRef.current
    if (!el) { setSubject(s => s + tok); return }
    const start = el.selectionStart ?? subject.length, end = el.selectionEnd ?? subject.length
    setSubject(subject.slice(0, start) + tok + subject.slice(end))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + tok.length, start + tok.length) }, 0)
  }

  async function doPreview() {
    setErr('')
    const r = await api(`/api/v1/tenant/${slug}/email/messages/preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_member_id: defaultRecipient.member_id, subject, body }),
    })
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.detail || 'Error'); return }
    setPreview(await r.json())
  }

  async function send() {
    setErr(''); setBusy(true)
    const r = await api(`/api/v1/tenant/${slug}/email/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_member_ids: [defaultRecipient.member_id],
        template_id: tplId || null, subject, body,
      }),
    })
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.detail || 'Error'); setBusy(false); return }
    onSent(await r.json())
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div data-tp="wizard-modal" style={{ ...s.modal, width: 680, padding: 0, gap: 0 }}>
        {/* Header (sticky) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 14px', borderBottom: `1px solid ${C.border}` }}>
          <h3 style={s.modalTitle}>Enviar correo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>

        {/* Scrollable middle */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select style={{ ...s.select, flex: 1 }} value={tplId} onChange={e => applyTemplate(e.target.value)}>
              <option value="">— Sin plantilla (empezar en blanco) —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{KIND_LABEL[t.kind]} · {t.name}</option>
              ))}
            </select>
            <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 12px' }} onClick={() => setTemplatesOpen(true)}>
              Editar plantillas ›
            </button>
          </div>

          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.text }}>
            <strong>Para:</strong> {defaultRecipient.full_name || defaultRecipient.email}
            <span style={{ color: C.muted, marginLeft: 8 }}>&lt;{defaultRecipient.email}&gt;</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Asunto</label>
              <VariablePicker onInsert={insertIntoSubject} anchorRight />
            </div>
            <input ref={subjectRef} style={s.input} value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="p. ej. ¡Bienvenido(a) a {{ organization.name }}!" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Cuerpo</label>
            <RichTextEditor key={bodyKey} ref={bodyRef} value={body} onChange={setBody}
              placeholder="Hola {{ to.first_name }}, …"
              minHeight={220}
              extraToolbar={<VariablePicker onInsert={insertIntoBody} anchorRight />} />
          </div>

          {preview && (
            <div style={{ border: `1.5px solid ${C.primary}`, borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.soft}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vista previa del correo</div>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 12 }}>✕ Cerrar</button>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                <strong style={{ color: C.text }}>Para:</strong> {defaultRecipient.full_name || defaultRecipient.email} &lt;{defaultRecipient.email}&gt;
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                {preview.subject || <em style={{ color: C.muted, fontWeight: 400 }}>(sin asunto)</em>}
              </div>
              {preview.body
                ? <div className="worsyn-rich-render" style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: preview.body }} />
                : <em style={{ color: C.muted, fontSize: 13 }}>(sin cuerpo)</em>}
            </div>
          )}

          {err && <p style={s.errorText}>{err}</p>}
        </div>

        {/* Footer (sticky) */}
        <div style={{ ...s.modalActions, padding: '14px 28px 18px', borderTop: `1px solid ${C.border}`, marginTop: 0 }}>
          <button style={s.btnGhost} onClick={onClose}>Cancelar</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btnGhost} onClick={doPreview}>Vista previa</button>
            <button style={s.btnPrimary} onClick={send} disabled={busy}>{busy ? '…' : 'Enviar 1'}</button>
          </div>
        </div>

        {templatesOpen && (
          <TemplatesManagerModal slug={slug}
            onClose={() => { setTemplatesOpen(false); reloadTemplates() }} />
        )}
      </div>
    </div>
  )
}

function TemplatesManagerModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [kind, setKind] = useState<EmailKind>('general')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editing, setEditing] = useState<EmailTemplate | null | undefined>(undefined) // undefined closed, null create
  const [busy, setBusy] = useState(false)
  useEscape(onClose)

  const reload = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/email/templates`)
    setTemplates(r.ok ? await r.json() : [])
  }, [slug])
  useEffect(() => { reload() }, [reload])

  const visible = templates.filter(t => t.kind === kind)

  async function deleteTemplate(t: EmailTemplate) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return
    const r = await api(`/api/v1/tenant/${slug}/email/templates/${t.id}`, { method: 'DELETE' })
    if (r.ok) setTemplates(prev => prev.filter(x => x.id !== t.id))
  }

  if (editing !== undefined) {
    return <TemplateEditorModal slug={slug} kind={kind} initial={editing}
      onSaved={t => { setTemplates(prev => editing ? prev.map(x => x.id === t.id ? t : x) : [...prev, t]); setEditing(undefined) }}
      onClose={() => setEditing(undefined)} />
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div data-tp="wizard-modal" style={{ ...s.modal, width: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '0 0 4px' }}>‹ ENVIAR CORREO</button>
            <h3 style={s.modalTitle}>Plantillas de email</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 0, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {(['general','schedule','signup','welcome'] as EmailKind[]).map((k, i) => {
            const active = k === kind
            return (
              <button key={k} onClick={() => setKind(k)}
                style={{
                  flex: 1, padding: '12px 8px', cursor: 'pointer', border: 'none',
                  background: active ? C.surface : C.bg,
                  borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
                  fontSize: 12, fontWeight: 600, color: active ? C.text : C.muted,
                }}>{KIND_LABEL[k]}</button>
            )
          })}
        </div>

        <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>{KIND_HINT[kind]}</p>

        {visible.length === 0
          ? (
            <div style={{ padding: 36, textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 10 }}>
              <p style={{ color: C.success, fontWeight: 600, margin: 0 }}>Aún no has creado plantillas {KIND_LABEL[kind]}</p>
              <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>Crea la primera abajo.</p>
            </div>
          )
          : (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {visible.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.soft}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                  </div>
                  <button style={{ ...s.btnGhost, fontSize: 12, padding: '4px 10px' }} onClick={() => setEditing(t)}>Editar</button>
                  <button style={{ ...s.btnGhost, fontSize: 12, padding: '4px 10px', color: C.danger, borderColor: 'rgba(239,68,68,.3)' }} onClick={() => deleteTemplate(t)}>Eliminar</button>
                </div>
              ))}
            </div>
          )
        }

        <div style={s.modalActions}>
          <button style={s.btnGhost} onClick={onClose}>Cerrar</button>
          <button style={s.btnPrimary} onClick={() => setEditing(null)} disabled={busy}>+ Nueva plantilla {KIND_LABEL[kind]}</button>
        </div>
      </div>
    </div>
  )
}

function TemplateEditorModal({ slug, kind, initial, onSaved, onClose }: {
  slug: string; kind: EmailKind; initial?: EmailTemplate | null
  onSaved: (t: EmailTemplate) => void; onClose: () => void
}) {
  const [name, setName]   = useState(initial?.name || '')
  const [subject, setSubject] = useState(initial?.subject || '')
  const [body, setBody]   = useState(initial?.body || '')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')
  useEscape(onClose)
  const bodyRef = React.useRef<RichTextEditorHandle>(null)
  const subjectRef = React.useRef<HTMLInputElement>(null)

  function insertBody(tok: string) { bodyRef.current?.insert(tok) }
  function insertSubject(tok: string) {
    const el = subjectRef.current
    if (!el) { setSubject(s => s + tok); return }
    const start = el.selectionStart ?? subject.length, end = el.selectionEnd ?? subject.length
    setSubject(subject.slice(0, start) + tok + subject.slice(end))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + tok.length, start + tok.length) }, 0)
  }

  async function save() {
    if (!name.trim()) { setErr('Nombre requerido'); return }
    setBusy(true); setErr('')
    const url = initial
      ? `/api/v1/tenant/${slug}/email/templates/${initial.id}`
      : `/api/v1/tenant/${slug}/email/templates`
    const r = await api(url, {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name: name.trim(), subject, body }),
    })
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.detail || 'Error'); setBusy(false); return }
    onSaved(await r.json())
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div data-tp="wizard-modal" style={{ ...s.modal, width: 680, padding: 0, gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 14px', borderBottom: `1px solid ${C.border}` }}>
          <h3 style={s.modalTitle}>{initial ? 'Editar plantilla' : `Nueva plantilla ${KIND_LABEL[kind]}`}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={s.label}>Nombre interno<input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Bienvenida Equipo de Adoración" /></label>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Asunto</label>
              <VariablePicker onInsert={insertSubject} anchorRight />
            </div>
            <input ref={subjectRef} style={s.input} value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }}>Cuerpo</label>
            <RichTextEditor ref={bodyRef} value={body} onChange={setBody} minHeight={260}
              extraToolbar={<VariablePicker onInsert={insertBody} anchorRight />} />
          </div>
          {err && <p style={s.errorText}>{err}</p>}
        </div>
        <div style={{ ...s.modalActions, padding: '14px 28px 18px', borderTop: `1px solid ${C.border}`, marginTop: 0 }}>
          <button style={s.btnGhost} onClick={onClose}>Cancelar</button>
          <button style={s.btnPrimary} onClick={save} disabled={busy}>{busy ? '…' : initial ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonDetailView — full person profile (Scheduling | Communication | Details)
// ─────────────────────────────────────────────────────────────────────────────
function PersonDetailView({ slug, person, allTeams, onBack, onChanged }: {
  slug: string
  person: ServicePerson
  allTeams: Team[]
  onBack: () => void
  onChanged: (p: ServicePerson) => void
}) {
  const [tab, setTab] = useState<'scheduling' | 'communication' | 'details'>('scheduling')
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [loadingB, setLoadingB] = useState(true)
  const [blockoutOpen, setBlockoutOpen] = useState(false)
  // Preferences (editable plans-per-month / plans-per-day)
  const [prefsEditing, setPrefsEditing] = useState(false)
  const [prefsMonth, setPrefsMonth] = useState<number | null>(person.scheduling?.max_per_month ?? null)
  const [prefsDay, setPrefsDay] = useState<number | null>(person.scheduling?.max_per_day ?? null)
  const [prefsSaving, setPrefsSaving] = useState(false)
  // Person → Teams membership
  const [personTeams, setPersonTeams] = useState<PersonTeam[]>([])
  const [loadingPT, setLoadingPT] = useState(true)
  const [teamPickerOpen, setTeamPickerOpen] = useState(false)
  const [pickedTeamId, setPickedTeamId] = useState<string>('')
  const [pickedTeamRole, setPickedTeamRole] = useState('')
  // Signature
  const [sigEditing, setSigEditing] = useState(false)
  const [sigText, setSigText]   = useState(person.signature?.text  || '')
  const [sigImage, setSigImage] = useState<string | null>(person.signature?.image || null)
  const [sigSaving, setSigSaving] = useState(false)
  const [sigErr, setSigErr] = useState('')
  const sigFileRef = React.useRef<HTMLInputElement>(null)
  const sigTextRef = React.useRef<HTMLTextAreaElement>(null)
  function insertIntoSig(tok: string) {
    const el = sigTextRef.current
    if (!el) { setSigText(t => t + tok); return }
    const start = el.selectionStart ?? sigText.length, end = el.selectionEnd ?? sigText.length
    const newVal = sigText.slice(0, start) + tok + sigText.slice(end)
    setSigText(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + tok.length, start + tok.length) }, 0)
  }
  // Communication: messages list + compose
  const [msgs, setMsgs] = useState<EmailMessage[]>([])
  const [msgsLoading, setMsgsLoading] = useState(true)
  const [msgsTab, setMsgsTab] = useState<'received' | 'sent'>('received')
  const [composeOpen, setComposeOpen] = useState(false)
  const [openMsg, setOpenMsg] = useState<EmailMessage | null>(null)
  const reloadMsgs = useCallback(async () => {
    setMsgsLoading(true)
    try {
      const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/messages`)
      setMsgs(r.ok ? await r.json() : [])
    } finally { setMsgsLoading(false) }
  }, [slug, person.id])
  useEffect(() => { reloadMsgs() }, [reloadMsgs])
  const [editingBlockout, setEditingBlockout] = useState<Blockout | null>(null)

  const reload = useCallback(async () => {
    setLoadingB(true)
    try {
      const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/blockouts`)
      setBlockouts(r.ok ? await r.json() : [])
    } finally { setLoadingB(false) }
  }, [slug, person.id])
  useEffect(() => { reload() }, [reload])

  async function removeBlockout(b: Blockout) {
    if (!confirm('¿Eliminar este bloqueo?')) return
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/blockouts/${b.id}`, { method: 'DELETE' })
    if (r.ok) setBlockouts(prev => prev.filter(x => x.id !== b.id))
  }

  // ── Person Teams ──────────────────────────────────────────────────────────
  const reloadPersonTeams = useCallback(async () => {
    setLoadingPT(true)
    try {
      const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/teams`)
      setPersonTeams(r.ok ? await r.json() : [])
    } finally { setLoadingPT(false) }
  }, [slug, person.id])
  useEffect(() => { reloadPersonTeams() }, [reloadPersonTeams])

  const availableTeams = useMemo(() => {
    const taken = new Set(personTeams.map(pt => pt.team_id))
    return allTeams.filter(t => !taken.has(t.id))
  }, [allTeams, personTeams])

  async function addToTeam() {
    if (!pickedTeamId) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${pickedTeamId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: person.member_id, role: pickedTeamRole.trim() || null }),
    })
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.detail || 'Error'); return }
    setTeamPickerOpen(false); setPickedTeamId(''); setPickedTeamRole('')
    reloadPersonTeams()
  }
  async function removeFromTeam(pt: PersonTeam) {
    if (!confirm(`¿Quitar a ${person.full_name || person.email} de ${pt.team_name}?`)) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${pt.team_id}/members/${person.member_id}`, { method: 'DELETE' })
    if (r.ok) setPersonTeams(prev => prev.filter(x => x.membership_id !== pt.membership_id))
  }

  // ── Preferences ───────────────────────────────────────────────────────────
  async function savePrefs() {
    setPrefsSaving(true)
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduling: { max_per_month: prefsMonth, max_per_day: prefsDay } }),
    })
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.detail || 'Error'); setPrefsSaving(false); return }
    const updated = await r.json() as ServicePerson
    onChanged(updated)
    setPrefsEditing(false); setPrefsSaving(false)
  }
  function fmtCap(v: number | null): string {
    return v === null || v === undefined ? 'Sin límite' : `Hasta ${v}`
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  const SIG_MAX = 1 * 1024 * 1024
  function handleSigFile(file: File) {
    setSigErr('')
    if (!file.type.startsWith('image/')) { setSigErr('Solo imágenes (JPG, PNG, WebP, etc.)'); return }
    if (file.size > SIG_MAX)             { setSigErr(`Imagen demasiado grande (máx. 1 MB · actual ${(file.size/1024).toFixed(0)} KB)`); return }
    const r = new FileReader()
    r.onload = () => setSigImage(typeof r.result === 'string' ? r.result : null)
    r.onerror = () => setSigErr('No se pudo leer la imagen')
    r.readAsDataURL(file)
  }
  async function saveSignature() {
    setSigSaving(true); setSigErr('')
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature: { text: sigText.trim() || null, image: sigImage } }),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setSigErr(j.detail || 'Error'); setSigSaving(false); return
    }
    const updated = await r.json() as ServicePerson
    onChanged(updated)
    setSigEditing(false); setSigSaving(false)
  }
  function cancelSig() {
    setSigText(person.signature?.text || '')
    setSigImage(person.signature?.image || null)
    setSigErr(''); setSigEditing(false)
  }


  return (
    <main style={{ ...s.main, gap: 0 }}>
      {/* Back link */}
      <button onClick={onBack}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 0 10px' }}>
        ‹ PERSONAS
      </button>

      {/* Header */}
      <div data-tp="detail-header" style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: person.avatar ? `url(${person.avatar}) center/cover` : C.soft, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
          {!person.avatar && (person.full_name?.[0]?.toUpperCase() || person.email[0]?.toUpperCase())}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{person.full_name || person.email}</h2>
          <div style={{ display: 'flex', gap: 18, marginTop: 6, color: C.muted, fontSize: 13 }}>
            <span>{person.email}</span>
          </div>
        </div>
        <div data-tp="detail-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text }}>
            {SERVICE_ROLE_LABEL[person.service_role]}
            <svg viewBox="0 0 16 16" fill={C.muted} width={12} height={12}><path d="M5 7h6l-3 4z"/></svg>
          </div>
          <button style={s.btnGhost}>Acciones ▾</button>
        </div>
      </div>

      {/* Tabs */}
      <div data-tp="tab-strip" style={{ display: 'flex', gap: 4, padding: '12px 0 0', borderBottom: `1px solid ${C.border}` }}>
        {(['scheduling', 'communication', 'details'] as const).map(id => {
          const label = id === 'scheduling' ? 'Programación' : id === 'communication' ? 'Comunicación' : 'Detalles'
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{
                background: active ? C.surface : 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                color: active ? C.text : C.muted,
                borderTopLeftRadius: 8, borderTopRightRadius: 8,
                borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
              }}>{label}</button>
          )
        })}
      </div>

      {/* Tab content */}
      <div data-tp="detail-grid" style={{ padding: '20px 0', display: 'grid', gridTemplateColumns: tab === 'details' ? '1fr 1fr 1fr' : '1.2fr 1fr', gap: 22, flex: 1 }}>
        {tab === 'scheduling' && <>
          {/* Left: Schedule (blockouts) */}
          <div>
            <SectionTitle hint="Bloqueos y disponibilidad de la persona" right={
              <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={() => { setEditingBlockout(null); setBlockoutOpen(true) }}>
                + Añadir bloqueo
              </button>
            }>Calendario</SectionTitle>
            <Card padded={false}>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Próximos bloqueos</span>
              </div>
              {loadingB
                ? <div style={{ padding: 28, textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>
                : blockouts.length === 0
                  ? <div style={{ padding: '32px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                      No hay bloqueos. Pulsa <strong>+ Añadir bloqueo</strong> para registrar un periodo de indisponibilidad.
                    </div>
                  : (
                    <table style={s.planTable}>
                      <thead>
                        <tr>
                          <th style={s.planTh}>Fechas</th>
                          <th style={s.planTh}>Repetición</th>
                          <th style={s.planTh}>Motivo</th>
                          <th style={s.planTh}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockouts.map(b => (
                          <tr key={b.id}>
                            <td style={s.planTd}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: C.danger, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 500 }}>
                                  {b.start_date === b.end_date ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} — ${fmtDate(b.end_date)}`}
                                </span>
                              </div>
                            </td>
                            <td style={{ ...s.planTd, fontSize: 12, color: C.muted }}>
                              {b.repeat_kind === 'none' ? 'Una vez' : `${CADA_LABEL[b.repeat_interval] || 'Cada'} ${REPEAT_KIND_LABEL[b.repeat_kind]} ${b.repeat_until ? `hasta ${fmtDate(b.repeat_until)}` : 'siempre'}`}
                            </td>
                            <td style={{ ...s.planTd, fontSize: 12, color: C.text }}>{b.reason || '—'}</td>
                            <td style={{ ...s.planTd, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, marginRight: 6 }}
                                onClick={() => { setEditingBlockout(b); setBlockoutOpen(true) }}>Editar</button>
                              <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 12, color: C.danger, borderColor: 'rgba(239,68,68,.3)' }}
                                onClick={() => removeBlockout(b)}>Eliminar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
              }
            </Card>
          </div>

          {/* Right: Preferences + Teams */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <SectionTitle hint="Cuántas veces puede ser agendada esta persona en planes."
                right={
                  prefsEditing
                    ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={() => { setPrefsEditing(false); setPrefsMonth(person.scheduling?.max_per_month ?? null); setPrefsDay(person.scheduling?.max_per_day ?? null) }}>Cancelar</button>
                        <button style={{ ...s.btnPrimary, fontSize: 12, padding: '6px 12px' }} onClick={savePrefs} disabled={prefsSaving}>{prefsSaving ? '…' : 'Guardar'}</button>
                      </div>
                    )
                    : <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={() => setPrefsEditing(true)}>Editar</button>
                }>
                Preferencias
              </SectionTitle>
              <Card>
                {prefsEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 20 20" fill={C.success} width={18} height={18}><path fillRule="evenodd" d="M6 2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1z" clipRule="evenodd"/></svg>
                      </div>
                      <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                        Límites para el generador automático de cuadrantes (Fase 3). Útil cuando la iglesia tiene varios servicios el mismo día.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <select style={{ ...s.select, padding: '6px 10px', fontSize: 13 }}
                        value={prefsMonth ?? ''}
                        onChange={e => setPrefsMonth(e.target.value === '' ? null : parseInt(e.target.value))}>
                        <option value="">Sin límite</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Hasta {n}</option>)}
                      </select>
                      <span style={{ fontSize: 13, color: C.text }}>planes al mes</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <select style={{ ...s.select, padding: '6px 10px', fontSize: 13 }}
                        value={prefsDay ?? ''}
                        onChange={e => setPrefsDay(e.target.value === '' ? null : parseInt(e.target.value))}>
                        <option value="">Sin límite</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Hasta {n}</option>)}
                      </select>
                      <span style={{ fontSize: 13, color: C.text }}>planes al día</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 20 20" fill={C.success} width={18} height={18}><path fillRule="evenodd" d="M6 2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1z" clipRule="evenodd"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {person.scheduling?.max_per_month == null && person.scheduling?.max_per_day == null
                        ? <span style={{ fontSize: 13, color: C.text }}>Prográmame todas las veces que quieras</span>
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13, color: C.text }}>
                            <span><strong>{fmtCap(person.scheduling?.max_per_month ?? null)}</strong> planes al mes</span>
                            <span><strong>{fmtCap(person.scheduling?.max_per_day ?? null)}</strong> planes al día</span>
                          </div>
                        )
                      }
                    </div>
                  </div>
                )}
              </Card>
            </div>
            <div>
              <SectionTitle hint="Equipos asignados a esta persona"
                right={availableTeams.length > 0
                  ? <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={() => { setTeamPickerOpen(true); setPickedTeamId(availableTeams[0]?.id || ''); setPickedTeamRole('') }}>+ Añadir</button>
                  : <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} disabled title="Esta persona ya pertenece a todos los equipos">+ Añadir</button>}>
                Equipos
              </SectionTitle>
              <Card padded={false}>
                {loadingPT
                  ? <div style={{ padding: 22, textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>
                  : personTeams.length === 0
                    ? <div style={{ padding: '20px 16px', fontSize: 13, color: C.muted }}>
                        Esta persona aún no está en ningún equipo.{availableTeams.length > 0 ? ' Pulsa + Añadir para asignarla.' : ''}
                      </div>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {personTeams.map(pt => (
                          <div key={pt.membership_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.soft}` }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: pt.team_color || C.primary, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{pt.team_name}</div>
                              {pt.role && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{pt.role}</div>}
                            </div>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1, padding: 4 }}
                              title="Quitar del equipo" onClick={() => removeFromTeam(pt)}>×</button>
                          </div>
                        ))}
                      </div>
                    )
                }
              </Card>
              {teamPickerOpen && (
                <div style={s.overlay} onClick={e => e.target === e.currentTarget && setTeamPickerOpen(false)}>
                  <div data-tp="modal" style={{ ...s.modal, width: 420 }}>
                    <h3 style={s.modalTitle}>Añadir a un equipo</h3>
                    <label style={s.label}>
                      Equipo
                      <select style={s.select} value={pickedTeamId} onChange={e => setPickedTeamId(e.target.value)} autoFocus>
                        {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </label>
                    <label style={s.label}>
                      Rol en el equipo <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span>
                      <input style={s.input} value={pickedTeamRole} onChange={e => setPickedTeamRole(e.target.value)} placeholder="p. ej. Pianista, Líder, Vocalista…" />
                    </label>
                    <div style={s.modalActions}>
                      <button style={s.btnGhost} onClick={() => setTeamPickerOpen(false)}>Cancelar</button>
                      <button style={s.btnPrimary} onClick={addToTeam}>Añadir</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>}

        {tab === 'communication' && <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <SectionTitle right={
                <button style={{ ...s.btnPrimary, fontSize: 12, padding: '6px 12px' }} onClick={() => setComposeOpen(true)}>+ Nuevo</button>
              }>Mensajes</SectionTitle>
              <Card padded={false}>
                <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
                  {(['received', 'sent'] as const).map(t => {
                    const active = msgsTab === t
                    const label = t === 'received' ? 'Recibidos' : 'Enviados'
                    return (
                      <button key={t} onClick={() => setMsgsTab(t)}
                        style={{ padding: '10px 18px', fontSize: 13, background: active ? C.soft : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, color: active ? C.text : C.muted }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
                {(() => {
                  const filtered = msgs.filter(m => m.direction === msgsTab)
                  if (msgsLoading) return <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>
                  if (filtered.length === 0) return (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
                      {msgsTab === 'sent' ? 'Aún no se han enviado correos.' : 'Aún no hay correos recibidos.'}<br/>
                      <span style={{ fontSize: 11 }}>El historial de email se conserva durante tres meses (configurable hasta 12).</span>
                    </div>
                  )
                  return (
                    <div>
                      {filtered.map(m => (
                        <button key={m.id} onClick={() => setOpenMsg(m)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${C.soft}`, cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = C.soft}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.subject || <em style={{ color: C.muted, fontWeight: 400 }}>(sin asunto)</em>}
                            </span>
                            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{fmtDate(m.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>{msgsTab === 'sent' ? 'Para' : 'De'}: {m.counterparty_name || (msgsTab === 'sent' ? m.recipient_email : m.sender_email || '—')}</span>
                            {m.status === 'queued'    && <span style={{ ...s.pill, background: C.soft,         color: C.muted,   fontSize: 10, padding: '1px 6px' }}>En cola</span>}
                            {m.status === 'sent'      && <span style={{ ...s.pill, background: C.successLight, color: C.success, fontSize: 10, padding: '1px 6px' }}>Enviado</span>}
                            {m.status === 'failed'    && <span style={{ ...s.pill, background: C.dangerLight,  color: C.danger,  fontSize: 10, padding: '1px 6px' }}>Fallido</span>}
                            {m.status === 'delivered' && <span style={{ ...s.pill, background: C.successLight, color: C.success, fontSize: 10, padding: '1px 6px' }}>Entregado</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </Card>
            </div>
            <div>
              <SectionTitle hint="Reset de contraseña por email">Contraseña</SectionTitle>
              <Card>
                <button style={s.btnGhost} disabled>Enviar email de restablecimiento</button>
                <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 0', fontStyle: 'italic' }}>* Pendiente de conectar SMTP.</p>
              </Card>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <SectionTitle hint="Notificaciones push (Fase 3 — app móvil)">Notificaciones</SectionTitle>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.success, fontWeight: 700, fontSize: 13 }}>≡</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>App preferida</span>
                </div>
                <select style={{ ...s.select, width: '100%' }}
                  value={person.preferred_notif_app || 'servicios'}
                  onChange={async e => {
                    const v = e.target.value as 'servicios' | 'worsyn'
                    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ preferred_notif_app: v }),
                    })
                    if (r.ok) onChanged(await r.json())
                  }}>
                  <option value="servicios">Servicios (este módulo)</option>
                  <option value="worsyn" disabled>Worsyn (próximamente)</option>
                </select>
                <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 0', lineHeight: 1.55 }}>
                  Cuando la app móvil esté disponible, las notificaciones push llegarán al app elegido. Por defecto es <strong>Servicios</strong>.
                </p>
              </Card>
            </div>
            <div>
              <SectionTitle hint="Firma usada al enviar comunicaciones por email"
                right={
                  sigEditing
                    ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={cancelSig}>Cancelar</button>
                        <button style={{ ...s.btnPrimary, fontSize: 12, padding: '6px 12px' }} onClick={saveSignature} disabled={sigSaving}>{sigSaving ? '…' : 'Guardar'}</button>
                      </div>
                    )
                    : <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={() => setSigEditing(true)}>Editar</button>
                }>
                Firma
              </SectionTitle>
              <Card>
                {sigEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.muted }}>Acepta variables del destinatario y de la organización.</span>
                      <VariablePicker onInsert={insertIntoSig} anchorRight allowedGroups={['Destinatario', 'Organización']} />
                    </div>
                    <textarea ref={sigTextRef} value={sigText} onChange={e => setSigText(e.target.value)}
                      placeholder={`${person.full_name || 'Nombre'}\nRol o cargo\n{{ organization.name }}`}
                      style={{ ...s.input, minHeight: 110, resize: 'vertical' as const, fontFamily: 'inherit' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Imagen / Logo</div>
                      {sigImage ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <img src={sigImage} alt="firma"
                            style={{ maxWidth: 220, maxHeight: 90, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', objectFit: 'contain', padding: 4 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} onClick={() => sigFileRef.current?.click()}>Reemplazar</button>
                            <button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px', color: C.danger, borderColor: 'rgba(239,68,68,.3)' }} onClick={() => setSigImage(null)}>Quitar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => sigFileRef.current?.click()}
                          style={{ width: '100%', padding: '18px 16px', border: `1.5px dashed ${C.border}`, borderRadius: 10, background: C.bg, cursor: 'pointer', color: C.muted, fontSize: 13 }}>
                          + Subir imagen (máx. 1 MB · JPG, PNG, WebP)
                        </button>
                      )}
                      <input ref={sigFileRef} type="file" accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleSigFile(f); e.target.value = '' }} />
                    </div>
                    {sigErr && <p style={s.errorText}>{sigErr}</p>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {person.signature?.text
                      ? <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{person.signature.text}</pre>
                      : <p style={{ margin: 0, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Sin firma de texto.</p>}
                    {person.signature?.image && (
                      <img src={person.signature.image} alt="firma"
                        style={{ maxWidth: 220, maxHeight: 90, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', objectFit: 'contain', padding: 4 }} />
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: C.light, fontStyle: 'italic' }}>
                      Se adjuntará automáticamente al final de los correos enviados desde el portal (cuando SMTP esté activo).
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>}

        {tab === 'details' && <>
          <div>
            <SectionTitle hint="Etiquetas para clasificar a la persona" right={<button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} disabled>+ Añadir</button>}>Etiquetas</SectionTitle>
            <Card>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Sin etiquetas todavía.</p>
            </Card>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <SectionTitle hint="Notas internas (no visibles para la persona)">Notas</SectionTitle>
              <Card>
                <textarea disabled style={{ ...s.input, minHeight: 90, resize: 'vertical' as const, fontFamily: 'inherit', background: C.bg, color: C.muted }} placeholder="Aún no hay notas." />
              </Card>
            </div>
            <div>
              <SectionTitle right={<button style={{ ...s.btnGhost, fontSize: 12, padding: '6px 10px' }} disabled>+ Añadir</button>}>Archivos</SectionTitle>
              <Card padded={false}>
                <div style={{ padding: '40px 16px', textAlign: 'center', color: C.muted, fontSize: 13, border: `1px dashed ${C.border}`, margin: 12, borderRadius: 8 }}>
                  Arrastra y suelta o <span style={{ color: C.primary }}>haz clic aquí</span> para añadir tu primer archivo.
                </div>
              </Card>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <SectionTitle hint="Carpeta actual de la persona">Carpeta actual</SectionTitle>
              <Card>
                <input style={s.input} placeholder="Buscar carpeta…" disabled />
              </Card>
            </div>
            <div>
              <SectionTitle>Actividad</SectionTitle>
              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Último acceso</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Creado</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>{fmtDate(person.welcomed_at)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>}
      </div>

      {blockoutOpen && (
        <BlockoutModal slug={slug} smId={person.id}
          initial={editingBlockout || undefined}
          onSaved={b => {
            if (editingBlockout) {
              setBlockouts(prev => prev.map(x => x.id === b.id ? b : x))
            } else {
              setBlockouts(prev => [b, ...prev])
            }
            setBlockoutOpen(false); setEditingBlockout(null)
          }}
          onClose={() => { setBlockoutOpen(false); setEditingBlockout(null) }} />
      )}
      {composeOpen && (
        <ComposeEmailModal slug={slug} defaultRecipient={person}
          onSent={sent => {
            setMsgs(prev => [...sent, ...prev]); setComposeOpen(false); setMsgsTab('sent')
            // SMTP dispatch is async (BackgroundTask). Poll twice to catch queued→sent/failed.
            setTimeout(() => reloadMsgs(), 2500)
            setTimeout(() => reloadMsgs(), 8000)
          }}
          onClose={() => setComposeOpen(false)} />
      )}
      {openMsg && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setOpenMsg(null)}>
          <div data-tp="modal" style={{ ...s.modal, width: 580 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={s.modalTitle}>{openMsg.subject || '(sin asunto)'}</h3>
              <button onClick={() => setOpenMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><strong style={{ color: C.text }}>{openMsg.direction === 'sent' ? 'Para' : 'De'}:</strong> {openMsg.counterparty_name || ''} &lt;{openMsg.direction === 'sent' ? openMsg.recipient_email : (openMsg.sender_email || '')}&gt;</div>
              <div><strong style={{ color: C.text }}>Fecha:</strong> {fmtDate(openMsg.created_at)} · <strong style={{ color: C.text }}>Estado:</strong> {openMsg.status}{openMsg.sent_at ? ` · Enviado: ${fmtDate(openMsg.sent_at)}` : ''}</div>
            </div>
            {openMsg.error && (
              <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}`, color: '#7F1D1D', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>El envío SMTP falló</div>
                <code style={{ fontFamily: 'monospace', fontSize: 11, color: C.danger }}>{openMsg.error}</code>
                <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                  Revisa la configuración en <strong>Panel admin → Configuración → Correo SMTP</strong> o pide al admin que mire los logs del servidor.
                </div>
              </div>
            )}
            <div className="worsyn-rich-render" style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, color: C.text, lineHeight: 1.6, background: '#fff', border: `1px solid ${C.border}`, padding: '14px 16px', borderRadius: 8, maxHeight: '50vh', overflow: 'auto' }}
              dangerouslySetInnerHTML={{ __html: openMsg.body }} />
            <div style={s.modalActions}>
              <button style={s.btnPrimary} onClick={() => setOpenMsg(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonasView — full People / Teams management
// ─────────────────────────────────────────────────────────────────────────────
function PersonasView({ slug, teams, setTeams, types, resetSignal }: {
  slug: string
  teams: Team[]
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>
  types: ServiceType[]
  resetSignal?: number
}) {
  const [tab, setTab] = useState<'personas' | 'equipos'>('personas')
  const [editingTeam, setEditingTeam] = useState<Team | null | undefined>(undefined)
  const [people, setPeople] = useState<ServicePerson[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberLite[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

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

  // Top sub-tab click resets internal detail/selection state so clicking
  // "Personas" while viewing a person returns to the list (same for future
  // team-detail when implemented). Skips initial mount (resetSignal undefined).
  useEffect(() => {
    if (resetSignal === undefined) return
    setSelectedPersonId(null)
  }, [resetSignal])

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

  // Detail view takes over when a person is selected
  const selected = selectedPersonId ? people.find(p => p.id === selectedPersonId) : null
  if (selected) {
    return (
      <PersonDetailView slug={slug} person={selected} allTeams={teams}
        onBack={() => setSelectedPersonId(null)}
        onChanged={updated => setPeople(prev => prev.map(x => x.id === updated.id ? updated : x))} />
    )
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
            <div data-tp="table-wrap" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
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
                    <tr key={p.id} style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPersonId(p.id)}>
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
                      <td style={s.planTd} onClick={e => e.stopPropagation()}>
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
                      <td style={{ ...s.planTd, background: '#FFFBEB', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
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
                      <td style={{ ...s.planTd, textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
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
            <div data-tp="table-wrap" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
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
export default function Servicios({ tab, resetSignal }: { tab: ServiciosTab; resetSignal?: number }) {
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
    return <PersonasView slug={slug!} teams={teams} setTeams={setTeams} types={types} resetSignal={resetSignal} />
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
