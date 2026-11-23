import { normalizeText } from './search'
import type { Recipe, Tag } from './collections'

/** Clave de comparación: sin tildes, mayúsculas ni espacios sobrantes. */
export const tagKey = (name: string) => normalizeText(name).trim()

/** Clave de orden: ignora emojis o símbolos al principio («🍰 Postre» se ordena por «Postre»). */
function sortKey(name: string) {
  return name.replace(/^[^\p{L}\p{N}]+/u, '') || name
}

/** Primero las ordenadas a mano (`order`), luego el resto alfabéticamente (ignorando emojis iniciales). */
export function sortTags<T extends { name: string; order?: number }>(tags: T[]): T[] {
  return [...tags].sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) || sortKey(a.name).localeCompare(sortKey(b.name), 'es'),
  )
}

/** Ids en el nuevo orden tras mover una etiqueta una posición (-1 arriba, +1 abajo). */
export function moveId(ids: string[], id: string, delta: -1 | 1): string[] {
  const i = ids.indexOf(id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= ids.length) return ids
  const out = [...ids]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

/** Etiqueta con ese nombre, sin distinguir tildes, mayúsculas ni espacios de los extremos. */
export function findTag(tags: Tag[], name: string): Tag | undefined {
  const key = tagKey(name)
  return tags.find((t) => tagKey(t.name) === key)
}

/** Id estable para una etiqueta migrada: dos dispositivos que migren a la vez crean el mismo documento. */
export function legacyTagId(name: string): string {
  return 'm' + Array.from(new TextEncoder().encode(tagKey(name)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface LegacyMigrationPlan {
  newTags: { id: string; name: string }[]
  updates: { recipeId: string; tagIds: string[] }[]
}

/**
 * Pasa las etiquetas antiguas (texto en `recipe.tags`) a la colección `tags`. Solo toca recetas que aún
 * no tienen `tagIds` y no borra el campo antiguo. Reutiliza una etiqueta existente con el mismo nombre.
 */
export function planLegacyMigration(recipes: Recipe[], tags: Tag[]): LegacyMigrationPlan {
  const newTags = new Map<string, { id: string; name: string }>()
  const updates: LegacyMigrationPlan['updates'] = []
  for (const r of recipes) {
    if (r.tagIds !== undefined || !r.tags?.length) continue
    const ids: string[] = []
    for (const name of r.tags) {
      const key = tagKey(name)
      if (!key) continue
      const id = findTag(tags, name)?.id ?? newTags.get(key)?.id ?? legacyTagId(name)
      if (!findTag(tags, name) && !newTags.has(key)) newTags.set(key, { id, name: name.trim() })
      if (!ids.includes(id)) ids.push(id)
    }
    updates.push({ recipeId: r.id, tagIds: ids })
  }
  return { newTags: [...newTags.values()], updates }
}

export interface ImportTagPlan {
  /** id de cada etiqueta pedida (clave: `tagKey`) */
  idByKey: Map<string, string>
  /** las que no existen y se crearán al importar */
  newTags: { id: string; name: string }[]
}

/** Casa los nombres de etiqueta de las recetas importadas con las existentes; las demás se crean (opción A). */
export function planImportTags(names: string[], tags: Tag[], newId: () => string): ImportTagPlan {
  const idByKey = new Map<string, string>()
  const newTags: ImportTagPlan['newTags'] = []
  for (const name of names) {
    const key = tagKey(name)
    if (!key || idByKey.has(key)) continue
    const existing = findTag(tags, name)
    if (existing) {
      idByKey.set(key, existing.id)
    } else {
      const id = newId()
      idByKey.set(key, id)
      newTags.push({ id, name: name.trim() })
    }
  }
  return { idByKey, newTags }
}
