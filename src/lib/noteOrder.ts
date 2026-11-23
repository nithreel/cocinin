import type { Member, Note } from './collections'

/** Primero las que tienen aviso pendiente (la más próxima arriba), luego las simples (la más nueva arriba) y al final
 *  las ya avisadas. Marcar una como hecha no la mueve de sitio. */
export function orderNotes(notes: Note[]): Note[] {
  const rank = (n: Note) => (n.notify && !n.sent ? 0 : n.notify ? 2 : 1)
  return [...notes].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? (a.remindAt ?? 0) - (b.remindAt ?? 0) : b.createdAt - a.createdAt))
}

/** Nombres cortos de los destinatarios de una nota: el alias o, si no tiene, el correo hasta la @; «?» si ya no está. */
export function recipientNames(note: Note, members: Member[]): string[] {
  return note.recipients.map((id) => (() => {
    const m = members.find((x) => x.id === id)
    return m ? (m.alias?.trim() || m.email.split('@')[0]) : '?'
  })())
}
