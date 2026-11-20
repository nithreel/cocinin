import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

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
  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* región viva siempre montada (algunos lectores no anuncian una región que nace con su texto) */}
      <div
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md md:bottom-6"
      >
        {toast && (
          <div
            key={seq}
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
        )}
      </div>
    </ToastContext.Provider>
  )
}
