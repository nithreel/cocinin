import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import { addRecipe, deleteRecipe, migrateLegacyTags, updateRecipe, useRecipes, useTags } from './data'
import TagsManager from './TagsManager'
import { planLegacyMigration, sortTags } from '../../lib/tags'
import RecipeForm from './RecipeForm'
import { getExpiryInfo } from '../../lib/expiry'
import { CartIcon, ChevronIcon } from '../../components/icons'
import Collapse from '../../components/Collapse'
import { prefersReducedMotion } from '../../lib/motion'
import { keepFocus } from '../../lib/keepFocus'
import SegmentedToggle from '../../components/SegmentedToggle'
import SearchInput from '../../components/SearchInput'
import ListSkeleton from '../../components/ListSkeleton'
import { scrollMainToTop } from '../../lib/scroll'
import { matchesSearch } from '../../lib/search'
import { addToShoppingList, removeFromShoppingList, useShoppingList } from '../shopping-list/data'
import { useToast } from '../../components/Toast'
import StickyHeader from '../../components/StickyHeader'
import ImportRecipes from './ImportRecipes'
import DeleteButton from '../../components/DeleteButton'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import type { Group, Ingredient, Recipe, Tag } from '../../lib/collections'

type RecipeStatus = 'full' | 'partial' | 'missing'

/** Disponible para cocinar: lo tienes (congelado también) y no está caducado. */
function isUsable(ing: Ingredient | undefined) {
  return ing?.inPantry === true && getExpiryInfo(ing)?.status !== 'expired'
}

function getRecipeStatus(recipe: Recipe, ingredientsById: Map<string, Ingredient>): RecipeStatus {
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
function countMissingRequired(recipe: Recipe, ingredientsById: Map<string, Ingredient>) {
  return recipe.ingredients.filter((ri) => !ri.optional && !isUsable(ingredientsById.get(ri.ingredientId))).length
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
  onEditing,
  onOpen,
}: {
  recipe: Recipe
  status: RecipeStatus
  ingredients: Ingredient[]
  groups: Group[]
  ingredientsById: Map<string, Ingredient>
  tags: Tag[]
  /** avisa a la página de si esta receta está abierta en edición (para ocultar buscador y filtros) */
  onEditing: (id: string, on: boolean) => void
  /** avisa de si esta receta está desplegada (leyendo, se pliegan los filtros para dejar sitio) */
  onOpen: (id: string, on: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  // borrador del título y las etiquetas mientras se edita: la cabecera de arriba los muestra en directo
  const [draftTitle, setDraftTitle] = useState(recipe.title)
  const [draftTagIds, setDraftTagIds] = useState<string[]>(recipe.tagIds ?? [])
  useEffect(() => {
    onEditing(recipe.id, open && editing)
    return () => onEditing(recipe.id, false)
  }, [open, editing, recipe.id, onEditing])
  useEffect(() => {
    onOpen(recipe.id, open)
    return () => onOpen(recipe.id, false)
  }, [open, recipe.id, onOpen])
  const toast = useToast()
  const { items: shoppingItems } = useShoppingList()
  // lo necesario que falta en la despensa y aún no está en la lista
  const toBuy = useMemo(() => {
    const onList = new Set(shoppingItems.map((i) => i.ingredientId))
    return recipe.ingredients
      .filter((ri) => !ri.optional && ingredientsById.has(ri.ingredientId))
      .map((ri) => ingredientsById.get(ri.ingredientId)!)
      .filter((ing) => !isUsable(ing) && !onList.has(ing.id))
  }, [recipe.ingredients, ingredientsById, shoppingItems])

  // animación del carrito: se pone en verde con ✓ y se encoge antes de desaparecer; los ingredientes que faltan parpadean
  const [adding, setAdding] = useState(false)
  // ids que se van a añadir, fijados al hacer clic (toBuy se vacía a los 320 ms, antes de que acabe el destello)
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set())
  function handleAddMissing() {
    if (adding) return
    if (prefersReducedMotion()) {
      addMissingToList()
      return
    }
    setAdding(true)
    setFlashIds(new Set(toBuy.map((i) => i.id)))
    window.setTimeout(addMissingToList, 320)
    window.setTimeout(() => {
      setAdding(false)
      setFlashIds(new Set())
    }, 950)
  }

  function addMissingToList() {
    const ids = toBuy.map((ing) => addToShoppingList(ing.id))
    toast({
      message: `${ids.length} ingrediente${ids.length === 1 ? '' : 's'} añadido${ids.length === 1 ? '' : 's'} a la lista`,
      actionLabel: 'Deshacer',
      onAction: () => ids.forEach((id) => void removeFromShoppingList(id)),
    })
  }
  const articleRef = useRef<HTMLElement>(null)
  // al plegar, las demás recetas reaparecen y el scroll quedaba arriba del todo: se vuelve a esta tarjeta
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) requestAnimationFrame(() => articleRef.current?.scrollIntoView({ block: 'nearest' }))
    wasOpen.current = open
  }, [open])
  const titleRef = useRef<HTMLDivElement>(null)
  const recipeTags = useMemo(
    () => sortTags(tags.filter((t) => (editing ? draftTagIds : recipe.tagIds)?.includes(t.id))),
    [tags, recipe.tagIds, editing, draftTagIds],
  )

  // alto real del nombre fijo (puede ocupar 2 líneas): las cabeceras de sección se pegan justo debajo
  useLayoutEffect(() => {
    const art = articleRef.current
    const title = titleRef.current
    if (!art || !title) return
    const apply = () => art.style.setProperty('--card-h', `${title.getBoundingClientRect().height - 1}px`)
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
      <div
        ref={titleRef}
        className={'bg-white dark:bg-moss-900' + (open ? ' kb-static sticky top-[var(--head-h)] z-20' : '')}
      >
        {editing && open ? (
          // editando: el título se escribe aquí mismo, y las etiquetas de abajo se reflejan en directo
          <div className="p-4">
            <input autoComplete="off"
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              aria-label="Título de la receta"
              placeholder="Nombre de la receta"
              className="w-full rounded-md border border-gray-300 px-2 py-0.5 text-lg font-semibold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
            />
            <p className="mt-1 min-h-4 text-xs text-gray-500 dark:text-gray-400">{recipeTags.map((t) => t.name).join(' · ')}</p>
          </div>
        ) : (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
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
        )}
      </div>

      <Collapse open={open}>
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
              title={draftTitle}
              onTitleChange={setDraftTitle}
              onTagsChange={setDraftTagIds}
              submitLabel="Guardar cambios"
              onSubmit={(values) =>
                updateRecipe(recipe.id, values.title, values.instructions, values.ingredients, values.tagIds)
              }
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              <section>
              <h4 className={sectionHead + ' flex items-center justify-between'}>
                Ingredientes
                {(toBuy.length > 0 || adding) && (
                  <button
                    type="button"
                    onClick={handleAddMissing}
                    aria-label={`Añadir a la lista de la compra lo que falta (${adding ? flashIds.size : toBuy.length})`}
                    title={`Añadir a la lista lo que falta (${adding ? flashIds.size : toBuy.length})`}
                    className={
                      'cart-btn ripple relative -my-1.5 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-emerald-700 max-md:h-10 max-md:w-10 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-emerald-400' +
                      (adding ? ' cart-done' : '')
                    }
                  >
                    <span className="cart-ico">
                      <CartIcon />
                    </span>
                    <svg viewBox="0 0 24 24" className="add-check absolute h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </button>
                )}
              </h4>
              {/* pb-8 (≥ alto del título fijo): al acabar la sección el título queda sobre espacio vacío y no a medias sobre la última fila */}
              <ul className="space-y-1 pb-8 text-sm text-gray-600 dark:text-gray-300">
                {recipe.ingredients.map((ri) => {
                  const ing = ingredientsById.get(ri.ingredientId)
                  const expired = !!ing?.inPantry && !isUsable(ing)
                  const have = isUsable(ing)
                  const missingOptional = !have && ri.optional
                  return (
                    <li
                      key={ri.ingredientId}
                      className={
                        (flashIds.has(ri.ingredientId) ? 'row-flash ' : '') +
                        (have
                          ? ''
                          : missingOptional
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'font-medium text-red-700 dark:text-red-400')
                      }
                    >
                      {ing?.name ?? '(ingrediente eliminado: edita la receta para quitarlo)'}
                      {ri.quantity && ` — ${ri.quantity}${ri.unit ? ` ${ri.unit}` : ''}`}
                      {expired && ' — ⚠ caducado'}
                      {ri.optional && ' (opcional)'}
                    </li>
                  )
                })}
              </ul>
              </section>

              {recipe.instructions && (
                <section className="border-t-2 border-gray-200 dark:border-moss-700">
                  <h4 className={sectionHead + ' pt-3'}>Preparación</h4>
                  <p className="whitespace-pre-wrap pb-8 text-sm text-gray-700 dark:text-gray-300">{recipe.instructions}</p>
                </section>
              )}

              {/* Pie fijo: Editar y Eliminar siguen a la vista aunque la receta sea larga */}
              <div className="kb-static sticky -bottom-4 z-10 -mx-4 mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-gray-100 bg-white px-4 py-2 md:-bottom-8 dark:border-moss-800 dark:bg-moss-900">
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(recipe.title)
                    setDraftTagIds(recipe.tagIds ?? [])
                    setEditing(true)
                  }}
                  className={cancelButton}
                >
                  Editar
                </button>
                <DeleteButton
                  onConfirm={() => deleteRecipe(recipe.id)}
                  label="Eliminar"
                  question={`¿Eliminar la receta «${recipe.title}»?`}
                  confirmClassName="w-full basis-full justify-end"
                />
              </div>
            </>
          )}
        </div>
      </Collapse>
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
          (!search.trim() ||
            matchesSearch(r.title, search) ||
            r.ingredients.some((ri) => matchesSearch(ingredientsById.get(ri.ingredientId)?.name ?? '', search))) &&
          (!onlyReady || countMissingRequired(r, ingredientsById) === 0) &&
          effectiveTags.every((id) => r.tagIds?.includes(id)),
      ),
    [recipes, search, onlyReady, ingredientsById, effectiveTags],
  )

  // con una receta en edición o creándose, el buscador y los filtros se ocultan para dejar espacio (sobre todo con el teclado)
  const [editingIds, setEditingIds] = useState<ReadonlySet<string>>(new Set())
  const handleEditing = useCallback((id: string, on: boolean) => {
    setEditingIds((prev) => {
      if (prev.has(id) === on) return prev
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const formActive = showForm || editingIds.size > 0
  // con una receta desplegada, los filtros (Todas/Puedo hacerla y etiquetas) se pliegan; el buscador se queda
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set())
  const handleOpen = useCallback((id: string, on: boolean) => {
    setOpenIds((prev) => {
      if (prev.has(id) === on) return prev
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const compact = openIds.size > 0

  return (
    <div>
      <StickyHeader
        title="Recetario"
        below={
          recipes.length > 0 && (
            <Collapse open={!formActive && !compact}>
            <div className="space-y-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar receta o ingrediente…" className="" />
              <div>
                <div className="kb-hide space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <SegmentedToggle
                  value={onlyReady}
                  onChange={setOnlyReady}
                  label="Filtrar recetas"
                  className="min-w-0 flex-1"
                  options={[
                    [false, 'Todas'],
                    [true, 'Puedo hacerla'],
                  ]}
                />
                <button
                  type="button"
                  aria-pressed={showTags}
                  onClick={() => {
                    setShowTags((v) => !v)
                    scrollMainToTop()
                  }}
                  className={
                    'ripple relative shrink-0 rounded-full border px-3 py-1 text-sm ' +
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
                    className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-1 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                          'ripple relative shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm ' +
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
              </div>
            </div>
            </Collapse>
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

      <Collapse open={showTags}>
        <TagsManager tags={tags} recipes={recipes} onClose={() => setShowTags(false)} />
      </Collapse>

      <Collapse open={showImport}>
        <ImportRecipes ingredients={ingredients} groups={groups} recipes={recipes} tags={tags} onClose={() => setShowImport(false)} />
      </Collapse>

      <Collapse open={showForm}>
        <RecipeForm
          ingredients={ingredients}
          groups={groups}
          tags={tags}
          onSubmit={(values) => addRecipe(values.title, values.instructions, values.ingredients, values.tagIds)}
          onDone={() => setShowForm(false)}
        />
      </Collapse>

      {loading && <ListSkeleton />}

      {!loading && !formActive && recipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay recetas. Añade la primera con «+ Receta».</p>
      )}

      {!formActive && recipes.length > 0 && visibleRecipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No hay recetas que coincidan {search.trim() ? `con «${search.trim()}»` : 'con los filtros elegidos'}.</p>
      )}

      <div className="space-y-4">
        {visibleRecipes.map((recipe) => (
          // mientras se crea, edita o lee (desplegada) una receta, las demás se ocultan (siguen montadas: conservan si estaban abiertas)
          <div key={recipe.id} className={(formActive || compact) && !editingIds.has(recipe.id) && !openIds.has(recipe.id) ? 'hidden' : ''}>
          <RecipeCard
            recipe={recipe}
            status={getRecipeStatus(recipe, ingredientsById)}
            ingredients={ingredients}
            groups={groups}
            ingredientsById={ingredientsById}
            tags={tags}
            onEditing={handleEditing}
            onOpen={handleOpen}
          />
          </div>
        ))}
      </div>

    </div>
  )
}
