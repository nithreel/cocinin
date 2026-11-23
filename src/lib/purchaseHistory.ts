import type { PurchaseHistoryEntry } from './collections'

/** Una compra confirmada: las entradas con el mismo `purchasedAt`. */
export interface PurchaseBatch {
  key: number
  purchasedAt: number
  entries: PurchaseHistoryEntry[]
}

/** Agrupa en compras las entradas consecutivas con el mismo momento de compra (vienen ordenadas). */
export function groupPurchaseHistory(entries: PurchaseHistoryEntry[]): PurchaseBatch[] {
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

/** «hoy», «ayer», «hace N días» (menos de una semana) o la fecha corta («5 nov»). */
export function formatRelativeDate(timestamp: number, now = Date.now()) {
  const diffDays = Math.floor((now - timestamp) / 86400000)
  if (diffDays <= 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  return new Date(timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/** Si se llegó al límite, la compra más antigua puede venir incompleta: se descarta entera. Si una sola compra ocupa
 *  toda la página, se muestra (cortada) en vez de dejar el historial vacío y sin «Cargar compras anteriores». */
export function wholePurchases(entries: PurchaseHistoryEntry[], limit: number) {
  if (entries.length < limit) return entries
  const oldest = entries[entries.length - 1].purchasedAt
  const whole = entries.filter((e) => e.purchasedAt !== oldest)
  return whole.length > 0 ? whole : entries
}
