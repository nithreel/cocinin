import { describe, expect, it } from 'vitest'
import {
  createCollector,
  createShoppingBurst,
  expiryMessage,
  inSendWindow,
  newlyExpiring,
  purchaseMessage,
  recipients,
  spentMessage,
} from '../../notifier/lib.mjs'

const NOW = new Date('2026-10-29T12:00:00')
const ing = (expiryDate: string, extra = {}) => ({
  name: 'Leche',
  inPantry: true,
  expiryMode: 'date',
  expiryDate,
  ...extra,
})

describe('lista de la compra', () => {
  it('un solo añadido no avisa; el segundo avisa una vez', () => {
    const b = createShoppingBurst(15 * 60_000)
    expect(b.add(1_000)).toBe(false)
    expect(b.add(2_000)).toBe(true)
    expect(b.add(3_000)).toBe(false)
  })
  it('la ventana se renueva con cada añadido', () => {
    const b = createShoppingBurst(15 * 60_000)
    b.add(0)
    expect(b.add(10 * 60_000)).toBe(true)
    expect(b.add(24 * 60_000)).toBe(false) // 14 min desde el anterior: sigue la misma tanda
  })
  it('pasado el enfriamiento, una tanda nueva vuelve a empezar sin avisar con el primero', () => {
    const b = createShoppingBurst(15 * 60_000)
    b.add(0)
    b.add(1_000)
    expect(b.add(60 * 60_000)).toBe(false)
    expect(b.add(60 * 60_000 + 1_000)).toBe(true)
  })
})

describe('caducidad', () => {
  it('entra en aviso con 3 días o menos, incluido caducado y hoy', () => {
    const map = new Map([
      ['a', ing('2026-10-29')],
      ['b', ing('2026-11-01')],
      ['c', ing('2026-11-02')],
      ['d', ing('2026-10-20')],
    ])
    expect(newlyExpiring(map, new Set(), NOW).map((i) => i.id)).toEqual(['d', 'a', 'b'])
  })
  it('no repite lo ya avisado, pero cambiar la fecha lo rearma', () => {
    const map = new Map([['a', ing('2026-10-30')]])
    const first = newlyExpiring(map, new Set(), NOW)
    expect(newlyExpiring(map, new Set(first.map((f) => f.key)), NOW)).toEqual([])
    map.set('a', ing('2026-10-31'))
    expect(newlyExpiring(map, new Set(first.map((f) => f.key)), NOW)).toHaveLength(1)
  })
  it('ignora congelados, agotados y los de «desde que se compró»', () => {
    const map = new Map([
      ['a', ing('2026-10-30', { frozen: true })],
      ['b', ing('2026-10-30', { inPantry: false })],
      ['c', { name: 'X', inPantry: true, expiryMode: 'sinceStocked', stockedDate: '2026-10-01' }],
    ])
    expect(newlyExpiring(map, new Set(), NOW)).toEqual([])
  })
  it('solo se envía de 8:00 a 22:00', () => {
    expect(inSendWindow(new Date('2026-10-29T07:59:00'))).toBe(false)
    expect(inSendWindow(new Date('2026-10-29T08:00:00'))).toBe(true)
    expect(inSendWindow(new Date('2026-10-29T22:00:00'))).toBe(false)
  })
})

describe('mensajes y destinatarios', () => {
  it('textos en singular y plural', () => {
    expect(spentMessage(['Leche']).body).toBe('Se ha gastado Leche')
    expect(spentMessage(['Leche', 'Pan', 'Leche']).body).toBe('Se han gastado 2: Leche, Pan')
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((name, days) => ({ name, days }))
    expect(expiryMessage(many).body).toBe(
      '6 ingredientes caducan pronto: a (hoy), b (mañana), c (en 2 días), d (en 3 días) y 2 más',
    )
    expect(expiryMessage([{ name: 'Leche', days: 0 }]).body).toBe('Leche caduca hoy')
    expect(expiryMessage([{ name: 'Leche', days: 1 }]).body).toBe('Leche caduca mañana')
    expect(expiryMessage([{ name: 'Leche', days: 3 }]).body).toBe('Leche caduca en 3 días')
    expect(expiryMessage([{ name: 'Leche', days: -2 }]).body).toBe('Leche ha caducado')
    expect(purchaseMessage(1).body).toBe('1 producto añadido a la despensa')
    expect(purchaseMessage(12).body).toBe('12 productos añadidos a la despensa')
  })
  it('no avisa a quien lo provoca ni a quien lo tiene desactivado', () => {
    const subs = [
      { uid: 'yo', prefs: { lista: true } },
      { uid: 'ella', prefs: { lista: true } },
      { uid: 'ella', prefs: { lista: false } },
    ]
    expect(recipients(subs, 'lista', 'yo')).toHaveLength(1)
    expect(recipients(subs, 'lista', null)).toHaveLength(2)
  })
})

describe('agrupación', () => {
  it('entrega todo junto tras un tiempo sin novedades', () => {
    let fire: (() => void) | null = null
    const out: number[][] = []
    const c = createCollector(
      60_000,
      (b: number[]) => out.push(b),
      ((fn: () => void) => ((fire = fn), 1)) as never,
      (() => {}) as never,
    )
    c.push(1)
    c.push(2)
    fire!()
    expect(out).toEqual([[1, 2]])
  })
})
