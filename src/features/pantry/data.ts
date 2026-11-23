import { doc, getDocsFromCache, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { currentUid, db } from '../../firebase'
import { groupsCol, ingredientsCol, shoppingListCol, type ExpiryMode } from '../../lib/collections'

export { useGroups, useIngredients, useRecipes } from '../../lib/AppDataContext'

/*
 * Las escrituras no esperan la confirmación del servidor: Firestore ya las aplica en la caché local y las sube
 * cuando hay red. Así la interfaz responde al instante sin cobertura; un fallo real llega al aviso global.
 */
export interface ExpiryInput {
  mode: ExpiryMode
  date: string | null
  /** cantidad que queda, texto libre; vacío = sin dato */
  quantity: string
}

/** Crea un grupo; sin `order` se ordena alfabéticamente. */
export async function addGroup(name: string, isFood: boolean, order?: number) {
  void setDoc(doc(groupsCol), { name, isFood, createdAt: Date.now(), ...(order === undefined ? {} : { order }) })
}

/** Guarda el orden elegido: la posición de cada id pasa a ser su `order`. */
export async function reorderGroups(ids: string[]) {
  const batch = writeBatch(db)
  ids.forEach((id, i) => batch.update(doc(groupsCol, id), { order: i }))
  void batch.commit()
}

/** Cambia nombre y «Es comida» de un grupo; sus ingredientes no se tocan. */
export async function updateGroup(id: string, name: string, isFood: boolean) {
  void updateDoc(doc(groupsCol, id), { name, isFood })
}

/** Un ingrediente nuevo nace disponible (ON): quien lo añade es porque lo tiene. Devuelve su id. */
export function addIngredient(name: string, groupId: string | null, expiry: ExpiryInput, inPantry = true) {
  const ref = doc(ingredientsCol)
  void setDoc(ref, {
    name,
    groupId,
    inPantry,
    createdAt: Date.now(),
    expiryMode: expiry.mode,
    expiryDate: expiry.mode === 'date' ? expiry.date : null,
    stockedDate: expiry.mode === 'sinceStocked' && expiry.date ? expiry.date : null,
    quantity: expiry.quantity.trim() || null,
  })
  return ref.id
}

/** Fecha y cantidad desde el panel de la fila: la fecha se guarda como caducidad o como compra según `mode`, y la
 *  otra se borra. */
export async function updateIngredientExpiry(id: string, expiry: ExpiryInput) {
  void updateDoc(doc(ingredientsCol, id), {
    expiryMode: expiry.mode,
    expiryDate: expiry.mode === 'date' ? expiry.date : null,
    stockedDate: expiry.mode === 'sinceStocked' ? expiry.date : null,
    quantity: expiry.quantity.trim() || null,
  })
}

/** Edición completa (nombre, grupo, fecha y cantidad); las fechas siguen la misma regla que
 *  `updateIngredientExpiry`. */
export async function updateIngredient(
  id: string,
  name: string,
  groupId: string | null,
  expiry: ExpiryInput,
) {
  void updateDoc(doc(ingredientsCol, id), {
    name,
    groupId,
    expiryMode: expiry.mode,
    expiryDate: expiry.mode === 'date' ? expiry.date : null,
    stockedDate: expiry.mode === 'sinceStocked' ? expiry.date : null,
    quantity: expiry.quantity.trim() || null,
  })
}

/** Al reponer o congelar algo agotado a mano nace sin fecha: «Comprado hace…» solo lo pone la lista de la compra. */
const NO_DATES = { expiryMode: 'none', expiryDate: null, stockedDate: null, thawedAt: null, useSoon: false, useSoonAt: null } as const

/** Interruptor de la Despensa. Al agotarse deja de estar congelado y pierde cantidad y «gastar pronto», y anota
 *  `by` (el notifier no avisa a quien lo agota); al reponerse nace sin fechas. */
export async function setIngredientInPantry(id: string, inPantry: boolean) {
  void updateDoc(
    doc(ingredientsCol, id),
    // al agotarse deja de estar congelado
    inPantry
      ? { inPantry, ...NO_DATES }
      : { inPantry, frozen: false, thawedAt: null, useSoon: false, useSoonAt: null, quantity: null, by: currentUid() },
  )
}

/**
 * Marca o desmarca un ingrediente como congelado. Congelar implica que lo tienes (ON).
 * Sacarlo del congelador (`wasFrozen`) arranca la cuenta de descongelado (en nevera); volver a congelar la borra.
 */
export async function setIngredientFrozen(id: string, frozen: boolean, wasInPantry: boolean, wasFrozen = false) {
  void updateDoc(
    doc(ingredientsCol, id),
    frozen
      ? { frozen, thawedAt: null, ...(wasInPantry ? {} : { inPantry: true, ...NO_DATES }) }
      : { frozen, thawedAt: wasFrozen ? Date.now() : null },
  )
}

/** «Gastar pronto»: marca manual que pinta el interruptor en ámbar. */
export async function setIngredientUseSoon(id: string, useSoon: boolean) {
  void updateDoc(doc(ingredientsCol, id), { useSoon, useSoonAt: useSoon ? Date.now() : null })
}

/** Lee de la caché local (los listeners la mantienen al día): así borrar no depende de la red. */
export async function deleteIngredient(id: string) {
  const batch = writeBatch(db)
  batch.delete(doc(ingredientsCol, id))
  const shoppingSnap = await getDocsFromCache(query(shoppingListCol, where('ingredientId', '==', id)))
  shoppingSnap.forEach((d) => batch.delete(d.ref))
  void batch.commit()
}

/** Borra el grupo y pasa sus ingredientes a «Sin grupo» (los busca en la caché local, así no depende de la red). */
export async function deleteGroup(id: string) {
  const batch = writeBatch(db)
  const ingredientsSnap = await getDocsFromCache(query(ingredientsCol, where('groupId', '==', id)))
  ingredientsSnap.forEach((d) => batch.update(d.ref, { groupId: null }))
  batch.delete(doc(groupsCol, id))
  void batch.commit()
}
