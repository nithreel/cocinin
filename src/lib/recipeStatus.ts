import type { Ingredient, Recipe, RecipeIngredient, ShoppingItem } from './collections'
import { getExpiryInfo } from './expiry'
import { matchesSearch } from './search'

/** full: tienes todo; partial: solo faltan opcionales; missing: falta algo necesario. */
export type RecipeStatus = 'full' | 'partial' | 'missing'

/** Disponible para cocinar: lo tienes (congelado también) y no está caducado. */
export function isUsable(ing: Ingredient | undefined) {
  return ing?.inPantry === true && getExpiryInfo(ing)?.status !== 'expired'
}

export function getRecipeStatus(recipe: Recipe, ingredientsById: Map<string, Ingredient>): RecipeStatus {
  let missingOptional = false
  for (const ri of recipe.ingredients) {
    const have = isUsable(ingredientsById.get(ri.ingredientId))
    if (!have) {
      if (ri.optional) missingOptional = true
      else return 'missing'
    }
  }
  return missingOptional ? 'partial' : 'full'
}

/** Cuántos ingredientes necesarios (no opcionales) faltan en la despensa. */
export function countMissingRequired(recipe: Recipe, ingredientsById: Map<string, Ingredient>) {
  return recipe.ingredients.filter((ri) => !ri.optional && !isUsable(ingredientsById.get(ri.ingredientId))).length
}

/** Lo necesario que falta en la despensa y aún no está en la lista (los ingredientes borrados no cuentan). */
export function ingredientsToBuy(
  recipeIngredients: RecipeIngredient[],
  ingredientsById: Map<string, Ingredient>,
  shoppingItems: ShoppingItem[],
): Ingredient[] {
  const onList = new Set(shoppingItems.map((i) => i.ingredientId))
  return recipeIngredients
    .filter((ri) => !ri.optional && ingredientsById.has(ri.ingredientId))
    .map((ri) => ingredientsById.get(ri.ingredientId)!)
    .filter((ing) => !isUsable(ing) && !onList.has(ing.id))
}

/** Filtros del Recetario: búsqueda en el título o en sus ingredientes, «Puedo hacerla» y todas las etiquetas elegidas. */
export function filterRecipes(
  recipes: Recipe[],
  { search, onlyReady, tagIds }: { search: string; onlyReady: boolean; tagIds: string[] },
  ingredientsById: Map<string, Ingredient>,
): Recipe[] {
  return recipes.filter(
    (r) =>
      (!search.trim() ||
        matchesSearch(r.title, search) ||
        r.ingredients.some((ri) => matchesSearch(ingredientsById.get(ri.ingredientId)?.name ?? '', search))) &&
      (!onlyReady || countMissingRequired(r, ingredientsById) === 0) &&
      tagIds.every((id) => r.tagIds?.includes(id)),
  )
}
