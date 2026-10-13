import { addDoc, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { localDateString } from '../../lib/expiry'
import { groupsCol, ingredientsCol, shoppingListCol, type ExpiryMode } from '../../lib/collections'

export { useGroups, useIngredients, useRecipes } from '../../lib/AppDataContext'

export interface ExpiryInput {
  mode: ExpiryMode
  date: string | null
}

export async function addGroup(name: string, isFood: boolean) {
  await addDoc(groupsCol, { name, isFood, createdAt: Date.now() })
}

export async function updateGroup(id: string, name: string, isFood: boolean) {
  await updateDoc(doc(groupsCol, id), { name, isFood })
}

// Un ingrediente nuevo nace disponible (ON): quien lo añade es porque lo tiene.
export async function addIngredient(name: string, groupId: string | null, expiry: ExpiryInput) {
  const ref = await addDoc(ingredientsCol, {
    name,
    groupId,
    inPantry: true,
    createdAt: Date.now(),
    expiryMode: expiry.mode,
    expiryDate: expiry.mode === 'date' ? expiry.date : null,
    stockedDate: expiry.mode === 'sinceStocked' && expiry.date ? expiry.date : localDateString(),
  })
  return ref.id
}

export async function updateIngredientExpiry(id: string, expiry: ExpiryInput) {
  await updateDoc(doc(ingredientsCol, id), {
    expiryMode: expiry.mode,
    expiryDate: expiry.mode === 'date' ? expiry.date : null,
    stockedDate: expiry.mode === 'sinceStocked' ? expiry.date : null,
  })
}

export async function updateIngredient(
  id: string,
  name: string,
  groupId: string | null,
  expiry: ExpiryInput,
) {
  await updateDoc(doc(ingredientsCol, id), {
    name,
    groupId,
    expiryMode: expiry.mode,
    expiryDate: expiry.mode === 'date' ? expiry.date : null,
    stockedDate: expiry.mode === 'sinceStocked' ? expiry.date : null,
  })
}

export async function setIngredientInPantry(id: string, inPantry: boolean) {
  await updateDoc(
    doc(ingredientsCol, id),
    inPantry ? { inPantry, stockedDate: localDateString() } : { inPantry },
  )
}

export async function deleteIngredient(id: string) {
  const batch = writeBatch(db)
  batch.delete(doc(ingredientsCol, id))
  const shoppingSnap = await getDocs(query(shoppingListCol, where('ingredientId', '==', id)))
  shoppingSnap.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

export async function deleteGroup(id: string) {
  const batch = writeBatch(db)
  const ingredientsSnap = await getDocs(query(ingredientsCol, where('groupId', '==', id)))
  ingredientsSnap.forEach((d) => batch.update(d.ref, { groupId: null }))
  batch.delete(doc(groupsCol, id))
  await batch.commit()
}
