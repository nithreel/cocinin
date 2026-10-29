import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { pushSubscriptionsCol, type PushPrefs } from './collections'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const DEFAULT_PREFS: PushPrefs = {
  gastado: true,
  lista: true,
  compra: true,
  receta: true,
  usuario: true,
  caducidad: true,
}

export type PushState =
  /** el navegador no puede (p. ej. iPhone sin instalar la app) */
  | 'unsupported'
  /** la app no trae clave VAPID */
  | 'unconfigured'
  | 'denied'
  | 'off'
  | 'on'

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
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

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

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await deleteDoc(doc(pushSubscriptionsCol, await subscriptionId(sub.endpoint)))
  await sub.unsubscribe()
}

export async function savePrefs(prefs: PushPrefs) {
  const sub = await currentSubscription()
  if (!sub) return
  await updateDoc(doc(pushSubscriptionsCol, await subscriptionId(sub.endpoint)), { prefs })
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
