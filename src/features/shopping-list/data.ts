import { deleteDoc, doc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { currentUid, db } from '../../firebase'
import {
  ingredientsCol,
  purchaseHistoryCol,
  shoppingListCol,
  type Ingredient,
  type ShoppingItem,
} from '../../lib/collections'
import { localDateString } from '../../lib/expiry'

export { useShoppingList, usePurchaseHistory } from '../../lib/AppDataContext'

/*
 * Las escrituras no esperan la confirmación del servidor: Firestore ya las aplica en la caché local y las sube
 * cuando hay red. Así la interfaz responde al instante sin cobertura; un fallo real llega al aviso global.
 */
/** Devuelve el id del elemento creado (para poder deshacer). */
export function addToShoppingList(ingredientId: string) {
  const ref = doc(shoppingListCol)
  void setDoc(ref, { ingredientId, checked: false, addedAt: Date.now(), by: currentUid() })
  return ref.id
}

export async function removeFromShoppingList(itemId: string) {
  void deleteDoc(doc(shoppingListCol, itemId))
}

export async function setShoppingItemChecked(itemId: string, checked: boolean) {
  void updateDoc(doc(shoppingListCol, itemId), { checked })
}

export async function confirmPurchase(items: ShoppingItem[], ingredientsById: Map<string, Ingredient>) {
  const checkedItems = items.filter((item) => item.checked)
  const batch = writeBatch(db)
  const purchasedAt = Date.now()
  const stockedDate = localDateString(new Date(purchasedAt))
  for (const item of checkedItems) {
    batch.delete(doc(shoppingListCol, item.id))
    // otro miembro pudo borrar el ingrediente: se quita de la lista sin romper el resto de la compra
    if (!ingredientsById.has(item.ingredientId)) continue
    batch.update(doc(ingredientsCol, item.ingredientId), {
      inPantry: true,
      expiryMode: 'sinceStocked',
      stockedDate,
      expiryDate: null,
      // lo recién comprado está entero: se vacía la cantidad que quedaba
      quantity: null,
    })
    const ingredientName = ingredientsById.get(item.ingredientId)?.name ?? '(ingrediente eliminado)'
    batch.set(doc(purchaseHistoryCol), { ingredientName, purchasedAt, by: currentUid() })
  }
  void batch.commit()
}

export async function clearPurchaseHistory() {
  const snap = await getDocs(purchaseHistoryCol)
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db)
    for (const d of docs.slice(i, i + 500)) {
      batch.delete(d.ref)
    }
    await batch.commit()
  }
}
