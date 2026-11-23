import { describe, expect, it } from 'vitest'
import { recipeToShareText } from '../../src/lib/shareRecipe'
import type { Ingredient, Recipe, Tag } from '../../src/lib/collections'

const ing = (id: string, name: string): Ingredient => ({ id, name, groupId: null, inPantry: true, createdAt: 0 })
const byId = new Map([ing('a', 'Lentejas'), ing('b', 'Pimiento rojo'), ing('c', 'Sal')].map((i) => [i.id, i]))
const tags: Tag[] = [
  { id: 't1', name: 'Plato único', createdAt: 0 },
  { id: 't2', name: 'De cuchara', createdAt: 0 },
]
const base: Recipe = {
  id: 'r',
  title: 'Lentejas con verduras',
  instructions: '1. Pica la verdura.\n2. Cuece 40 minutos.',
  ingredients: [
    { ingredientId: 'a', quantity: '300', unit: 'g' },
    { ingredientId: 'b', quantity: '1/2', unit: '' },
    { ingredientId: 'c', quantity: '', unit: '', optional: true },
  ],
  tagIds: ['t1', 't2'],
  createdAt: 0,
}

describe('recipeToShareText', () => {
  it('da el formato de WhatsApp: título en negrita, etiquetas en cursiva, ingredientes con viñeta y preparación', () => {
    expect(recipeToShareText(base, byId, tags)).toBe(
      [
        '*Lentejas con verduras*',
        '_De cuchara · Plato único_',
        '',
        '*Ingredientes*',
        '• Lentejas — 300 g',
        '• Pimiento rojo — 1/2',
        '• Sal (opcional)',
        '',
        '*Preparación*',
        '1. Pica la verdura.',
        '2. Cuece 40 minutos.',
      ].join('\n'),
    )
  })

  it('omite lo que no hay: sin etiquetas, sin preparación y sin los ingredientes eliminados', () => {
    const r: Recipe = { ...base, tagIds: [], instructions: '  ', ingredients: [{ ingredientId: 'a', quantity: '', unit: '' }, { ingredientId: 'borrado', quantity: '2', unit: 'uds' }] }
    expect(recipeToShareText(r, byId, tags)).toBe(['*Lentejas con verduras*', '', '*Ingredientes*', '• Lentejas'].join('\n'))
  })

  it('una receta sin ingredientes ni preparación se queda en el título', () => {
    expect(recipeToShareText({ ...base, tagIds: undefined, instructions: '', ingredients: [] }, byId, tags)).toBe('*Lentejas con verduras*')
  })

  it('ordena las etiquetas como la app: primero las ordenadas a mano, luego alfabético ignorando el emoji', () => {
    const t: Tag[] = [
      { id: 'z', name: '🌶️ Picante', createdAt: 0 },
      { id: 'a', name: 'Asiática', createdAt: 0 },
      { id: 'm', name: 'Cena', createdAt: 0, order: 0 },
      { id: 'f', name: '🍰 Fría', createdAt: 0 },
    ]
    const r: Recipe = { ...base, tagIds: ['z', 'f', 'a', 'm'] }
    expect(recipeToShareText(r, byId, t).split('\n')[1]).toBe('_Cena · Asiática · 🍰 Fría · 🌶️ Picante_')
  })

  it('ignora etiquetas que ya no existen', () => {
    expect(recipeToShareText({ ...base, tagIds: ['t1', 'borrada'] }, byId, tags).split('\n')[1]).toBe('_Plato único_')
  })
})
