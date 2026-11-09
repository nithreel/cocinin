import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import { addRecipe, deleteRecipe, updateRecipe, useRecipes } from './data'
import RecipeForm from './RecipeForm'
import { scrollMainToTop } from '../../lib/scroll'
import { ChevronIcon } from '../../components/icons'
import SearchInput from '../../components/SearchInput'
import { matchesSearch } from '../../lib/search'
import ListSkeleton from '../../components/ListSkeleton'
import StickyHeader from '../../components/StickyHeader'
import ImportRecipes from './ImportRecipes'
import DeleteButton from '../../components/DeleteButton'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import type { Group, Ingredient, Recipe } from '../../lib/collections'

type RecipeStatus = 'full' | 'partial' | 'missing'

function getRecipeStatus(recipe: Recipe, ingredientsById: Map<string, Ingredient>): RecipeStatus {
  let missingOptional = false
  for (const ri of recipe.ingredients) {
    const have = ingredientsById.get(ri.ingredientId)?.inPantry === true
    if (!have) {
      if (ri.optional) missingOptional = true
      else return 'missing'
    }
  }
  return missingOptional ? 'partial' : 'full'
}

/** Qué falta de una receta: ingredientes necesarios y opcionales que no están en la despensa. */
function getMissing(recipe: Recipe, ingredientsById: Map<string, Ingredient>) {
  const required: string[] = []
  const optional: string[] = []
  for (const ri of recipe.ingredients) {
    const ing = ingredientsById.get(ri.ingredientId)
    if (ing?.inPantry === true) continue
    ;(ri.optional ? optional : required).push(ing?.name ?? '(eliminado)')
  }
  return { required, optional }
}

function statusSubtitle(status: RecipeStatus, missing: { required: string[]; optional: string[] }) {
  if (status === 'full') return { text: 'Tienes todo', className: 'text-emerald-700 dark:text-emerald-400' }
  if (status === 'partial') {
    const n = missing.optional.length
    return { text: `Falta ${n} opcional${n === 1 ? '' : 'es'}`, className: 'text-amber-700 dark:text-amber-400' }
  }
  const n = missing.required.length
  const names = missing.required.slice(0, 3).join(', ') + (n > 3 ? '…' : '')
  return { text: `${n === 1 ? 'Falta' : 'Faltan'} ${n}: ${names}`, className: 'text-red-700 dark:text-red-400' }
}

const statusBorderClasses: Record<RecipeStatus, string> = {
  full: 'border-l-emerald-500',
  partial: 'border-l-amber-500',
  missing: 'border-l-red-400',
}

/** Cabecera de sección de una receta abierta: se queda pegada bajo el nombre mientras se recorre su sección. */
const sectionHead =
  'sticky top-[calc(var(--head-h)+var(--card-h,0px))] z-10 -mx-4 mb-2 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-moss-900 dark:text-gray-400'

function RecipeCard({
  recipe,
  status,
  ingredients,
  groups,
  ingredientsById,
}: {
  recipe: Recipe
  status: RecipeStatus
  ingredients: Ingredient[]
  groups: Group[]
  ingredientsById: Map<string, Ingredient>
}) {
  const subtitle = statusSubtitle(status, getMissing(recipe, ingredientsById))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLButtonElement>(null)

  // alto real del nombre fijo (puede ocupar 2 líneas): las cabeceras de sección se pegan justo debajo
  useLayoutEffect(() => {
    const art = articleRef.current
    const title = titleRef.current
    if (!art || !title) return
    const apply = () => art.style.setProperty('--card-h', `${title.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(title)
    return () => ro.disconnect()
  }, [])

  return (
    <article
      ref={articleRef}
      className={
        'overflow-clip rounded-lg border-y border-r border-t-gray-200 border-r-gray-200 border-b-gray-200 border-l-4 bg-white dark:border-t-moss-800 dark:border-r-moss-800 dark:border-b-moss-800 dark:bg-moss-900 ' +
        statusBorderClasses[status]
      }
    >
      <button
        ref={titleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          'flex w-full items-center justify-between gap-3 bg-white p-4 text-left dark:bg-moss-900' +
          (open ? ' sticky top-[var(--head-h)] z-20' : '')
        }
      >
        <span className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.title}</h3>
          <span className={'block text-xs ' + subtitle.className}>{subtitle.text}</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div className={`border-t border-gray-100 px-4 pt-3 dark:border-moss-800 ${editing ? 'pb-4' : 'pb-0'}`}>
          {editing ? (
            <RecipeForm
              ingredients={ingredients}
              groups={groups}
              initial={{
                title: recipe.title,
                instructions: recipe.instructions,
                ingredients: recipe.ingredients,
              }}
              submitLabel="Guardar cambios"
              onSubmit={(values) =>
                updateRecipe(recipe.id, values.title, values.instructions, values.ingredients)
              }
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              <section>
              <h4 className={sectionHead}>Ingredientes</h4>
              <ul className="mb-4 space-y-1 text-sm">
                {recipe.ingredients.map((ri) => {
                  const ing = ingredientsById.get(ri.ingredientId)
                  const have = ing?.inPantry
                  const missingOptional = !have && ri.optional
                  return (
                    <li
                      key={ri.ingredientId}
                      className={
                        have
                          ? 'text-gray-900 dark:text-gray-100'
                          : missingOptional
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'font-medium text-red-700 dark:text-red-400'
                      }
                    >
                      {ing?.name ?? '(ingrediente eliminado: edita la receta para quitarlo)'}
                      {ri.quantity && ` — ${ri.quantity}${ri.unit ? ` ${ri.unit}` : ''}`}
                      {ri.optional && ' (opcional)'}
                      {!have && ' · falta'}
                    </li>
                  )
                })}
              </ul>
              </section>

              {recipe.instructions && (
                <section className="border-t-2 border-gray-200 dark:border-moss-700">
                  <h4 className={sectionHead + ' pt-3'}>Preparación</h4>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{recipe.instructions}</p>
                </section>
              )}

              {/* Pie fijo: Editar y Eliminar siguen a la vista aunque la receta sea larga */}
              <div className="sticky -bottom-4 z-10 -mx-4 mt-3 flex items-center justify-end gap-1 border-t border-gray-100 bg-white px-4 py-2 md:-bottom-8 dark:border-moss-800 dark:bg-moss-900">
                <button type="button" onClick={() => setEditing(true)} className={cancelButton}>
                  Editar
                </button>
                <DeleteButton onConfirm={() => deleteRecipe(recipe.id)} label="Eliminar" />
              </div>
            </>
          )}
        </div>
      )}
    </article>
  )
}

export default function RecipesPage() {
  const { ingredients } = useIngredients()
  const { groups } = useGroups()
  const { recipes, loading } = useRecipes()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const ingredientsById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready' | 'close'>('all')

  const visibleRecipes = useMemo(
    () =>
      recipes.filter((r) => {
        if (search.trim() && !matchesSearch(r.title, search)) return false
        if (filter === 'all') return true
        const missing = getMissing(r, ingredientsById).required.length
        return filter === 'ready' ? missing === 0 : missing > 0 && missing <= 2
      }),
    [recipes, search, filter, ingredientsById],
  )

  return (
    <div>
      <StickyHeader title="Recetario">
        <button type="button" onClick={() => {
            setShowImport((v) => !v)
            scrollMainToTop()
          }} className={outlineButton}>
          Importar
        </button>
        <button type="button" onClick={() => {
            setShowForm((v) => !v)
            scrollMainToTop()
          }} className={primaryButton}>
          + Receta
        </button>
      </StickyHeader>

      {showImport && <ImportRecipes ingredients={ingredients} groups={groups} recipes={recipes} onClose={() => setShowImport(false)} />}

      {showForm && (
        <RecipeForm
          ingredients={ingredients}
          groups={groups}
          onSubmit={(values) => addRecipe(values.title, values.instructions, values.ingredients)}
          onDone={() => setShowForm(false)}
        />
      )}

      {loading && <ListSkeleton />}

      {!loading && recipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay recetas. Crea la primera con «+ Receta».</p>
      )}

      {recipes.length > 0 && (
        <div className="mb-4 space-y-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar receta…" className="" />
          <div role="group" aria-label="Filtrar recetas" className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Todas'],
                ['ready', 'Puedo hacerla'],
                ['close', 'Falta poco'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={
                  'rounded-full border px-3 py-1 text-sm max-md:min-h-11 ' +
                  (filter === key
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800')
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {recipes.length > 0 && visibleRecipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Ninguna receta coincide.</p>
      )}

      <div className="space-y-4 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0">
        {visibleRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            status={getRecipeStatus(recipe, ingredientsById)}
            ingredients={ingredients}
            groups={groups}
            ingredientsById={ingredientsById}
          />
        ))}
      </div>

    </div>
  )
}
