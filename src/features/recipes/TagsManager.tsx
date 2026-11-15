import { useState, type FormEvent } from 'react'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import { ConfirmDelete } from '../../components/DeleteButton'
import { XIcon } from '../../components/icons'
import type { Recipe, Tag } from '../../lib/collections'
import { findTag, moveId, sortTags } from '../../lib/tags'
import { addTag, deleteTag, renameTag, reorderTags } from './data'

const inputClass =
  'min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100'

function TagRow({
  tag,
  tags,
  uses,
  first,
  last,
  onMove,
}: {
  tag: Tag
  tags: Tag[]
  uses: number
  first: boolean
  last: boolean
  onMove: (delta: -1 | 1) => void
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
      setError('No se pudo guardar.')
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
      setError('No se pudo eliminar.')
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
    <li className="py-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
          {tag.name}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {uses === 1 ? '1 receta' : `${uses} recetas`}
          </span>
        </span>
        {!confirming && (
          <>
            <button
              type="button"
              disabled={first}
              onClick={() => onMove(-1)}
              aria-label={`Subir «${tag.name}»`}
              className={cancelButton + ' disabled:opacity-30'}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={last}
              onClick={() => onMove(1)}
              aria-label={`Bajar «${tag.name}»`}
              className={cancelButton + ' disabled:opacity-30'}
            >
              ↓
            </button>
            <button type="button" onClick={() => setEditing(true)} className={cancelButton}>
              Renombrar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              Eliminar
            </button>
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
      setError('No se pudo crear la etiqueta.')
    } finally {
      setBusy(false)
    }
  }

  const sorted = sortTags(tags)

  async function move(id: string, delta: -1 | 1) {
    try {
      await reorderTags(moveId(sorted.map((t) => t.id), id, delta))
    } catch (err) {
      console.error(err)
      setError('No se pudo cambiar el orden.')
    }
  }

  const usesOf = (id: string) => recipes.filter((r) => r.tagIds?.includes(id)).length

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Etiquetas</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className={cancelButton + ' -mr-2'}>
          <XIcon />
        </button>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Nueva etiqueta (Postre, Fría, 🍲 Caliente…)"
          className={inputClass}
        />
        <button type="submit" disabled={busy || !name.trim()} className={outlineButton}>
          Crear
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {tags.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Aún no hay etiquetas.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-moss-800">
          {sorted.map((t, i) => (
            <TagRow
              key={t.id}
              tag={t}
              tags={tags}
              uses={usesOf(t.id)}
              first={i === 0}
              last={i === sorted.length - 1}
              onMove={(d) => move(t.id, d)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
