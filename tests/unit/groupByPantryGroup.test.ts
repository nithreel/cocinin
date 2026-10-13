import { describe, expect, it } from 'vitest'
import { groupByPantryGroup } from '../../src/lib/groupByPantryGroup'
import type { Group, Ingredient } from '../../src/lib/collections'

const groups: Group[] = [
  { id: 'g1', name: 'Fruta', createdAt: 0 },
  { id: 'g2', name: 'Lácteos', createdAt: 0 },
]
const ing = (id: string, groupId: string | null): Ingredient => ({ id, name: id, groupId, inPantry: true, createdAt: 0 })

describe('groupByPantryGroup', () => {
  const ingredients = [ing('manzana', 'g1'), ing('leche', 'g2'), ing('sal', null)]
  const byId = new Map(ingredients.map((i) => [i.id, i]))

  it('agrupa por grupo y deja los huérfanos en «Sin grupo»', () => {
    const sections = groupByPantryGroup(ingredients, (i) => i.id, byId, groups)
    expect(sections.map((s) => [s.name, s.items.map((i) => i.id)])).toEqual([
      ['Fruta', ['manzana']],
      ['Lácteos', ['leche']],
      ['Sin grupo', ['sal']],
    ])
  })
  it('omite los grupos vacíos', () => {
    const sections = groupByPantryGroup([ing('manzana', 'g1')], (i) => i.id, byId, groups)
    expect(sections.map((s) => s.name)).toEqual(['Fruta'])
  })
})
