import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseSettings,
  readSettings,
  resolveReduceMotion,
  writeSettings,
  type SettingsStorage,
} from '../../src/lib/settings'
import { keepScreenOn, type VisibilitySource, type WakeSentinel } from '../../src/lib/wakeLock'

function memoryStorage(initial: Record<string, string> = {}): SettingsStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

describe('ajustes del dispositivo', () => {
  it('sin nada guardado: valores por defecto (animaciones como el sistema, pantalla normal, vibración sí)', () => {
    expect(parseSettings(null)).toEqual({ theme: 'system', motion: 'system', wakeLock: false, vibration: true })
    expect(readSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS)
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('JSON corrupto o de otro tipo: valores por defecto', () => {
    for (const raw of ['{no es json', '[]', '"texto"', '42', 'null', '']) expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS)
  })

  it('campos inválidos se descartan uno a uno; los válidos se conservan', () => {
    expect(parseSettings(JSON.stringify({ theme: 'verde', motion: 'rápido', wakeLock: 'sí', vibration: false }))).toEqual({
      theme: 'system',
      motion: 'system',
      wakeLock: false,
      vibration: false,
    })
    expect(parseSettings(JSON.stringify({ theme: 'dark', motion: 'reduce', wakeLock: true }))).toEqual({ theme: 'dark', motion: 'reduce', wakeLock: true, vibration: true })
  })

  it('guarda y vuelve a leer lo mismo', () => {
    const st = memoryStorage()
    writeSettings(st, { theme: 'light', motion: 'full', wakeLock: true, vibration: false })
    expect(JSON.parse(st.data[SETTINGS_KEY])).toEqual({ theme: 'light', motion: 'full', wakeLock: true, vibration: false })
    expect(readSettings(st)).toEqual({ theme: 'light', motion: 'full', wakeLock: true, vibration: false })
  })

  it('almacenamiento que lanza (modo privado, bloqueado): no rompe', () => {
    const broken: SettingsStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readSettings(broken)).toEqual(DEFAULT_SETTINGS)
    expect(() => writeSettings(broken, DEFAULT_SETTINGS)).not.toThrow()
  })

  it('resolución de «reducir movimiento»: sistema / reducidas / completas', () => {
    expect(resolveReduceMotion('system', false)).toBe(false)
    expect(resolveReduceMotion('system', true)).toBe(true)
    expect(resolveReduceMotion('reduce', false)).toBe(true)
    expect(resolveReduceMotion('reduce', true)).toBe(true)
    expect(resolveReduceMotion('full', false)).toBe(false)
    expect(resolveReduceMotion('full', true)).toBe(false)
  })
})

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
