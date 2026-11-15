import { useRef, useState, type CSSProperties, type FormEvent, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import { ConfirmDelete } from '../../components/DeleteButton'
import { XIcon } from '../../components/icons'
import type { Recipe, Tag } from '../../lib/collections'
import { findTag, moveId, sortTags } from '../../lib/tags'
import { addTag, deleteTag, renameTag, reorderTags } from './data'

const inputClass =
  'min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100'

interface DragState {
  id: string
  dy: number
  target: number
  ids: string[]
  tops: number[]
  heights: number[]
  startY: number
}

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
      style={style}
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
  // Arrastre: la fila sigue al puntero y las demás se apartan con una transición; al soltar se guarda el orden.
  const [drag, setDrag] = useState<DragState | null>(null)
  // orden recién soltado: se mantiene un momento hasta que llega el cambio de Firestore (evita un salto)
  const [settled, setSettled] = useState<string[] | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())

  async function save(ids: string[]) {
    try {
      await reorderTags(ids)
    } catch (err) {
      console.error(err)
      setError('No se pudo cambiar el orden.')
    }
  }

  function targetFor(sn: DragState, dy: number) {
    const id = sn.id
    const from = sn.ids.indexOf(id)
    const center = sn.tops[from] + sn.heights[from] / 2 + dy
    let target = from
    sn.ids.forEach((_, j) => {
      if (j === from) return
      const c = sn.tops[j] + sn.heights[j] / 2
      if (j < from && center < c) target = Math.min(target, j)
      if (j > from && center > c) target = Math.max(target, j)
    })
    return target
  }

  function handleFor(id: string): HTMLAttributes<HTMLButtonElement> {
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const ids = sorted.map((t) => t.id)
        const rects = ids.map((i) => rows.current.get(i)!.getBoundingClientRect())
        setSettled(null)
        setDrag({
          id,
          dy: 0,
          target: ids.indexOf(id),
          ids,
          tops: rects.map((x) => x.top),
          heights: rects.map((x) => x.height),
          startY: e.clientY,
        })
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        if (drag?.id !== id) return
        const dy = e.clientY - drag.startY
        setDrag({ ...drag, dy, target: targetFor(drag, dy) })
      },
      onPointerUp: () => {
        if (drag?.id === id) {
          const ids = [...drag.ids]
          const from = ids.indexOf(id)
          ids.splice(from, 1)
          ids.splice(drag.target, 0, id)
          if (ids.join() !== drag.ids.join()) {
            setSettled(ids)
            setTimeout(() => setSettled(null), 800)
            void save(ids)
          }
        }
        setDrag(null)
      },
      onPointerCancel: () => {
        setDrag(null)
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
  const shown = settled && !drag ? settled.map((i) => byId.get(i)).filter((t): t is Tag => !!t) : sorted

  /** Desplazamiento de cada fila mientras se arrastra: la arrastrada sigue al puntero; las demás se apartan. */
  function rowStyle(id: string): CSSProperties | undefined {
    if (!drag) return undefined
    if (id === drag.id) return { transform: `translateY(${drag.dy}px)`, transition: 'none' }
    const from = drag.ids.indexOf(drag.id)
    const j = drag.ids.indexOf(id)
    const h = drag.heights[from] + 1
    let shift = 0
    if (drag.target > from && j > from && j <= drag.target) shift = -h
    if (drag.target < from && j >= drag.target && j < from) shift = h
    return { transform: `translateY(${shift}px)`, transition: 'transform 150ms ease' }
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
          {shown.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              tags={tags}
              uses={usesOf(t.id)}
              dragging={drag?.id === t.id}
              style={rowStyle(t.id)}
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
