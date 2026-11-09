import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { currentUid } from '../../firebase'
import { notesCol } from '../../lib/collections'

export { useNotes } from '../../lib/AppDataContext'

export interface NoteValues {
  text: string
  notify: boolean
  remindAt: number | null
  recipients: string[]
}

export async function addNote(values: NoteValues) {
  await addDoc(notesCol, { ...values, sent: false, createdAt: Date.now(), by: currentUid() })
}

/** Al editar se rearma el aviso (sent: false), por si se cambia la hora. */
export async function updateNote(id: string, values: NoteValues) {
  await updateDoc(doc(notesCol, id), { ...values, sent: false })
}

export async function deleteNote(id: string) {
  await deleteDoc(doc(notesCol, id))
}
