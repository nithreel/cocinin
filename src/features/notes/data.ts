import { deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { currentUid, db } from '../../firebase'
import { notesCol, type Note } from '../../lib/collections'
import { reminderChanged } from '../../lib/noteTime'

export { useNotes } from '../../lib/AppDataContext'

export interface NoteValues {
  text: string
  notify: boolean
  remindAt: number | null
  recipients: string[]
}

export async function addNote(values: NoteValues) {
  void setDoc(doc(notesCol), { ...values, sent: false, createdAt: Date.now(), by: currentUid() })
}

/** Al editar solo se rearma el aviso (sent: false) si cambia la hora, los destinatarios o la activación. */
export async function updateNote(note: Note, values: NoteValues) {
  const rearm = reminderChanged(note, values)
  void updateDoc(doc(notesCol, note.id), rearm ? { ...values, sent: false } : { ...values })
}

export async function setNoteDone(id: string, done: boolean) {
  void updateDoc(doc(notesCol, id), { done })
}

/** Borra todas las notas marcadas como hechas (lee de la caché local, que mantiene el listener). */
export async function deleteDoneNotes(notes: Note[]) {
  const batch = writeBatch(db)
  notes.filter((n) => n.done).forEach((n) => batch.delete(doc(notesCol, n.id)))
  void batch.commit()
}

export async function deleteNote(id: string) {
  void deleteDoc(doc(notesCol, id))
}
