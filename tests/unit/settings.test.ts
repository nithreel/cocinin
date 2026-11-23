import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseSettings,
  readSettings,
  resolveReduceMotion,
  writeSettings,
  type SettingsStorage,
} from '../../src/lib/settings'

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
