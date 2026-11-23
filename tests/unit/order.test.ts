import { describe, expect, it } from 'vitest'
import { nextOrder } from '../../src/lib/order'

describe('nextOrder', () => {
  it('sin orden manual no pone ninguno', () => {
    expect(nextOrder([{}, {}])).toBeUndefined()
    expect(nextOrder([])).toBeUndefined()
  })
  it('con orden manual va detrás del mayor, aunque haya elementos sin orden', () => {
    expect(nextOrder([{ order: 0 }, { order: 4 }, {}])).toBe(5)
  })
  it('un único elemento en la posición 0 deja el siguiente en 1', () => {
    expect(nextOrder([{ order: 0 }])).toBe(1)
  })
})
