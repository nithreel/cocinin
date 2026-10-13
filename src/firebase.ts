import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  // sin configuración, getAuth() lanzaría al cargar: un valor de relleno deja que App muestre el aviso
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'sin-configurar',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
// Caché local persistente: la app abre al instante y sigue mostrando datos sin cobertura
// (en el súper), y las aperturas siguientes solo descargan los cambios, no todo de nuevo.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Desarrollo local sin tocar datos reales: `npm run emulators` + VITE_USE_EMULATORS=true
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8089)
}

/**
 * Crea una cuenta de Firebase Auth sin cambiar la sesión actual: usa una
 * instancia secundaria de la app, de modo que quien invita sigue conectado.
 */
export async function createAccount(email: string, password: string): Promise<string> {
  const secondary = initializeApp(firebaseConfig, `signup-${Date.now()}`)
  try {
    const secondaryAuth = getAuth(secondary)
    if (import.meta.env.VITE_USE_EMULATORS === 'true') {
      connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    }
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const uid = cred.user.uid
    await signOut(secondaryAuth)
    return uid
  } finally {
    await deleteApp(secondary)
  }
}
