import { describe, expect, it } from 'vitest'
import { defaultRemindAt, reminderChanged } from '../../src/lib/noteTime'
import { sortByText } from '../../src/lib/search'

describe('sortByText', () => {
  it('ignora mayúsculas y tildes', () => {
    const r = sortByText(['Zanahoria', 'aceite', 'Ácido', 'Berenjena'], (x) => x)
    expect(r).toEqual(['aceite', 'Ácido', 'Berenjena', 'Zanahoria'])
  })
})

describe('notas', () => {
  it('propone la próxima hora en punto', () => {
    const now = new Date(2026, 10, 18, 17, 23).getTime()
    expect(new Date(defaultRemindAt(now)).getHours()).toBe(18)
    expect(new Date(defaultRemindAt(now)).getMinutes()).toBe(0)
  })
  it('solo rearma si cambia hora, activación o destinatarios', () => {
    const a = { notify: true, remindAt: 1000, recipients: ['x', 'y'] }
    expect(reminderChanged(a, { ...a, recipients: ['y', 'x'] })).toBe(false)
    expect(reminderChanged(a, { ...a, remindAt: 2000 })).toBe(true)
    expect(reminderChanged(a, { ...a, recipients: ['x'] })).toBe(true)
  })
})

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
