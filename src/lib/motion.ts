/** ¿Animaciones reducidas? Por el sistema (`prefers-reduced-motion`) o por el ajuste del dispositivo: `settings.ts`
 *  lo resuelve y lo deja en `data-reduce-motion` de <html>, la misma marca que usa el CSS. */
export function prefersReducedMotion() {
  return document.documentElement.hasAttribute('data-reduce-motion')
}

/** Duración (ms) del desplegable `Collapse`: la usan su CSS (--collapse-ms), su desmontaje y los scroll que esperan a que termine. */
export const COLLAPSE_MS = 340

/** Duración de un desplegable alto (recetas): crece con el contenido para que una receta larga no vaya más deprisa que una corta. */
export function tallCollapseMs(heightPx: number) {
  return Math.round(Math.min(900, Math.max(COLLAPSE_MS, 260 + heightPx * 0.4)))
}

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

/** Red de seguridad: si la fila sigue en el DOM pasado `ms` (la acción no la quitó), deshace el deslizamiento y avisa. */
export function restoreIfStill(row: Element | null | undefined, anim: Animation | null, onRestore?: () => void, ms = 1200) {
  if (!anim) return
  window.setTimeout(() => {
    if (row?.isConnected) {
      anim.cancel()
      onRestore?.()
    }
  }, ms)
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
