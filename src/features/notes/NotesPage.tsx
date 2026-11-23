import { useMemo, useState } from 'react'
import Collapse from '../../components/Collapse'
import { ConfirmDelete } from '../../components/DeleteButton'
import ListSkeleton from '../../components/ListSkeleton'
import { scrollMainToTop } from '../../lib/scroll'
import StickyHeader from '../../components/StickyHeader'
import { dangerTextButton, rowIconButton } from '../../components/buttonStyles'
import RemoveButton from '../../components/RemoveButton'
import IconsReveal from '../../components/IconsReveal'
import SwapLabelButton from '../../components/SwapLabelButton'
import { BellIcon, PencilIcon } from '../../components/icons'
import { useLongPress } from '../../lib/useLongPress'
import type { Member, Note } from '../../lib/collections'
import { formatRemind } from '../../lib/noteTime'
import { useMembers } from '../../lib/useMembers'
import { orderNotes, recipientNames } from '../../lib/noteOrder'
import { addNote, deleteDoneNotes, deleteNote, setNoteDone, updateNote, useNotes } from './data'
import NoteForm from './NoteForm'

function NoteCard({
  note,
  members,
  organizing,
  onStartOrganize,
}: {
  note: Note
  members: Member[]
  /** modo «organizar» (pulsación larga en una nota): lápiz y ✕ en vez del menú */
  organizing: boolean
  onStartOrganize: () => void
}) {
  const longPress = useLongPress(onStartOrganize)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  if (editing) {
    return (
      <NoteForm
        members={members}
        initial={note}
        submitLabel="Guardar cambios"
        onSubmit={(v) => updateNote(note, v)}
        onDone={() => setEditing(false)}
      />
    )
  }
  const names = recipientNames(note, members)
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-800 dark:bg-moss-900">
      <div className="flex items-start justify-between gap-2">
        <label
          className="flex min-w-0 flex-1 cursor-pointer select-none items-start gap-3"
          title={organizing ? undefined : 'Mantén pulsado para editar o eliminar'}
          {...(organizing ? {} : longPress.handlers)}
          // tras una pulsación larga, el clic que sigue no debe marcar la nota como hecha
          onClick={(e) => {
            if (longPress.consumeFired()) e.preventDefault()
          }}
        >
          <input autoComplete="off"
            type="checkbox"
            checked={!!note.done}
            onChange={(e) => setNoteDone(note.id, e.target.checked)}
            aria-label="Marcar como hecha"
            className="cb mt-0.5 h-4 w-4 shrink-0 max-md:h-5 max-md:w-5"
          />
          <p className={'whitespace-pre-wrap ' + (note.done ? 'text-gray-500 line-through dark:text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
            {note.text}
          </p>
        </label>
        <IconsReveal show={organizing && !confirmingDelete} className="flex shrink-0 items-center gap-4">
            <button type="button" onClick={() => setEditing(true)} aria-label="Editar la nota" title="Editar la nota" className={rowIconButton}>
              <PencilIcon />
            </button>
            <RemoveButton trash row={false} onRemove={() => setConfirmingDelete(true)} label="Eliminar la nota" title="Eliminar la nota" />
        </IconsReveal>
      </div>
      {note.notify && note.remindAt && (
        <p
          className={
            'mt-2 flex items-center gap-1.5 text-xs ' +
            (note.sent ? 'text-gray-500 dark:text-gray-400' : 'text-emerald-700 dark:text-emerald-400')
          }
        >
          <span className="scale-75">
            <BellIcon />
          </span>
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

/** Notas del hogar: crear, marcar como hechas, borrar las hechas y, con pulsación larga, editar o eliminar una. */
export default function NotesPage() {
  const { notes, loading } = useNotes()
  const { members } = useMembers()
  const [showForm, setShowForm] = useState(false)
  // modo «organizar»: se entra manteniendo pulsada una nota; «Listo» sale
  const [organizing, setOrganizing] = useState(false)
  const [confirmingDone, setConfirmingDone] = useState(false)
  const doneCount = notes.filter((n) => n.done).length

  // primero las que tienen aviso pendiente (la más próxima arriba), luego las simples, al final las ya avisadas
  // (marcar una como hecha no la mueve de sitio)
  const ordered = useMemo(() => orderNotes(notes), [notes])

  return (
    <div>
      <StickyHeader
        title="Notas"
        below={
          confirmingDone && doneCount > 0 && (
            // la confirmación va en su propia línea bajo la cabecera: en un móvil estrecho no cabría junto a los botones
            <ConfirmDelete
              question={doneCount === 1 ? '¿Eliminar la nota?' : `¿Eliminar las ${doneCount} notas?`}
              questionClassName="w-full"
              onConfirm={() => {
                deleteDoneNotes(notes)
                setConfirmingDone(false)
              }}
              onCancel={() => setConfirmingDone(false)}
            />
          )
        }
      >
        {/* elimina las marcadas como hechas; junto a «+ Nota» para no desplazar la lista */}
        {doneCount > 0 && !confirmingDone && (
          <button type="button" onClick={() => setConfirmingDone(true)} className={dangerTextButton}>
            Eliminar
          </button>
        )}
        <SwapLabelButton
          labelA="+ Nota"
          labelB="Listo"
          showB={organizing}
          onClick={
            organizing
              ? () => setOrganizing(false)
              : () => {
                  setShowForm((v) => !v)
                  scrollMainToTop()
                }
          }
        />
      </StickyHeader>

      <Collapse open={showForm}>
        <NoteForm members={members} submitLabel="Guardar nota" onSubmit={addNote} onDone={() => setShowForm(false)} />
      </Collapse>

      {loading && <ListSkeleton />}
      {!loading && notes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay notas. Añade la primera con «+ Nota».</p>
      )}

      <ul className="space-y-3">
        {ordered.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            members={members}
            organizing={organizing}
            onStartOrganize={() => {
              setShowForm(false)
              setOrganizing(true)
            }}
          />
        ))}
      </ul>
    </div>
  )
}
