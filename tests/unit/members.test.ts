import { describe, expect, it } from 'vitest'
import { memberName } from '../../src/lib/members'

describe('memberName', () => {
  it('con alias, el alias', () => {
    expect(memberName({ email: 'ana@example.com', alias: 'Ana' })).toBe('Ana')
  })
  it('el alias se recorta; si solo tiene espacios, cuenta como sin alias', () => {
    expect(memberName({ email: 'ana@example.com', alias: '  Ana  ' })).toBe('Ana')
    expect(memberName({ email: 'ana@example.com', alias: '   ' })).toBe('ana@example.com')
  })
  it('sin alias, el correo completo', () => {
    expect(memberName({ email: 'luis@example.com' })).toBe('luis@example.com')
  })
})
