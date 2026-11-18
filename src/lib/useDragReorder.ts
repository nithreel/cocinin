import { useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'
import { moveId } from './tags'

interface DragState {
  id: string
  dy: number
  target: number
  ids: string[]
  tops: number[]
  heights: number[]
  startY: number
}

/**
 * Lista reordenable por arrastre (puntero/táctil) o con ↑ ↓ en el asa. La fila arrastrada sigue al puntero y las
 * demás se apartan con una transición; al soltar se llama a `onSave` con los ids en el nuevo orden.
 * `sorted` es el orden actual (el que llega de Firestore).
 */
export function useDragReorder<T extends { id: string }>(sorted: T[], onSave: (ids: string[]) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  // orden recién soltado: se mantiene un momento hasta que llega el cambio de Firestore (evita un salto)
  const [settled, setSettled] = useState<string[] | null>(null)
  const rows = useRef(new Map<string, HTMLElement>())

  function targetFor(sn: DragState, dy: number) {
    const from = sn.ids.indexOf(sn.id)
    const center = sn.tops[from] + sn.heights[from] / 2 + dy
    let target = from
    sn.ids.forEach((_, j) => {
      if (j === from) return
      const c = sn.tops[j] + sn.heights[j] / 2
      if (j < from && center < c) target = Math.min(target, j)
      if (j > from && center > c) target = Math.max(target, j)
    })
    return target
  }

  function handleFor(id: string): HTMLAttributes<HTMLButtonElement> {
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const ids = sorted.map((t) => t.id)
        const rects = ids.map((i) => rows.current.get(i)!.getBoundingClientRect())
        setSettled(null)
        setDrag({
          id,
          dy: 0,
          target: ids.indexOf(id),
          ids,
          tops: rects.map((x) => x.top),
          heights: rects.map((x) => x.height),
          startY: e.clientY,
        })
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        if (drag?.id !== id) return
        const dy = e.clientY - drag.startY
        setDrag({ ...drag, dy, target: targetFor(drag, dy) })
      },
      onPointerUp: () => {
        if (drag?.id === id) {
          const ids = [...drag.ids]
          ids.splice(ids.indexOf(id), 1)
          ids.splice(drag.target, 0, id)
          if (ids.join() !== drag.ids.join()) {
            setSettled(ids)
            setTimeout(() => setSettled(null), 800)
            onSave(ids)
          }
        }
        setDrag(null)
      },
      onPointerCancel: () => setDrag(null),
      // teclado: con el asa enfocada, ↑ y ↓ mueven el elemento
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        onSave(moveId(sorted.map((t) => t.id), id, e.key === 'ArrowUp' ? -1 : 1))
      },
    }
  }

  const byId = new Map(sorted.map((t) => [t.id, t]))
  const shown = settled && !drag ? settled.map((i) => byId.get(i)).filter((t): t is T => !!t) : sorted

  /** Desplazamiento de cada fila mientras se arrastra: la arrastrada sigue al puntero; las demás se apartan. */
  function rowStyle(id: string): CSSProperties | undefined {
    if (!drag) return undefined
    if (id === drag.id) return { transform: `translateY(${drag.dy}px)`, transition: 'none' }
    const from = drag.ids.indexOf(drag.id)
    const j = drag.ids.indexOf(id)
    const h = drag.heights[from] + 1
    let shift = 0
    if (drag.target > from && j > from && j <= drag.target) shift = -h
    if (drag.target < from && j >= drag.target && j < from) shift = h
    return { transform: `translateY(${shift}px)`, transition: 'transform 150ms ease' }
  }

  const rowRef = (id: string) => (el: HTMLElement | null) => {
    if (el) rows.current.set(id, el)
    else rows.current.delete(id)
  }

  return { shown, draggingId: drag?.id ?? null, rowStyle, handleFor, rowRef }
}
