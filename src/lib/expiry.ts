import type { Ingredient } from './collections'

/** Fecha local en formato YYYY-MM-DD (toISOString daría la UTC y se adelanta/atrasa cerca de medianoche). */
export function localDateString(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'frozen'

export interface ExpiryInfo {
  label: string
  status: ExpiryStatus
}

export function getExpiryInfo(ingredient: Ingredient): ExpiryInfo | null {
  if (!ingredient.inPantry) return null
  // congelado: las fechas se conservan, pero no se avisa de caducidad mientras esté en el congelador
  if (ingredient.frozen) return { label: 'Congelado', status: 'frozen' }

  if (ingredient.expiryMode === 'date' && ingredient.expiryDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(`${ingredient.expiryDate}T00:00:00`)
    const diffDays = Math.round((expiry.getTime() - today.getTime()) / 86400000)

    if (diffDays < 0) return { label: 'Caducado', status: 'expired' }
    if (diffDays === 0) return { label: 'Caduca hoy', status: 'soon' }
    if (diffDays <= 3) {
      return { label: `Caduca en ${diffDays} día${diffDays === 1 ? '' : 's'}`, status: 'soon' }
    }
    return { label: `Caduca en ${diffDays} días`, status: 'ok' }
  }

  if (ingredient.expiryMode === 'sinceStocked' && ingredient.stockedDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const stocked = new Date(`${ingredient.stockedDate}T00:00:00`)
    const diffDays = Math.round((today.getTime() - stocked.getTime()) / 86400000)

    if (diffDays <= 0) return { label: 'Comprado hoy', status: 'ok' }
    return { label: `Comprado hace ${diffDays} día${diffDays === 1 ? '' : 's'}`, status: 'ok' }
  }

  return null
}

export function expiryBadgeClasses(status: ExpiryStatus) {
  switch (status) {
    case 'expired':
      return 'text-red-600 dark:text-red-400 font-medium'
    case 'soon':
      return 'text-amber-600 dark:text-amber-400 font-medium'
    case 'frozen':
      return 'text-frost-700 dark:text-frost-400 font-medium'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}
