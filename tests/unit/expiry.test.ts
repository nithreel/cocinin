import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getExpiryInfo, localDateString, remainingLabel } from '../../src/lib/expiry'
import type { Ingredient } from '../../src/lib/collections'

function ingredient(over: Partial<Ingredient>): Ingredient {
  return { id: 'i', name: 'Leche', groupId: null, inPantry: true, createdAt: 0, ...over }
}

describe('localDateString', () => {
  it('usa la fecha local, no la UTC', () => {
    // 00:30 hora local del 15 de marzo: en UTC sería aún el día 14 en zonas con offset positivo
    expect(localDateString(new Date(2026, 2, 15, 0, 30))).toBe('2026-03-15')
  })
  it('rellena mes y día con ceros', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('getExpiryInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 13, 12, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('no muestra nada si el ingrediente está agotado', () => {
    expect(getExpiryInfo(ingredient({ inPantry: false, expiryMode: 'date', expiryDate: '2026-10-14' }))).toBeNull()
  })
  it('sin caducidad no muestra nada', () => {
    expect(getExpiryInfo(ingredient({ expiryMode: 'none' }))).toBeNull()
  })
  it('congelado: se muestra «Congelado» y no se avisa de caducidad', () => {
    expect(getExpiryInfo(ingredient({ frozen: true, expiryMode: 'date', expiryDate: '2026-10-12' }))).toEqual({ label: 'Congelado', status: 'frozen' })
  })
  it('agotado no puede mostrarse congelado', () => {
    expect(getExpiryInfo(ingredient({ inPantry: false, frozen: true }))).toBeNull()
  })
  it('caducado', () => {
    expect(getExpiryInfo(ingredient({ expiryMode: 'date', expiryDate: '2026-10-12' }))).toEqual({ label: 'Caducado', status: 'expired' })
  })
  it('caduca hoy', () => {
    expect(getExpiryInfo(ingredient({ expiryMode: 'date', expiryDate: '2026-10-13' }))).toEqual({ label: 'Caduca hoy', status: 'soon' })
  })
  it('caduca pronto (≤ 3 días) con singular y plural', () => {
    expect(getExpiryInfo(ingredient({ expiryMode: 'date', expiryDate: '2026-10-14' }))?.label).toBe('Caduca en 1 día')
    expect(getExpiryInfo(ingredient({ expiryMode: 'date', expiryDate: '2026-10-16' }))).toEqual({ label: 'Caduca en 3 días', status: 'soon' })
  })
  it('caducidad lejana', () => {
    expect(getExpiryInfo(ingredient({ expiryMode: 'date', expiryDate: '2026-11-13' }))?.status).toBe('ok')
  })
  it('desde la compra', () => {
    expect(getExpiryInfo(ingredient({ expiryMode: 'sinceStocked', stockedDate: '2026-10-13' }))?.label).toBe('Comprado hoy')
    expect(getExpiryInfo(ingredient({ expiryMode: 'sinceStocked', stockedDate: '2026-10-08' }))?.label).toBe('Comprado hace 5 días')
  })
})

describe('remainingLabel', () => {
  it('singular con una unidad o menos', () => {
    for (const q of ['1', '1 bote', '1/2', '0,5 kg', 'media lata', 'un paquete']) expect(remainingLabel(q)).toBe('Queda')
  })
  it('plural en el resto', () => {
    for (const q of ['2 botes', '500 g', '1,5 l', '1-2 latas', '10']) expect(remainingLabel(q)).toBe('Quedan')
  })
})
