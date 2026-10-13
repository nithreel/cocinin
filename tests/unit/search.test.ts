import { describe, expect, it } from 'vitest'
import { matchesSearch, normalizeText } from '../../src/lib/search'

describe('búsqueda sin tildes', () => {
  it('normaliza tildes, diéresis y mayúsculas', () => {
    expect(normalizeText('Sésamo TOSTADO')).toBe('sesamo tostado')
    expect(normalizeText('Pingüino')).toBe('pinguino')
  })
  it('encuentra con o sin tilde en cualquier sentido', () => {
    expect(matchesSearch('Sésamo tostado', 'sesamo')).toBe(true)
    expect(matchesSearch('Sesamo tostado', 'sésamo')).toBe(true)
    expect(matchesSearch('Limón', 'LIMON')).toBe(true)
  })
  it('la ñ también se encuentra escribiendo n', () => {
    expect(matchesSearch('Piña', 'pina')).toBe(true)
    expect(matchesSearch('Piña', 'piña')).toBe(true)
  })
  it('ignora los espacios sobrantes del término', () => {
    expect(matchesSearch('Aceite de oliva', ' aceite ')).toBe(true)
  })
})
