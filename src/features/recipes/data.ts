import { addDoc, deleteDoc, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { recipesCol, type RecipeIngredient } from '../../lib/collections'

export { useRecipes } from '../../lib/AppDataContext'

export async function addRecipe(title: string, instructions: string, ingredients: RecipeIngredient[]) {
  await addDoc(recipesCol, { title, instructions, ingredients, createdAt: Date.now() })
}

export async function updateRecipe(
  id: string,
  title: string,
  instructions: string,
  ingredients: RecipeIngredient[],
) {
  await updateDoc(doc(recipesCol, id), { title, instructions, ingredients })
}

export async function deleteRecipe(id: string) {
  await deleteDoc(doc(recipesCol, id))
}

/** Añade recetas importadas (siempre documentos nuevos) marcadas con un id de lote. Devuelve ese id. */
export async function addImportedRecipes(
  recipes: { title: string; instructions: string; ingredients: RecipeIngredient[] }[],
): Promise<string> {
  const batchId = String(Date.now())
  const batch = writeBatch(db)
  for (const r of recipes) {
    batch.set(doc(recipesCol), { ...r, createdAt: Date.now(), importada: batchId })
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
