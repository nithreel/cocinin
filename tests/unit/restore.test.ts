import { describe, expect, it } from 'vitest'
import { parseBackup } from '../../src/lib/restore'

describe('parseBackup', () => {
  it('lee una copia válida e ignora users', () => {
    const r = parseBackup(JSON.stringify({ exportedAt: 'x', ingredients: [{ id: 'a', name: 'Leche' }], users: [{ id: 'u' }] }))
    expect(r.ingredients).toEqual([{ id: 'a', data: { name: 'Leche' } }])
    expect('users' in r).toBe(false)
  })
  it('rechaza archivos que no son una copia', () => {
    expect(() => parseBackup('no json')).toThrow()
    expect(() => parseBackup('{"foo":1}')).toThrow()
    expect(() => parseBackup('{"recipes":[{"title":"sin id"}]}')).toThrow()
  })
})

describe('parseBackup: validación', () => {
  it('rechaza documentos sin los campos imprescindibles', () => {
    expect(() => parseBackup('{"ingredients":[{"id":"a"}]}')).toThrow(/nombre/)
    expect(() => parseBackup('{"recipes":[{"id":"a","title":"x"}]}')).toThrow()
    expect(() => parseBackup('{"purchaseHistory":[{"id":"a","ingredientName":"x"}]}')).toThrow()
  })
})
