import { useEffect, useState } from 'react'
import { deleteDoc, doc, getDocs, limit as fsLimit, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { currentUid, db } from '../../firebase'
import { localDateString } from '../../lib/expiry'
import { wholePurchases } from '../../lib/purchaseHistory'
import {
  ingredientsCol,
  purchaseHistoryCol,
  type PurchaseHistoryEntry,
  shoppingListCol,
  type Ingredient,
  type ShoppingItem,
} from '../../lib/collections'

export { useShoppingList } from '../../lib/AppDataContext'

/**
 * Historial de compras: solo se descarga (y se escucha) cuando `enabled` (la sección está desplegada), de `limit` en
 * `limit` entradas. Escucharlo siempre costaba cientos de lecturas de Firestore cada vez que se abría la app.
 * `mayHaveMore`: se llegó al límite, así que puede haber compras más antiguas.
 */
export function usePurchaseHistory(enabled: boolean, limit: number) {
  const [state, setState] = useState<{ entries: PurchaseHistoryEntry[]; mayHaveMore: boolean } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const q = query(purchaseHistoryCol, orderBy('purchasedAt', 'desc'), fsLimit(limit))
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PurchaseHistoryEntry)
      setState({ entries: wholePurchases(all, limit), mayHaveMore: all.length >= limit })
    })
  }, [enabled, limit])

  return { entries: state?.entries ?? [], loading: enabled && state === null, mayHaveMore: state?.mayHaveMore ?? false }
}

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

/** Quita el artículo de la lista; el ingrediente no cambia. */
export async function removeFromShoppingList(itemId: string) {
  void deleteDoc(doc(shoppingListCol, itemId))
}

/** Tacha o destacha un artículo; el ingrediente no cambia hasta confirmar la compra. */
export async function setShoppingItemChecked(itemId: string, checked: boolean) {
  void updateDoc(doc(shoppingListCol, itemId), { checked })
}

/** Confirma lo tachado de `items`: lo quita de la lista, lo repone como «Comprado hoy» (sin cantidad ni estados
 *  anteriores) y lo anota en el historial con un mismo `purchasedAt`. Los ingredientes ya borrados solo salen de la
 *  lista. */
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
      // lo recién comprado sale como «Comprado hoy» (sin fecha de caducidad: se pone a mano si hace falta), sin
      // cantidad y sin el estado anterior (congelado, descongelando o «gastar pronto» de lo que quedaba)
      expiryMode: 'sinceStocked',
      stockedDate,
      expiryDate: null,
      quantity: null,
      frozen: false,
      thawedAt: null,
      useSoon: false,
      useSoonAt: null,
    })
    const ingredientName = ingredientsById.get(item.ingredientId)?.name ?? '(ingrediente eliminado)'
    batch.set(doc(purchaseHistoryCol), { ingredientName, purchasedAt, by: currentUid() })
  }
  void batch.commit()
}

/** Borra todo el historial de compras, en lotes de 500 (límite de Firestore por lote). */
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
