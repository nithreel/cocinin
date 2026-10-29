import { useMemo, useState } from 'react'
import { addIngredient } from '../pantry/data'
import { addImportedRecipes, undoImport } from './data'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import BackupButton from '../../components/BackupButton'
import { XIcon } from '../../components/icons'
import { parseImport, resolveRecipes } from '../../lib/importRecipes'
import type { Group, Ingredient, Recipe } from '../../lib/collections'

/** Texto que se pega en Claude web junto con la copia de seguridad y la receta. */
const CLAUDE_PROMPT = `Te paso la copia de seguridad de mi cocina (JSON) y una receta. Devuélveme SOLO un JSON, sin explicaciones, con esta forma:

{"recipes":[{"title":"…","instructions":"…","ingredients":[{"name":"…","quantity":"…","unit":"…","optional":false}]}]}

Reglas:
- "name" debe ser EXACTAMENTE el nombre de un ingrediente de "ingredients" de la copia (aunque esté mal escrito). No inventes ingredientes: si falta alguno, ponlo igualmente con su nombre y yo decido si lo creo.
- "quantity": número, fracción o rango con guion ("1", "1/2", "700-800"); vacío si es «al gusto». "unit" en castellano y minúscula (gramos, ml, cucharada, diente, lata, Ud…); vacío si no hay cantidad.
- Si un ingrediente se usa varias veces, suma las cantidades en una sola entrada. "optional": true solo si la receta lo marca como opcional.
- "instructions": cabecera solo con lo que diga la receta (raciones, horno…; no inventes), línea en blanco, pasos numerados "1. Título corto: texto en infinitivo.", y al final, si hay alternativas reales, una línea "Sustituciones: …". Sin comentarios de relleno, bromas ni primera persona.
- El agua no es ingrediente.`

/** Crea los ingredientes que faltan, cada uno en el grupo que elija nith (no se crea nada sin elegirlo). */
function CreateMissing({ names, groups }: { names: string[]; groups: Group[] }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const foodGroups = groups.filter((g) => g.isFood !== false)
  const ready = names.every((n) => picked[n])

  async function create() {
    setBusy(true)
    setError(null)
    try {
      // Sin existencias: son cosas que no tienes; así la receta no sale como «completa» por error.
      for (const n of names) await addIngredient(n, picked[n], { mode: 'none', date: null, quantity: '' }, false)
    } catch (e) {
      setError(`No se pudieron crear: ${(e as Error).message}`)
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cancelButton + ' ml-4 mt-1 text-emerald-700 dark:text-emerald-400'}>
        Crear los que faltan…
      </button>
    )
  }
  return (
    <div className="mt-2 space-y-2 pl-6">
      {names.map((n) => (
        <div key={n} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">{n}</span>
          <select
            value={picked[n] ?? ''}
            onChange={(e) => setPicked((p) => ({ ...p, [n]: e.target.value }))}
            className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
          >
            <option value="">Grupo…</option>
            {foodGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={!ready || busy} onClick={create} className={primaryButton}>
          {busy ? 'Creando…' : `Crear ${names.length}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={cancelButton}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export default function ImportRecipes({
  ingredients,
  groups,
  recipes,
  onClose,
}: {
  ingredients: Ingredient[]
  groups: Group[]
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
    const toAdd = selected.map(({ r }) => ({
      title: r.recipe.title,
      instructions: r.recipe.instructions,
      ingredients: r.ingredients,
    }))
    const previousText = text
    // Se vacía antes de escribir: Firestore avisa de la receta nueva al instante (antes de confirmar),
    // y con el texto aún pegado saldría «Ya hay una receta con este título» en la propia importada.
    setText('')
    setChecked({})
    try {
      const batchId = await addImportedRecipes(toAdd)
      setDone({ batchId, count: toAdd.length })
    } catch (e) {
      setText(previousText)
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Importar recetas</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className={cancelButton + ' -mr-2'}>
          <XIcon />
        </button>
      </div>

      <button
        type="button"
        onClick={copyPrompt}
        className="mb-3 flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:bg-gray-50 dark:border-moss-700 dark:hover:bg-moss-800"
      >
        <span className="text-emerald-700 dark:text-emerald-400">{copied ? <CheckIcon /> : <CopyIcon />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {copied ? 'Instrucciones copiadas' : 'Copiar instrucciones'}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Pégalas junto con tu copia de seguridad y la receta
          </span>
        </span>
      </button>

      <div className="mb-3">
        <BackupButton />
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
                {r.duplicateTitle && (
                  <p className="pl-6 text-amber-600 dark:text-amber-400">Ya hay una receta con este título.</p>
                )}
                {blocked && (
                  <p className="pl-6 text-red-600 dark:text-red-400">
                    No se importa: faltan en la Despensa {r.unknown.join(', ')}. Créalos y vuelve a probar.
                  </p>
                )}
                {blocked && r.missing.length > 0 && <CreateMissing names={r.missing} groups={groups} />}
                <details className="group mt-1 pl-6">
                  <summary className="cursor-pointer list-none text-gray-600 marker:hidden dark:text-gray-400">
                    {r.ingredients.length}/{r.lines.length} ingredientes
                    {r.recipe.instructions ? ' · con preparación' : ' · sin preparación'}
                    <span className="ml-1 text-emerald-700 group-open:hidden dark:text-emerald-400">Ver</span>
                    <span className="ml-1 hidden text-emerald-700 group-open:inline dark:text-emerald-400">Ocultar</span>
                  </summary>
                  <ul className="mt-2 space-y-0.5 text-gray-700 dark:text-gray-300">
                    {r.lines.map((l, k) => (
                      <li key={k} className={l.found ? '' : 'text-red-600 dark:text-red-400'}>
                        {l.found ? '✓' : '✕'} {l.name}
                        {l.quantity && ` — ${l.quantity}${l.unit ? ` ${l.unit}` : ''}`}
                        {!l.quantity && l.unit && ` — ${l.unit}`}
                        {l.optional && ' (opcional)'}
                      </li>
                    ))}
                  </ul>
                  {r.recipe.instructions && (
                    <p className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap border-t border-gray-100 pt-3 text-gray-700 dark:border-moss-800 dark:text-gray-300">
                      {r.recipe.instructions}
                    </p>
                  )}
                </details>
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
      </div>
    </section>
  )
}
