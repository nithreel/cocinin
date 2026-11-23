import type { Ingredient, Recipe, Tag } from './collections'
import { sortTags } from './tags'

/** Texto de una receta con el formato de WhatsApp (*negrita*, _cursiva_, viñetas): título, etiquetas (en el orden de la app),
 *  ingredientes y preparación. Los ingredientes ya eliminados de la despensa se omiten: no tienen nombre. */
export function recipeToShareText(recipe: Recipe, ingredientsById: Map<string, Ingredient>, tags: Tag[]): string {
  // mismo orden que en la app (a mano primero, luego alfabético sin contar el emoji), no el orden en que se guardaron
  const tagNames = sortTags(tags.filter((t) => recipe.tagIds?.includes(t.id))).map((t) => t.name)
  const lines: string[] = [`*${recipe.title}*`]
  if (tagNames.length > 0) lines.push(`_${tagNames.join(' · ')}_`)

  const ingredientLines = recipe.ingredients.flatMap((ri) => {
    const name = ingredientsById.get(ri.ingredientId)?.name
    if (!name) return []
    const amount = ri.quantity ? ` — ${ri.quantity}${ri.unit ? ` ${ri.unit}` : ''}` : ''
    return [`• ${name}${amount}${ri.optional ? ' (opcional)' : ''}`]
  })
  if (ingredientLines.length > 0) lines.push('', '*Ingredientes*', ...ingredientLines)

  const steps = recipe.instructions.trim()
  if (steps) lines.push('', '*Preparación*', steps)
  return lines.join('\n')
}

/** Comparte el texto: con el menú de compartir del sistema (móvil, donde sale WhatsApp) si existe y, si no,
 *  lo copia al portapapeles. Devuelve qué pasó; cerrar el menú sin compartir no es un error. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // otro fallo del menú de compartir: se intenta copiar
    }
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}
