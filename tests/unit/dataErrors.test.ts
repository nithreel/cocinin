import { describe, expect, it } from 'vitest'
import { firstDataError, setDataErrorFor } from '../../src/lib/dataErrors'

describe('errores de los listeners', () => {
  it('sin errores no hay aviso', () => {
    expect(firstDataError({})).toBeNull()
  })
  it('una lectura correcta de otro listener no borra el aviso del caído', () => {
    let e = setDataErrorFor({}, 'notes', 'permission-denied')
    e = setDataErrorFor(e, 'groups', null)
    expect(firstDataError(e)).toBe('permission-denied')
  })
  it('lo borra el propio listener al volver a leer bien', () => {
    const e = setDataErrorFor(setDataErrorFor({}, 'notes', 'x'), 'notes', null)
    expect(firstDataError(e)).toBeNull()
  })
  it('sin cambios devuelve el mismo objeto (no repinta)', () => {
    const e = setDataErrorFor({}, 'notes', 'x')
    expect(setDataErrorFor(e, 'notes', 'x')).toBe(e)
    expect(setDataErrorFor(e, 'groups', null)).toBe(e)
  })
})
