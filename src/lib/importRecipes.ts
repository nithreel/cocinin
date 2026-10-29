import { normalizeText } from './search'
import type { Ingredient, Recipe, RecipeIngredient } from './collections'

export const MAX_IMPORT_RECIPES = 20
const MAX_TITLE = 200
const MAX_INSTRUCTIONS = 20_000
const MAX_INGREDIENTS = 100

export interface ImportedRecipeIngredient {
  name: string
  quantity: string
  unit: string
  optional: boolean
}

export interface ImportedRecipe {
  title: string
  instructions: string
  ingredients: ImportedRecipeIngredient[]
}

export type ParseResult = { ok: true; recipes: ImportedRecipe[] } | { ok: false; error: string }

function str(value: unknown, field: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`falta «${field}»`)
    return ''
  }
  if (typeof value === 'number' && field === 'quantity') value = String(value)
  if (typeof value !== 'string') throw new Error(`«${field}» debe ser texto`)
  const text = value.trim()
  if (required && !text) throw new Error(`«${field}» está vacío`)
  if (text.length > max) throw new Error(`«${field}» es demasiado largo`)
  return text
}

function parseIngredient(raw: unknown, where: string): ImportedRecipeIngredient {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error(`${where}: ingrediente no válido`)
  const r = raw as Record<string, unknown>
  try {
    if (r.optional !== undefined && typeof r.optional !== 'boolean') throw new Error('«optional» debe ser true o false')
    return {
      name: str(r.name, 'name', 100, true),
      quantity: str(r.quantity, 'quantity', 40),
      unit: str(r.unit, 'unit', 60),
      optional: r.optional === true,
    }
  } catch (e) {
    throw new Error(`${where}: ${(e as Error).message}`)
  }
}

function parseRecipe(raw: unknown, index: number): ImportedRecipe {
  const where = `receta ${index + 1}`
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error(`${where}: no es un objeto`)
  const r = raw as Record<string, unknown>
  try {
    const title = str(r.title, 'title', MAX_TITLE, true)
    const instructions = str(r.instructions, 'instructions', MAX_INSTRUCTIONS)
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) throw new Error('«ingredients» debe ser una lista con algo dentro')
    if (r.ingredients.length > MAX_INGREDIENTS) throw new Error('demasiados ingredientes')
    const ingredients = r.ingredients.map((ing, i) => parseIngredient(ing, `«${title}», ingrediente ${i + 1}`))
    return { title, instructions, ingredients }
  } catch (e) {
    throw new Error(`${where}: ${(e as Error).message}`)
  }
}

/** Valida el JSON pegado. Acepta `{recipes:[…]}`, una lista o una sola receta, con o sin ```json. */
export function parseImport(text: string): ParseResult {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  if (!cleaned) return { ok: false, error: 'No hay nada pegado.' }
  let data: unknown
  try {
    data = JSON.parse(cleaned)
  } catch {
    return { ok: false, error: 'Eso no es un JSON válido.' }
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { recipes?: unknown }).recipes)
      ? (data as { recipes: unknown[] }).recipes
      : data && typeof data === 'object' && 'title' in data
        ? [data]
        : null
  if (!list) return { ok: false, error: 'Falta la lista «recipes».' }
  if (list.length === 0) return { ok: false, error: 'La lista de recetas está vacía.' }
  if (list.length > MAX_IMPORT_RECIPES) return { ok: false, error: `Máximo ${MAX_IMPORT_RECIPES} recetas por importación.` }
  try {
    return { ok: true, recipes: list.map(parseRecipe) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export interface ResolvedRecipe {
  recipe: ImportedRecipe
  /** ingredientes ya resueltos a la despensa (solo vale si `unknown` está vacío) */
  ingredients: RecipeIngredient[]
  /** nombres que no existen en la despensa (o son ambiguos): no se crean */
  unknown: string[]
  /** una línea por ingrediente pedido, con el nombre real de la despensa si se encontró */
  lines: { name: string; quantity: string; unit: string; optional: boolean; found: boolean }[]
  /** ya hay una receta con ese título */
  duplicateTitle: boolean
}

/** Casa cada ingrediente por nombre (sin tildes ni mayúsculas) con la despensa. Nunca crea nada. */
export function resolveRecipes(
  recipes: ImportedRecipe[],
  ingredients: Ingredient[],
  existing: Recipe[],
): ResolvedRecipe[] {
  const byName = new Map<string, Ingredient[]>()
  for (const ing of ingredients) {
    const key = normalizeText(ing.name).trim()
    byName.set(key, [...(byName.get(key) ?? []), ing])
  }
  const titles = new Set(existing.map((r) => normalizeText(r.title).trim()))
  return recipes.map((recipe) => {
    const resolved: RecipeIngredient[] = []
    const unknown: string[] = []
    const lines: ResolvedRecipe['lines'] = []
    const seen = new Set<string>()
    for (const ri of recipe.ingredients) {
      const found = byName.get(normalizeText(ri.name).trim())
      const line = { name: ri.name, quantity: ri.quantity, unit: ri.unit, optional: ri.optional }
      if (found?.length !== 1) {
        unknown.push(found ? `${ri.name} (ambiguo)` : ri.name)
        lines.push({ ...line, found: false })
        continue
      }
      if (seen.has(found[0].id)) {
        unknown.push(`${ri.name} (repetido)`)
        lines.push({ ...line, found: false })
        continue
      }
      lines.push({ ...line, name: found[0].name, found: true })
      seen.add(found[0].id)
      resolved.push({ ingredientId: found[0].id, quantity: ri.quantity, unit: ri.unit, optional: ri.optional })
    }
    return {
      recipe,
      ingredients: resolved,
      unknown,
      lines,
      duplicateTitle: titles.has(normalizeText(recipe.title).trim()),
    }
  })
}
