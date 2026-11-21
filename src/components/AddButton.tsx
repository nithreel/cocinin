import { useRef, useState } from 'react'
import { keepFocus } from '../lib/keepFocus'
import { leaveRow, prefersReducedMotion, restoreIfStill } from '../lib/motion'

/** Botón + de añadir a la lista, sin fondo (como la ✕ de quitar): el «+» se pone verde y gira al pasar el cursor y, al pulsar,
 *  hay un pop con anillo verde y el «+» se convierte en un ✓ que se dibuja; la fila se desliza fuera y entonces se añade. */
export default function AddButton({
  onAdd,
  label,
  title,
}: {
  onAdd: () => void | Promise<void>
  label: string
  title?: string
}) {
  const [done, setDone] = useState(false)
  const busy = useRef(false)

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (busy.current) return
    busy.current = true
    // si la acción falla, el botón y la fila vuelven a su sitio (y el error sigue su camino hasta el aviso de errores)
    let leaving: Animation | null = null
    const row = e.currentTarget.closest('li')
    const reset = () => {
      setDone(false)
      busy.current = false
    }
    const run = () =>
      Promise.resolve()
        .then(onAdd)
        .then(() => restoreIfStill(row, leaving, reset))
        .catch((err) => {
          leaving?.cancel()
          reset()
          throw err
        })
    if (prefersReducedMotion()) {
      void run()
      return
    }
    setDone(true)
    window.setTimeout(() => (leaving = leaveRow(row)), 260)
    window.setTimeout(() => void run(), 520)
  }

  return (
    <button
      type="button"
      // no roba el foco a un campo de texto: así el teclado no se cierra al añadir varios seguidos
      onMouseDown={keepFocus}
      onClick={handleClick}
      aria-label={label}
      title={title}
      className={
        'add-btn ripple relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 after:absolute after:-inset-2 after:content-[\'\'] dark:text-gray-400' +
        (done ? ' add-done' : '')
      }
    >
      <svg viewBox="0 0 24 24" className="add-plus h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <svg viewBox="0 0 24 24" className="add-check absolute h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    </button>
  )
}
