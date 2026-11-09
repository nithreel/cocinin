import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDelete } from '../../components/DeleteButton'
import KebabMenu from '../../components/KebabMenu'
import StickyHeader from '../../components/StickyHeader'
import Switch from '../../components/Switch'
import { BellIcon } from '../../components/icons'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import { usersCol, type Member, type Note } from '../../lib/collections'
import { defaultRemindAt, formatRemind, joinDateTime, splitDateTime } from '../../lib/noteTime'
import { scrollMainToTop } from '../../lib/scroll'
import { memberName } from '../../lib/members'
import { addNote, deleteNote, updateNote, useNotes, type NoteValues } from './data'

const inputClasses =
  'field'

function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  useEffect(
    () =>
      onSnapshot(query(usersCol, orderBy('createdAt')), (snap) =>
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member)),
      ),
    [],
  )
  return members
}

function NoteForm({
  members,
  initial,
  submitLabel,
  onSubmit,
  onDone,
}: {
  members: Member[]
  initial?: Note
  submitLabel: string
  onSubmit: (values: NoteValues) => Promise<void>
  onDone: () => void
}) {
  const { user } = useAuth()
  const start = useMemo(() => splitDateTime(initial?.remindAt ?? defaultRemindAt()), [initial])
  const [text, setText] = useState(initial?.text ?? '')
  const [notify, setNotify] = useState(initial?.notify ?? false)
  const [time, setTime] = useState(start.time)
  const [date, setDate] = useState(start.date)
  // por defecto reciben el aviso todos; en una nota existente, los que ya tenía elegidos
  const [chosen, setChosen] = useState<Set<string> | null>(initial ? new Set(initial.recipients) : null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recipients = chosen ?? new Set(members.map((m) => m.id))

  function toggleRecipient(id: string, on: boolean) {
    const next = new Set(recipients)
    if (on) next.add(id)
    else next.delete(id)
    setChosen(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!text.trim()) return
    const remindAt = notify ? joinDateTime(date, time) : null
    if (notify) {
      if (Number.isNaN(remindAt)) return setError('Elige hora y fecha.')
      // se admite el minuto en curso (hora por defecto = ahora)
      if (remindAt! < Date.now() - 60_000) return setError('Esa hora ya ha pasado.')
      if (recipients.size === 0) return setError('Elige a quién avisar.')
    }
    setSubmitting(true)
    try {
      await onSubmit({ text: text.trim(), notify, remindAt, recipients: notify ? [...recipients] : [] })
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="note-text">
        Nota
      </label>
      <textarea
        id="note-text"
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Sacar pollo del congelador…"
        className={inputClasses + ' mb-4 w-full'}
      />

      <div className="mb-3 flex items-center gap-3">
        <Switch checked={notify} onChange={setNotify} label="Avisar a una hora" />
        <span className="text-sm text-gray-900 dark:text-gray-100">Avisar a una hora</span>
      </div>

      {notify && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input type="time" required step={60} lang="es-ES" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora" className={inputClasses} />
            <span className="text-sm text-gray-500 dark:text-gray-400">del</span>
            <input type="date" required lang="es-ES" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Fecha" className={inputClasses} />
          </div>

          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Avisar a</p>
          <ul className="mb-4 divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-moss-800 dark:border-moss-700">
            {members.map((m) => (
              <li key={m.id} className="flex items-center px-3">
                <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3 text-sm text-gray-900 dark:text-gray-100">
                  <input type="checkbox" checked={recipients.has(m.id)} onChange={(e) => toggleRecipient(m.id, e.target.checked)} />
                  <span className="min-w-0 truncate">
                    {memberName(m)}
                    {m.id === user?.uid && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(tú)</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? 'Guardando…' : submitLabel}
        </button>
        <button type="button" onClick={onDone} className={cancelButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function NoteCard({ note, members }: { note: Note; members: Member[] }) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  if (editing) {
    return (
      <NoteForm
        members={members}
        initial={note}
        submitLabel="Guardar cambios"
        onSubmit={(v) => updateNote(note.id, v)}
        onDone={() => setEditing(false)}
      />
    )
  }
  const names = note.recipients.map((id) => (() => {
    const m = members.find((x) => x.id === id)
    return m ? (m.alias?.trim() || m.email.split('@')[0]) : '?'
  })())
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-800 dark:bg-moss-900">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{note.text}</p>
        <KebabMenu
          items={[
            { label: 'Editar', onClick: () => setEditing(true) },
            { label: 'Eliminar', onClick: () => setConfirmingDelete(true), danger: true },
          ]}
        />
      </div>
      {note.notify && note.remindAt && (
        <p
          className={
            'mt-2 flex items-center gap-1.5 text-xs ' +
            (note.sent ? 'text-gray-500 dark:text-gray-400' : 'text-emerald-700 dark:text-emerald-400')
          }
        >
          <BellIcon size={16} />
          <span>
            {formatRemind(note.remindAt)}
            {note.sent ? ' · avisada' : ''} · {names.join(', ')}
          </span>
        </p>
      )}
      {confirmingDelete && (
        <ConfirmDelete
          className="mt-2"
          question="¿Eliminar la nota?"
          busy={deleting}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteNote(note.id)
            } finally {
              setDeleting(false)
            }
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  )
}

export default function NotesPage() {
  const { notes, loading } = useNotes()
  const members = useMembers()
  const [showForm, setShowForm] = useState(false)

  // primero las que tienen aviso pendiente (la más próxima arriba), luego las simples, al final las ya avisadas
  const ordered = useMemo(() => {
    const rank = (n: Note) => (n.notify && !n.sent ? 0 : n.notify ? 2 : 1)
    return [...notes].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? (a.remindAt ?? 0) - (b.remindAt ?? 0) : b.createdAt - a.createdAt))
  }, [notes])

  return (
    <div>
      <StickyHeader title="Notas">
        <button type="button" onClick={() => {
            setShowForm((v) => !v)
            scrollMainToTop()
          }} className={primaryButton}>
          + Nota
        </button>
      </StickyHeader>

      {showForm && (
        <NoteForm members={members} submitLabel="Guardar nota" onSubmit={addNote} onDone={() => setShowForm(false)} />
      )}

      {loading && <p className="text-gray-500 dark:text-gray-400">Cargando…</p>}
      {!loading && notes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay notas. Crea la primera con "+ Nota".</p>
      )}

      <ul className="space-y-3">
        {ordered.map((n) => (
          <NoteCard key={n.id} note={n} members={members} />
        ))}
      </ul>
    </div>
  )
}
