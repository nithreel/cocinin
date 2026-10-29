import { getDocs } from 'firebase/firestore'
import {
  groupsCol,
  ingredientsCol,
  purchaseHistoryCol,
  recipesCol,
  shoppingListCol,
  usersCol,
} from './collections'

const COLLECTIONS = {
  groups: groupsCol,
  ingredients: ingredientsCol,
  shoppingList: shoppingListCol,
  recipes: recipesCol,
  purchaseHistory: purchaseHistoryCol,
  users: usersCol,
}

/**
 * Descarga un JSON con los datos de la cocina (copia de seguridad). Sin `includeUsers` se omiten los
 * correos de los miembros: es la copia que puede bajar cualquier usuario.
 */
export async function downloadBackup(includeUsers = true) {
  const data: Record<string, unknown> = { exportedAt: new Date().toISOString() }
  for (const [name, col] of Object.entries(COLLECTIONS)) {
    if (name === 'users' && !includeUsers) continue
    const snap = await getDocs(col)
    data[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cocinin-copia-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  // Safari/iOS necesita que la URL siga viva un momento tras el clic
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
