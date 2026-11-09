import { describe, expect, it } from 'vitest'
import { compareVersions } from '../../src/lib/releases'

describe('compareVersions', () => {
  it('compara numéricamente, no como texto', () => {
    expect(compareVersions('v1.10.0', '1.9.2')).toBeGreaterThan(0)
    expect(compareVersions('1.1.0', 'v1.2.0')).toBeLessThan(0)
  })
  it('iguales y con partes que faltan', () => {
    expect(compareVersions('v1.1.0', '1.1.0')).toBe(0)
    expect(compareVersions('1.1', '1.1.0')).toBe(0)
  })
  it('ignora el sufijo de preversión', () => {
    expect(compareVersions('v1.2.0-beta', '1.2.0')).toBe(0)
  })
})
