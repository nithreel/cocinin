import type { Group, Ingredient, Recipe } from './collections'
import { NO_GROUP } from './groupByPantryGroup'
import { matchesSearch } from './search'

/** Grupo de la Despensa tal como se pinta: a diferencia de `groupByPantryGroup`, incluye los grupos vacíos. */
export interface PantrySection {
  id: string
  name: string
  items: Ingredient[]
  deletable: boolean
  isFood: boolean
}

/** Borrador de nombre y «Es comida» de un grupo mientras se edita en el modo «organizar». */
export type GroupDraft = { name: string; isFood: boolean }

/** Un apartado por grupo (en el orden de `groups`, vacíos incluidos) y «Sin grupo» al final si hace falta. */
export function buildPantrySections(groups: Group[], ingredients: Ingredient[]): PantrySection[] {
  const byGroup = new Map<string, Ingredient[]>()
  const noGroup: Ingredient[] = []
  for (const ing of ingredients) {
    if (ing.groupId) {
      const list = byGroup.get(ing.groupId) ?? []
      list.push(ing)
      byGroup.set(ing.groupId, list)
    } else {
      noGroup.push(ing)
    }
  }
  const result = groups.map((g) => ({
    id: g.id,
    name: g.name,
    items: byGroup.get(g.id) ?? [],
    deletable: true,
    isFood: g.isFood ?? true,
  }))
  if (noGroup.length > 0) {
    result.push({ id: NO_GROUP, name: 'Sin grupo', items: noGroup, deletable: false, isFood: true })
  }
  return result
}

/** Búsqueda: si el término coincide con el nombre del grupo entra entero; si no, solo sus ingredientes que coinciden.
 *  Los grupos que se quedan sin nada desaparecen. Sin término, devuelve las mismas secciones. */
export function filterPantrySections(sections: PantrySection[], search: string): PantrySection[] {
  if (!search.trim()) return sections
  return sections
    .map((s) =>
      // si el término coincide con el nombre del grupo, entra el grupo entero
      matchesSearch(s.name, search) ? s : { ...s, items: s.items.filter((i) => matchesSearch(i.name, search)) },
    )
    .filter((s) => s.items.length > 0)
}

/** Al organizar: todos los grupos en el orden que se está arrastrando (`shown`) y «Sin grupo» al final. */
export function organizeSections(sections: PantrySection[], shown: { id: string }[]): PantrySection[] {
  const byId = new Map(sections.map((x) => [x.id, x]))
  const ordered = shown.map((g) => byId.get(g.id)).filter((x): x is PantrySection => !!x)
  const noGroup = byId.get(NO_GROUP)
  return noGroup ? [...ordered, noGroup] : ordered
}

/** Títulos de las recetas que usan cada ingrediente (para avisar antes de borrarlo). */
export function recipeTitlesByIngredient(recipes: Recipe[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const r of recipes) {
    for (const ri of r.ingredients) map.set(ri.ingredientId, [...(map.get(ri.ingredientId) ?? []), r.title])
  }
  return map
}

/** Borradores que de verdad cambian algo (grupo existente, nombre no vacío y distinto nombre o «Es comida»). */
export function changedGroupDrafts(drafts: Record<string, GroupDraft>, groups: Group[]): { id: string; name: string; isFood: boolean }[] {
  const changes: { id: string; name: string; isFood: boolean }[] = []
  for (const [id, d] of Object.entries(drafts)) {
    const g = groups.find((x) => x.id === id)
    const name = d.name.trim()
    if (!g || !name || (name === g.name && d.isFood === (g.isFood ?? true))) continue
    changes.push({ id, name, isFood: d.isFood })
  }
  return changes
}

/** Algún borrador con el nombre vacío: no se puede guardar. */
export function hasInvalidDraft(drafts: Record<string, GroupDraft>): boolean {
  return Object.values(drafts).some((d) => !d.name.trim())
}

/** Al cancelar «organizar»: el orden con el que se entró (sin los grupos eliminados entretanto), o `null` si no ha
 *  cambiado y no hay nada que restaurar. */
export function orderToRestore(orderOnEnter: string[], groups: Group[]): string[] | null {
  const existing = new Set(groups.map((g) => g.id))
  const before = orderOnEnter.filter((id) => existing.has(id))
  const now = groups.map((g) => g.id).filter((id) => before.includes(id))
  return before.join() !== now.join() ? before : null
}
