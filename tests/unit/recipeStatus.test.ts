import { describe, expect, it } from 'vitest'
import { countMissingRequired, filterRecipes, getRecipeStatus, ingredientsToBuy, isUsable } from '../../src/lib/recipeStatus'
import type { Ingredient, Recipe, RecipeIngredient, ShoppingItem } from '../../src/lib/collections'

const ing = (id: string, extra: Partial<Ingredient> = {}): Ingredient => ({ id, name: id, groupId: null, inPantry: true, createdAt: 0, ...extra })
const ri = (ingredientId: string, optional = false): RecipeIngredient => ({ ingredientId, quantity: '', unit: '', optional })
const recipe = (title: string, ingredients: RecipeIngredient[], tagIds?: string[]): Recipe => ({
  id: title,
  title,
  instructions: '',
  ingredients,
  tagIds,
  createdAt: 0,
})
const item = (ingredientId: string): ShoppingItem => ({ id: 'l-' + ingredientId, ingredientId, checked: false, addedAt: 0 })

const byId = new Map(
  [
    ing('huevo'),
    ing('patata', { name: 'Patata' }),
    ing('cebolla', { inPantry: false }),
    ing('caducado', { expiryMode: 'date', expiryDate: '2000-01-01' }),
    ing('congelado', { frozen: true }),
  ].map((i) => [i.id, i]),
)

describe('isUsable', () => {
  it('vale lo que tienes, congelado incluido, salvo lo caducado', () => {
    expect(isUsable(byId.get('huevo'))).toBe(true)
    expect(isUsable(byId.get('congelado'))).toBe(true)
    expect(isUsable(byId.get('cebolla'))).toBe(false)
    expect(isUsable(byId.get('caducado'))).toBe(false)
    expect(isUsable(undefined)).toBe(false)
  })
})

describe('getRecipeStatus y countMissingRequired', () => {
  it('completa, parcial (solo faltan opcionales) o falta algo', () => {
    expect(getRecipeStatus(recipe('a', [ri('huevo'), ri('patata')]), byId)).toBe('full')
    expect(getRecipeStatus(recipe('b', [ri('huevo'), ri('cebolla', true)]), byId)).toBe('partial')
    expect(getRecipeStatus(recipe('c', [ri('cebolla', true), ri('caducado')]), byId)).toBe('missing')
    expect(getRecipeStatus(recipe('d', [ri('borrado')]), byId)).toBe('missing')
  })
  it('cuenta solo lo necesario', () => {
    expect(countMissingRequired(recipe('c', [ri('cebolla', true), ri('caducado'), ri('borrado'), ri('huevo')]), byId)).toBe(2)
  })
})

describe('ingredientsToBuy', () => {
  it('lo necesario que falta y no está ya en la lista; sin opcionales ni borrados', () => {
    const r = recipe('t', [ri('huevo'), ri('cebolla'), ri('caducado'), ri('patata', true), ri('borrado')])
    expect(ingredientsToBuy(r.ingredients, byId, []).map((i) => i.id)).toEqual(['cebolla', 'caducado'])
    expect(ingredientsToBuy(r.ingredients, byId, [item('cebolla')]).map((i) => i.id)).toEqual(['caducado'])
  })
})

describe('filterRecipes', () => {
  const recipes = [
    recipe('Tortilla', [ri('huevo'), ri('patata')], ['t1']),
    recipe('Sopa de cebolla', [ri('cebolla')], ['t1', 't2']),
  ]
  const f = (search: string, onlyReady = false, tagIds: string[] = []) =>
    filterRecipes(recipes, { search, onlyReady, tagIds }, byId).map((r) => r.title)
  it('busca en el título y en el nombre de los ingredientes', () => {
    expect(f('')).toEqual(['Tortilla', 'Sopa de cebolla'])
    expect(f('sopa')).toEqual(['Sopa de cebolla'])
    expect(f('patata')).toEqual(['Tortilla'])
  })
  it('«Puedo hacerla» y etiquetas (todas a la vez)', () => {
    expect(f('', true)).toEqual(['Tortilla'])
    expect(f('', false, ['t1', 't2'])).toEqual(['Sopa de cebolla'])
  })
})
