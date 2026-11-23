import { useMemo, useState } from 'react'
import { clearPurchaseHistory, usePurchaseHistory } from './data'
import { CaretIcon } from '../../components/icons'
import Collapse from '../../components/Collapse'
import DeleteButton from '../../components/DeleteButton'
import { outlineButton } from '../../components/buttonStyles'
import { useCollapsedSet } from '../../lib/useCollapsedSet'
import { formatRelativeDate, groupPurchaseHistory } from '../../lib/purchaseHistory'
import SectionHeader from './SectionHeader'

const HISTORY_PAGE = 100

/** Historial de compras de la Lista: plegado de inicio; solo se descarga al desplegarlo, de HISTORY_PAGE en HISTORY_PAGE. */
export default function PurchaseHistory() {
  const [historyCollapsed, setHistoryCollapsed] = useState(true)
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE)
  const { entries: historyEntries, loading: loadingHistory, mayHaveMore } = usePurchaseHistory(!historyCollapsed, historyLimit)
  const batchCollapse = useCollapsedSet('lista-lotes')

  const purchaseBatches = useMemo(() => groupPurchaseHistory(historyEntries), [historyEntries])

  return (
    <div>
      <div className="sticky top-[var(--head-h)] z-20 flex flex-wrap items-center justify-between gap-2 bg-white pb-1 pt-1 dark:bg-moss-950">
        <SectionHeader
          name="Historial de compras"
          count={historyCollapsed ? undefined : purchaseBatches.length}
          isCollapsed={historyCollapsed}
          onToggle={() => setHistoryCollapsed((v) => !v)}
        />
        {!historyCollapsed && historyEntries.length > 0 && (
          <DeleteButton
            onConfirm={clearPurchaseHistory}
            label="Eliminar historial"
            question="¿Eliminar el historial de compras?"
            confirmClassName="w-full basis-full"
          />
        )}
      </div>
      {!historyCollapsed &&
        (!loadingHistory && purchaseBatches.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Aún no hay compras confirmadas.</p>
        ) : (
          <>
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
                          <CaretIcon open={!isCollapsed} />
                        </span>
                        Compra de {formatRelativeDate(batch.purchasedAt)}
                      </span>
                      <span className="shrink-0 text-gray-500 dark:text-gray-400">
                        {batch.entries.length} artículo{batch.entries.length === 1 ? '' : 's'}
                      </span>
                    </button>
                    <Collapse open={!isCollapsed}>
                      <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-moss-800 dark:border-moss-800">
                        {batch.entries.map((entry) => (
                          <li key={entry.id} className="py-2 text-gray-900 dark:text-gray-100">
                            {entry.ingredientName}
                          </li>
                        ))}
                      </ul>
                    </Collapse>
                  </section>
                )
              })}
            </div>
            {mayHaveMore && (
              <button type="button" onClick={() => setHistoryLimit((n) => n + HISTORY_PAGE)} className={outlineButton + ' mt-3'}>
                Cargar compras anteriores
              </button>
            )}
          </>
        ))}
    </div>
  )
}
