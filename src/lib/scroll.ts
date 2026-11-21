import { prefersReducedMotion } from './motion'

/** Quien hace scroll es <main>, no la ventana: vuelve arriba para ver un formulario recién abierto. */
export function scrollMainToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: smoothBehavior() })
}

/** Comportamiento de scroll que respeta «reducir movimiento». */
export function smoothBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

/** Lleva `el` arriba del área con scroll (bajo la barra fija: respeta `scroll-padding-top`) a la vez que se despliega:
 *  en cada fotograma se acerca a su posición, y como el contenido crece durante la animación, el desplazamiento y la
 *  apertura van juntos, sin cortes. Si tocas o haces scroll, se detiene. */
export function scrollToWhileOpening(el: HTMLElement | null, ms = 420) {
  const main = el?.closest('main')
  if (!el || !main) return
  if (prefersReducedMotion()) {
    el.scrollIntoView({ block: 'start' })
    return
  }
  const end = performance.now() + ms
  let raf = 0
  const stop = () => {
    cancelAnimationFrame(raf)
    main.removeEventListener('wheel', stop)
    main.removeEventListener('touchstart', stop)
    main.removeEventListener('pointerdown', stop)
  }
  main.addEventListener('wheel', stop, { passive: true })
  main.addEventListener('touchstart', stop, { passive: true })
  main.addEventListener('pointerdown', stop, { passive: true })
  const gap = () => {
    const pad = parseFloat(getComputedStyle(main).scrollPaddingTop) || 0
    return el.getBoundingClientRect().top - (main.getBoundingClientRect().top + pad)
  }
  const step = () => {
    const delta = gap()
    // 22 % de lo que falta en cada fotograma: arranca rápido y frena al llegar
    if (Math.abs(delta) > 0.5) main.scrollTop += Math.sign(delta) * Math.max(1, Math.abs(delta) * 0.22)
    if (performance.now() < end) raf = requestAnimationFrame(step)
    else {
      // remate en un píxel FÍSICO (Chrome redondea el scroll al píxel físico, no al CSS) y siempre por debajo del
      // punto: así el borde de 1 px de la tarjeta nunca queda un poco por detrás de la cabecera
      const d = window.devicePixelRatio || 1
      main.scrollTop = Math.floor((main.scrollTop + gap()) * d) / d
      stop()
    }
  }
  raf = requestAnimationFrame(step)
}
