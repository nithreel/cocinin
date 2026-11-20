import { useState, type CSSProperties, type FormEvent, type HTMLAttributes } from 'react'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import { ConfirmDelete } from '../../components/DeleteButton'
import RemoveButton from '../../components/RemoveButton'
import { XIcon } from '../../components/icons'
import type { Recipe, Tag } from '../../lib/collections'
import { findTag, sortTags } from '../../lib/tags'
import { useDragReorder } from '../../lib/useDragReorder'
import DragHandle from '../../components/DragHandle'
import { addTag, deleteTag, renameTag, reorderTags } from './data'

const inputClass =
  'min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100'

function TagRow({
  tag,
  tags,
  uses,
  dragging,
  style,
  rowRef,
  handle,
}: {
  tag: Tag
  tags: Tag[]
  uses: number
  dragging: boolean
  style?: CSSProperties
  rowRef: (el: HTMLLIElement | null) => void
  handle: HTMLAttributes<HTMLButtonElement>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const other = findTag(tags, n)
    if (other && other.id !== tag.id) {
      setError('Ya existe una etiqueta con ese nombre.')
      return
    }
    setBusy(true)
    try {
      await renameTag(tag.id, n)
      setEditing(false)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteTag(tag.id)
    } catch (err) {
      console.error(err)
      setError('No se pudo eliminar. Inténtalo de nuevo.')
      setBusy(false)
      setConfirming(false)
    }
  }

  if (editing) {
    return (
      <li className="py-2">
        <form onSubmit={save} className="flex items-center gap-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className={inputClass} />
          <button type="submit" disabled={busy} className={primaryButton}>
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setName(tag.name)
              setError(null)
            }}
            className={cancelButton}
          >
            Cancelar
          </button>
        </form>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </li>
    )
  }

  return (
    <li
      ref={rowRef}
      style={style}
      className={'py-2 ' + (dragging ? 'relative z-10 rounded-md bg-emerald-50 shadow-md dark:bg-moss-800' : '')}
    >
      <div className="flex items-center gap-2">
        <DragHandle label={`Mover «${tag.name}» (arrastra, o usa ↑ ↓)`} handle={handle} />
        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
          {tag.name}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {uses === 1 ? '1 receta' : `${uses} recetas`}
          </span>
        </span>
        {!confirming && (
          <>
            <button type="button" onClick={() => setEditing(true)} className={cancelButton}>
              Editar
            </button>
            <RemoveButton onRemove={() => setConfirming(true)} label={`Eliminar «${tag.name}»`} title="Eliminar" row={false} />
          </>
        )}
      </div>
      {confirming && (
        <ConfirmDelete
          className="mt-1"
          question={
            uses > 0
              ? `¿Eliminar «${tag.name}»? Se quitará de ${uses === 1 ? 'su receta' : `las ${uses} recetas`}.`
              : `¿Eliminar «${tag.name}»?`
          }
          questionClassName="w-full"
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  )
}

/** Panel para crear, renombrar y borrar etiquetas (borrar las quita también de las recetas). */
export default function TagsManager({
  tags,
  recipes,
  onClose,
}: {
  tags: Tag[]
  recipes: Recipe[]
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (findTag(tags, n)) {
      setError('Ya existe una etiqueta con ese nombre.')
      return
    }
    setBusy(true)
    try {
      await addTag(n, tags.some((t) => t.order !== undefined) ? Math.max(...tags.map((t) => t.order ?? -1)) + 1 : undefined)
      setName('')
      setError(null)
    } catch (err) {
      console.error(err)
      setError('No se pudo crear la etiqueta. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const { shown, draggingId, rowStyle, handleFor, rowRef } = useDragReorder(sortTags(tags), (ids) => {
    reorderTags(ids).catch((err) => {
      console.error(err)
      setError('No se pudo cambiar el orden. Inténtalo de nuevo.')
    })
  })

  const usesOf = (id: string) => recipes.filter((r) => r.tagIds?.includes(id)).length

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Etiquetas</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className={cancelButton + ' -mr-2'}>
          <XIcon />
        </button>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Nueva etiqueta"
          className={inputClass}
        />
        <button type="submit" disabled={busy || !name.trim()} className={outlineButton}>
          Añadir
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {tags.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Aún no hay etiquetas. Añade la primera arriba.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-moss-800">
          {shown.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              tags={tags}
              uses={usesOf(t.id)}
              dragging={draggingId === t.id}
              style={rowStyle(t.id)}
              rowRef={rowRef(t.id)}
              handle={handleFor(t.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
