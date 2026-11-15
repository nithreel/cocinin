import { addDoc, arrayRemove, deleteDoc, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { currentUid, db } from '../../firebase'
import { recipesCol, tagsCol, type RecipeIngredient } from '../../lib/collections'
import type { LegacyMigrationPlan } from '../../lib/tags'

export { useRecipes, useTags } from '../../lib/AppDataContext'

export async function addRecipe(
  title: string,
  instructions: string,
  ingredients: RecipeIngredient[],
  tagIds: string[] = [],
) {
  await addDoc(recipesCol, { title, instructions, ingredients, tagIds, createdAt: Date.now(), by: currentUid() })
}

export async function updateRecipe(
  id: string,
  title: string,
  instructions: string,
  ingredients: RecipeIngredient[],
  tagIds: string[] = [],
) {
  await updateDoc(doc(recipesCol, id), { title, instructions, ingredients, tagIds })
}

export async function deleteRecipe(id: string) {
  await deleteDoc(doc(recipesCol, id))
}

/** Añade recetas importadas (siempre documentos nuevos) marcadas con un id de lote. Devuelve ese id. */
export async function addImportedRecipes(
  recipes: { title: string; instructions: string; ingredients: RecipeIngredient[]; tagIds: string[] }[],
  newTags: { id: string; name: string }[] = [],
): Promise<string> {
  const batchId = String(Date.now())
  const batch = writeBatch(db)
  for (const t of newTags) batch.set(doc(tagsCol, t.id), { name: t.name, createdAt: Date.now(), by: currentUid() })
  for (const r of recipes) {
    batch.set(doc(recipesCol), { ...r, createdAt: Date.now(), importada: batchId, by: currentUid() })
  }
  await batch.commit()
  return batchId
}

/** Borra solo las recetas de un lote importado. */
export async function undoImport(batchId: string) {
  const snap = await getDocs(query(recipesCol, where('importada', '==', batchId)))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** `order` = posición al final de las ya ordenadas a mano (si no hay ninguna, sin orden y va alfabética). */
export async function addTag(name: string, order?: number) {
  await addDoc(tagsCol, { name, createdAt: Date.now(), by: currentUid(), ...(order === undefined ? {} : { order }) })
}

/** Guarda el orden elegido: la posición de cada id en la lista pasa a ser su `order`. */
export async function reorderTags(ids: string[]) {
  const batch = writeBatch(db)
  ids.forEach((id, i) => batch.update(doc(tagsCol, id), { order: i }))
  await batch.commit()
}

export async function renameTag(id: string, name: string) {
  await updateDoc(doc(tagsCol, id), { name })
}

/** Borra la etiqueta y la quita de todas las recetas que la tengan (no hace falta quitarla antes). */
export async function deleteTag(id: string) {
  const snap = await getDocs(query(recipesCol, where('tagIds', 'array-contains', id)))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { tagIds: arrayRemove(id) }))
  batch.delete(doc(tagsCol, id))
  await batch.commit()
}

/** Pasa las etiquetas antiguas (texto) a la colección `tags`; el campo antiguo se conserva. */
export async function migrateLegacyTags(plan: LegacyMigrationPlan) {
  const batch = writeBatch(db)
  for (const t of plan.newTags) batch.set(doc(tagsCol, t.id), { name: t.name, createdAt: Date.now(), by: currentUid() })
  for (const u of plan.updates) batch.update(doc(recipesCol, u.recipeId), { tagIds: u.tagIds })
  await batch.commit()
}
