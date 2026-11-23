import { describe, expect, it } from 'vitest'
import { greeting } from '../../src/lib/greeting'

const at = (h: number, m: number) => new Date(2026, 10, 23, h, m)
const text = (g: ReturnType<typeof greeting>) => g.before + g.name + g.after

describe('greeting', () => {
  it('cambia de saludo justo en las 6:00, 12:00 y 20:00', () => {
    expect(text(greeting('', at(5, 59)))).toBe('¡Buenas noches!')
    expect(text(greeting('', at(6, 0)))).toBe('¡Buenos días!')
    expect(text(greeting('', at(11, 59)))).toBe('¡Buenos días!')
    expect(text(greeting('', at(12, 0)))).toBe('¡Buenas tardes!')
    expect(text(greeting('', at(19, 59)))).toBe('¡Buenas tardes!')
    expect(text(greeting('', at(20, 0)))).toBe('¡Buenas noches!')
  })
  it('sin alias (vacío o solo espacios) no pone nombre', () => {
    expect(greeting('', at(9, 0))).toEqual({ before: '¡Buenos días!', name: '', after: '' })
    expect(greeting('   ', at(9, 0)).name).toBe('')
  })
  it('alias de hasta 12 caracteres, recortado; de 13 o más se omite', () => {
    expect(greeting(' Abcdefghijkl ', at(9, 0))).toEqual({ before: '¡Buenos días, ', name: 'Abcdefghijkl', after: '!' })
    expect(greeting('Abcdefghijklm', at(9, 0))).toEqual({ before: '¡Buenos días!', name: '', after: '' })
  })
})
