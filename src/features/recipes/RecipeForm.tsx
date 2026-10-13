import { useMemo, useState, type FormEvent } from 'react'
import type { Group, Ingredient, RecipeIngredient } from '../../lib/collections'
import { groupByPantryGroup } from '../../lib/groupByPantryGroup'
import SearchInput from '../../components/SearchInput'

interface SelectedIngredient {
  quantity: string
  unit: string
  optional: boolean
}

export interface RecipeFormValues {
  title: string
  instructions: string
  ingredients: RecipeIngredient[]
}

export default function RecipeForm({
  ingredients,
  groups,
  initial,
  submitLabel = 'Guardar receta',
  onSubmit,
  onDone,
}: {
  ingredients: Ingredient[]
  groups: Group[]
  initial?: RecipeFormValues
  submitLabel?: string
  onSubmit: (values: RecipeFormValues) => Promise<void>
  onDone: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [selected, setSelected] = useState<Record<string, SelectedIngredient>>(() => {
    const initialSelected: Record<string, SelectedIngredient> = {}
    for (const ri of initial?.ingredients ?? []) {
      initialSelected[ri.ingredientId] = { quantity: ri.quantity, unit: ri.unit, optional: ri.optional ?? false }
    }
    return initialSelected
  })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  function toggleIngredient(id: string) {
    setSelected((prev) => {
      const next = { ...prev }
      if (id in next) {
        delete next[id]
      } else {
        next[id] = { quantity: '', unit: '', optional: false }
      }
      return next
    })
  }

  function updateSelected(id: string, field: 'quantity' | 'unit', value: string) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  function toggleOptional(id: string) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], optional: !prev[id].optional } }))
  }

  const foodGroupIds = useMemo(
    () => new Set(groups.filter((g) => g.isFood !== false).map((g) => g.id)),
    [groups],
  )
  const availableIngredients = useMemo(
    () => ingredients.filter((ing) => !ing.groupId || foodGroupIds.has(ing.groupId) || ing.id in selected),
    [ingredients, foodGroupIds, selected],
  )
  const ingredientsById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  // los ya marcados siguen visibles aunque no coincidan con la búsqueda
  const visibleIngredients = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return availableIngredients
    return availableIngredients.filter((i) => i.name.toLowerCase().includes(term) || i.id in selected)
  }, [availableIngredients, search, selected])
  const sections = useMemo(
    () => groupByPantryGroup(visibleIngredients, (i) => i.id, ingredientsById, groups),
    [visibleIngredients, ingredientsById, groups],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || Object.keys(selected).length === 0) return
    setSubmitting(true)
    try {
      const recipeIngredients: RecipeIngredient[] = Object.entries(selected).map(
        ([ingredientId, { quantity, unit, optional }]) => ({
          ingredientId,
          quantity: quantity.trim(),
          unit: unit.trim(),
          optional,
        }),
      )
      await onSubmit({ title: title.trim(), instructions: instructions.trim(), ingredients: recipeIngredients })
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipe-title">
        Título
      </label>
      <input
        id="recipe-title"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nombre de la receta"
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
      />

      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Ingredientes</p>
      {availableIngredients.length > 0 && <SearchInput value={search} onChange={setSearch} className="mb-3" />}
      {availableIngredients.length === 0 && (
        <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">Añade ingredientes de comida en la Despensa primero.</p>
      )}
      {search.trim() && sections.length === 0 && (
        <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">Nada que coincida con "{search.trim()}".</p>
      )}
      <div className="mb-4 space-y-3">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {section.name}
            </p>
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-moss-800 dark:border-moss-700">
              {section.items.map((ing) => {
                const isSelected = ing.id in selected
                return (
                  <li key={ing.id} className="flex flex-col gap-2 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIngredient(ing.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 dark:border-moss-600 dark:bg-moss-800"
                      />
                      {ing.name}
                    </label>
                    {isSelected && (
                      <div className="flex flex-wrap items-center gap-2 pl-6">
                        <input
                          value={selected[ing.id].quantity}
                          onChange={(e) => updateSelected(ing.id, 'quantity', e.target.value)}
                          placeholder="Cantidad"
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
                        />
                        <input
                          value={selected[ing.id].unit}
                          onChange={(e) => updateSelected(ing.id, 'unit', e.target.value)}
                          placeholder="Unidad"
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
                        />
                        <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={selected[ing.id].optional}
                            onChange={() => toggleOptional(ing.id)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 dark:border-moss-600 dark:bg-moss-800"
                          />
                          Opcional
                        </label>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <hr className="mb-4 border-t-2 border-gray-200 dark:border-moss-700" />

      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipe-instructions">
        Preparación
      </label>
      <textarea
        id="recipe-instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={6}
        placeholder="Pasos a seguir..."
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : submitLabel}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          Cancelar
        </button>
      </div>
    </form>
  )
}
