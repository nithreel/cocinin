import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { COLLAPSE_MS } from '../lib/motion'

/** Desplegable: el alto crece suave (grid 0fr→1fr) y el contenido «cae» y se asienta con rebote, como el pomo
 *  de los interruptores. Desmonta al cerrar. Mientras anima recorta con overflow: clip (no hidden, para no romper los
 *  sticky del interior); una vez abierto del todo deja el contenido libre (anillos de foco, sombras…).
 *  El contenido se pinta en el mismo render en que `open` pasa a true (así el autoFocus y el teclado de iOS siguen
 *  dentro del gesto del usuario); los estados de animación se ajustan después, en el efecto. */
export default function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const initial = useRef(open)
  // sigue montado tras cerrar mientras se encoge
  const [mounted, setMounted] = useState(open)
  const [grown, setGrown] = useState(open)
  const [settled, setSettled] = useState(open)
  const [touched, setTouched] = useState(false)
  // al cerrar se conserva el último contenido, para que no desaparezca de golpe antes de encogerse
  const last = useRef(children)
  if (open) last.current = children

  useEffect(() => {
    // al montar (o mientras no haya cambiado nunca) no hay nada que animar
    if (open === initial.current && !touched) return
    setTouched(true)
    setSettled(false)
    if (open) {
      setMounted(true)
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setGrown(true))
      })
      const t = setTimeout(() => setSettled(true), COLLAPSE_MS + 60)
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
        clearTimeout(t)
      }
    }
    setGrown(false)
    const t = setTimeout(() => setMounted(false), COLLAPSE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open && !mounted) return null
  const expanded = open && grown
  return (
    <div className={'collapse-grid ' + (expanded ? 'collapse-open' : '')} style={{ '--collapse-ms': COLLAPSE_MS + 'ms' } as CSSProperties}>
      <div className={settled && open ? '' : 'overflow-clip'} style={{ minHeight: 0, minWidth: 0 }}>
        <div className={touched ? (expanded ? 'collapse-in' : 'collapse-out') : ''}>{open ? children : last.current}</div>
      </div>
    </div>
  )
}
