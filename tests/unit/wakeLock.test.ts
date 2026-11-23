import { describe, expect, it, vi } from 'vitest'
import { keepScreenOn, type VisibilitySource, type WakeSentinel } from '../../src/lib/wakeLock'

describe('mantener la pantalla encendida', () => {
  function fakeDoc(state = 'visible') {
    let fn: (() => void) | null = null
    const doc: VisibilitySource & { set(s: string): void; listening(): boolean } = {
      visibilityState: state,
      addEventListener: (_t, f) => void (fn = f),
      removeEventListener: () => void (fn = null),
      set(s) {
        this.visibilityState = s
        fn?.()
      },
      listening: () => fn !== null,
    }
    return doc
  }
  function fakeApi() {
    const sentinels: WakeSentinel[] = []
    const api = {
      request: vi.fn(async () => {
        const s: WakeSentinel = { released: false, release: vi.fn(async () => void (s.released = true)) }
        sentinels.push(s)
        return s
      }),
    }
    return { api, sentinels }
  }
  const tick = () => new Promise((r) => setTimeout(r, 0))

  it('sin soporte: no hace nada y la limpieza no falla', () => {
    const stop = keepScreenOn(undefined, fakeDoc())
    expect(() => stop()).not.toThrow()
  })

  it('pide el bloqueo al activarse y lo suelta al desactivarse', async () => {
    const { api, sentinels } = fakeApi()
    const doc = fakeDoc()
    const stop = keepScreenOn(api, doc)
    await tick()
    expect(api.request).toHaveBeenCalledTimes(1)
    stop()
    expect(sentinels[0].released).toBe(true)
    expect(doc.listening()).toBe(false)
  })

  it('con la pestaña oculta no lo pide; al volver a verse (el navegador lo soltó) lo pide otra vez', async () => {
    const { api, sentinels } = fakeApi()
    const doc = fakeDoc('hidden')
    const stop = keepScreenOn(api, doc)
    await tick()
    expect(api.request).not.toHaveBeenCalled()
    doc.set('visible')
    await tick()
    expect(api.request).toHaveBeenCalledTimes(1)
    // el navegador lo suelta al ocultarse
    sentinels[0].released = true
    doc.set('hidden')
    await tick()
    expect(api.request).toHaveBeenCalledTimes(1)
    doc.set('visible')
    await tick()
    expect(api.request).toHaveBeenCalledTimes(2)
    // visible otra vez con el bloqueo vigente: no lo duplica
    doc.set('visible')
    await tick()
    expect(api.request).toHaveBeenCalledTimes(2)
    stop()
  })

  it('si el navegador lo rechaza, no rompe y lo reintenta al volver a la pestaña', async () => {
    const doc = fakeDoc()
    const api = { request: vi.fn(async (): Promise<WakeSentinel> => Promise.reject(new Error('NotAllowedError'))) }
    const stop = keepScreenOn(api, doc)
    await tick()
    doc.set('hidden')
    doc.set('visible')
    await tick()
    expect(api.request).toHaveBeenCalledTimes(2)
    stop()
  })

  it('desactivado mientras se pedía: se suelta en cuanto llega', async () => {
    const { api, sentinels } = fakeApi()
    const stop = keepScreenOn(api, fakeDoc())
    stop()
    await tick()
    expect(sentinels[0].released).toBe(true)
  })
})
