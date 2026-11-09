/** Quien hace scroll es <main>, no la ventana: vuelve arriba para ver un formulario recién abierto. */
export function scrollMainToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.querySelector('main')?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

/** Comportamiento de scroll que respeta «reducir movimiento». */
export function smoothBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
