import { deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { pushSubscriptionsCol, pushTestsCol, type PushPrefs } from './collections'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** ¿Esta instalación tiene clave VAPID (servicio de avisos configurado)? Sin ella los avisos nunca llegarían. */
export const isPushConfigured = !!VAPID_PUBLIC_KEY

export const DEFAULT_PREFS: PushPrefs = {
  gastado: true,
  lista: true,
  compra: true,
  receta: true,
  usuario: true,
  caducidad: true,
  descongelado: true,
  nota: true,
}

export type PushState =
  /** el navegador no puede (p. ej. iPhone sin instalar la app) */
  | 'unsupported'
  /** la app no trae clave VAPID */
  | 'unconfigured'
  | 'denied'
  | 'off'
  | 'on'

/** ¿Puede este navegador recibir avisos push? (service worker, PushManager y Notification). */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Id estable del dispositivo en Firestore: hash del endpoint (el endpoint en sí no cabe como id). */
async function subscriptionId(endpoint: string) {
  const bytes = new TextEncoder().encode(endpoint)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function currentSubscription() {
  // sin service worker (p. ej. servidor de desarrollo) no se queda esperando para siempre
  const reg = await withTimeout(navigator.serviceWorker.ready, 3000)
  return reg?.pushManager.getSubscription()
}

/** Estado de los avisos en este dispositivo y sus preferencias guardadas. «on» solo si hay suscripción en el
 *  navegador y también en Firestore. */
export async function getPushState(): Promise<{ state: PushState; prefs: PushPrefs }> {
  if (!isPushSupported()) return { state: 'unsupported', prefs: DEFAULT_PREFS }
  if (!VAPID_PUBLIC_KEY) return { state: 'unconfigured', prefs: DEFAULT_PREFS }
  if (Notification.permission === 'denied') return { state: 'denied', prefs: DEFAULT_PREFS }
  const sub = await currentSubscription()
  if (!sub) return { state: 'off', prefs: DEFAULT_PREFS }
  const snap = await getDoc(doc(pushSubscriptionsCol, await subscriptionId(sub.endpoint)))
  if (!snap.exists()) return { state: 'off', prefs: DEFAULT_PREFS }
  return { state: 'on', prefs: { ...DEFAULT_PREFS, ...snap.data().prefs } }
}

/** Pide permiso, suscribe este dispositivo y guarda la suscripción. Devuelve false si se deniega. */
export async function enablePush(uid: string, prefs: PushPrefs): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) throw new Error('Falta VITE_VAPID_PUBLIC_KEY')
  if ((await Notification.requestPermission()) !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Suscripción incompleta')
  await setDoc(doc(pushSubscriptionsCol, await subscriptionId(json.endpoint)), {
    uid,
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    prefs,
    createdAt: Date.now(),
  })
  return true
}

/** Espera una promesa como mucho `ms`; si no llega, sigue con `undefined` (sin red muchas promesas no resuelven). */
function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))])
}

/**
 * Quita este dispositivo de los avisos. No se queda colgada sin cobertura ni sin service worker: la baja en
 * Firestore espera 3 s como mucho (queda en cola) y el dispositivo se desuscribe en cualquier caso.
 */
export async function disablePush() {
  if (!isPushSupported()) return
  const reg = await withTimeout(navigator.serviceWorker.ready, 3000)
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const ref = doc(pushSubscriptionsCol, await subscriptionId(sub.endpoint))
  await withTimeout(deleteDoc(ref).catch(() => undefined), 3000)
  await withTimeout(sub.unsubscribe(), 3000)
}

/** Guarda de qué avisar en la suscripción de este dispositivo; sin suscripción no hace nada. Espera al servidor y
 *  lanza si falla. */
export async function savePrefs(prefs: PushPrefs) {
  const sub = await currentSubscription()
  if (!sub) return
  await updateDoc(doc(pushSubscriptionsCol, await subscriptionId(sub.endpoint)), { prefs })
}

/**
 * Aviso de prueba REAL: pide al servicio de avisos (la Raspberry) que envíe una notificación a este dispositivo,
 * así se comprueba toda la cadena. 'ok' = el servidor la envió; 'no-device' = no encontró este dispositivo;
 * 'timeout' = el servicio no responde (apagado); 'offline' = este dispositivo no tiene conexión.
 */
export async function requestServerTest(uid: string): Promise<'ok' | 'no-device' | 'timeout' | 'offline'> {
  if (!navigator.onLine) return 'offline'
  const sub = await currentSubscription()
  if (!sub) return 'no-device'
  const ref = doc(pushTestsCol)
  return new Promise((resolve) => {
    let pending = true // la petición aún no ha llegado al servidor: el móvil no tiene red
    const finish = (result: 'ok' | 'no-device' | 'timeout' | 'offline') => {
      clearTimeout(timer)
      unsubscribe()
      void deleteDoc(ref).catch(() => undefined)
      resolve(result)
    }
    const timer = setTimeout(() => finish(pending || !navigator.onLine ? 'offline' : 'timeout'), 15_000)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        pending = snap.metadata.hasPendingWrites
        const status = snap.data()?.status
        if (status) finish(status === 'sent' ? 'ok' : 'no-device')
      },
      () => finish('timeout'),
    )
    setDoc(ref, { uid, endpoint: sub.endpoint, createdAt: Date.now() }).catch(() => finish('timeout'))
  })
}

/** Aviso local, sin pasar por el servidor: solo comprueba permisos y service worker de este dispositivo. */
export async function showLocalTestNotification() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('CocinIN', {
    body: 'Los avisos funcionan en este dispositivo.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: '/avisos' },
  })
}
