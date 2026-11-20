import { flushSync } from 'react-dom'
import { prefersReducedMotion } from './motion'
/** Dirección de la transición entre páginas: Usuarios y Avisos (iconos de arriba) entran de arriba a abajo;
 *  Despensa, Lista, Recetario y Notas entran de abajo a arriba, vengas de donde vengas. */
const TOP_PAGES = ['/usuarios', '/avisos']

/** Se llama al pulsar un enlace de navegación, justo antes de que se inicie la transición. */
export function markNavDirection(to: string) {
  document.documentElement.dataset.navDir = TOP_PAGES.some((p) => to === p || to.startsWith(p + '/')) ? 'down' : 'up'
}

type Nav = (to: string) => void

/** onClick para un enlace de navegación: anima con View Transitions si el navegador puede; si no, navega normal. */
export function transitionClick(navigate: Nav, to: string) {
  return (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (window.location.pathname === to) return
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (!doc.startViewTransition || prefersReducedMotion()) return
    e.preventDefault()
    markNavDirection(to)
    doc.startViewTransition(() => {
      flushSync(() => navigate(to))
    })
  }
}
