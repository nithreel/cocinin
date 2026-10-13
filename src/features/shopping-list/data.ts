import { addDoc, deleteDoc, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  ingredientsCol,
  purchaseHistoryCol,
  shoppingListCol,
  type Ingredient,
  type ShoppingItem,
} from '../../lib/collections'
import { localDateString } from '../../lib/expiry'

export { useShoppingList, usePurchaseHistory } from '../../lib/AppDataContext'

export async function addToShoppingList(ingredientId: string) {
  await addDoc(shoppingListCol, { ingredientId, checked: false, addedAt: Date.now() })
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
    batch.update(doc(ingredientsCol, item.ingredientId), {
      inPantry: true,
      expiryMode: 'sinceStocked',
      stockedDate,
      expiryDate: null,
    })
    batch.delete(doc(shoppingListCol, item.id))
    const ingredientName = ingredientsById.get(item.ingredientId)?.name ?? '(ingrediente eliminado)'
    batch.set(doc(purchaseHistoryCol), { ingredientName, purchasedAt })
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
