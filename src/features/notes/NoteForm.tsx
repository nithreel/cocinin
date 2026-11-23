import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import Switch from '../../components/Switch'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import type { Member, Note } from '../../lib/collections'
import { isPushConfigured } from '../../lib/push'
import { defaultRemindAt, joinDateTime, reminderChanged, splitDateTime } from '../../lib/noteTime'
import { memberName } from '../../lib/members'
import type { NoteValues } from './data'
import { inputBase } from '../../components/inputStyles'

const inputClasses = inputBase + ' px-2 py-1.5 text-sm'

/** Crear o editar una nota (`initial`). Con aviso exige hora, fecha y destinatarios; la hora debe ser futura salvo
 *  que no se toque al editar. */
export default function NoteForm({
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
      if (recipients.size === 0) return setError('Elige a quién avisar.')
      // una nota ya avisada se puede corregir sin tocar la hora; si se cambia, debe ser futura
      const unchanged = initial && !reminderChanged(initial, { notify, remindAt, recipients: [...recipients] })
      if (!unchanged && remindAt! < Date.now() - 60_000) return setError('Esa hora ya ha pasado.')
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
        placeholder="Escribe la nota aquí…"
        className={inputClasses + ' mb-4 w-full'}
      />

      {/* sin servicio de avisos (clave VAPID) el aviso nunca llegaría: se oculta, salvo en notas que ya lo tienen */}
      {(isPushConfigured || notify) && (
        <div className="mb-3 flex items-center gap-3">
          <Switch checked={notify} onChange={setNotify} label="Avisar a una hora" />
          <span className="text-sm text-gray-900 dark:text-gray-100">Avisar a una hora</span>
        </div>
      )}

      {notify && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input autoComplete="off" type="time" required step={60} lang="es-ES" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora" className={inputClasses} />
            <span className="text-sm text-gray-500 dark:text-gray-400">del</span>
            <input autoComplete="off" type="date" required lang="es-ES" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Fecha" className={inputClasses} />
          </div>

          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Avisar a</p>
          <ul className="mb-4 divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-moss-800 dark:border-moss-700">
            {members.map((m) => (
              <li key={m.id} className="flex items-center px-3">
                <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3 text-sm text-gray-900 dark:text-gray-100">
                  <input autoComplete="off" type="checkbox" className="cb h-5 w-5" checked={recipients.has(m.id)} onChange={(e) => toggleRecipient(m.id, e.target.checked)} />
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
