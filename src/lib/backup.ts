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

/** Descarga un JSON con todos los datos de la cocina (copia de seguridad). */
export async function downloadBackup() {
  const data: Record<string, unknown> = { exportedAt: new Date().toISOString() }
  for (const [name, col] of Object.entries(COLLECTIONS)) {
    const snap = await getDocs(col)
    data[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cocinin-copia-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
