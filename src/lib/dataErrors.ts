/** Errores de lectura por listener (clave = colección). Cada listener solo pone o quita el suyo. */
export type DataErrors = Readonly<Record<string, string>>

/** Pone (`message`) o quita (`null`) el error de un listener; si no cambia nada devuelve el mismo objeto. */
export function setDataErrorFor(prev: DataErrors, key: string, message: string | null): DataErrors {
  if (message === null) {
    if (!(key in prev)) return prev
    const next = { ...prev }
    delete next[key]
    return next
  }
  if (prev[key] === message) return prev
  return { ...prev, [key]: message }
}

/** El aviso que se muestra: el primer listener caído, o null si todos leen bien. */
export function firstDataError(errors: DataErrors): string | null {
  return Object.values(errors)[0] ?? null
}
