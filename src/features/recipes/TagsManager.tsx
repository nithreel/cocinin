import { useState, type FormEvent, type HTMLAttributes, type PointerEvent, type KeyboardEvent, useRef } from 'react'
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
  dragging,
  rowRef,
  handle,
}: {
  tag: Tag
  tags: Tag[]
  uses: number
  dragging: boolean
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
    <li
      ref={rowRef}
      className={'py-2 ' + (dragging ? 'relative z-10 rounded-md bg-emerald-50 shadow-md dark:bg-moss-800' : '')}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Mover «${tag.name}» (arrastra, o usa ↑ ↓)`}
          {...handle}
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M2 3.5h10M2 7h10M2 10.5h10" />
          </svg>
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
          {tag.name}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {uses === 1 ? '1 receta' : `${uses} recetas`}
          </span>
        </span>
        {!confirming && (
          <>
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
  // durante el arrastre se muestra el orden provisional; al soltar se guarda
  const [dragId, setDragId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[] | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())

  async function save(ids: string[]) {
    try {
      await reorderTags(ids)
    } catch (err) {
      console.error(err)
      setError('No se pudo cambiar el orden.')
    }
  }

  function handleFor(id: string): HTMLAttributes<HTMLButtonElement> {
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragId(id)
        setDraft(sorted.map((t) => t.id))
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        if (dragId !== id || !draft) return
        // la fila de destino es la primera cuya mitad queda por debajo del puntero
        let target = draft.length - 1
        for (let i = 0; i < draft.length; i++) {
          const el = rows.current.get(draft[i])
          if (el) {
            const rect = el.getBoundingClientRect()
            if (e.clientY < rect.top + rect.height / 2) {
              target = i
              break
            }
          }
        }
        const from = draft.indexOf(id)
        if (target === from) return
        const next = draft.filter((x) => x !== id)
        next.splice(target, 0, id)
        setDraft(next)
      },
      onPointerUp: () => {
        if (dragId === id && draft && draft.join() !== sorted.map((t) => t.id).join()) void save(draft)
        setDragId(null)
        setDraft(null)
      },
      onPointerCancel: () => {
        setDragId(null)
        setDraft(null)
      },
      // teclado: con el asa enfocada, ↑ y ↓ mueven la etiqueta
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        void save(moveId(sorted.map((t) => t.id), id, e.key === 'ArrowUp' ? -1 : 1))
      },
    }
  }

  const byId = new Map(tags.map((t) => [t.id, t]))
  const shown = draft ? draft.map((id) => byId.get(id)).filter((t): t is Tag => !!t) : sorted

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
          {shown.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              tags={tags}
              uses={usesOf(t.id)}
              dragging={dragId === t.id}
              rowRef={(el) => {
                if (el) rows.current.set(t.id, el)
                else rows.current.delete(t.id)
              }}
              handle={handleFor(t.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
