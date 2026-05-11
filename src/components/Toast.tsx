import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastKind = 'success' | 'danger' | 'warning' | 'info'

export interface ToastMessage {
  id: number
  kind: ToastKind
  title: string
  body?: string
}

const DURATION = 10000 // ms

const icons: Record<ToastKind, JSX.Element> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  danger: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [progress, setProgress] = useState(100)
  const startRef = useRef<number>(Date.now())
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Reset start time when this specific toast mounts
    startRef.current = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(pct)
      if (pct > 0) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        onDismiss(toast.id)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]) // only on mount — onDismiss intentionally omitted to avoid rAF restarts

  return (
    <div className={`toast-item alert ${toast.kind}`} role="alert">
      <div className="ico">{icons[toast.kind]}</div>
      <div className="body">
        <div className="title">{toast.title}</div>
        {toast.body && <div className="toast-body-text">{toast.body}</div>}
        <div className="toast-progress">
          <div className="toast-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <button className="close" onClick={() => onDismiss(toast.id)} aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

// Module-level component — stable identity, never unmounts due to parent re-renders
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

let _nextId = 1

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, kind, title, body }])
  }, [])

  return { show, toasts, dismiss }
}
