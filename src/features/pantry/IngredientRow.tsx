import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  deleteIngredient,
  setIngredientFrozen,
  setIngredientUseSoon,
  setIngredientInPantry,
  updateIngredientExpiry,
} from './data'
import type { ExpiryMode, Group, Ingredient } from '../../lib/collections'
import { ConfirmDelete } from '../../components/DeleteButton'
import RemoveButton from '../../components/RemoveButton'
import IconsReveal from '../../components/IconsReveal'
import { PencilIcon } from '../../components/icons'
import Collapse from '../../components/Collapse'
import Pop, { useSettled } from '../../components/Pop'
import Switch from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { addToShoppingList, removeFromShoppingList, useShoppingList } from '../shopping-list/data'
import { COLLAPSE_MS } from '../../lib/motion'
import { smoothBehavior } from '../../lib/scroll'
import { keepFocus } from '../../lib/keepFocus'
import { cancelButton, primaryButton, rowIconButton } from '../../components/buttonStyles'
import { expiryBadgeClasses, frozenWithWarning, getExpiryInfo, hasWarning, remainingLabel, soonMarkLabel } from '../../lib/expiry'
import ExpiryFields from './ExpiryFields'
import IngredientEditForm from './IngredientEditForm'
import IngredientActions from './IngredientActions'

/** Fila de ingrediente: interruptor de existencias y, al tocar el nombre, un panel con fecha, cantidad, «gastar
 *  pronto», carrito, congelar, editar y eliminar. */
export default function IngredientRow({
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
    closePanel()
    setEditing(true)
  }

  if (editing) {
    return <IngredientEditForm ingredient={ingredient} groups={groups} onDone={() => setEditing(false)} />
  }

  const expiryInfo = getExpiryInfo(ingredient)
  const soonFlag = !!ingredient.useSoon && ingredient.inPantry
  const actionButtons = (
    <IngredientActions
      ingredient={ingredient}
      onList={onList}
      canFreeze={canFreeze}
      busy={busy}
      onToggleUseSoon={toggleUseSoon}
      onToggleOnList={toggleOnList}
      onToggleFrozen={toggleFrozen}
    />
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
        <IconsReveal show={panelOpen && !confirmingDelete} className="flex shrink-0 items-center gap-4">
          <button type="button" onClick={startEdit} aria-label={`Editar «${ingredient.name}»`} title="Editar el ingrediente" className={rowIconButton}>
            <PencilIcon />
          </button>
          <RemoveButton trash row={false} onRemove={() => setConfirmingDelete(true)} label={`Eliminar «${ingredient.name}»`} title="Eliminar el ingrediente" />
        </IconsReveal>
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
