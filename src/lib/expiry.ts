import type { Ingredient } from './collections'

/** Fecha local en formato YYYY-MM-DD (toISOString daría la UTC y se adelanta/atrasa cerca de medianoche). */
export function localDateString(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Descongelado en nevera: a las 24 h pasa a aviso (ámbar) y a las 48 h a rojo (no consumir). */
export const THAW_SOON_HOURS = 24
export const THAW_BAD_HOURS = 48

/** Horas completas desde que se sacó del congelador, o null si no está descongelando. */
export function thawHours(ingredient: Ingredient, now: number = Date.now()) {
  if (!ingredient.inPantry || ingredient.frozen || typeof ingredient.thawedAt !== 'number') return null
  return Math.max(0, Math.floor((now - ingredient.thawedAt) / 3600000))
}

export type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'frozen' | 'thawing'

export interface ExpiryInfo {
  label: string
  status: ExpiryStatus
}

/** «hace 5 h», «hace 1 día», «hace 1 día y 6 h», «hace 2 días y 3 h». */
export function thawAgo(hours: number) {
  if (hours < 1) return 'ahora'
  if (hours < 24) return `hace ${hours} h`
  const d = Math.floor(hours / 24)
  const h = hours % 24
  return `hace ${d} día${d === 1 ? '' : 's'}${h ? ` y ${h} h` : ''}`
}

function dateExpiry(ingredient: Ingredient): ExpiryInfo {
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

/** Etiqueta y estado de la fecha de un ingrediente. null si está agotado o no tiene fecha; congelado prima sobre
 *  todo y el descongelado sobre las fechas de compra o caducidad. */
export function getExpiryInfo(ingredient: Ingredient): ExpiryInfo | null {
  if (!ingredient.inPantry) return null
  // congelado: las fechas se conservan, pero no se avisa de caducidad mientras esté en el congelador
  if (ingredient.frozen) return { label: 'Congelado', status: 'frozen' }

  // descongelando: la fecha de descongelación prima sobre cualquier fecha de compra o caducidad
  const thaw = thawHours(ingredient)
  if (thaw !== null) {
    return {
      label: `Descongelado ${thawAgo(thaw)}`,
      status: thaw >= THAW_BAD_HOURS ? 'expired' : thaw >= THAW_SOON_HOURS ? 'soon' : 'thawing',
    }
  }

  if (ingredient.expiryMode === 'date' && ingredient.expiryDate) {
    return dateExpiry(ingredient)
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

/** «Marcado hoy» / «Marcado hace 3 días» (días naturales); sin fecha guardada, solo «Marcado». */
export function soonMarkLabel(ingredient: Ingredient, now: Date = new Date()) {
  if (typeof ingredient.useSoonAt !== 'number') return 'Marcado'
  const start = new Date(ingredient.useSoonAt)
  start.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000))
  return days === 0 ? 'Marcado hoy' : `Marcado hace ${days} día${days === 1 ? '' : 's'}`
}

/** ¿Tiene aviso (ámbar)? Marca manual «gastar pronto», caducidad cercana/pasada o descongelado ≥ 24 h. */
export function hasWarning(ingredient: Ingredient) {
  if (!ingredient.inPantry || ingredient.frozen) return false
  const status = getExpiryInfo(ingredient)?.status
  return !!ingredient.useSoon || status === 'soon' || status === 'expired'
}

/** Congelado con «gastar pronto» marcado: sale el aviso aunque `hasWarning` no cuente los congelados. */
export function frozenWithWarning(ingredient: Ingredient) {
  return ingredient.inPantry && !!ingredient.frozen && !!ingredient.useSoon
}

/** Contadores de las insignias de un grupo de la despensa: ⚠ avisos, ❄ congelados, ❄ tachado descongelando. */
export function groupBadgeCounts(items: Ingredient[]) {
  return {
    warnCount: items.filter((i) => hasWarning(i) || frozenWithWarning(i)).length,
    frozenCount: items.filter((i) => i.inPantry && i.frozen).length,
    thawCount: items.filter((i) => i.inPantry && !i.frozen && typeof i.thawedAt === 'number').length,
  }
}

/** Clases del texto de la fecha según su estado (rojo caducado, ámbar pronto, azul congelado o descongelando). */
export function expiryBadgeClasses(status: ExpiryStatus) {
  switch (status) {
    case 'expired':
      return 'text-red-600 dark:text-red-400 font-medium'
    case 'soon':
      return 'text-amber-600 dark:text-amber-400 font-medium'
    case 'frozen':
    case 'thawing':
      return 'text-frost-700 dark:text-frost-400 font-medium'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}

/** «Queda» si la cantidad es una unidad o menos («1 bote», «1/2», «media lata»); «Quedan» en el resto. */
export function remainingLabel(quantity: string) {
  const q = quantity.trim().toLowerCase()
  const m = q.match(/^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?(?![\d.,/-])/)
  if (m) {
    const n = m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1].replace(',', '.'))
    return n > 0 && n <= 1 ? 'Queda' : 'Quedan'
  }
  return /^(un|una|medio|media)(\s|$)/.test(q) ? 'Queda' : 'Quedan'
}
