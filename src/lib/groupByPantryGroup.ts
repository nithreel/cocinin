import type { Group, Ingredient } from './collections'

export const NO_GROUP = '__none__'

export interface Section<T> {
  id: string
  name: string
  items: T[]
}

export function groupByPantryGroup<T>(
  items: T[],
  getIngredientId: (item: T) => string,
  ingredientsById: Map<string, Ingredient>,
  groups: Group[],
): Section<T>[] {
  const byGroup = new Map<string, T[]>()
  const noGroup: T[] = []
  for (const item of items) {
    const groupId = ingredientsById.get(getIngredientId(item))?.groupId
    if (groupId) {
      const list = byGroup.get(groupId) ?? []
      list.push(item)
      byGroup.set(groupId, list)
    } else {
      noGroup.push(item)
    }
  }
  const result = groups
    .map((g) => ({ id: g.id, name: g.name, items: byGroup.get(g.id) ?? [] }))
    .filter((s) => s.items.length > 0)
  if (noGroup.length > 0) {
    result.push({ id: NO_GROUP, name: 'Sin grupo', items: noGroup })
  }
  return result
}
