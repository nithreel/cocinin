// Lógica pura del servicio de avisos (sin red ni Firestore), para poder probarla.

export const SOON_DAYS = 3

/** Días hasta la caducidad de un ingrediente con fecha, o null si no avisa (misma regla que src/lib/expiry.ts). */
export function daysToExpiry(ingredient, now = new Date()) {
  if (!ingredient.inPantry || ingredient.frozen || typeof ingredient.thawedAt === 'number') return null
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
    out.push({ id, name: ing.name, days, key: expiryKey(id, ing) })
  }
  return out.sort((a, b) => a.days - b.days)
}

export const THAW_SOON_HOURS = 24
export const THAW_BAD_HOURS = 48

/**
 * Avisos de descongelado (en nevera): fase 1 a las 24 h, fase 2 a las 48 h (no consumir). Una vez cada uno.
 * Si ya van 48 h sin haber avisado, solo sale el de fase 2 (la fase 1 se marca como enviada).
 * Devuelve [{ id, name, hours, stage, key, keys }]; `keys` = claves a marcar como avisadas.
 */
export function newlyThawed(ingredients, notified, now = Date.now()) {
  const out = []
  for (const [id, ing] of ingredients) {
    if (!ing.inPantry || ing.frozen || typeof ing.thawedAt !== 'number') continue
    const hours = Math.floor((now - ing.thawedAt) / 3600000)
    const k1 = `thaw1|${id}|${ing.thawedAt}`
    const k2 = `thaw2|${id}|${ing.thawedAt}`
    if (hours >= THAW_BAD_HOURS && !notified.has(k2)) out.push({ id, name: ing.name, hours, stage: 2, keys: [k1, k2] })
    else if (hours >= THAW_SOON_HOURS && hours < THAW_BAD_HOURS && !notified.has(k1)) out.push({ id, name: ing.name, hours, stage: 1, keys: [k1] })
  }
  return out.sort((a, b) => b.hours - a.hours)
}

/** `items` de una misma fase. */
export function thawMessage(items) {
  const stage = items[0].stage
  if (stage === 2) {
    if (items.length === 1) return { title: 'Descongelado', body: `${items[0].name}: mejor no lo uses` }
    const shown = items.slice(0, 4).map((i) => i.name).join(', ')
    const rest = items.length > 4 ? ` y ${items.length - 4} más` : ''
    return { title: 'Descongelados', body: `${shown}${rest}: mejor no los uses` }
  }
  if (items.length === 1) {
    const { name, hours } = items[0]
    return { title: 'Descongelado', body: `${name} lleva ${hours} h descongelado en la nevera: úsalo hoy` }
  }
  const shown = items.slice(0, 4).map((i) => `${i.name} (${i.hours} h)`).join(', ')
  const rest = items.length > 4 ? ` y ${items.length - 4} más` : ''
  return { title: 'Descongelados', body: `${items.length} ingredientes llevan más de 24 h descongelados: ${shown}${rest}. Úsalos hoy` }
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
  return { title: 'Compra hecha', body: `${count} ${plural(count, 'producto añadido', 'productos añadidos')} a la despensa` }
}

/** Plazo en palabras: «hoy», «mañana», «en 3 días» o «caducado». */
export function expiryWhen(days) {
  if (days < 0) return 'caducado'
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  return `en ${days} días`
}

/** `items`: [{ name, days }] ordenados del más urgente al menos. */
export function expiryMessage(items) {
  if (items.length === 1) {
    const { name, days } = items[0]
    return { title: 'Caducidad', body: days < 0 ? `${name} ha caducado` : `${name} caduca ${expiryWhen(days)}` }
  }
  const shown = items
    .slice(0, 4)
    .map((i) => `${i.name} (${expiryWhen(i.days)})`)
    .join(', ')
  const rest = items.length > 4 ? ` y ${items.length - 4} más` : ''
  return { title: 'Caducidad', body: `${items.length} ingredientes caducan pronto: ${shown}${rest}` }
}

/** Suscripciones a las que enviar: con el aviso activado y que no sean de quien provocó el cambio. */
export function recipients(subscriptions, kind, exceptUid) {
  return subscriptions.filter((s) => s.prefs?.[kind] !== false && (!exceptUid || s.uid !== exceptUid))
}

/** Descarta suscripciones de quien ya no es miembro (su uid no está en `users`). */
export function onlyMembers(subscriptions, memberUids) {
  return subscriptions.filter((s) => memberUids.has(s.uid))
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

/** Notas con aviso pendiente cuya hora ya ha llegado: [{ id, ...datos }]. */
export function dueNotes(notes, now = Date.now()) {
  const out = []
  for (const [id, n] of notes) {
    if (n.notify === true && n.sent !== true && n.done !== true && typeof n.remindAt === 'number' && n.remindAt <= now) out.push({ id, ...n })
  }
  return out.sort((a, b) => a.remindAt - b.remindAt)
}

/** Etiqueta propia por nota: con la misma etiqueta el sistema sustituye la notificación anterior. */
export const noteTag = (note) => `nota-${note.id}`

export function noteMessage(note) {
  return { title: 'Nota', body: note.text }
}

/** Dispositivos de los usuarios elegidos en la nota (con el aviso «nota» activado). */
export function noteRecipients(subscriptions, note) {
  const uids = new Set(note.recipients ?? [])
  return subscriptions.filter((s) => uids.has(s.uid) && s.prefs?.nota !== false)
}
