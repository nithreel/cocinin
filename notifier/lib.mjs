// Lógica pura del servicio de avisos (sin red ni Firestore), para poder probarla.

export const SOON_DAYS = 3

/** Días hasta la caducidad de un ingrediente con fecha, o null si no avisa (misma regla que src/lib/expiry.ts). */
export function daysToExpiry(ingredient, now = new Date()) {
  if (!ingredient.inPantry || ingredient.frozen) return null
  if (ingredient.expiryMode !== 'date' || !ingredient.expiryDate) return null
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${ingredient.expiryDate}T00:00:00`)
  return Math.round((expiry.getTime() - today.getTime()) / 86400000)
}

/** Clave de «ya avisado»: cambiar la fecha de caducidad rearma el aviso. */
export const expiryKey = (id, ingredient) => `${id}|${ingredient.expiryDate}`

/** Ingredientes que han entrado en «caduca en ≤3 días» y aún no se han avisado. */
export function newlyExpiring(ingredients, notified, now = new Date()) {
  const out = []
  for (const [id, ing] of ingredients) {
    const days = daysToExpiry(ing, now)
    if (days === null || days > SOON_DAYS) continue
    if (notified.has(expiryKey(id, ing))) continue
    out.push({ id, name: ing.name, key: expiryKey(id, ing) })
  }
  return out
}

export function inSendWindow(now = new Date(), from = 8, to = 22) {
  const h = now.getHours()
  return h >= from && h < to
}

/**
 * Lista de la compra: un solo añadido no avisa. Al llegar el segundo dentro de la ventana avisa una vez,
 * y no vuelve a avisar hasta que pasen `cooldownMs` sin añadidos (la ventana se renueva con cada añadido).
 */
export function createShoppingBurst(cooldownMs = 15 * 60 * 1000) {
  let last = null
  let notified = false
  return {
    /** Devuelve true si este añadido debe provocar un aviso. */
    add(now = Date.now()) {
      const inBurst = last !== null && now - last < cooldownMs
      last = now
      if (!inBurst) {
        notified = false
        return false
      }
      if (notified) return false
      notified = true
      return true
    },
  }
}

const plural = (n, one, many) => (n === 1 ? one : many)

export function spentMessage(names) {
  const unique = [...new Set(names)]
  if (unique.length === 1) return { title: 'Elemento gastado', body: `Se ha gastado ${unique[0]}` }
  return { title: 'Elementos gastados', body: `Se han gastado ${unique.length}: ${unique.join(', ')}` }
}

export function recipeMessage(titles) {
  if (titles.length === 1) return { title: 'Receta nueva', body: titles[0] }
  return { title: 'Recetas nuevas', body: `${titles.length} recetas nuevas en el recetario` }
}

export function purchaseMessage(count) {
  return { title: 'Compra hecha', body: `${count} ${plural(count, 'producto', 'productos')}` }
}

export function expiryMessage(names) {
  if (names.length === 1) return { title: 'Caducidad', body: `${names[0]} caduca pronto` }
  const shown = names.slice(0, 4).join(', ')
  const rest = names.length > 4 ? ` y ${names.length - 4} más` : ''
  return { title: 'Caducidad', body: `${names.length} ingredientes caducan pronto: ${shown}${rest}` }
}

/** Suscripciones a las que enviar: con el aviso activado y que no sean de quien provocó el cambio. */
export function recipients(subscriptions, kind, exceptUid) {
  return subscriptions.filter((s) => s.prefs?.[kind] !== false && (!exceptUid || s.uid !== exceptUid))
}

/** Agrupa avisos que llegan seguidos: tras `waitMs` sin novedades entrega todo junto. */
export function createCollector(waitMs, flush, setTimer = setTimeout, clearTimer = clearTimeout) {
  let items = []
  let timer = null
  return {
    push(item) {
      items.push(item)
      if (timer) clearTimer(timer)
      timer = setTimer(() => {
        const batch = items
        items = []
        timer = null
        flush(batch)
      }, waitMs)
    },
  }
}
