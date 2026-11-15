import { describe, expect, it } from 'vitest'
import { findTag, legacyTagId, moveId, planImportTags, planLegacyMigration, sortTags } from '../../src/lib/tags'
import type { Recipe, Tag } from '../../src/lib/collections'

const tag = (id: string, name: string): Tag => ({ id, name, createdAt: 0 })
const rec = (id: string, extra: Partial<Recipe>): Recipe => ({ id, title: id, instructions: '', ingredients: [], createdAt: 0, ...extra })

describe('tags', () => {
  it('ordena ignorando el emoji inicial', () => {
    expect(sortTags([tag('1', 'Postre'), tag('2', '🍰 Dulce'), tag('3', 'Fría')]).map((t) => t.name)).toEqual(['🍰 Dulce', 'Fría', 'Postre'])
  })
  it('respeta el orden manual y deja el resto al final', () => {
    const t = (id: string, name: string, order?: number) => ({ ...tag(id, name), order })
    expect(sortTags([t('1', 'A'), t('2', 'B', 1), t('3', 'C', 0), t('4', 'Z')]).map((x) => x.id)).toEqual(['3', '2', '1', '4'])
  })
  it('mueve un id arriba o abajo sin salirse', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c'])
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
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
