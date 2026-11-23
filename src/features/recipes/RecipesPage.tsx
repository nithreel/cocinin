import { useEffect, useMemo, useRef, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import { addRecipe, migrateLegacyTags, useRecipes, useTags } from './data'
import TagsManager from './TagsManager'
import { planLegacyMigration, sortTags } from '../../lib/tags'
import RecipeForm from './RecipeForm'
import RecipeCard from './RecipeCard'
import Collapse from '../../components/Collapse'
import { dragScrollProps, wheelScrollX } from '../../lib/dragScroll'
import SegmentedToggle from '../../components/SegmentedToggle'
import SearchInput from '../../components/SearchInput'
import ListSkeleton from '../../components/ListSkeleton'
import { scrollMainToTop } from '../../lib/scroll'
import StickyHeader from '../../components/StickyHeader'
import ImportRecipes from './ImportRecipes'
import { outlineButton, pillButton, primaryButton } from '../../components/buttonStyles'
import { filterRecipes, getRecipeStatus } from '../../lib/recipeStatus'
import { useIdSet } from '../../lib/useIdSet'

/** Recetario: búsqueda, filtros («Puedo hacerla» y etiquetas), alta, importación y gestión de etiquetas. Con una
 *  receta abierta o en edición, las demás se pliegan. */
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
    () => filterRecipes(recipes, { search, onlyReady, tagIds: effectiveTags }, ingredientsById),
    [recipes, search, onlyReady, ingredientsById, effectiveTags],
  )

  // con una receta en edición o creándose, el buscador y los filtros se ocultan para dejar espacio (sobre todo con el teclado)
  const [editingIds, handleEditing] = useIdSet()
  const formActive = showForm || editingIds.size > 0
  // con una receta desplegada, los filtros (Todas/Puedo hacerla y etiquetas) se pliegan; el buscador se queda
  const [openIds, handleOpen] = useIdSet()
  const compact = openIds.size > 0

  return (
    <div>
      <StickyHeader
        title="Recetario"
        below={
          recipes.length > 0 && (
            <Collapse open={!formActive && !compact && !showImport}>
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
                  className={pillButton(showTags) + ' shrink-0'}
                >
                  Etiquetas
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    role="group"
                    aria-label="Filtrar por etiqueta"
                    ref={wheelScrollX}
                    {...dragScrollProps}
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
                        className={pillButton(on) + ' shrink-0 whitespace-nowrap'}
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

      {!loading && !formActive && !showImport && recipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay recetas. Añade la primera con «+ Receta».</p>
      )}

      {!formActive && !showImport && recipes.length > 0 && visibleRecipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No hay recetas que coincidan {search.trim() ? `con «${search.trim()}»` : 'con los filtros elegidos'}.</p>
      )}

      <div className="-mb-4">
        {visibleRecipes.map((recipe) => {
          // mientras se crea, edita o lee (desplegada) una receta, las demás se pliegan con animación (siguen montadas: conservan si estaban abiertas)
          const hide = (formActive || compact || showImport) && !editingIds.has(recipe.id) && !openIds.has(recipe.id)
          return (
          <div key={recipe.id} className={'recipe-wrap' + (hide ? ' recipe-wrap-hidden' : '')} inert={hide}>
          <div className={'pb-4' + (openIds.has(recipe.id) || editingIds.has(recipe.id) ? '' : ' overflow-clip')} style={{ minHeight: 0 }}>
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
          </div>
          )
        })}
      </div>

    </div>
  )
}
