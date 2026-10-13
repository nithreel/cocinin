import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  addGroup,
  addIngredient,
  deleteGroup,
  deleteIngredient,
  setIngredientInPantry,
  updateGroup,
  updateIngredient,
  updateIngredientExpiry,
  useGroups,
  useIngredients,
  useRecipes,
  type ExpiryInput,
} from './data'
import type { ExpiryMode, Group, Ingredient } from '../../lib/collections'
import { CheckIcon, XIcon } from '../../components/DeleteButton'
import SearchInput from '../../components/SearchInput'
import { matchesSearch } from '../../lib/search'
import KebabMenu, { MenuPopup } from '../../components/KebabMenu'
import { expiryBadgeClasses, getExpiryInfo } from '../../lib/expiry'
import { NO_GROUP } from '../../lib/groupByPantryGroup'

const LONG_PRESS_MS = 500

function ExpiryFields({
  mode,
  date,
  onModeChange,
  onDateChange,
}: {
  mode: ExpiryMode
  date: string
  onModeChange: (mode: ExpiryMode) => void
  onDateChange: (date: string) => void
}) {
  return (
    <>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as ExpiryMode)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
      >
        <option value="none">Sin caducidad</option>
        <option value="date">Fecha de caducidad</option>
        <option value="sinceStocked">Fecha de compra</option>
      </select>
      {(mode === 'date' || mode === 'sinceStocked') && (
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />
      )}
    </>
  )
}

function IngredientRow({
  ingredient,
  groups,
  highlight,
  usedIn,
}: {
  ingredient: Ingredient
  groups: Group[]
  highlight: boolean
  /** títulos de las recetas que usan este ingrediente (para avisar antes de borrarlo) */
  usedIn: string[]
}) {
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const rowRef = useRef<HTMLLIElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(ingredient.name)
  const [groupId, setGroupId] = useState(ingredient.groupId ?? NO_GROUP)
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>(ingredient.expiryMode ?? 'none')
  const [expiryDate, setExpiryDate] = useState(ingredient.expiryDate ?? ingredient.stockedDate ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (highlight) rowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlight])

  useEffect(() => {
    if (!menuOpen) return
    // cualquier toque fuera del menú (incluso dentro de la misma fila), scroll o Escape lo cierran
    function handleDown(e: Event) {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const close = () => setMenuOpen(false)
    document.addEventListener('pointerdown', handleDown, true)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', handleDown, true)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', close, true)
    }
  }, [menuOpen])

  function cancelPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function startPress() {
    longPressed.current = false
    cancelPress()
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      longPressed.current = true
      setMenuOpen(true)
    }, LONG_PRESS_MS)
  }

  function handleInfoClick() {
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    if (!ingredient.inPantry) return
    setExpiryMode(ingredient.expiryMode ?? 'none')
    setExpiryDate(ingredient.expiryDate ?? ingredient.stockedDate ?? '')
    setEditingDates((v) => !v)
  }

  async function handleSaveDates(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateIngredientExpiry(ingredient.id, { mode: expiryMode, date: expiryDate || null })
      setEditingDates(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggle() {
    setBusy(true)
    try {
      await setIngredientInPantry(ingredient.id, !ingredient.inPantry)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteIngredient(ingredient.id)
    } finally {
      setDeleting(false)
    }
  }

  function startEdit() {
    setName(ingredient.name)
    setGroupId(ingredient.groupId ?? NO_GROUP)
    setExpiryMode(ingredient.expiryMode ?? 'none')
    setExpiryDate(ingredient.expiryDate ?? ingredient.stockedDate ?? '')
    setEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const expiry: ExpiryInput = { mode: expiryMode, date: expiryDate || null }
      await updateIngredient(ingredient.id, name.trim(), groupId === NO_GROUP ? null : groupId, expiry)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li
        className={
          'border-l-4 py-2 pl-3 pr-1 ' +
          (ingredient.inPantry ? 'border-l-emerald-500' : 'border-l-red-400')
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-32 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
            />
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
            >
              <option value={NO_GROUP}>Sin grupo</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    )
  }

  const expiryInfo = getExpiryInfo(ingredient)

  return (
    <li
      ref={rowRef}
      className={
        'relative border-l-4 py-2 pl-3 pr-1 transition-colors duration-700 ' +
        (ingredient.inPantry ? 'border-l-emerald-500' : 'border-l-red-400') +
        (highlight ? ' bg-emerald-50 dark:bg-emerald-950' : '')
      }
    >
      <div className="flex items-center justify-between gap-3">
      <div
        role={ingredient.inPantry ? 'button' : undefined}
        tabIndex={ingredient.inPantry ? 0 : undefined}
        onClick={handleInfoClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ingredient.inPantry) handleInfoClick()
        }}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => {
          e.preventDefault()
          cancelPress()
          longPressed.current = true
          setMenuOpen(true)
        }}
        className={
          'flex min-w-0 flex-1 select-none flex-col ' + (ingredient.inPantry ? 'cursor-pointer' : '')
        }
      >
        <span className={ingredient.inPantry ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {ingredient.name}
        </span>
        {expiryInfo && (
          <span className={'text-xs ' + expiryBadgeClasses(expiryInfo.status)}>{expiryInfo.label}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={ingredient.inPantry}
          aria-label={
            ingredient.inPantry
              ? `${ingredient.name}: disponible, pulsa para marcar como agotado`
              : `${ingredient.name}: agotado, pulsa para marcar como disponible`
          }
          onClick={toggle}
          disabled={busy}
          className={
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ' +
            (ingredient.inPantry ? 'bg-emerald-500' : 'bg-gray-300')
          }
        >
          <span
            className={
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ' +
              (ingredient.inPantry ? 'translate-x-6' : 'translate-x-1')
            }
          />
        </button>
        {confirmingDelete ? (
          <span className="inline-flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={deleting}
              aria-label="Confirmar eliminación"
              title="Confirmar eliminación"
              onClick={handleDelete}
              className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              title="Cancelar"
              onClick={() => setConfirmingDelete(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-moss-800"
            >
              <XIcon />
            </button>
          </span>
        ) : null}
      </div>
      </div>
      {confirmingDelete && usedIn.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Se usa en {usedIn.length === 1 ? 'la receta' : 'las recetas'}: {usedIn.join(', ')}. Si lo eliminas, seguirá
          apareciendo en {usedIn.length === 1 ? 'ella' : 'ellas'} como «(ingrediente eliminado)».
        </p>
      )}
      {editingDates && (
        <form onSubmit={handleSaveDates} className="mt-2 flex flex-wrap items-center gap-2">
          <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditingDates(false)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Cancelar
          </button>
        </form>
      )}
      {menuOpen && (
        <div ref={menuRef}>
          <MenuPopup
            className="right-12 top-8"
            onClose={() => setMenuOpen(false)}
            items={[
              { label: 'Editar', onClick: startEdit },
              { label: 'Eliminar', onClick: () => setConfirmingDelete(true), danger: true },
            ]}
          />
        </div>
      )}
    </li>
  )
}

function IsFoodCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 dark:border-moss-600 dark:bg-moss-800"
      />
      Mostrar en recetas
    </label>
  )
}

function AddGroupForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [isFood, setIsFood] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await addGroup(name.trim(), isFood)
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-moss-700 dark:bg-moss-900">
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del grupo"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />
      </div>
      <IsFoodCheckbox checked={isFood} onChange={setIsFood} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Crear
        </button>
        <button type="button" onClick={onDone} className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function AddIngredientForm({
  groups,
  onDone,
}: {
  groups: { id: string; name: string }[]
  onDone: (id?: string, groupId?: string | null) => void
}) {
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState(NO_GROUP)
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('none')
  const [expiryDate, setExpiryDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const expiry: ExpiryInput = { mode: expiryMode, date: expiryDate || null }
      const targetGroup = groupId === NO_GROUP ? null : groupId
      const id = await addIngredient(name.trim(), targetGroup, expiry)
      onDone(id, targetGroup)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-moss-700 dark:bg-moss-900">
      <div className="flex flex-wrap gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del ingrediente"
          className="min-w-40 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        >
          <option value={NO_GROUP}>Sin grupo</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Añadir
        </button>
        <button type="button" onClick={() => onDone()} className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function GroupHeader({
  section,
  isCollapsed,
  onToggleCollapsed,
}: {
  section: { id: string; name: string; items: Ingredient[]; deletable: boolean; isFood: boolean }
  isCollapsed: boolean
  onToggleCollapsed: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(section.name)
  const [isFood, setIsFood] = useState(section.isFood)
  const [saving, setSaving] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateGroup(section.id, name.trim(), isFood)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGroup(section.id)
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="mb-2 flex flex-col gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />
        <IsFoodCheckbox checked={isFood} onChange={setIsFood} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!isCollapsed}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <span aria-hidden="true" className="shrink-0 text-gray-400 dark:text-gray-500">
          {isCollapsed ? '▶' : '▼'}
        </span>
        <span className="truncate">{section.name}</span>
        <span className="shrink-0 font-normal normal-case text-gray-400 dark:text-gray-500">
          ({section.items.length})
        </span>
      </button>
      {section.deletable &&
        (confirmingDelete ? (
          <span className="inline-flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={deleting}
              aria-label="Confirmar eliminación"
              title="Confirmar eliminación"
              onClick={handleDelete}
              className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              title="Cancelar"
              onClick={() => setConfirmingDelete(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-moss-800"
            >
              <XIcon />
            </button>
          </span>
        ) : (
          <KebabMenu
            items={[
              {
                label: 'Editar',
                onClick: () => {
                  setName(section.name)
                  setEditing(true)
                },
              },
              { label: 'Eliminar', onClick: () => setConfirmingDelete(true), danger: true },
            ]}
          />
        ))}
    </div>
  )
}

export default function PantryPage() {
  const { groups, loading: loadingGroups } = useGroups()
  const { ingredients, loading: loadingIngredients } = useIngredients()
  const { recipes } = useRecipes()
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const searchActive = search.trim().length > 0

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const recipesByIngredient = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const r of recipes) {
      for (const ri of r.ingredients) map.set(ri.ingredientId, [...(map.get(ri.ingredientId) ?? []), r.title])
    }
    return map
  }, [recipes])

  function handleIngredientAdded(id?: string, groupId?: string | null) {
    setShowAddIngredient(false)
    if (!id) return
    setSearch('')
    setHighlightId(id)
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 3000)
    // el grupo destino puede estar plegado: lo desplegamos para llegar al ingrediente
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.delete(groupId ?? NO_GROUP)
      return next
    })
  }

  const sections = useMemo(() => {
    const byGroup = new Map<string, Ingredient[]>()
    const noGroup: Ingredient[] = []
    for (const ing of ingredients) {
      if (ing.groupId) {
        const list = byGroup.get(ing.groupId) ?? []
        list.push(ing)
        byGroup.set(ing.groupId, list)
      } else {
        noGroup.push(ing)
      }
    }
    const result = groups.map((g) => ({
      id: g.id,
      name: g.name,
      items: byGroup.get(g.id) ?? [],
      deletable: true,
      isFood: g.isFood ?? true,
    }))
    if (noGroup.length > 0) {
      result.push({ id: NO_GROUP, name: 'Sin grupo', items: noGroup, deletable: false, isFood: true })
    }
    return result
  }, [groups, ingredients])

  const visibleSections = useMemo(() => {
    if (!searchActive) return sections
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => matchesSearch(i.name, search)) }))
      .filter((s) => s.items.length > 0)
  }, [sections, searchActive, search])

  const loading = loadingGroups || loadingIngredients

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Despensa</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddGroup((v) => !v)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800"
          >
            + Grupo
          </button>
          <button
            type="button"
            onClick={() => setShowAddIngredient((v) => !v)}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            + Ingrediente
          </button>
        </div>
      </div>

      {showAddGroup && <AddGroupForm onDone={() => setShowAddGroup(false)} />}
      {showAddIngredient && (
        <AddIngredientForm groups={groups} onDone={handleIngredientAdded} />
      )}

      {(ingredients.length > 0 || search) && (
        <SearchInput value={search} onChange={setSearch} />
      )}

      {loading && <p className="text-gray-400 dark:text-gray-500">Cargando…</p>}

      {!loading && ingredients.length === 0 && groups.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500">
          Aún no hay ingredientes. Añade el primero con "+ Ingrediente".
        </p>
      )}

      {!loading && searchActive && visibleSections.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500">No hay ingredientes que coincidan con "{search.trim()}".</p>
      )}

      <div className="space-y-6">
        {visibleSections.map((section) => {
          const isCollapsed = !searchActive && collapsed.has(section.id)
          return (
            <section key={section.id}>
              <GroupHeader
                section={section}
                isCollapsed={isCollapsed}
                onToggleCollapsed={() => toggleCollapsed(section.id)}
              />
              {!isCollapsed &&
                (section.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 dark:border-moss-700 dark:text-gray-500">
                    Sin ingredientes en este grupo.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
                    {section.items.map((ing) => (
                      <IngredientRow
                        key={ing.id}
                        ingredient={ing}
                        groups={groups}
                        highlight={ing.id === highlightId}
                        usedIn={recipesByIngredient.get(ing.id) ?? []}
                      />
                    ))}
                  </ul>
                ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
