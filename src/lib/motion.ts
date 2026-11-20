/** ¿El sistema pide «reducir movimiento»? */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Duración (ms) del desplegable `Collapse`: la usan su CSS (--collapse-ms), su desmontaje y los scroll que esperan a que termine. */
export const COLLAPSE_MS = 340

/** La fila se desliza hacia la derecha y se desvanece (se queda así: `fill: forwards`). Usa la API de animaciones web
 *  y no toca el `className` de la fila, que controla React. Devuelve la animación (`.cancel()` la deshace si la acción falla). */
export function leaveRow(el: Element | null | undefined, ms = 300): Animation | null {
  if (!el || prefersReducedMotion()) return null
  return el.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: 'translateX(32px)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-in', fill: 'forwards' },
  )
}

/** Casillas `.cb`: el rebote solo al marcarlas/desmarcarlas (no al montarse ya marcadas). Un solo listener global. */
export function initCheckboxPop() {
  document.addEventListener('change', (e) => {
    const el = e.target
    if (!(el instanceof HTMLInputElement) || !el.classList.contains('cb')) return
    el.classList.remove('cb-anim')
    void el.offsetWidth // reinicia la animación si se pulsa dos veces seguidas
    el.classList.add('cb-anim')
    el.addEventListener('animationend', () => el.classList.remove('cb-anim'), { once: true })
  })
}
