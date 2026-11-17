import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import { addRecipe, deleteRecipe, migrateLegacyTags, updateRecipe, useRecipes, useTags } from './data'
import TagsManager from './TagsManager'
import { planLegacyMigration, sortTags } from '../../lib/tags'
import RecipeForm from './RecipeForm'
import { ChevronIcon } from '../../components/icons'
import SearchInput from '../../components/SearchInput'
import ListSkeleton from '../../components/ListSkeleton'
import { scrollMainToTop } from '../../lib/scroll'
import { matchesSearch } from '../../lib/search'
import StickyHeader from '../../components/StickyHeader'
import ImportRecipes from './ImportRecipes'
import DeleteButton from '../../components/DeleteButton'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import type { Group, Ingredient, Recipe, Tag } from '../../lib/collections'

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

/** Cuántos ingredientes necesarios (no opcionales) faltan en la despensa. */
function countMissingRequired(recipe: Recipe, ingredientsById: Map<string, Ingredient>) {
  return recipe.ingredients.filter((ri) => !ri.optional && ingredientsById.get(ri.ingredientId)?.inPantry !== true).length
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
  tags,
}: {
  recipe: Recipe
  status: RecipeStatus
  ingredients: Ingredient[]
  groups: Group[]
  ingredientsById: Map<string, Ingredient>
  tags: Tag[]
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLButtonElement>(null)
  const recipeTags = useMemo(
    () => sortTags(tags.filter((t) => recipe.tagIds?.includes(t.id))),
    [tags, recipe.tagIds],
  )

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
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.title}</h3>
          {recipeTags.length > 0 && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{recipeTags.map((t) => t.name).join(' · ')}</p>
          )}
        </div>
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
              tags={tags}
              initial={{
                title: recipe.title,
                instructions: recipe.instructions,
                ingredients: recipe.ingredients,
                tagIds: recipe.tagIds ?? [],
              }}
              submitLabel="Guardar cambios"
              onSubmit={(values) =>
                updateRecipe(recipe.id, values.title, values.instructions, values.ingredients, values.tagIds)
              }
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              <section>
              <h4 className={sectionHead}>Ingredientes</h4>
              <ul className="mb-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {recipe.ingredients.map((ri) => {
                  const ing = ingredientsById.get(ri.ingredientId)
                  const have = ing?.inPantry
                  const missingOptional = !have && ri.optional
                  return (
                    <li
                      key={ri.ingredientId}
                      className={
                        have
                          ? ''
                          : missingOptional
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'font-medium text-red-700 dark:text-red-400'
                      }
                    >
                      {ing?.name ?? '(ingrediente eliminado: edita la receta para quitarlo)'}
                      {ri.quantity && ` — ${ri.quantity}${ri.unit ? ` ${ri.unit}` : ''}`}
                      {ri.optional && ' (opcional)'}
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
  const [onlyReady, setOnlyReady] = useState(false)
  const { tags: rawTags, loading: tagsLoading } = useTags()
  const tags = useMemo(() => sortTags(rawTags), [rawTags])
  const [showTags, setShowTags] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])
  // si una etiqueta se borra, su filtro se ignora
  const effectiveTags = useMemo(() => activeTags.filter((id) => tags.some((t) => t.id === id)), [activeTags, tags])

  // Migración única: las etiquetas antiguas (texto en la receta) pasan a la colección `tags`
  const migrating = useRef(false)
  useEffect(() => {
    if (loading || tagsLoading || migrating.current) return
    const plan = planLegacyMigration(recipes, rawTags)
    if (plan.updates.length === 0) return
    migrating.current = true
    migrateLegacyTags(plan).catch((e) => {
      console.error(e)
      migrating.current = false
    })
  }, [loading, tagsLoading, recipes, rawTags])

  const visibleRecipes = useMemo(
    () =>
      recipes.filter(
        (r) =>
          (!search.trim() || matchesSearch(r.title, search)) &&
          (!onlyReady || countMissingRequired(r, ingredientsById) === 0) &&
          effectiveTags.every((id) => r.tagIds?.includes(id)),
      ),
    [recipes, search, onlyReady, ingredientsById, effectiveTags],
  )

  return (
    <div>
      <StickyHeader
        title="Recetario"
        below={
          recipes.length > 0 && (
            <div className="space-y-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar receta…" className="" />
              <div role="group" aria-label="Filtrar recetas" className="flex gap-2">
                {(
                  [
                    [false, 'Todas'],
                    [true, 'Puedo hacerla'],
                  ] as const
                ).map(([ready, label]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={onlyReady === ready}
                    onClick={() => setOnlyReady(ready)}
                    className={
                      'rounded-full border px-3 py-1 text-sm ' +
                      (onlyReady === ready
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800')
                    }
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={showTags}
                  onClick={() => {
                    setShowTags((v) => !v)
                    scrollMainToTop()
                  }}
                  className={
                    'ml-auto rounded-full border px-3 py-1 text-sm ' +
                    (showTags
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800')
                  }
                >
                  Etiquetas
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    role="group"
                    aria-label="Filtrar por etiqueta"
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                  {tags.map((tag) => {
                    const on = effectiveTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setActiveTags((prev) => (on ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]))
                        }
                        className={
                          'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm ' +
                          (on
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800')
                        }
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                  </div>
                </div>
              )}
            </div>
          )
        }
      >
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

      {showTags && <TagsManager tags={tags} recipes={recipes} onClose={() => setShowTags(false)} />}

      {showImport && <ImportRecipes ingredients={ingredients} groups={groups} recipes={recipes} tags={tags} onClose={() => setShowImport(false)} />}

      {showForm && (
        <RecipeForm
          ingredients={ingredients}
          groups={groups}
          tags={tags}
          onSubmit={(values) => addRecipe(values.title, values.instructions, values.ingredients, values.tagIds)}
          onDone={() => setShowForm(false)}
        />
      )}

      {loading && <ListSkeleton />}

      {!loading && recipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay recetas. Crea la primera con «+ Receta».</p>
      )}

      {recipes.length > 0 && visibleRecipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Ninguna receta coincide.</p>
      )}

      <div className="space-y-4">
        {visibleRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            status={getRecipeStatus(recipe, ingredientsById)}
            ingredients={ingredients}
            groups={groups}
            ingredientsById={ingredientsById}
            tags={tags}
          />
        ))}
      </div>

    </div>
  )
}
