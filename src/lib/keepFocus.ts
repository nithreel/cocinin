import type { MouseEvent } from 'react'

/** Para `onMouseDown` de botones/filas que se tocan con un campo de texto enfocado (buscador): el toque no le quita el
 *  foco. Si lo hiciera, el teclado se cerraría, la pantalla se recolocaría antes de soltar el dedo y el toque se perdería. */
export function keepFocus(e: MouseEvent) {
  // solo con el teclado abierto: si se cerró con «Atrás», el toque debe quitarle el foco al campo
  if (!document.documentElement.hasAttribute('data-kb')) return
  const f = document.activeElement
  if (f instanceof HTMLInputElement || f instanceof HTMLTextAreaElement) e.preventDefault()
}
