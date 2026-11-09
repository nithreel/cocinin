import { useCallback, useState } from 'react'

/** Conjunto de secciones plegadas, recordado por dispositivo (localStorage) bajo `key`. */
export function useCollapsedSet(key: string) {
  const storageKey = `cocinin:plegado:${key}`
  const [collapsed, setCollapsedState] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return new Set(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set()
    }
  })

  const update = useCallback(
    (change: (prev: Set<string>) => Set<string>) => {
      setCollapsedState((prev) => {
        const next = change(prev)
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]))
        } catch {
          /* sin almacenamiento: solo se pierde el recuerdo */
        }
        return next
      })
    },
    [storageKey],
  )

  const toggle = useCallback(
    (id: string) =>
      update((prev) => {
        const next = new Set(prev)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    [update],
  )

  const expand = useCallback(
    (id: string) =>
      update((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      }),
    [update],
  )

  return { collapsed, toggle, expand }
}
