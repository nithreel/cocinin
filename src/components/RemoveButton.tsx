import { useRef, useState } from 'react'
import { leaveRow, prefersReducedMotion, restoreIfStill } from '../lib/motion'

/** Botón ✕ de quitar: gris en reposo; al pasar el cursor la cruz se pone roja y gira; al pulsar, pop con anillo rojo
 *  y la fila se desliza fuera antes de quitarse. Con `row={false}` no desliza la fila (p. ej. si abre una confirmación). */
export default function RemoveButton({
  onRemove,
  label,
  title,
  row = true,
  trash = false,
}: {
  onRemove: () => void | Promise<void>
  label: string
  title?: string
  row?: boolean
  /** papelera en vez de ✕: para los pares editar/eliminar, donde la ✕ se confunde con cerrar el desplegable */
  trash?: boolean
}) {
  const [done, setDone] = useState(false)
  const busy = useRef(false)

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (busy.current) return
    busy.current = true
    const reset = () => {
      setDone(false)
      busy.current = false
    }
    if (prefersReducedMotion()) {
      void Promise.resolve()
        .then(onRemove)
        .finally(() => (busy.current = false))
      return
    }
    setDone(true)
    const li = e.currentTarget.closest('li')
    let leaving: Animation | null = null
    if (row) window.setTimeout(() => (leaving = leaveRow(li)), 240)
    window.setTimeout(
      () => {
        // si la fila sigue (abre una confirmación o falla), el botón y la fila vuelven a su sitio
        void Promise.resolve()
          .then(onRemove)
          .then(() => (row ? restoreIfStill(li, leaving, reset) : reset()))
          .catch((err) => {
            leaving?.cancel()
            reset()
            throw err
          })
      },
      row ? 500 : 280,
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={title}
      className={
        'rm-btn ripple relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 after:absolute after:-inset-2 after:content-[\'\'] dark:text-gray-400' +
        (done ? ' rm-done' : '')
      }
    >
      {trash ? (
        <svg viewBox="0 0 24 24" className="rm-x rm-trash h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="rm-x h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
    </button>
  )
}
