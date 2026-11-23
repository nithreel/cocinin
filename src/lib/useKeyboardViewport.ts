import { useEffect } from 'react'
import { smoothBehavior } from './scroll'

/**
 * Con el teclado del móvil abierto, la app mide solo lo que se ve (no lo que tapa el teclado):
 * así la lista se encoge y los resultados quedan por encima del teclado, en tiempo real.
 * Publica `--app-h` y los atributos `data-kb` / `data-kb-low` en <html>.
 */
export function useKeyboardViewport() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const isField = (el: Element | null) =>
      !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range)$/.test((el as HTMLInputElement).type)))
    // solo en pantallas táctiles: en un PC con la ventana baja no hay teclado en pantalla
    const coarse = window.matchMedia('(pointer: coarse)')
    let wasKb = false
    const apply = () => {
      root.style.setProperty('--app-h', `${vv.height}px`)
      const field = isField(document.activeElement)
      // teclado abierto = campo enfocado y pantalla visible mucho menor que la física
      const small = coarse.matches && vv.height < screen.height * 0.8
      const kb = field && small
      // teclado cerrado con «Atrás»: el campo sigue enfocado y el siguiente toque lo reabriría (y la pantalla
      // saltaría bajo el dedo), así que se le quita el foco
      if (wasKb && field && !small) (document.activeElement as HTMLElement).blur()
      wasKb = kb
      root.toggleAttribute('data-kb', kb)
      // pantalla muy baja (móvil en horizontal con teclado): nada fijo, para que quepa el campo
      root.toggleAttribute('data-kb-low', kb && vv.height < 300)
      // iOS desplaza la página al abrir el teclado; la app ocupa justo la parte visible
      if (vv.offsetTop > 0) window.scrollTo(0, 0)
    }
    // al enfocar un campo, llevarlo al centro de lo visible cuando el teclado ya está abierto
    const onFocus = (e: FocusEvent) => {
      if (!isField(e.target as Element)) return
      const t = e.target as HTMLElement
      window.setTimeout(() => {
        apply()
        if (root.hasAttribute('data-kb')) {
          // buscadores: arriba, para dejar sitio a los resultados; el resto, al centro de lo visible
          const top = t.dataset.kbAlign === 'start' || root.hasAttribute('data-kb-low')
          t.scrollIntoView({ block: top ? 'start' : 'center', behavior: smoothBehavior() })
        }
      }, 350)
    }
    document.addEventListener('focusin', onFocus)
    // con retardo: si no, al tocar un botón con el teclado abierto la pantalla se recoloca antes de soltar y el toque se pierde
    let outTimer = 0
    const onFocusOut = () => {
      window.clearTimeout(outTimer)
      outTimer = window.setTimeout(apply, 300)
    }
    document.addEventListener('focusout', onFocusOut)
    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onFocusOut)
      window.clearTimeout(outTimer)
      root.removeAttribute('data-kb')
      root.removeAttribute('data-kb-low')
      root.style.removeProperty('--app-h')
    }
  }, [])
}
