import { useMemo, useState } from 'react'
import { addImportedRecipes, undoImport } from './data'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import { parseImport, resolveRecipes } from '../../lib/importRecipes'
import type { Ingredient, Recipe } from '../../lib/collections'

/** Texto que se pega en Claude web junto con la copia de seguridad y la receta. */
const CLAUDE_PROMPT = `Te paso la copia de seguridad de mi cocina (JSON) y una receta. Devuélveme SOLO un JSON, sin explicaciones, con esta forma:

{"recipes":[{"title":"…","instructions":"…","ingredients":[{"name":"…","quantity":"…","unit":"…","optional":false}]}]}

Reglas:
- "name" debe ser EXACTAMENTE el nombre de un ingrediente de "ingredients" de la copia (aunque esté mal escrito). No inventes ingredientes: si falta alguno, ponlo igualmente con su nombre y yo decido si lo creo.
- "quantity": número, fracción o rango con guion ("1", "1/2", "700-800"); vacío si es «al gusto». "unit" en castellano y minúscula (gramos, ml, cucharada, diente, lata, Ud…); vacío si no hay cantidad.
- Si un ingrediente se usa varias veces, suma las cantidades en una sola entrada. "optional": true solo si la receta lo marca como opcional.
- "instructions": cabecera solo con lo que diga la receta (raciones, horno…; no inventes), línea en blanco, pasos numerados "1. Título corto: texto en infinitivo.", y al final, si hay alternativas reales, una línea "Sustituciones: …". Sin comentarios de relleno, bromas ni primera persona.
- El agua no es ingrediente.`

export default function ImportRecipes({
  ingredients,
  recipes,
  onClose,
}: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ batchId: string; count: number } | null>(null)

  const parsed = useMemo(() => (text.trim() ? parseImport(text) : null), [text])
  const resolved = useMemo(
    () => (parsed?.ok ? resolveRecipes(parsed.recipes, ingredients, recipes) : []),
    [parsed, ingredients, recipes],
  )

  // por defecto se marcan las que se pueden importar y no repiten título
  const isChecked = (i: number) => checked[i] ?? (resolved[i].unknown.length === 0 && !resolved[i].duplicateTitle)
  const selected = resolved.map((r, i) => ({ r, i })).filter(({ r, i }) => r.unknown.length === 0 && isChecked(i))

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(CLAUDE_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setError('No se pudo copiar al portapapeles.')
    }
  }

  async function handleImport() {
    setBusy(true)
    setError(null)
    try {
      const batchId = await addImportedRecipes(
        selected.map(({ r }) => ({
          title: r.recipe.title,
          instructions: r.recipe.instructions,
          ingredients: r.ingredients,
        })),
      )
      setDone({ batchId, count: selected.length })
      setText('')
      setChecked({})
    } catch (e) {
      setError(`No se pudo importar: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleUndo() {
    if (!done) return
    setBusy(true)
    setError(null)
    try {
      await undoImport(done.batchId)
      setDone(null)
    } catch (e) {
      setError(`No se pudo deshacer: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Importar recetas (JSON)</h3>
        <button type="button" onClick={copyPrompt} className={cancelButton}>
          {copied ? 'Copiado ✓' : 'Copiar instrucciones para Claude'}
        </button>
      </div>

      {done && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <span>
            {done.count === 1 ? 'Receta importada.' : `${done.count} recetas importadas.`}
          </span>
          <button type="button" disabled={busy} onClick={handleUndo} className={cancelButton}>
            Deshacer importación
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setChecked({})
          setDone(null)
        }}
        rows={5}
        placeholder="Pega aquí el JSON que te devuelva Claude…"
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
      />

      {parsed && !parsed.ok && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{parsed.error}</p>}

      {resolved.length > 0 && (
        <ul className="mb-3 space-y-2">
          {resolved.map((r, i) => {
            const blocked = r.unknown.length > 0
            return (
              <li key={i} className="rounded-md border border-gray-200 p-3 text-sm dark:border-moss-700">
                <label className="flex items-start gap-2 text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    disabled={blocked}
                    checked={!blocked && isChecked(i)}
                    onChange={() => setChecked((c) => ({ ...c, [i]: !isChecked(i) }))}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 dark:border-moss-600 dark:bg-moss-800"
                  />
                  <span className="font-medium">{r.recipe.title}</span>
                </label>
                <p className="mt-1 pl-6 text-gray-600 dark:text-gray-400">
                  {r.ingredients.length} ingredientes
                  {r.recipe.instructions ? ' · con preparación' : ' · sin preparación'}
                </p>
                {r.duplicateTitle && (
                  <p className="pl-6 text-amber-600 dark:text-amber-400">Ya hay una receta con este título.</p>
                )}
                {blocked && (
                  <p className="pl-6 text-red-600 dark:text-red-400">
                    No se importa: faltan en la Despensa {r.unknown.join(', ')}. Créalos y vuelve a probar.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || selected.length === 0}
          onClick={handleImport}
          className={primaryButton}
        >
          {busy ? 'Importando…' : `Importar ${selected.length || ''}`.trim()}
        </button>
        <button type="button" onClick={onClose} className={cancelButton}>
          Cerrar
        </button>
      </div>
    </section>
  )
}
