import { describe, expect, it } from 'vitest'
import {
  buildPantrySections,
  changedGroupDrafts,
  filterPantrySections,
  hasInvalidDraft,
  nextGroupOrder,
  organizeSections,
  orderToRestore,
  recipeTitlesByIngredient,
} from '../../src/lib/pantrySections'
import { NO_GROUP } from '../../src/lib/groupByPantryGroup'
import type { Group, Ingredient, Recipe } from '../../src/lib/collections'

const group = (id: string, name: string, extra: Partial<Group> = {}): Group => ({ id, name, createdAt: 0, ...extra })
const ing = (id: string, groupId: string | null, name = id): Ingredient => ({ id, name, groupId, inPantry: true, createdAt: 0 })
const recipe = (title: string, ids: string[]): Recipe => ({
  id: title,
  title,
  instructions: '',
  createdAt: 0,
  ingredients: ids.map((ingredientId) => ({ ingredientId, quantity: '', unit: '' })),
})

describe('buildPantrySections', () => {
  it('incluye los grupos vacíos y pone «Sin grupo» al final', () => {
    const groups = [group('g1', 'Fruta'), group('g2', 'Limpieza', { isFood: false }), group('g3', 'Vacío')]
    const s = buildPantrySections(groups, [ing('manzana', 'g1'), ing('lejía', 'g2'), ing('sal', null)])
    expect(s.map((x) => [x.id, x.items.map((i) => i.id), x.deletable, x.isFood])).toEqual([
      ['g1', ['manzana'], true, true],
      ['g2', ['lejía'], true, false],
      ['g3', [], true, true],
      [NO_GROUP, ['sal'], false, true],
    ])
    expect(s[3].name).toBe('Sin grupo')
  })
  it('sin ingredientes huérfanos no hay «Sin grupo»', () => {
    expect(buildPantrySections([group('g1', 'Fruta')], [ing('pera', 'g1')]).map((x) => x.id)).toEqual(['g1'])
  })
})

describe('filterPantrySections', () => {
  const sections = buildPantrySections([group('g1', 'Lácteos'), group('g2', 'Fruta')], [
    ing('leche', 'g1', 'Leche'),
    ing('yogur', 'g1', 'Yogur'),
    ing('limon', 'g2', 'Limón'),
  ])
  it('sin término devuelve las mismas secciones', () => {
    expect(filterPantrySections(sections, '  ')).toBe(sections)
  })
  it('si coincide el grupo entra entero; si no, solo lo que coincide; los vacíos se quitan', () => {
    expect(filterPantrySections(sections, 'lacteos').map((s) => s.items.length)).toEqual([2])
    expect(filterPantrySections(sections, 'limon').map((s) => [s.id, s.items.map((i) => i.id)])).toEqual([['g2', ['limon']]])
  })
})

describe('organizeSections', () => {
  it('sigue el orden arrastrado y deja «Sin grupo» al final', () => {
    const sections = buildPantrySections([group('a', 'A'), group('b', 'B')], [ing('x', null)])
    expect(organizeSections(sections, [{ id: 'b' }, { id: 'a' }, { id: 'borrado' }]).map((s) => s.id)).toEqual(['b', 'a', NO_GROUP])
  })
})

describe('recipeTitlesByIngredient', () => {
  it('lista los títulos de las recetas que usan cada ingrediente', () => {
    const m = recipeTitlesByIngredient([recipe('Tortilla', ['huevo', 'patata']), recipe('Flan', ['huevo'])])
    expect(m.get('huevo')).toEqual(['Tortilla', 'Flan'])
    expect(m.get('patata')).toEqual(['Tortilla'])
    expect(m.get('sal')).toBeUndefined()
  })
})

describe('nextGroupOrder', () => {
  it('sin orden manual no pone ninguno', () => {
    expect(nextGroupOrder([group('a', 'A')])).toBeUndefined()
    expect(nextGroupOrder([])).toBeUndefined()
  })
  it('con orden manual va detrás del mayor', () => {
    expect(nextGroupOrder([group('a', 'A', { order: 0 }), group('b', 'B', { order: 4 }), group('c', 'C')])).toBe(5)
  })
})

describe('borradores de grupos', () => {
  const groups = [group('a', 'Fruta'), group('b', 'Limpieza', { isFood: false })]
  it('solo guarda los que cambian algo', () => {
    expect(
      changedGroupDrafts(
        {
          a: { name: ' Fruta ', isFood: true }, // igual (tras recortar)
          b: { name: 'Limpieza', isFood: true }, // cambia «Es comida»
          c: { name: 'Otro', isFood: true }, // grupo que ya no existe
        },
        groups,
      ),
    ).toEqual([{ id: 'b', name: 'Limpieza', isFood: true }])
    expect(changedGroupDrafts({ a: { name: '  Frutas ', isFood: true } }, groups)).toEqual([{ id: 'a', name: 'Frutas', isFood: true }])
  })
  it('un nombre vacío invalida el guardado', () => {
    expect(hasInvalidDraft({ a: { name: '   ', isFood: true } })).toBe(true)
    expect(hasInvalidDraft({ a: { name: 'x', isFood: true } })).toBe(false)
  })
})

describe('orderToRestore', () => {
  it('nada que restaurar si el orden no cambió', () => {
    expect(orderToRestore(['a', 'b'], [group('a', 'A'), group('b', 'B')])).toBeNull()
  })
  it('devuelve el orden de entrada sin los grupos borrados', () => {
    expect(orderToRestore(['a', 'b', 'c'], [group('b', 'B'), group('a', 'A')])).toEqual(['a', 'b'])
  })
  it('los grupos nuevos no cuentan como cambio', () => {
    expect(orderToRestore(['a', 'b'], [group('a', 'A'), group('n', 'N'), group('b', 'B')])).toBeNull()
  })
})
