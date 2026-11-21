import { createContext, useCallback, useContext, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

interface ToastOptions {
  message: string
  kind?: 'success' | 'error'
  /** acción opcional del aviso («Deshacer», «Añadir a la lista») */
  actionLabel?: string
  onAction?: () => void
  /** ms visible; por defecto 5 s (7 s los errores) */
  duration?: number
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {})

export const useToast = () => useContext(ToastContext)

/** Aviso flotante único de la app: confirmaciones con acción opcional y errores. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null)
  // al ocultarse se conserva el último aviso hasta que acaba la animación de salida
  const [leaving, setLeaving] = useState(false)
  // cambia con cada aviso: relanza la animación de entrada si llega uno nuevo mientras hay otro visible
  const [seq, setSeq] = useState(0)
  const timer = useRef<number>(undefined)
  const gone = useRef<number>(undefined)

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setLeaving(true)
    window.clearTimeout(gone.current)
    gone.current = window.setTimeout(() => setToast(null), 260)
  }, [])

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current)
    window.clearTimeout(gone.current)
    setLeaving(false)
    setSeq((n) => n + 1)
    setToast(t)
    // duration 0 = se queda hasta que se pulse la acción o se cierre
    const ms = t.duration ?? (t.kind === 'error' ? 7000 : 5000)
    if (ms > 0) timer.current = window.setTimeout(hide, ms)
  }, [hide])

  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(gone.current) }, [])

  const isError = toast?.kind === 'error'

  // deslizar el aviso hacia un lado lo quita
  const [drag, setDrag] = useState({ x: 0, active: false, out: false })
  const start = useRef<{ x: number; id: number } | null>(null)
  function onDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    start.current = { x: e.clientX, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    window.clearTimeout(timer.current)
    setDrag({ x: 0, active: true, out: false })
  }
  function onMove(e: PointerEvent) {
    if (!start.current) return
    setDrag({ x: e.clientX - start.current.x, active: true, out: false })
  }
  function onUp(e: PointerEvent) {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    start.current = null
    if (Math.abs(dx) > 70) {
      setDrag({ x: dx > 0 ? 400 : -400, active: false, out: true })
      window.setTimeout(() => {
        setToast(null)
        setLeaving(false)
        setDrag({ x: 0, active: false, out: false })
      }, 200)
    } else {
      setDrag({ x: 0, active: false, out: false })
      // se retoma la cuenta atrás que se paró al tocarlo
      timer.current = window.setTimeout(hide, 2500)
    }
  }
  // arriba (donde el título de cada pantalla), para no tapar lo que se está tocando abajo
  const regionClasses = 'pointer-events-none fixed inset-x-4 top-[calc(3.25rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md md:top-6'
  const card = toast && (
    <div
      key={seq}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={drag.x !== 0 || drag.out ? { transform: `translateX(${drag.x}px)`, opacity: drag.out ? 0 : 1 - Math.min(Math.abs(drag.x) / 200, 0.6), transition: drag.active ? 'none' : 'transform 200ms ease-out, opacity 200ms ease-out', touchAction: 'pan-y' } : { touchAction: 'pan-y' }}
      className={
        (leaving ? 'toast-out ' : 'toast-in ') +
        'pointer-events-auto flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ' +
        (isError ? 'bg-red-700' : 'bg-gray-900 dark:bg-moss-700')
      }
    >
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          disabled={leaving}
          onClick={() => {
            toast.onAction?.()
            hide()
          }}
          className="shrink-0 rounded-md px-2 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-white/10 max-md:min-h-11"
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  )
  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* dos regiones vivas fijas, siempre montadas: el aviso se pinta en la que le toca (cambiar role/aria-live al vuelo no siempre se anuncia) */}
      <div role="status" aria-live="polite" className={regionClasses}>{toast && !isError && card}</div>
      <div role="alert" aria-live="assertive" className={regionClasses}>{toast && isError && card}</div>
    </ToastContext.Provider>
  )
}
