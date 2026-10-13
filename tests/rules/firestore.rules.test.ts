// Pruebas de las reglas de seguridad. Necesitan el emulador de Firestore:
//   npm run test:rules
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, setLogLevel, updateDoc, writeBatch } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  setLogLevel('error')
  env = await initializeTestEnvironment({
    projectId: 'demo-cocinin-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())

/** Instalación ya hecha: un admin, un miembro y un dato de ejemplo. */
async function seedInstalled() {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'meta/setup'), { createdAt: 1 })
    await setDoc(doc(db, 'users/admin'), { email: 'a@x.es', role: 'admin', createdAt: 1 })
    await setDoc(doc(db, 'users/member'), { email: 'm@x.es', role: 'member', createdAt: 2 })
    await setDoc(doc(db, 'ingredients/leche'), { name: 'Leche' })
  })
}

describe('instalación hecha', () => {
  beforeEach(seedInstalled)

  it('un desconocido (sin sesión) no lee ni escribe', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'ingredients/leche')))
    await assertFails(setDoc(doc(db, 'ingredients/x'), { name: 'x' }))
    await assertFails(getDoc(doc(db, 'users/admin')))
  })

  it('una cuenta sin documento en users no accede a nada', async () => {
    const db = env.authenticatedContext('intruso').firestore()
    await assertFails(getDoc(doc(db, 'ingredients/leche')))
    await assertFails(setDoc(doc(db, 'ingredients/x'), { name: 'x' }))
    await assertFails(getDocs(collection(db, 'users')))
  })

  it('nadie puede hacerse admin ni miembro por su cuenta', async () => {
    const db = env.authenticatedContext('intruso').firestore()
    await assertFails(setDoc(doc(db, 'users/intruso'), { email: 'i@x.es', role: 'admin', createdAt: 3 }))
    await assertFails(setDoc(doc(db, 'users/intruso'), { email: 'i@x.es', role: 'member', createdAt: 3 }))
    const batch = writeBatch(db)
    batch.set(doc(db, 'meta/setup'), { createdAt: 3 })
    batch.set(doc(db, 'users/intruso'), { email: 'i@x.es', role: 'admin', createdAt: 3 })
    await assertFails(batch.commit())
  })

  it('un miembro lee y escribe los datos', async () => {
    const db = env.authenticatedContext('member').firestore()
    await assertSucceeds(getDoc(doc(db, 'ingredients/leche')))
    await assertSucceeds(setDoc(doc(db, 'ingredients/pan'), { name: 'Pan' }))
    await assertSucceeds(deleteDoc(doc(db, 'ingredients/pan')))
  })

  it('un miembro no puede crear, cambiar ni borrar usuarios', async () => {
    const db = env.authenticatedContext('member').firestore()
    await assertFails(setDoc(doc(db, 'users/nuevo'), { email: 'n@x.es', role: 'member', createdAt: 3 }))
    await assertFails(updateDoc(doc(db, 'users/member'), { role: 'admin' }))
    await assertFails(deleteDoc(doc(db, 'users/admin')))
  })

  it('el admin crea miembros, pero no otro admin', async () => {
    const db = env.authenticatedContext('admin').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/nuevo'), { email: 'n@x.es', role: 'member', createdAt: 3 }))
    await assertFails(setDoc(doc(db, 'users/otro'), { email: 'o@x.es', role: 'admin', createdAt: 3 }))
  })

  it('el admin quita a otros pero no a sí mismo', async () => {
    const db = env.authenticatedContext('admin').firestore()
    await assertSucceeds(deleteDoc(doc(db, 'users/member')))
    await assertFails(deleteDoc(doc(db, 'users/admin')))
  })

  it('nadie modifica meta/setup', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('admin').firestore(), 'meta/setup'), { createdAt: 9 }))
    await assertFails(deleteDoc(doc(env.authenticatedContext('admin').firestore(), 'meta/setup')))
  })

  it('meta/setup es legible sin sesión (el login lo consulta)', async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'meta/setup')))
  })
})

describe('instalación nueva (sin usuarios)', () => {
  beforeEach(() => env.clearFirestore())

  it('el primer usuario se crea como admin junto con meta/setup', async () => {
    const db = env.authenticatedContext('primero').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'meta/setup'), { createdAt: 1 })
    batch.set(doc(db, 'users/primero'), { email: 'p@x.es', role: 'admin', createdAt: 1 })
    await assertSucceeds(batch.commit())
  })

  it('no se puede crear el primer usuario como miembro, ni sin meta/setup', async () => {
    const db = env.authenticatedContext('primero').firestore()
    const asMember = writeBatch(db)
    asMember.set(doc(db, 'meta/setup'), { createdAt: 1 })
    asMember.set(doc(db, 'users/primero'), { email: 'p@x.es', role: 'member', createdAt: 1 })
    await assertFails(asMember.commit())
    await assertFails(setDoc(doc(db, 'users/primero'), { email: 'p@x.es', role: 'admin', createdAt: 1 }))
  })

  it('no se puede registrar a otro uid como admin', async () => {
    const db = env.authenticatedContext('primero').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'meta/setup'), { createdAt: 1 })
    batch.set(doc(db, 'users/otro'), { email: 'o@x.es', role: 'admin', createdAt: 1 })
    await assertFails(batch.commit())
  })
})
