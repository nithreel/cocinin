import { useMemo, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import {
  addToShoppingList,
  clearPurchaseHistory,
  confirmPurchase,
  removeFromShoppingList,
  setShoppingItemChecked,
  usePurchaseHistory,
  useShoppingList,
} from './data'
import type { Ingredient, PurchaseHistoryEntry, ShoppingItem } from '../../lib/collections'
import { groupByPantryGroup } from '../../lib/groupByPantryGroup'
import DeleteButton from '../../components/DeleteButton'
import SearchInput from '../../components/SearchInput'
import { matchesSearch } from '../../lib/search'

function formatRelativeDate(timestamp: number) {
  const diffDays = Math.floor((Date.now() - timestamp) / 86400000)
  if (diffDays <= 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  return new Date(timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

interface PurchaseBatch {
  key: number
  purchasedAt: number
  entries: PurchaseHistoryEntry[]
}

function groupPurchaseHistory(entries: PurchaseHistoryEntry[]): PurchaseBatch[] {
  const batches: PurchaseBatch[] = []
  for (const entry of entries) {
    const last = batches[batches.length - 1]
    if (last && last.purchasedAt === entry.purchasedAt) {
      last.entries.push(entry)
    } else {
      batches.push({ key: entry.purchasedAt, purchasedAt: entry.purchasedAt, entries: [entry] })
    }
  }
  return batches
}

function useCollapsedSet() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  function toggle(id: string) {
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
  return { collapsed, toggle }
}

function SectionHeader({
  name,
  count,
  isCollapsed,
  onToggle,
}: {
  name: string
  count: number
  isCollapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!isCollapsed}
      className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <span aria-hidden="true" className="text-gray-500 dark:text-gray-400">
        {isCollapsed ? '▶' : '▼'}
      </span>
      {name}
      <span className="font-normal normal-case text-gray-500 dark:text-gray-400">({count})</span>
    </button>
  )
}

export default function ShoppingListPage() {
  const { groups } = useGroups()
  const { ingredients, loading: loadingIngredients } = useIngredients()
  const { items, loading: loadingItems } = useShoppingList()
  const { entries: historyEntries, loading: loadingHistory } = usePurchaseHistory()
  const [confirming, setConfirming] = useState(false)
  const [historyCollapsed, setHistoryCollapsed] = useState(true)
  const cartCollapse = useCollapsedSet()
  const missingCollapse = useCollapsedSet()
  const batchCollapse = useCollapsedSet()
  const [missingSearch, setMissingSearch] = useState('')

  const purchaseBatches = useMemo(() => groupPurchaseHistory(historyEntries), [historyEntries])

  const ingredientsById = useMemo(() => {
    const map = new Map(ingredients.map((i) => [i.id, i]))
    return map
  }, [ingredients])

  const shoppingIngredientIds = useMemo(() => new Set(items.map((i) => i.ingredientId)), [items])

  const hasChecked = items.some((i) => i.checked)

  const missingAll = useMemo(
    () => ingredients.filter((i) => !i.inPantry && !shoppingIngredientIds.has(i.id)),
    [ingredients, shoppingIngredientIds],
  )

  const missing = useMemo(() => {
    return missingSearch.trim() ? missingAll.filter((i) => matchesSearch(i.name, missingSearch)) : missingAll
  }, [missingAll, missingSearch])

  const cartSections = useMemo(
    () => groupByPantryGroup(items, (i: ShoppingItem) => i.ingredientId, ingredientsById, groups),
    [items, ingredientsById, groups],
  )

  const missingSections = useMemo(
    () => groupByPantryGroup(missing, (i: Ingredient) => i.id, ingredientsById, groups),
    [missing, ingredientsById, groups],
  )

  const loading = loadingIngredients || loadingItems

  async function handleConfirmPurchase() {
    setConfirming(true)
    try {
      await confirmPurchase(items, ingredientsById)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">Lista de la compra</h2>

        {loading && <p className="text-gray-500 dark:text-gray-400">Cargando…</p>}

        {!loading && items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">Tu lista está vacía. Añade algo de lo que te falta abajo.</p>
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
                    {!isCollapsed && (
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
                        {section.items.map((item) => {
                          const ingredient = ingredientsById.get(item.ingredientId)
                          return (
                            <li key={item.id} className="flex items-center gap-3 pl-4 pr-3">
                              <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3 py-2 max-md:min-h-11">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={(e) => setShoppingItemChecked(item.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 max-md:h-5 max-md:w-5 dark:border-moss-600 dark:bg-moss-800"
                                />
                                <span
                                  className={
                                    item.checked
                                      ? 'flex-1 text-gray-500 line-through dark:text-gray-400'
                                      : 'flex-1 text-gray-900 dark:text-gray-100'
                                  }
                                >
                                  {ingredient?.name ?? '(ingrediente eliminado)'}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => removeFromShoppingList(item.id)}
                                className="text-sm text-gray-500 hover:text-red-600 max-md:py-3 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                Quitar
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
            <button
              type="button"
              onClick={handleConfirmPurchase}
              disabled={confirming || !hasChecked}
              title={hasChecked ? undefined : 'Tacha al menos un artículo para confirmar la compra'}
              className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
            >
              {confirming ? 'Confirmando…' : 'Confirmar compra'}
            </button>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Te falta</h3>

        {missingAll.length > 0 && <SearchInput value={missingSearch} onChange={setMissingSearch} className="mb-3" />}

        {!loading && missingAll.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No te falta nada por ahora.</p>
        )}

        {missingAll.length > 0 && missing.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">Nada que coincida con "{missingSearch.trim()}".</p>
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
                  {!isCollapsed && (
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
                      {section.items.map((ingredient) => (
                        <li key={ingredient.id} className="flex items-center justify-between gap-3 py-1.5 pl-4 pr-3 max-md:min-h-11 max-md:py-0.5">
                          <span className="text-gray-900 dark:text-gray-100">{ingredient.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              addToShoppingList(ingredient.id)
                              // tras añadir, la búsqueda se reinicia y vuelve a verse todo lo que falta
                              setMissingSearch('')
                            }}
                            className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-100 max-md:py-2"
                          >
                            Añadir a la lista
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <SectionHeader
            name="Historial de compras"
            count={purchaseBatches.length}
            isCollapsed={historyCollapsed}
            onToggle={() => setHistoryCollapsed((v) => !v)}
          />
          {historyEntries.length > 0 && (
            <DeleteButton onConfirm={clearPurchaseHistory} label="Borrar historial" confirmLabel="Sí, borrar" />
          )}
        </div>
        {!historyCollapsed &&
          (!loadingHistory && purchaseBatches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Aún no hay compras confirmadas.</p>
          ) : (
            <div className="space-y-3">
              {purchaseBatches.map((batch) => {
                const batchKey = String(batch.key)
                const isCollapsed = batchCollapse.collapsed.has(batchKey)
                return (
                  <section
                    key={batch.key}
                    className="rounded-lg border border-gray-200 bg-white px-4 dark:border-moss-800 dark:bg-moss-900"
                  >
                    <button
                      type="button"
                      onClick={() => batchCollapse.toggle(batchKey)}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center justify-between gap-2 py-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="text-gray-500 dark:text-gray-400">
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                        Compra de {formatRelativeDate(batch.purchasedAt)}
                      </span>
                      <span className="shrink-0 text-gray-500 dark:text-gray-400">
                        {batch.entries.length} artículo{batch.entries.length === 1 ? '' : 's'}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-moss-800 dark:border-moss-800">
                        {batch.entries.map((entry) => (
                          <li key={entry.id} className="py-2 text-gray-900 dark:text-gray-100">
                            {entry.ingredientName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          ))}
      </div>
    </div>
  )
}
