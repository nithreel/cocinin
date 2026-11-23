import type { MouseEvent } from 'react'

/** Desplazamiento horizontal con ratón: rueda y arrastre (el táctil ya funciona solo). */
export const dragScrollProps = {
  onMouseDown(e: MouseEvent<HTMLElement>) {
    if (e.button !== 0) return
    const el = e.currentTarget
    const startX = e.clientX
    const startLeft = el.scrollLeft
    let moved = false
    const move = (ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > 4) moved = true
      if (moved) el.scrollLeft = startLeft - dx
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      if (moved) {
        const stop = (ev: Event) => ev.stopPropagation()
        el.addEventListener('click', stop, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', stop, true), 0)
      }
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  },
}

/** Ref: la rueda mueve la fila de lado (listener no pasivo para frenar el scroll vertical de la página). */
export function wheelScrollX(el: HTMLElement | null) {
  if (!el) return
  el.addEventListener(
    'wheel',
    (e) => {
      // Zona bloqueada: la página nunca baja con el ratón encima, ni en los bordes.
      e.preventDefault()
      if (e.deltaX !== 0) el.scrollLeft += e.deltaX
      else el.scrollLeft += e.deltaY
    },
    { passive: false },
  )
}
