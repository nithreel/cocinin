import { prefersReducedMotion } from './motion'

/** Ripple de Material en los elementos con la clase `ripple` (botones de icono). Un solo listener global. */
export function initRipple() {
  // el círculo de hover sigue al cursor dentro del elemento
  // como mucho una lectura de layout por fotograma, aunque lleguen más eventos
  let frame = 0
  let last: PointerEvent | null = null
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return
      last = e
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const ev = last
        const el = (ev?.target as Element | null)?.closest<HTMLElement>('.ripple')
        if (!ev || !el) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--rx', ev.clientX - r.left + 'px')
        el.style.setProperty('--ry', ev.clientY - r.top + 'px')
      })
    },
    { passive: true },
  )
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('.ripple')
      if (!el || (el as HTMLButtonElement).disabled || prefersReducedMotion()) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--rx', e.clientX - r.left + 'px')
      el.style.setProperty('--ry', e.clientY - r.top + 'px')
      const size = Math.max(r.width, r.height) * 2.2
      const wrap = document.createElement('span')
      wrap.className = 'ripple-wrap'
      const dot = document.createElement('span')
      dot.className = 'ripple-dot'
      dot.style.width = dot.style.height = size + 'px'
      dot.style.left = e.clientX - r.left - size / 2 + 'px'
      dot.style.top = e.clientY - r.top - size / 2 + 'px'
      wrap.appendChild(dot)
      el.appendChild(wrap)
      // el ripple se queda mientras se mantiene pulsado y se apaga al soltar
      let grown = false
      let released = false
      const fade = () => {
        dot.classList.add('ripple-out')
        setTimeout(() => wrap.remove(), 420)
      }
      dot.addEventListener('animationend', () => {
        grown = true
        if (released) fade()
      })
      // un solo AbortController por pulsación: al soltar se retiran los tres listeners (si no, pointercancel quedaba colgado)
      const ac = new AbortController()
      const release = () => {
        ac.abort()
        released = true
        if (grown) fade()
      }
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(type, release, { signal: ac.signal })
    },
    { passive: true },
  )
}
