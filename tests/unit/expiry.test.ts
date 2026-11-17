import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { thawAgo, soonMarkLabel, getExpiryInfo, localDateString, remainingLabel } from '../../src/lib/expiry'
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

describe('descongelado', () => {
  const H = 3600000
  const thawed = (hoursAgo: number, extra = {}) =>
    ingredient({ thawedAt: Date.now() - hoursAgo * H - 1000, expiryMode: 'sinceStocked', stockedDate: '2026-10-01', ...extra })
  it('pisa «Comprado hace» y cuenta en horas', () => {
    expect(getExpiryInfo(thawed(5))).toEqual({ label: 'Descongelado hace 5 h', status: 'thawing' })
  })
  it('a las 24 h ámbar y a las 48 h rojo', () => {
    expect(getExpiryInfo(thawed(24))).toEqual({ label: 'Descongelado hace 1 día', status: 'soon' })
    expect(getExpiryInfo(thawed(30))?.label).toBe('Descongelado hace 1 día y 6 h')
    expect(getExpiryInfo(thawed(47))?.status).toBe('soon')
    expect(getExpiryInfo(thawed(51))).toEqual({ label: 'Descongelado hace 2 días y 3 h', status: 'expired' })
  })
  it('prima sobre la fecha de caducidad', () => {
    expect(getExpiryInfo(thawed(5, { expiryMode: 'date', expiryDate: '2026-10-12' }))?.label).toBe('Descongelado hace 5 h')
    expect(thawAgo(0)).toBe('ahora')
  })
  it('congelado de nuevo no cuenta', () => {
    expect(getExpiryInfo(thawed(49, { frozen: true }))?.label).toBe('Congelado')
  })
})

describe('soonMarkLabel', () => {
  it('cuenta días naturales desde la marca', () => {
    const now = new Date(2026, 10, 17, 12)
    expect(soonMarkLabel(ingredient({ useSoonAt: new Date(2026, 10, 17, 9).getTime() }), now)).toBe('Marcado hoy')
    expect(soonMarkLabel(ingredient({ useSoonAt: new Date(2026, 10, 16, 23).getTime() }), now)).toBe('Marcado hace 1 día')
    expect(soonMarkLabel(ingredient({ useSoonAt: new Date(2026, 10, 12, 8).getTime() }), now)).toBe('Marcado hace 5 días')
    expect(soonMarkLabel(ingredient({ useSoon: true }), now)).toBe('Marcado')
  })
})
