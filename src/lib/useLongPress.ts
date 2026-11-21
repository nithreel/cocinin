import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { vibrate } from './settings'

/** Pulsación larga (mantener ~0,5 s sin mover el dedo) o clic derecho / tecla de menú: entra en el modo «organizar grupos». */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef(0)
  const origin = useRef({ x: 0, y: 0 })
  const fired = useRef(false)
  const cancel = () => window.clearTimeout(timer.current)
  return {
    /** ¿el clic que sigue viene de una pulsación larga? (lo consume: la siguiente vez devuelve false) */
    consumeFired: () => {
      const was = fired.current
      fired.current = false
      return was
    },
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        fired.current = false
        origin.current = { x: e.clientX, y: e.clientY }
        cancel()
        timer.current = window.setTimeout(() => {
          fired.current = true
          vibrate(15)
          onLongPress()
        }, 500)
      },
      onPointerMove: (e: PointerEvent) => {
        // si el dedo se mueve es un scroll, no una pulsación larga
        if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 8) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        fired.current = true
        onLongPress()
      },
    },
  }
}
