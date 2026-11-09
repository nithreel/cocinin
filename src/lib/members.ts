import type { Member } from './collections'

/** Nombre a mostrar de un miembro: su alias si lo tiene, si no el correo. */
export function memberName(m: Pick<Member, 'email' | 'alias'>) {
  return m.alias?.trim() || m.email
}
