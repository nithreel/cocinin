import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  addGroup,
  addIngredient,
  deleteGroup,
  deleteIngredient,
  reorderGroups,
  setIngredientFrozen,
  setIngredientUseSoon,
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
import { ConfirmDelete } from '../../components/DeleteButton'
import RemoveButton from '../../components/RemoveButton'
import SwapLabelButton from '../../components/SwapLabelButton'
import { useDragReorder } from '../../lib/useDragReorder'
import { AlertIcon, CaretIcon, CartIcon, PencilIcon, SnowflakeIcon } from '../../components/icons'
import SearchInput from '../../components/SearchInput'
import Collapse from '../../components/Collapse'
import Pop, { useSettled } from '../../components/Pop'
import Switch from '../../components/Switch'
import { useToast } from '../../components/Toast'
import ListSkeleton from '../../components/ListSkeleton'
import { addToShoppingList, removeFromShoppingList, useShoppingList } from '../shopping-list/data'
import { COLLAPSE_MS } from '../../lib/motion'
import { scrollMainToTop, smoothBehavior } from '../../lib/scroll'
import { keepFocus } from '../../lib/keepFocus'
import { useLongPress } from '../../lib/useLongPress'
import { useCollapsedSet } from '../../lib/useCollapsedSet'
import StickyHeader from '../../components/StickyHeader'
import { cancelButton, primaryButton, rowIconButton } from '../../components/buttonStyles'
import { matchesSearch, normalizeText } from '../../lib/search'
import { expiryBadgeClasses, frozenWithWarning, getExpiryInfo, groupBadgeCounts, hasWarning, remainingLabel, soonMarkLabel } from '../../lib/expiry'
import { NO_GROUP } from '../../lib/groupByPantryGroup'

function ExpiryFields({
  mode,
  date,
  quantity,
  onModeChange,
  onDateChange,
  onQuantityChange,
  trailing,
}: {
  mode: ExpiryMode
  date: string
  quantity: string
  onModeChange: (mode: ExpiryMode) => void
  onDateChange: (date: string) => void
  onQuantityChange: (quantity: string) => void
  /** panel del ingrediente: en dos filas (tipo de fecha | fecha; cantidad | alarmas) con esto a la derecha de la cantidad */
  trailing?: React.ReactNode
}) {
  const dateInput =
    mode === 'date' || mode === 'sinceStocked' ? (
      <input autoComplete="off"
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="min-w-0 shrink rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
      />
    ) : null
  const select = (
    <select
      value={mode}
      onChange={(e) => onModeChange(e.target.value as ExpiryMode)}
      className="min-w-0 shrink rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
    >
      <option value="none">Sin fecha</option>
      <option value="date">Fecha de caducidad</option>
      <option value="sinceStocked">Fecha de compra</option>
    </select>
  )
  const quantityInput = (
    <input autoComplete="off"
      value={quantity}
      onChange={(e) => onQuantityChange(e.target.value)}
      placeholder="Cantidad (ej. 500 g)"
      maxLength={40}
      aria-label="Cantidad que tienes"
      className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
    />
  )
  // con `trailing` (panel del ingrediente): fila 1 = tipo de fecha | fecha; fila 2 = cantidad | alarmas
  if (trailing) {
    return (
      <>
        <div className="flex w-full items-center justify-between gap-2">
          {select}
          {dateInput}
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          {quantityInput}
          <div className="flex items-center gap-1">{trailing}</div>
        </div>
      </>
    )
  }
  return (
    <>
      {select}
      {dateInput}
      {quantityInput}
    </>
  )
}

function IngredientRow({
  ingredient,
  groups,
  highlight,
  usedIn,
  canFreeze,
}: {
  ingredient: Ingredient
  groups: Group[]
  highlight: boolean
  /** los grupos que no son comida (limpieza, baño…) no ofrecen congelar */
  canFreeze: boolean
  /** títulos de las recetas que usan este ingrediente (para avisar antes de borrarlo) */
  usedIn: string[]
}) {
  const toast = useToast()
  const listItem = useShoppingList().items.find((i) => i.ingredientId === ingredient.id)
  const onList = !!listItem
  const settled = useSettled()
  const [busy, setBusy] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const rowRef = useRef<HTMLLIElement>(null)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(ingredient.name)
  const [groupId, setGroupId] = useState(ingredient.groupId ?? NO_GROUP)
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>(ingredient.expiryMode ?? 'none')
  const [expiryDate, setExpiryDate] = useState(ingredient.expiryDate ?? ingredient.stockedDate ?? '')
  const [quantity, setQuantity] = useState(ingredient.quantity ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (highlight) rowRef.current?.scrollIntoView({ block: 'center', behavior: smoothBehavior() })
  }, [highlight])

  function closePanel() {
    setPanelOpen(false)
    setConfirmingDelete(false)
  }

  // El panel se cierra al tocar fuera de la fila (otra fila, cabecera…) o con Escape.
  useEffect(() => {
    if (!panelOpen) return
    function handleDown(e: Event) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) closePanel()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('pointerdown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [panelOpen])

  function togglePanel() {
    if (panelOpen) {
      closePanel()
      return
    }
    setExpiryMode(ingredient.expiryMode ?? 'none')
    setExpiryDate(ingredient.expiryDate ?? ingredient.stockedDate ?? '')
    setQuantity(ingredient.quantity ?? '')
    setPanelOpen(true)
  }

  // al abrir el panel de una fila del final, se desplaza para que se vea entero (sin quedar bajo la barra)
  useEffect(() => {
    if (!panelOpen) return
    // tras la animación de apertura, para medir la altura final
    const t = setTimeout(() => rowRef.current?.scrollIntoView({ block: 'nearest', behavior: smoothBehavior() }), COLLAPSE_MS)
    return () => clearTimeout(t)
  }, [panelOpen, confirmingDelete])

  async function handleSaveDates(e: FormEvent) {
    e.preventDefault()
    if (!ingredient.inPantry) return
    setSaving(true)
    try {
      await updateIngredientExpiry(ingredient.id, { mode: expiryMode, date: expiryDate || null, quantity })
      closePanel()
    } finally {
      setSaving(false)
    }
  }

  async function toggleUseSoon() {
    setBusy(true)
    try {
      await setIngredientUseSoon(ingredient.id, !ingredient.useSoon)
    } finally {
      setBusy(false)
    }
  }

  async function toggleFrozen() {
    setBusy(true)
    try {
      await setIngredientFrozen(ingredient.id, !ingredient.frozen, ingredient.inPantry, !!ingredient.frozen)
    } finally {
      setBusy(false)
    }
  }

  async function toggle() {
    setBusy(true)
    try {
      const wasAvailable = ingredient.inPantry
      await setIngredientInPantry(ingredient.id, !ingredient.inPantry)
      if (wasAvailable && !onList) {
        toast({
          message: `${ingredient.name} agotado`,
          actionLabel: 'Añadir a la lista',
          onAction: () => void addToShoppingList(ingredient.id),
        })
      }
    } finally {
      setBusy(false)
    }
  }

  /** Carrito: para comprar algo que aún queda («queda poca leche») sin marcarlo como agotado; pulsar de nuevo lo quita. */
  function toggleOnList() {
    if (listItem) {
      removeFromShoppingList(listItem.id)
      return
    }
    const id = addToShoppingList(ingredient.id)
    toast({ message: `${ingredient.name} añadido a la lista`, actionLabel: 'Deshacer', onAction: () => void removeFromShoppingList(id) })
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
    setQuantity(ingredient.quantity ?? '')
    closePanel()
    setEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const expiry: ExpiryInput = { mode: expiryMode, date: expiryDate || null, quantity }
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
          'py-2 pl-3 pr-3'
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input autoComplete="off"
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
            <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} quantity={quantity} onQuantityChange={setQuantity} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className={primaryButton}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cancelButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    )
  }

  const expiryInfo = getExpiryInfo(ingredient)
  const soonFlag = !!ingredient.useSoon && ingredient.inPantry
  const actionButtons = (
    <>
      {ingredient.inPantry && (
              <button
                type="button"
                aria-pressed={!!ingredient.useSoon}
                aria-label={`${ingredient.name}: ${ingredient.useSoon ? 'marcado para gastar pronto, pulsa para quitarlo' : 'pulsa para marcarlo como «gastar pronto»'}`}
                title={ingredient.useSoon ? 'Gastar pronto (pulsa para quitar)' : 'Marcar como «gastar pronto»'}
                onClick={toggleUseSoon}
                disabled={busy}
                className={
                  'ripple relative flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50 max-md:h-10 max-md:w-10 ' +
                  (ingredient.useSoon
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-amber-400')
                }
              >
                <AlertIcon />
              </button>
            )}
      <button
        type="button"
        aria-pressed={onList}
        aria-label={`${ingredient.name}: ${onList ? 'está en la lista de la compra, pulsa para quitarlo' : 'pulsa para añadirlo a la lista de la compra'}`}
        title={onList ? 'En la lista (pulsa para quitar)' : 'Añadir a la lista de la compra'}
        onMouseDown={keepFocus}
        onClick={toggleOnList}
        className={
          'ripple relative flex h-8 w-8 items-center justify-center rounded-full transition-colors max-md:h-10 max-md:w-10 ' +
          (onList
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            : 'text-gray-400 hover:bg-gray-100 hover:text-emerald-700 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-emerald-400')
        }
      >
        <CartIcon />
      </button>
      {(canFreeze || ingredient.frozen) && (
        <button
          type="button"
          aria-pressed={!!ingredient.frozen}
          aria-label={
            ingredient.frozen
              ? `${ingredient.name}: en el congelador, pulsa para descongelar (en nevera)`
              : `${ingredient.name}: pulsa para marcarlo como congelado`
          }
          title={ingredient.frozen ? 'En el congelador: pulsa para descongelar' : 'Marcar como congelado'}
          onMouseDown={keepFocus}
          onClick={toggleFrozen}
          disabled={busy}
          className={
            'ripple relative flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50 max-md:h-10 max-md:w-10 ' +
            (ingredient.frozen
              ? 'bg-frost-100 text-frost-700 dark:bg-frost-950 dark:text-frost-400'
              : 'text-gray-400 hover:bg-gray-100 hover:text-frost-700 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-frost-400')
          }
        >
          <SnowflakeIcon />
        </button>
      )}
          </>
  )

  return (
    <li
      ref={rowRef}
      className={
        'scroll-mb-20 scroll-mt-28 py-2 pl-3 pr-3 transition-colors duration-700' +
        (highlight ? ' bg-emerald-50 dark:bg-emerald-950' : '')
      }
    >
      <div className="flex items-center gap-3 max-md:min-h-7">
          <Switch
            checked={ingredient.inPantry}
            onChange={toggle}
            disabled={busy}
            tone={
              ingredient.frozen
                ? 'frost'
                : hasWarning(ingredient)
                  ? 'amber'
                  : 'emerald'
            }
            // congelado + aviso, en cualquier orden: azul con remate amarillo
            capTone={frozenWithWarning(ingredient) ? 'amber' : undefined}
            offTone="red"
            label={
              ingredient.inPantry
                ? `${ingredient.name}: ${ingredient.frozen ? 'congelado' : 'disponible'}, pulsa para marcar como agotado`
                : `${ingredient.name}: agotado, pulsa para marcar como disponible`
            }
          />
        <div
          role="button"
          tabIndex={0}
          aria-expanded={panelOpen}
          onMouseDown={keepFocus}
          onClick={togglePanel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              togglePanel()
            }
          }}
          className="flex min-w-0 flex-1 cursor-pointer select-none flex-col"
        >
          <span className={'[overflow-wrap:anywhere] ' + (ingredient.inPantry ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400')}>
            {ingredient.name}
          </span>
          <Collapse open={!!(expiryInfo || ingredient.quantity || soonFlag)}>
            <span className="text-xs">
              {ingredient.quantity && (
                <span className="text-gray-500 dark:text-gray-400">{remainingLabel(ingredient.quantity)} {ingredient.quantity}</span>
              )}
              {expiryInfo && ingredient.quantity && <span className="text-gray-400"> · </span>}
              {expiryInfo && <Pop animate={settled} text className={expiryBadgeClasses(expiryInfo.status)}>{expiryInfo.label}</Pop>}
              {soonFlag && (ingredient.quantity || expiryInfo) && <span className="text-gray-400"> · </span>}
              {soonFlag && <Pop animate={settled} text className="whitespace-nowrap font-medium text-amber-600 dark:text-amber-400">⚠ {soonMarkLabel(ingredient)}</Pop>}
            </span>
          </Collapse>
        </div>
        {/* panel abierto: editar y eliminar, con iconos, a la derecha del nombre (el nombre largo se parte en líneas) */}
        {panelOpen && !confirmingDelete && (
          <div className="icon-in flex shrink-0 items-center gap-4">
            <button type="button" onClick={startEdit} aria-label={`Editar «${ingredient.name}»`} title="Editar el ingrediente" className={rowIconButton}>
              <PencilIcon />
            </button>
            <RemoveButton row={false} onRemove={() => setConfirmingDelete(true)} label={`Eliminar «${ingredient.name}»`} title="Eliminar el ingrediente" />
          </div>
        )}
      </div>

      <Collapse open={panelOpen}>
        <form
          onSubmit={handleSaveDates}
          className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2 dark:border-moss-800"
        >
          {!confirmingDelete && (
            <div className="flex flex-wrap items-center gap-2">
              {ingredient.inPantry ? (
                <ExpiryFields
                  mode={expiryMode}
                  date={expiryDate}
                  onModeChange={setExpiryMode}
                  onDateChange={setExpiryDate}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  trailing={actionButtons}
                />
              ) : (
                <div className="ml-auto flex items-center gap-1">{actionButtons}</div>
              )}
            </div>
          )}

          {confirmingDelete ? (
            <>
              {usedIn.length > 0 && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  Se usa en {usedIn.length === 1 ? 'la receta' : 'las recetas'}: {usedIn.join(', ')}. Si lo eliminas,
                  seguirá apareciendo en {usedIn.length === 1 ? 'ella' : 'ellas'} como «(ingrediente eliminado)».
                </p>
              )}
              <ConfirmDelete
                question={`¿Eliminar «${ingredient.name}»?`}
                questionClassName="w-full"
                busy={deleting}
                onConfirm={handleDelete}
                onCancel={() => setConfirmingDelete(false)}
              />
            </>
          ) : (
            ingredient.inPantry && (
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className={primaryButton}
                >
                  Guardar
                </button>
                <button type="button" onClick={closePanel} className={cancelButton}>
                  Cancelar
                </button>
              </div>
            )
          )}
        </form>
      </Collapse>
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
    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input autoComplete="off"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 cb h-4 w-4 shrink-0"
      />
      <span>
        Es comida
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          Sus ingredientes salen en las recetas y se pueden congelar.
        </span>
      </span>
    </label>
  )
}

function AddGroupForm({ groups, onDone }: { groups: Group[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [isFood, setIsFood] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      // si ya hay un orden elegido a mano, el grupo nuevo va al final
      await addGroup(name.trim(), isFood, groups.some((g) => g.order !== undefined) ? Math.max(...groups.map((g) => g.order ?? -1)) + 1 : undefined)
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-moss-700 dark:bg-moss-900">
      <div className="flex gap-2">
        <input autoComplete="off"
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
          className={primaryButton}
        >
          Añadir
        </button>
        <button type="button" onClick={onDone} className={cancelButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function AddIngredientForm({
  groups,
  existingNames,
  onDone,
}: {
  groups: { id: string; name: string }[]
  /** nombres que ya hay, para avisar de duplicados («Leche» / «leche») */
  existingNames: string[]
  onDone: (id?: string, groupId?: string | null) => void
}) {
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState(NO_GROUP)
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('none')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // nombre ya avisado como duplicado: si se vuelve a pulsar «Añadir», se crea igualmente
  const [warnedName, setWarnedName] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const key = normalizeText(name).trim()
    if (warnedName !== key && existingNames.some((n) => normalizeText(n).trim() === key)) {
      setWarnedName(key)
      return
    }
    setSubmitting(true)
    try {
      const expiry: ExpiryInput = { mode: expiryMode, date: expiryDate || null, quantity }
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
        <input autoComplete="off"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setWarnedName(null)
          }}
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
        <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} quantity={quantity} onQuantityChange={setQuantity} />
      </div>
      {warnedName !== null && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          Ya existe un ingrediente con ese nombre. Pulsa «Añadir» otra vez si quieres crearlo igualmente.
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={primaryButton}
        >
          Añadir
        </button>
        <button type="button" onClick={() => onDone()} className={cancelButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

type GroupDraft = { name: string; isFood: boolean }

function GroupHeader({
  section,
  isCollapsed,
  onToggleCollapsed,
  organizing,
  onStartOrganize,
  draft,
  onDraftChange,
  handle,
}: {
  section: { id: string; name: string; items: Ingredient[]; deletable: boolean; isFood: boolean }
  isCollapsed: boolean
  onToggleCollapsed: () => void
  /** modo «organizar grupos»: asa para mover, lápiz para renombrar y ✕ para eliminar */
  organizing: boolean
  onStartOrganize: () => void
  /** borrador de nombre y «Es comida» mientras se edita en el sitio (undefined = no se está editando) */
  draft: GroupDraft | undefined
  onDraftChange: (draft: GroupDraft | null) => void
  handle?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const settled = useSettled()
  // congelados (❄) y descongelando (❄ tachado) van aparte; los descongelando con aviso cuentan también en el ámbar
  const { warnCount, frozenCount, thawCount } = groupBadgeCounts(section.items)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const longPress = useLongPress(onStartOrganize)
  const canOrganize = section.deletable

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGroup(section.id)
    } finally {
      setDeleting(false)
    }
  }

  const badges = (
    <>
      <span className="shrink-0 font-normal normal-case text-gray-500 dark:text-gray-400">({section.items.length})</span>
      {frozenCount > 0 && (
        <Pop
          animate={settled}
          trigger={frozenCount}
          title={`${frozenCount} congelado${frozenCount === 1 ? '' : 's'}`}
          aria-label={`${frozenCount} ingrediente${frozenCount === 1 ? '' : 's'} congelado${frozenCount === 1 ? '' : 's'}`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-frost-100 px-2 text-xs font-semibold normal-case text-frost-700 dark:bg-frost-950 dark:text-frost-400"
        >
          <SnowflakeIcon className="h-3 w-3" /> {frozenCount}
        </Pop>
      )}
      {thawCount > 0 && (
        <Pop
          animate={settled}
          trigger={thawCount}
          title={`${thawCount} descongelando`}
          aria-label={`${thawCount} ingrediente${thawCount === 1 ? '' : 's'} descongelando`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-frost-100 px-2 text-xs font-semibold normal-case text-frost-700 dark:bg-frost-950 dark:text-frost-400"
        >
          <SnowflakeIcon className="h-3 w-3" crossed /> {thawCount}
        </Pop>
      )}
      {warnCount > 0 && (
        <Pop
          animate={settled}
          trigger={warnCount}
          title={`${warnCount} con aviso`}
          aria-label={`${warnCount} ingrediente${warnCount === 1 ? '' : 's'} con aviso`}
          className="shrink-0 rounded-full bg-amber-100 px-2 text-xs font-semibold normal-case text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        >
          ⚠ {warnCount}
        </Pop>
      )}
    </>
  )

  // la flecha > se convierte en tres rayas (asa de arrastre) al organizar
  const lead = (
    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400">
      <span
        aria-hidden="true"
        className={'absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ' + (organizing ? 'scale-50 rotate-90 opacity-0' : 'opacity-100')}
      >
        <CaretIcon open={!isCollapsed} />
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
        className={'absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ' + (organizing && canOrganize ? 'opacity-100' : 'scale-50 -rotate-90 opacity-0')}
      >
        <path d="M2 3.5h10M2 7h10M2 10.5h10" />
      </svg>
      {organizing && canOrganize && handle && (
        <button
          type="button"
          aria-label={`Mover «${section.name}» (arrastra, o usa ↑ ↓)`}
          {...handle}
          className="absolute -inset-2 cursor-grab touch-none active:cursor-grabbing"
        />
      )}
    </span>
  )

  const titleClasses = 'flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
  return (
    <div className={organizing ? '' : 'sticky top-[var(--head-h)] z-10 mb-1 bg-white py-1 dark:bg-moss-950'}>
      <div className={'flex items-center justify-between gap-2' + (organizing ? ' min-h-10' : '')}>
        {organizing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {lead}
            {draft ? (
              <input
                autoComplete="off"
                autoFocus
                value={draft.name}
                onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
                aria-label="Nombre del grupo"
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-0.5 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
              />
            ) : (
              <div className={titleClasses}>
                <span className="truncate">{section.name}</span>
                {badges}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => {
              // tras una pulsación larga el clic que sigue no debe plegar ni desplegar
              if (longPress.consumeFired()) return
              onToggleCollapsed()
            }}
            {...(canOrganize ? longPress.handlers : {})}
            title={canOrganize ? 'Mantén pulsado para organizar los grupos' : undefined}
            aria-expanded={!isCollapsed}
            className={titleClasses + ' select-none hover:text-gray-700 dark:hover:text-gray-200'}
          >
            {lead}
            <span className="truncate">{section.name}</span>
            {badges}
          </button>
        )}
        {organizing && canOrganize && (
          <div className="flex shrink-0 items-center gap-4">
            {!confirmingDelete && (
              <button
                type="button"
                onClick={() => onDraftChange(draft ? null : { name: section.name, isFood: section.isFood })}
                aria-label={`Editar «${section.name}»`}
                aria-pressed={!!draft}
                title="Editar el grupo"
                className={rowIconButton + (draft ? ' !text-emerald-600 dark:!text-emerald-400' : '')}
              >
                <PencilIcon />
              </button>
            )}
            {!confirmingDelete && (
              <RemoveButton row={false} onRemove={() => setConfirmingDelete(true)} label={`Eliminar «${section.name}»`} title="Eliminar el grupo" />
            )}
          </div>
        )}
      </div>
      {organizing && canOrganize && confirmingDelete && (
        <ConfirmDelete
          question={
            section.items.length > 0
              ? `¿Eliminar «${section.name}»? Sus ${section.items.length} ingredientes pasan a Sin grupo.`
              : `¿Eliminar «${section.name}»?`
          }
          questionClassName="w-full"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
          className="mt-1"
        />
      )}
      <Collapse open={organizing && !!draft}>
        <div className="pb-1 pl-7 pt-2">
          <IsFoodCheckbox checked={draft?.isFood ?? section.isFood} onChange={(v) => draft && onDraftChange({ ...draft, isFood: v })} />
        </div>
      </Collapse>
    </div>
  )
}

export default function PantryPage() {
  const { groups, loading: loadingGroups } = useGroups()
  const { ingredients, loading: loadingIngredients } = useIngredients()
  const { recipes } = useRecipes()
  const [showAddGroup, setShowAddGroup] = useState(false)
  // modo «organizar grupos» (se entra manteniendo pulsado un grupo): grupos plegados, asa para moverlos, lápiz y ✕
  const [organizing, setOrganizing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, GroupDraft>>({})
  const [savingGroups, setSavingGroups] = useState(false)
  const reorder = useDragReorder(groups, (ids) => void reorderGroups(ids))
  // orden de los grupos al entrar, para que «Cancelar» lo restaure
  const orderOnEnter = useRef<string[]>([])
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const { collapsed, toggle: toggleCollapsed, expand } = useCollapsedSet('despensa')
  const [search, setSearch] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const searchActive = search.trim().length > 0

  const recipesByIngredient = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const r of recipes) {
      for (const ri of r.ingredients) map.set(ri.ingredientId, [...(map.get(ri.ingredientId) ?? []), r.title])
    }
    return map
  }, [recipes])

  function startOrganize() {
    if (organizing) return
    setShowAddGroup(false)
    setShowAddIngredient(false)
    orderOnEnter.current = groups.map((g) => g.id)
    setOrganizing(true)
  }

  // «Guardar»: aplica los nombres y «Es comida» editados y sale del modo (el orden ya se guardó al soltar cada grupo)
  async function saveOrganize() {
    setSavingGroups(true)
    try {
      await Promise.all(
        Object.entries(drafts).map(([id, d]) => {
          const g = groups.find((x) => x.id === id)
          const name = d.name.trim()
          if (!g || !name || (name === g.name && d.isFood === (g.isFood ?? true))) return undefined
          return updateGroup(id, name, d.isFood)
        }),
      )
      setDrafts({})
      setOrganizing(false)
    } finally {
      setSavingGroups(false)
    }
  }
  const draftsInvalid = Object.values(drafts).some((d) => !d.name.trim())

  function handleIngredientAdded(id?: string, groupId?: string | null) {
    setShowAddIngredient(false)
    if (!id) return
    setSearch('')
    setHighlightId(id)
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 3000)
    // el grupo destino puede estar plegado: lo desplegamos para llegar al ingrediente
    expand(groupId ?? NO_GROUP)
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
      .map((s) =>
        // si el término coincide con el nombre del grupo, entra el grupo entero
        matchesSearch(s.name, search) ? s : { ...s, items: s.items.filter((i) => matchesSearch(i.name, search)) },
      )
      .filter((s) => s.items.length > 0)
  }, [sections, searchActive, search])

  const loading = loadingGroups || loadingIngredients

  // al organizar se ven todos los grupos (sin filtro de búsqueda), en el orden que se está arrastrando, y «Sin grupo» al final
  const displaySections = useMemo(() => {
    if (!organizing) return visibleSections
    const byId = new Map(sections.map((x) => [x.id, x]))
    const ordered = reorder.shown.map((g) => byId.get(g.id)).filter((x): x is (typeof sections)[number] => !!x)
    const noGroup = byId.get(NO_GROUP)
    return noGroup ? [...ordered, noGroup] : ordered
  }, [organizing, visibleSections, sections, reorder.shown])

  // Los formularios se abren arriba del todo: si se pulsa con la página desplazada, se vuelve a la cima para verlos.
  function openForm(toggle: (fn: (v: boolean) => boolean) => void) {
    toggle((v) => !v)
    scrollMainToTop()
  }

  return (
    <div>
      {/* Cabecera fija (título, botones y buscador); los formularios se abren debajo, en el flujo normal. */}
      <StickyHeader
        title="Despensa"
        below={
          (ingredients.length > 0 || search) && (
            <Collapse open={!organizing}>
              <SearchInput value={search} onChange={setSearch} className="" />
            </Collapse>
          )
        }
      >
        <SwapLabelButton
          variant="outline"
          labelA="+ Grupo"
          labelB="Cancelar"
          showB={organizing}
          disabled={organizing && savingGroups}
          onClick={
            organizing
              ? () => {
                  // sale sin aplicar los nombres editados y devuelve los grupos al orden con el que se entró
                  // (los grupos eliminados no se recuperan)
                  const existing = new Set(groups.map((g) => g.id))
                  const before = orderOnEnter.current.filter((id) => existing.has(id))
                  const now = groups.map((g) => g.id).filter((id) => before.includes(id))
                  if (before.join() !== now.join()) void reorderGroups(before)
                  setDrafts({})
                  setOrganizing(false)
                }
              : () => openForm(setShowAddGroup)
          }
        />
        <SwapLabelButton
          labelA="+ Ingrediente"
          labelB="Guardar"
          showB={organizing}
          disabled={organizing && (savingGroups || draftsInvalid)}
          onClick={organizing ? () => void saveOrganize() : () => openForm(setShowAddIngredient)}
        />
      </StickyHeader>

      <Collapse open={showAddGroup}>
        <AddGroupForm groups={groups} onDone={() => setShowAddGroup(false)} />
      </Collapse>
      <Collapse open={showAddIngredient}>
        <AddIngredientForm groups={groups} existingNames={ingredients.map((i) => i.name)} onDone={handleIngredientAdded} />
      </Collapse>

      {loading && <ListSkeleton />}

      {!loading && ingredients.length === 0 && groups.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Aún no hay ingredientes. Añade el primero con «+ Ingrediente».
        </p>
      )}

      {!loading && searchActive && visibleSections.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No hay ingredientes que coincidan con «{search.trim()}».</p>
      )}

      <div className={organizing ? 'divide-y divide-gray-100 dark:divide-moss-800' : 'space-y-6'}>
        {displaySections.map((section) => {
          const isCollapsed = organizing || (!searchActive && collapsed.has(section.id))
          const movable = organizing && section.id !== NO_GROUP
          return (
            <section
              key={section.id}
              ref={movable ? reorder.rowRef(section.id) : undefined}
              style={movable ? reorder.rowStyle(section.id) : undefined}
              className={organizing ? 'bg-white py-3 dark:bg-moss-950' + (reorder.draggingId === section.id ? ' relative z-10 rounded-md shadow-md' : '') : undefined}
            >
              <GroupHeader
                section={section}
                isCollapsed={isCollapsed}
                onToggleCollapsed={() => toggleCollapsed(section.id)}
                organizing={organizing}
                onStartOrganize={startOrganize}
                draft={drafts[section.id]}
                onDraftChange={(d) =>
                  setDrafts((prev) => {
                    const next = { ...prev }
                    if (d) next[section.id] = d
                    else delete next[section.id]
                    return next
                  })
                }
                handle={movable ? reorder.handleFor(section.id) : undefined}
              />
              <Collapse open={!isCollapsed}>
                {section.items.length === 0 ? (
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
                        canFreeze={section.isFood}
                      />
                    ))}
                  </ul>
                )}
              </Collapse>
            </section>
          )
        })}
      </div>

    </div>
  )
}
