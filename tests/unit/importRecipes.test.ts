import { describe, expect, it } from 'vitest'
import { parseImport, resolveRecipes } from '../../src/lib/importRecipes'
import type { Ingredient, Recipe } from '../../src/lib/collections'

const ing = (id: string, name: string): Ingredient => ({ id, name, groupId: null, inPantry: false, createdAt: 0 })
const pantry = [ing('1', 'Ricota'), ing('2', 'Limón'), ing('3', 'Sal'), ing('4', 'Sal')]
const valid = { title: 'Tarta', instructions: '1. Mezclar: todo.', ingredients: [{ name: 'ricota', quantity: 250, unit: 'gramos' }] }

describe('parseImport', () => {
  it('acepta {recipes}, lista, receta suelta y bloque ```json', () => {
    expect(parseImport(JSON.stringify({ recipes: [valid] })).ok).toBe(true)
    expect(parseImport(JSON.stringify([valid])).ok).toBe(true)
    expect(parseImport(JSON.stringify(valid)).ok).toBe(true)
    expect(parseImport('```json\n' + JSON.stringify([valid]) + '\n```').ok).toBe(true)
  })
  it('convierte cantidades numéricas a texto y rellena opcionales', () => {
    const r = parseImport(JSON.stringify([valid]))
    expect(r.ok && r.recipes[0].ingredients[0]).toEqual({ name: 'ricota', quantity: '250', unit: 'gramos', optional: false })
  })
  it('rechaza JSON roto, títulos vacíos, ingredientes vacíos y tipos erróneos', () => {
    expect(parseImport('{').ok).toBe(false)
    expect(parseImport(JSON.stringify([{ ...valid, title: ' ' }])).ok).toBe(false)
    expect(parseImport(JSON.stringify([{ ...valid, ingredients: [] }])).ok).toBe(false)
    expect(parseImport(JSON.stringify([{ ...valid, ingredients: [{ name: 'Sal', optional: 'sí' }] }])).ok).toBe(false)
    expect(parseImport(JSON.stringify([{ ...valid, instructions: 5 }])).ok).toBe(false)
  })
  it('limita el número de recetas', () => {
    expect(parseImport(JSON.stringify(Array(21).fill(valid))).ok).toBe(false)
  })
})

describe('resolveRecipes', () => {
  const run = (names: string[], existing: Recipe[] = []) => {
    const r = parseImport(JSON.stringify([{ ...valid, ingredients: names.map((name) => ({ name })) }]))
    if (!r.ok) throw new Error(r.error)
    return resolveRecipes(r.recipes, pantry, existing)[0]
  }
  it('casa sin tildes ni mayúsculas', () => {
    expect(run(['LIMON', 'ricota']).ingredients.map((i) => i.ingredientId)).toEqual(['2', '1'])
  })
  it('lista como desconocidos los que no existen, sin crearlos', () => {
    expect(run(['Ricota', 'Anís']).unknown).toEqual(['Anís'])
  })
  it('un nombre duplicado en la despensa es ambiguo y los repetidos se señalan', () => {
    expect(run(['Sal']).unknown).toEqual(['Sal (ambiguo)'])
    expect(run(['Limón', 'limon']).unknown).toEqual(['limon (repetido)'])
  })
  it('detecta título ya existente', () => {
    const existing = [{ id: 'x', title: 'tarta', instructions: '', ingredients: [], createdAt: 0 }]
    expect(run(['Ricota'], existing).duplicateTitle).toBe(true)
  })
})
