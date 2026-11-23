import { useEffect, useMemo, useRef, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import {
  addToShoppingList,
  confirmPurchase,
  removeFromShoppingList,
  setShoppingItemChecked,
  useShoppingList,
} from './data'
import type { Ingredient, ShoppingItem } from '../../lib/collections'
import { groupByPantryGroup } from '../../lib/groupByPantryGroup'
import AddButton from '../../components/AddButton'
import RemoveButton from '../../components/RemoveButton'
import Collapse from '../../components/Collapse'
import { prefersReducedMotion } from '../../lib/motion'
import SearchInput from '../../components/SearchInput'
import StickyHeader from '../../components/StickyHeader'
import { primaryButton } from '../../components/buttonStyles'
import { useCollapsedSet } from '../../lib/useCollapsedSet'
import ListSkeleton from '../../components/ListSkeleton'
import { useToast } from '../../components/Toast'
import { matchesSearch, normalizeText } from '../../lib/search'
import { hasWarning } from '../../lib/expiry'
import { addIngredient, deleteIngredient } from '../pantry/data'
import SectionHeader from './SectionHeader'
import PurchaseHistory from './PurchaseHistory'

/** Color del borde izquierdo = estado del interruptor de la Despensa (como en las recetas). */
function stockBorderClass(i: Ingredient) {
  if (!i.inPantry) return 'border-l-red-400'
  if (i.frozen) return 'border-l-frost-400'
  return hasWarning(i) ? 'border-l-amber-500' : 'border-l-emerald-500'
}

export default function ShoppingListPage() {
  const { groups } = useGroups()
  const { ingredients, loading: loadingIngredients } = useIngredients()
  const { items, loading: loadingItems } = useShoppingList()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const cartCollapse = useCollapsedSet('lista-compra')
  const missingCollapse = useCollapsedSet('lista-falta')
  const [missingSearch, setMissingSearch] = useState('')

  const ingredientsById = useMemo(() => {
    const map = new Map(ingredients.map((i) => [i.id, i]))
    return map
  }, [ingredients])

  const shoppingIngredientIds = useMemo(() => new Set(items.map((i) => i.ingredientId)), [items])

  const hasChecked = items.some((i) => i.checked)

  // Sin búsqueda: lo agotado que no está en la lista. Con búsqueda: cualquier ingrediente (también los que tienes).
  const missingAll = useMemo(
    () => ingredients.filter((i) => !i.inPantry && !shoppingIngredientIds.has(i.id)),
    [ingredients, shoppingIngredientIds],
  )

  const missing = useMemo(() => {
    const term = missingSearch.trim()
    if (!term) return missingAll
    return ingredients.filter((i) => !shoppingIngredientIds.has(i.id) && matchesSearch(i.name, term))
  }, [ingredients, missingAll, missingSearch, shoppingIngredientIds])

  // si lo escrito no existe, se ofrece crearlo (agotado, sin grupo) y añadirlo a la lista de una vez
  const searchTerm = missingSearch.trim()
  const canCreate = !!searchTerm && !ingredients.some((i) => normalizeText(i.name).trim() === normalizeText(searchTerm))

  function addIngredientToList(ingredient: Ingredient) {
    // tras añadir, la búsqueda se reinicia y vuelve a verse todo lo que falta
    setMissingSearch('')
    const id = addToShoppingList(ingredient.id)
    toast({
      message: `${ingredient.name} añadido a la lista`,
      actionLabel: 'Deshacer',
      onAction: () => void removeFromShoppingList(id),
    })
  }

  function createAndAdd() {
    const id = addIngredient(searchTerm, null, { mode: 'none', date: null, quantity: '' }, false)
    setMissingSearch('')
    addToShoppingList(id)
    // deshacer quita también el ingrediente recién creado (si fue una errata no queda en la despensa)
    toast({ message: `${searchTerm} añadido a la lista`, actionLabel: 'Deshacer', onAction: () => void deleteIngredient(id) })
  }

  const cartSections = useMemo(
    () => groupByPantryGroup(items, (i: ShoppingItem) => i.ingredientId, ingredientsById, groups),
    [items, ingredientsById, groups],
  )

  const missingSections = useMemo(
    () => groupByPantryGroup(missing, (i: Ingredient) => i.id, ingredientsById, groups),
    [missing, ingredientsById, groups],
  )

  const loading = loadingIngredients || loadingItems

  // misma animación que el carrito de las recetas: ✓ verde con anillo y destello; lo tachado sale deslizándose
  const [confirmAnim, setConfirmAnim] = useState(false)
  // la compra se confirma con los datos de después de la animación (otro miembro pudo cambiar la lista), pero solo lo que se vio tachado
  const latest = useRef({ items, ingredientsById })
  useEffect(() => {
    latest.current = { items, ingredientsById }
  })
  async function handleConfirmPurchase() {
    if (confirmAnim) return
    const checkedIds = new Set(items.filter((i) => i.checked).map((i) => i.id))
    const reduce = prefersReducedMotion()
    if (!reduce) {
      setConfirmAnim(true)
      await new Promise((r) => window.setTimeout(r, 650))
    }
    setConfirming(true)
    try {
      const now = latest.current
      await confirmPurchase(now.items.filter((i) => checkedIds.has(i.id)), now.ingredientsById)
    } finally {
      setConfirming(false)
      setConfirmAnim(false)
    }
  }

  return (
    <div>
      <StickyHeader title="Lista de la compra" />

      <div className="mb-8">

        {loading && <ListSkeleton />}

        {!loading && items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">Tu lista está vacía. Añade algo desde «Añadir a la lista», abajo.</p>
        )}

        {items.length > 0 && (
          <>
            <div className="mb-4 space-y-4">
              {cartSections.map((section) => {
                const isCollapsed = cartCollapse.collapsed.has(section.id)
                return (
                  <section key={section.id}>
                    <SectionHeader
                      name={section.name}
                      count={section.items.length}
                      isCollapsed={isCollapsed}
                      onToggle={() => cartCollapse.toggle(section.id)}
                    />
                    <Collapse open={!isCollapsed}>
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
                        {section.items.map((item) => {
                          const ingredient = ingredientsById.get(item.ingredientId)
                          return (
                            <li key={item.id} className={'flex items-center gap-3 pl-4 pr-3' + (confirmAnim && item.checked ? ' row-confirm' : '')}>
                              <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3 py-2 max-md:min-h-11">
                                <input autoComplete="off"
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={(e) => setShoppingItemChecked(item.id, e.target.checked)}
                                  className="cb h-5 w-5 max-md:h-6 max-md:w-6"
                                />
                                <span
                                  className={
                                    item.checked
                                      ? 'flex-1 text-gray-500 transition-colors duration-300 dark:text-gray-400'
                                      : 'flex-1 text-gray-900 transition-colors duration-300 dark:text-gray-100'
                                  }
                                >
                                  <span className={'strike' + (item.checked ? ' strike-on' : '')}>
                                    {ingredient?.name ?? '(ingrediente eliminado)'}
                                  </span>
                                </span>
                              </label>
                              <RemoveButton
                                onRemove={() => removeFromShoppingList(item.id)}
                                label="Quitar de la lista"
                                title="Quitar de la lista"
                              />
                            </li>
                          )
                        })}
                      </ul>
                    </Collapse>
                  </section>
                )
              })}
            </div>
            {/* Pie fijo: el botón de confirmar sigue a la vista con la lista larga */}
            <div className="sticky -bottom-4 z-10 bg-white py-2 md:-bottom-8 dark:bg-moss-950">
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={confirming || !hasChecked}
                title={hasChecked ? undefined : 'Tacha al menos un artículo para confirmar la compra'}
                className={primaryButton + ' confirm-btn w-full sm:w-auto' + (confirmAnim ? ' confirm-done' : '')}
              >
                <span className="confirm-label">{confirming ? 'Confirmando…' : 'Confirmar compra'}</span>
                <svg viewBox="0 0 24 24" className="add-check absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* El contenedor acaba antes del historial: al llegar a él, «Te falta» y el buscador dejan de estar fijos */}
      <div className="mb-8">
        <div className="sticky top-[var(--head-h)] z-20 bg-white pb-3 dark:bg-moss-950">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Añadir a la lista</h3>
          <SearchInput value={missingSearch} onChange={setMissingSearch} placeholder="Buscar o añadir ingrediente…" className="" />
        </div>

        {!loading && !searchTerm && missingAll.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No te falta nada por ahora. Escribe arriba para añadir algo.</p>
        )}

        {searchTerm && missing.length === 0 && !canCreate && (
          <p className="text-gray-500 dark:text-gray-400">«{searchTerm}» ya está en la lista.</p>
        )}

        {missing.length > 0 && (
          <div className="space-y-4">
            {missingSections.map((section) => {
              const isCollapsed = missingCollapse.collapsed.has(section.id)
              return (
                <section key={section.id}>
                  <SectionHeader
                    name={section.name}
                    count={section.items.length}
                    isCollapsed={isCollapsed}
                    onToggle={() => missingCollapse.toggle(section.id)}
                  />
                  <Collapse open={!isCollapsed}>
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
                      {section.items.map((ingredient) => (
                        <li
                          key={ingredient.id}
                          className={
                            'flex items-center justify-between gap-3 border-l-4 py-1 pl-3 pr-2 ' + stockBorderClass(ingredient)
                          }
                        >
                          <span className="text-gray-900 dark:text-gray-100">{ingredient.name}</span>
                          <AddButton
                            onAdd={() => addIngredientToList(ingredient)}
                            label={`Añadir ${ingredient.name} a la lista`}
                            title="Añadir a la lista"
                          />
                        </li>
                      ))}
                    </ul>
                  </Collapse>
                </section>
              )
            })}
          </div>
        )}

        {canCreate && (
          <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
            <li className="flex items-center justify-between gap-3 border-l-4 border-l-red-400 py-1 pl-3 pr-2">
              <span className="text-gray-900 dark:text-gray-100">
                Crear «{searchTerm}» <span className="text-xs text-gray-500 dark:text-gray-400">(nuevo, agotado)</span>
              </span>
              <AddButton onAdd={createAndAdd} label={`Crear ${searchTerm} y añadirlo a la lista`} title="Crear y añadir a la lista" />
            </li>
          </ul>
        )}
      </div>

      {/* El historial se descarga solo al desplegarlo, por páginas */}
      <PurchaseHistory />
    </div>
  )
}
