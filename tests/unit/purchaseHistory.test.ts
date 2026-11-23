import { describe, expect, it } from 'vitest'
import { formatRelativeDate, groupPurchaseHistory, wholePurchases } from '../../src/lib/purchaseHistory'
import type { PurchaseHistoryEntry } from '../../src/lib/collections'

const entry = (id: string, purchasedAt: number): PurchaseHistoryEntry => ({ id, ingredientName: id, purchasedAt })

describe('groupPurchaseHistory', () => {
  it('junta las entradas consecutivas del mismo momento en una compra', () => {
    const batches = groupPurchaseHistory([entry('leche', 200), entry('pan', 200), entry('huevos', 100)])
    expect(batches.map((b) => [b.key, b.purchasedAt, b.entries.map((e) => e.id)])).toEqual([
      [200, 200, ['leche', 'pan']],
      [100, 100, ['huevos']],
    ])
  })
  it('sin entradas no hay compras', () => {
    expect(groupPurchaseHistory([])).toEqual([])
  })
})

describe('formatRelativeDate', () => {
  const day = 86400000
  const now = new Date(2026, 10, 23, 12, 0).getTime()
  it('hoy, ayer y hace N días', () => {
    expect(formatRelativeDate(now - 1000, now)).toBe('hoy')
    expect(formatRelativeDate(now + day, now)).toBe('hoy')
    expect(formatRelativeDate(now - day, now)).toBe('ayer')
    expect(formatRelativeDate(now - 6 * day, now)).toBe('hace 6 días')
  })
  it('a partir de una semana, la fecha corta', () => {
    expect(formatRelativeDate(new Date(2026, 10, 5, 12, 0).getTime(), now)).toBe(
      new Date(2026, 10, 5, 12, 0).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    )
  })
})

describe('wholePurchases', () => {
  it('por debajo del límite lo deja todo', () => {
    const e = [entry('a', 2), entry('b', 1)]
    expect(wholePurchases(e, 3)).toBe(e)
  })
  it('en el límite descarta la compra más antigua, que puede venir cortada', () => {
    expect(wholePurchases([entry('a', 2), entry('b', 1), entry('c', 1)], 3).map((x) => x.id)).toEqual(['a'])
  })
  it('si una sola compra llena la página, la conserva (antes el historial salía vacío)', () => {
    expect(wholePurchases([entry('a', 1), entry('b', 1), entry('c', 1)], 3).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})
