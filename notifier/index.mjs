// Servicio de avisos push de CocinIN. Escucha Firestore con una cuenta de servicio y envía Web Push (VAPID).
// Variables: GOOGLE_APPLICATION_CREDENTIALS, VAPID_FILE (JSON {publicKey, privateKey}), VAPID_SUBJECT,
// DATA_DIR (estado de caducidad), TZ.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { Firestore } from '@google-cloud/firestore'
import webpush from 'web-push'
import {
  createCollector,
  createShoppingBurst,
  expiryMessage,
  inSendWindow,
  newlyExpiring,
  purchaseMessage,
  recipeMessage,
  recipients,
  spentMessage,
} from './lib.mjs'

const vapid = JSON.parse(readFileSync(process.env.VAPID_FILE ?? '/secrets/vapid.json', 'utf8'))
webpush.setVapidDetails(process.env.VAPID_SUBJECT, vapid.publicKey, vapid.privateKey)
const db = new Firestore()
const DATA_DIR = process.env.DATA_DIR ?? '/data'
const STATE_FILE = `${DATA_DIR}/expiry-state.json`
const log = (...a) => console.log(new Date().toISOString(), ...a)

let subscriptions = [] // { id, uid, endpoint, keys, prefs }
const ingredients = new Map() // id -> datos

async function send(kind, message, url, exceptUid) {
  const targets = recipients(subscriptions, kind, exceptUid)
  const payload = JSON.stringify({ ...message, url, tag: kind })
  log(`aviso «${kind}»: ${message.body} → ${targets.length} dispositivo(s)`)
  for (const s of targets) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 3600 })
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

// Elemento gastado: inPantry pasa de true a false. Se agrupa lo que llega en 60 s.
const spent = createCollector(60_000, (batch) => {
  const only = new Set(batch.map((b) => b.by))
  void send('gastado', spentMessage(batch.map((b) => b.name)), '/despensa', only.size === 1 ? [...only][0] : null)
})
listen('ingredients', (type, id, data, first) => {
  const before = ingredients.get(id)
  if (type === 'removed') ingredients.delete(id)
  else ingredients.set(id, data)
  if (!first && type === 'modified' && before?.inPantry === true && data.inPantry === false) {
    spent.push({ name: data.name, by: data.by ?? null })
  }
})

// Lista de la compra: un añadido solo no avisa; varios seguidos, un aviso.
const burst = createShoppingBurst()
listen('shoppingList', (type, _id, data, first) => {
  if (first || type !== 'added') return
  if (burst.add()) void send('lista', { title: 'Lista de la compra', body: 'Se están añadiendo elementos a la lista' }, '/lista', data.by)
})

// Compra hecha: el lote de purchaseHistory llega junto; se espera 5 s a que termine.
const purchases = createCollector(5_000, (batch) => {
  void send('compra', purchaseMessage(batch.length), '/lista', batch[0].by)
})
listen('purchaseHistory', (type, _id, data, first) => {
  if (!first && type === 'added') purchases.push({ by: data.by ?? null })
})

// 2 s: casi al momento, pero una importación en lote (varias recetas a la vez) sale como un solo aviso
const recipes = createCollector(2_000, (batch) => {
  void send('receta', recipeMessage(batch.map((b) => b.title)), '/recetario', batch[0].by)
})
listen('recipes', (type, _id, data, first) => {
  if (!first && type === 'added') recipes.push({ title: data.title, by: data.by ?? null })
})

listen('users', (type, _id, data, first) => {
  if (!first && type === 'added') {
    void send('usuario', { title: 'Usuario nuevo', body: `${data.email} se ha unido` }, '/usuarios', data.by)
  }
})

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
    notifiedExpiry = new Set(newlyExpiring(ingredients, new Set(), now).map((i) => i.key))
    writeFileSync(STATE_FILE, JSON.stringify([...notifiedExpiry]))
    log('estado de caducidad inicial:', notifiedExpiry.size, 'ya en aviso (sin enviar)')
    return
  }
  if (!inSendWindow(now)) return
  const fresh = newlyExpiring(ingredients, notifiedExpiry, now)
  if (fresh.length === 0) return
  fresh.forEach((f) => notifiedExpiry.add(f.key))
  writeFileSync(STATE_FILE, JSON.stringify([...notifiedExpiry]))
  await send('caducidad', expiryMessage(fresh.map((f) => f.name)), '/despensa', null)
}
setTimeout(() => void checkExpiry(), 15_000)
setInterval(() => void checkExpiry(), 60 * 60 * 1000)

log('servicio de avisos en marcha')
