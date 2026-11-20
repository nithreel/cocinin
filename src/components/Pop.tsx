import { useEffect, useRef, useState, type ReactNode } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/** Evita animar lo que ya estaba al montarse la fila o el grupo (p. ej. al desplegarlo): true pasados `ms` desde el montaje.
 *  Sin timers ni renders extra: se calcula al renderizar, y lo que aparece por una acción siempre llega con un render nuevo. */
export function useSettled(ms = 800) {
  const [t0] = useState(() => performance.now())
  return performance.now() - t0 > ms
}

/** Aparece con rebote solo si `animate` (algo que surge por una acción, no al montar).
 *  `text`: dentro de una línea recortada por un desplegable: solo crece desde la izquierda, sin salirse de su caja. */
export default function Pop({
  animate,
  trigger,
  text,
  className,
  children,
  ...rest
}: {
  animate: boolean
  /** si cambia (p. ej. el contador de una insignia), vuelve a saltar sin volver a montarse */
  trigger?: number
  text?: boolean
  className?: string
  children: ReactNode
  title?: string
  'aria-label'?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const last = useRef<{ at: number; anim: Animation | null }>({ at: 0, anim: null })
  useEffect(() => {
    const el = ref.current
    if (!animate || !el || prefersReducedMotion()) return
    // una sola animación por acción: ignora disparos repetidos casi a la vez (cambios intermedios del contador)
    const now = performance.now()
    if (now - last.current.at < 700) return
    last.current.at = now
    last.current.anim?.cancel()
    last.current.anim = el.animate(
      text
        ? [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'none' }]
        : [{ opacity: 0, transform: 'translateY(-8px) scale(0.6)' }, { opacity: 1, transform: 'none' }],
      { duration: 460, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    )
    // al montarse y cuando cambia `trigger`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return (
    <span ref={ref} className={className} style={text ? { display: 'inline-block', transformOrigin: 'left center' } : undefined} {...rest}>
      {children}
    </span>
  )
}
