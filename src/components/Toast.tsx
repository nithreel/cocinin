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
  const timer = useRef<number>(undefined)

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current)
    setToast(t)
    // duration 0 = se queda hasta que se pulse la acción o se cierre
    const ms = t.duration ?? (t.kind === 'error' ? 7000 : 5000)
    if (ms > 0) timer.current = window.setTimeout(() => setToast(null), ms)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const isError = toast?.kind === 'error'
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
          className={
            'fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg md:bottom-6 ' +
            (isError ? 'bg-red-700' : 'bg-gray-900 dark:bg-moss-700')
          }
        >
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.()
                setToast(null)
              }}
              className="shrink-0 rounded-md px-2 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-white/10 max-md:min-h-11"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}
