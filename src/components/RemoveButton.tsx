import { useRef, useState } from 'react'
import { leaveRow, prefersReducedMotion } from '../lib/motion'

/** Botón ✕ de quitar: gris en reposo; al pasar el cursor la cruz se pone roja y gira; al pulsar, pop con anillo rojo
 *  y la fila se desliza fuera antes de quitarse. Con `row={false}` no desliza la fila (p. ej. si abre una confirmación). */
export default function RemoveButton({
  onRemove,
  label,
  title,
  row = true,
}: {
  onRemove: () => void
  label: string
  title?: string
  row?: boolean
}) {
  const [done, setDone] = useState(false)
  const busy = useRef(false)

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (busy.current) return
    busy.current = true
    if (prefersReducedMotion()) {
      onRemove()
      busy.current = false
      return
    }
    setDone(true)
    const li = e.currentTarget.closest('li')
    let leaving: Animation | null = null
    if (row) window.setTimeout(() => (leaving = leaveRow(li)), 240)
    window.setTimeout(
      () => {
        try {
          onRemove()
        } catch (err) {
          leaving?.cancel()
          throw err
        } finally {
          // si la fila sigue (abre una confirmación o falla), el botón vuelve a su sitio
          setDone(false)
          busy.current = false
        }
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
      <svg viewBox="0 0 24 24" className="rm-x h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  )
}
