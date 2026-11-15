import { describe, expect, it } from 'vitest'
import { findTag, legacyTagId, planImportTags, planLegacyMigration, sortTags } from '../../src/lib/tags'
import type { Recipe, Tag } from '../../src/lib/collections'

const tag = (id: string, name: string): Tag => ({ id, name, createdAt: 0 })
const rec = (id: string, extra: Partial<Recipe>): Recipe => ({ id, title: id, instructions: '', ingredients: [], createdAt: 0, ...extra })

describe('tags', () => {
  it('ordena ignorando el emoji inicial', () => {
    expect(sortTags([tag('1', 'Postre'), tag('2', '🍰 Dulce'), tag('3', 'Fría')]).map((t) => t.name)).toEqual(['🍰 Dulce', 'Fría', 'Postre'])
  })
  it('encuentra sin tildes ni mayúsculas', () => {
    expect(findTag([tag('1', 'Fría')], 'FRIA')?.id).toBe('1')
  })
  it('migra las etiquetas antiguas: crea una por nombre y no toca las ya migradas', () => {
    const plan = planLegacyMigration(
      [rec('a', { tags: ['Postre', 'Fría'] }), rec('b', { tags: ['postre'] }), rec('c', { tags: ['X'], tagIds: [] }), rec('d', {})],
      [tag('t9', 'Fría')],
    )
    expect(plan.newTags).toEqual([{ id: legacyTagId('Postre'), name: 'Postre' }])
    expect(plan.updates).toEqual([
      { recipeId: 'a', tagIds: [legacyTagId('Postre'), 't9'] },
      { recipeId: 'b', tagIds: [legacyTagId('Postre')] },
    ])
  })
  it('al importar reutiliza las existentes y crea solo las nuevas (una vez)', () => {
    let n = 0
    const plan = planImportTags(['fria', 'Postre', 'postre', ' '], [tag('t1', 'Fría')], () => 'n' + ++n)
    expect(plan.newTags).toEqual([{ id: 'n1', name: 'Postre' }])
    expect(plan.idByKey.get('fria')).toBe('t1')
    expect(plan.idByKey.get('postre')).toBe('n1')
  })
})
