import type { Member, Note } from './collections'
import { memberName } from './members'

/** Primero las que tienen aviso pendiente (la más próxima arriba), luego las simples (la más nueva arriba) y al final
 *  las ya avisadas. Marcar una como hecha no la mueve de sitio. */
export function orderNotes(notes: Note[]): Note[] {
  const rank = (n: Note) => (n.notify && !n.sent ? 0 : n.notify ? 2 : 1)
  return [...notes].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? (a.remindAt ?? 0) - (b.remindAt ?? 0) : b.createdAt - a.createdAt))
}

/** Nombres de los destinatarios de una nota, como en el resto de la app (`memberName`: alias o correo completo);
 *  «?» si ya no es miembro. */
export function recipientNames(note: Note, members: Member[]): string[] {
  return note.recipients.map((id) => {
    const m = members.find((x) => x.id === id)
    return m ? memberName(m) : '?'
  })
}
