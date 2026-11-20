import { useRef, useState } from 'react'
import { leaveRow, prefersReducedMotion } from '../lib/motion'

/** Botón verde de añadir a la lista: círculo verde plano, el «+» gira al pasar el cursor y, al pulsar,
 *  se convierte en un ✓ que se dibuja con rebote y un anillo de pulso; la fila se desliza fuera y entonces se añade. */
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
    const run = () =>
      Promise.resolve()
        .then(onAdd)
        .catch((err) => {
          leaving?.cancel()
          setDone(false)
          busy.current = false
          throw err
        })
    if (prefersReducedMotion()) {
      void run()
      return
    }
    setDone(true)
    const row = e.currentTarget.closest('li')
    window.setTimeout(() => (leaving = leaveRow(row)), 260)
    window.setTimeout(() => void run(), 520)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={title}
      className={
        'add-btn ripple relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white max-md:h-9 max-md:w-9' +
        (done ? ' add-done' : '')
      }
    >
      <svg viewBox="0 0 24 24" className="add-plus absolute h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <svg viewBox="0 0 24 24" className="add-check absolute h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    </button>
  )
}
