import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
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
