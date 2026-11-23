import { describe, expect, it } from 'vitest'
import { orderNotes, recipientNames } from '../../src/lib/noteOrder'
import type { Member, Note } from '../../src/lib/collections'

const note = (id: string, extra: Partial<Note> = {}): Note =>
  ({ id, text: id, notify: false, remindAt: null, recipients: [], sent: false, createdAt: 0, ...extra }) as Note

describe('orderNotes', () => {
  it('pendientes por hora, luego simples (más nueva arriba) y al final las avisadas', () => {
    const notes = [
      note('simple-vieja', { createdAt: 1 }),
      note('avisada', { notify: true, sent: true, remindAt: 5, createdAt: 9 }),
      note('pendiente-tarde', { notify: true, remindAt: 300 }),
      note('simple-nueva', { createdAt: 2, done: true }),
      note('pendiente-pronto', { notify: true, remindAt: 100 }),
    ]
    expect(orderNotes(notes).map((n) => n.id)).toEqual(['pendiente-pronto', 'pendiente-tarde', 'simple-nueva', 'simple-vieja', 'avisada'])
  })
  it('no modifica la lista original', () => {
    const notes = [note('a', { createdAt: 1 }), note('b', { createdAt: 2 })]
    orderNotes(notes)
    expect(notes.map((n) => n.id)).toEqual(['a', 'b'])
  })
})

describe('recipientNames', () => {
  it('alias, o el correo completo (como memberName), o «?» si ya no es miembro', () => {
    const members = [
      { id: 'u1', email: 'ana@example.com', alias: ' Ana ' },
      { id: 'u2', email: 'luis@example.com' },
    ] as Member[]
    expect(recipientNames(note('n', { recipients: ['u1', 'u2', 'u3'] }), members)).toEqual(['Ana', 'luis@example.com', '?'])
  })
})
