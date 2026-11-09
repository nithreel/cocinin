import { addDoc, deleteDoc, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
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

/** Devuelve el id del elemento creado (para poder deshacer). */
export async function addToShoppingList(ingredientId: string) {
  const ref = await addDoc(shoppingListCol, { ingredientId, checked: false, addedAt: Date.now(), by: currentUid() })
  return ref.id
}

/** Añade varios de golpe; devuelve los ids creados. */
export async function addManyToShoppingList(ingredientIds: string[]) {
  const batch = writeBatch(db)
  const addedAt = Date.now()
  const ids: string[] = []
  ingredientIds.forEach((ingredientId, i) => {
    const ref = doc(shoppingListCol)
    ids.push(ref.id)
    batch.set(ref, { ingredientId, checked: false, addedAt: addedAt + i, by: currentUid() })
  })
  await batch.commit()
  return ids
}

export async function removeManyFromShoppingList(ids: string[]) {
  const batch = writeBatch(db)
  ids.forEach((id) => batch.delete(doc(shoppingListCol, id)))
  await batch.commit()
}

export async function removeFromShoppingList(itemId: string) {
  await deleteDoc(doc(shoppingListCol, itemId))
}

export async function setShoppingItemChecked(itemId: string, checked: boolean) {
  await updateDoc(doc(shoppingListCol, itemId), { checked })
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
    })
    const ingredientName = ingredientsById.get(item.ingredientId)?.name ?? '(ingrediente eliminado)'
    batch.set(doc(purchaseHistoryCol), { ingredientName, purchasedAt, by: currentUid() })
  }
  await batch.commit()
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
