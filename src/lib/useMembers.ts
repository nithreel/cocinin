import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { usersCol, type Member } from './collections'

/** Miembros del hogar (colección `users`), por orden de alta. Se escucha solo mientras la pantalla que lo usa está abierta. */
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    return onSnapshot(query(usersCol, orderBy('createdAt')), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member))
      setLoading(false)
    })
  }, [])
  return { members, loading }
}
