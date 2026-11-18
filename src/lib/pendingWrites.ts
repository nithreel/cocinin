import { waitForPendingWrites } from 'firebase/firestore'
import { db } from '../firebase'

/** ¿Se han subido ya al servidor todos los cambios hechos en este dispositivo? Espera como mucho `timeoutMs`. */
export async function allWritesSynced(timeoutMs = 3000) {
  return Promise.race([
    waitForPendingWrites(db).then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ])
}
