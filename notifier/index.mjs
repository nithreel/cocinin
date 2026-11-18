// Servicio de avisos push de CocinIN. Escucha Firestore con una cuenta de servicio y envía Web Push (VAPID).
// Variables: GOOGLE_APPLICATION_CREDENTIALS, VAPID_FILE (JSON {publicKey, privateKey}), VAPID_SUBJECT,
// DATA_DIR (estado de caducidad), TZ.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { Firestore } from '@google-cloud/firestore'
import webpush from 'web-push'
import {
  createCollector,
  createShoppingBurst,
  dueNotes,
  expiryMessage,
  inSendWindow,
  newlyExpiring,
  newlyThawed,
  thawMessage,
  noteMessage,
  noteTag,
  noteRecipients,
  purchaseMessage,
  recipeMessage,
  recipients,
  onlyMembers,
  spentMessage,
} from './lib.mjs'

const vapid = JSON.parse(readFileSync(process.env.VAPID_FILE ?? '/secrets/vapid.json', 'utf8'))
webpush.setVapidDetails(process.env.VAPID_SUBJECT, vapid.publicKey, vapid.privateKey)
const db = new Firestore()
const DATA_DIR = process.env.DATA_DIR ?? '/data'
const STATE_FILE = `${DATA_DIR}/expiry-state.json`
const log = (...a) => console.log(new Date().toISOString(), ...a)

const members = new Set() // uids con acceso (colección users)
// Restauración de copia en curso (la app escribe meta/restoring): durante ella y unos segundos después no se
// avisa de los cambios, que no son actividad real (recetas «nuevas», compras, ingredientes «gastados»…).
let restoring = { active: false, until: 0 }
const quiet = () => restoring.active || Date.now() < restoring.until
let subscriptions = [] // { id, uid, endpoint, keys, prefs }
const ingredients = new Map() // id -> datos

async function send(kind, message, url, exceptUid, targetsOverride, tag = kind) {
  const targets = onlyMembers(targetsOverride ?? recipients(subscriptions, kind, exceptUid), members)
  const payload = JSON.stringify({ ...message, url, tag })
  log(`aviso «${kind}»: ${message.body} → ${targets.length} dispositivo(s)`)
  let sent = 0
  for (const s of targets) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: kind === 'nota' ? 6 * 3600 : 3600 })
      sent++
    } catch (e) {
      // 404/410: el dispositivo ya no existe; se limpia para no reintentar siempre
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.collection('pushSubscriptions').doc(s.id).delete().catch(() => {})
        log('suscripción caducada eliminada', s.id)
      } else {
        log('error enviando a', s.id, e.statusCode ?? e.message)
      }
    }
  }
  return sent
}

/** Escucha una colección: la primera carga solo fija la base, después entrega cada cambio. */
function listen(name, onChange) {
  let first = true
  db.collection(name).onSnapshot(
    (snap) => {
      for (const ch of snap.docChanges()) onChange(ch.type, ch.doc.id, ch.doc.data(), first)
      first = false
    },
    (err) => {
      console.error(`error escuchando ${name}:`, err.message)
      process.exit(1) // Docker lo reinicia
    },
  )
}

listen('pushSubscriptions', (type, id, data) => {
  subscriptions = subscriptions.filter((s) => s.id !== id)
  if (type !== 'removed') subscriptions.push({ id, ...data })
})

db.doc('meta/restoring').onSnapshot(
  (snap) => {
    const d = snap.data()
    if (!d) restoring = { active: false, until: 0 }
    else if (d.endedAt) restoring = { active: false, until: Date.now() + 45_000 }
    // una marca sin fin con más de 15 min es de una restauración que se cortó: se ignora
    else restoring = { active: Date.now() - (d.startedAt ?? 0) < 15 * 60_000, until: 0 }
    if (quiet()) log('restauración de copia: avisos en pausa')
  },
  (err) => log('error escuchando meta/restoring:', err.message),
)

// Elemento gastado: inPantry pasa de true a false. Se agrupa lo que llega en 60 s.
const spent = createCollector(60_000, (batch) => {
  const only = new Set(batch.map((b) => b.by))
  void send('gastado', spentMessage(batch.map((b) => b.name)), '/despensa', only.size === 1 ? [...only][0] : null)
})
listen('ingredients', (type, id, data, first) => {
  const before = ingredients.get(id)
  if (type === 'removed') ingredients.delete(id)
  else ingredients.set(id, data)
  if (!first && !quiet() && type === 'modified' && before?.inPantry === true && data.inPantry === false) {
    spent.push({ name: data.name, by: data.by ?? null })
  }
})

// Lista de la compra: un añadido solo no avisa; varios seguidos, un aviso.
const burst = createShoppingBurst()
listen('shoppingList', (type, _id, data, first) => {
  if (first || quiet() || type !== 'added') return
  if (burst.add()) void send('lista', { title: 'Lista de la compra', body: 'Se están añadiendo elementos a la lista' }, '/lista', data.by)
})

// Compra hecha: el lote de purchaseHistory llega junto; se espera 5 s a que termine.
const purchases = createCollector(5_000, (batch) => {
  void send('compra', purchaseMessage(batch.length), '/lista', batch[0].by)
})
listen('purchaseHistory', (type, _id, data, first) => {
  if (!first && !quiet() && type === 'added') purchases.push({ by: data.by ?? null })
})

// 2 s: casi al momento, pero una importación en lote (varias recetas a la vez) sale como un solo aviso
const recipes = createCollector(2_000, (batch) => {
  void send('receta', recipeMessage(batch.map((b) => b.title)), '/recetario', batch[0].by)
})
listen('recipes', (type, _id, data, first) => {
  if (!first && !quiet() && type === 'added') recipes.push({ title: data.title, by: data.by ?? null })
})

listen('users', (type, id, data, first) => {
  if (type === 'removed') members.delete(id)
  else members.add(id)
  if (!first && !quiet() && type === 'added') {
    void send('usuario', { title: 'Usuario nuevo', body: `${data.email} se ha unido` }, '/usuarios', data.by)
  }
})

// Aviso de prueba real pedido desde la app («Enviarme un aviso de prueba»): se envía solo al dispositivo que lo pide
// y se anota el resultado en el propio documento, que la app espera y borra. Las peticiones viejas se limpian al arrancar.
listen('pushTests', async (type, id, data, first) => {
  if (type !== 'added') return
  const ref = db.collection('pushTests').doc(id)
  if (first) return void ref.delete().catch(() => {})
  const targets = subscriptions.filter((s) => s.uid === data.uid && s.endpoint === data.endpoint)
  const sent = targets.length
    ? await send('prueba', { title: 'CocinIN', body: 'Los avisos funcionan: este es un aviso de prueba.' }, '/avisos', null, targets)
    : 0
  await ref.update({ status: sent > 0 ? 'sent' : 'no-device' }).catch(() => {})
})

// Notas con aviso: se revisan cada 30 s. Se marcan como enviadas antes de enviar, para no repetir si falla algo.
const notes = new Map() // id -> datos
listen('notes', (type, id, data) => {
  if (type === 'removed') notes.delete(id)
  else notes.set(id, data)
})
let notesFirstLoad = true
async function checkNotes() {
  if (quiet()) return
  for (const note of dueNotes(notes)) {
    note.sent = true
    notes.set(note.id, { ...notes.get(note.id), sent: true })
    try {
      await db.collection('notes').doc(note.id).update({ sent: true, sentAt: Date.now() })
    } catch (e) {
      log('no se pudo marcar la nota', note.id, e.message)
      continue
    }
    await send('nota', noteMessage(note), '/notas', null, noteRecipients(subscriptions, note), noteTag(note))
  }
}
setTimeout(() => {
  notesFirstLoad = false
  void checkNotes()
}, 10_000)
setInterval(() => {
  if (!notesFirstLoad) void checkNotes()
}, 30_000)

// Caducidad: revisión cada hora. Solo se envía de 8:00 a 22:00; lo que entra de madrugada sale a las 8:00.
// Primera vez (sin fichero de estado): se marca lo que ya estaba en aviso sin enviar nada.
function loadState() {
  return existsSync(STATE_FILE) ? new Set(JSON.parse(readFileSync(STATE_FILE, 'utf8'))) : null
}
let notifiedExpiry = loadState()
async function checkExpiry() {
  if (ingredients.size === 0) return
  const now = new Date()
  if (notifiedExpiry === null) {
    notifiedExpiry = new Set([
      ...newlyExpiring(ingredients, new Set(), now).map((i) => i.key),
      ...newlyThawed(ingredients, new Set(), now.getTime()).flatMap((i) => i.keys),
    ])
    writeFileSync(STATE_FILE, JSON.stringify([...notifiedExpiry]))
    log('estado de caducidad inicial:', notifiedExpiry.size, 'ya en aviso (sin enviar)')
    return
  }
  if (!inSendWindow(now)) return
  const fresh = newlyExpiring(ingredients, notifiedExpiry, now)
  if (fresh.length === 0) return
  fresh.forEach((f) => notifiedExpiry.add(f.key))
  writeFileSync(STATE_FILE, JSON.stringify([...notifiedExpiry]))
  await send('caducidad', expiryMessage(fresh), '/despensa', null)
}

// Descongelado: revisión cada 10 min y SIN ventana horaria (24 h y 48 h exactas, de día o de noche).
async function checkThaw() {
  if (ingredients.size === 0 || notifiedExpiry === null) return
  const thawed = newlyThawed(ingredients, notifiedExpiry, Date.now())
  if (thawed.length === 0) return
  thawed.forEach((t) => t.keys.forEach((k) => notifiedExpiry.add(k)))
  writeFileSync(STATE_FILE, JSON.stringify([...notifiedExpiry]))
  for (const stage of [1, 2]) {
    const items = thawed.filter((t) => t.stage === stage)
    if (items.length) await send('descongelado', thawMessage(items), '/despensa', null)
  }
}
setTimeout(() => void checkThaw(), 20_000)
setInterval(() => void checkThaw(), 10 * 60 * 1000)
setTimeout(() => void checkExpiry(), 15_000)
setInterval(() => void checkExpiry(), 60 * 60 * 1000)

log('servicio de avisos en marcha')
