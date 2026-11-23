import { useCallback, useState } from 'react'

/**
 * Conjunto de ids que los hijos marcan y desmarcan (p. ej. recetas abiertas o en edición).
 * `set` es estable (no cambia entre renders): los hijos pueden ponerlo en las dependencias de sus efectos sin bucles.
 * Si el id ya estaba (o no estaba) como se pide, devuelve el mismo conjunto y no provoca otro render.
 */
export function useIdSet(): [ReadonlySet<string>, (id: string, on: boolean) => void] {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  const set = useCallback((id: string, on: boolean) => {
    setIds((prev) => {
      if (prev.has(id) === on) return prev
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  return [ids, set]
}
