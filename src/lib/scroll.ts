import { prefersReducedMotion } from './motion'

/** Quien hace scroll es <main>, no la ventana: vuelve arriba para ver un formulario recién abierto. */
export function scrollMainToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: smoothBehavior() })
}

/** Comportamiento de scroll que respeta «reducir movimiento». */
export function smoothBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}
