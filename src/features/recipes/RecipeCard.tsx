import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { deleteRecipe, updateRecipe } from './data'
import { sortTags } from '../../lib/tags'
import RecipeForm from './RecipeForm'
import { CartIcon, ChevronIcon, PencilIcon } from '../../components/icons'
import Collapse from '../../components/Collapse'
import { prefersReducedMotion, tallCollapseMs } from '../../lib/motion'
import { keepFocus } from '../../lib/keepFocus'
import { scrollToWhileOpening } from '../../lib/scroll'
import { addToShoppingList, removeFromShoppingList, useShoppingList } from '../shopping-list/data'
import { useToast } from '../../components/Toast'
import { ConfirmDelete } from '../../components/DeleteButton'
import RemoveButton from '../../components/RemoveButton'
import IconsReveal from '../../components/IconsReveal'
import { rowIconButton } from '../../components/buttonStyles'
import { ingredientsToBuy, isUsable, type RecipeStatus } from '../../lib/recipeStatus'
import type { Group, Ingredient, Recipe, Tag } from '../../lib/collections'
import { inputBase } from '../../components/inputStyles'

const statusBorderClasses: Record<RecipeStatus, string> = {
  full: 'border-l-emerald-500',
  partial: 'border-l-amber-500',
  missing: 'border-l-red-400',
}

/** Cabecera de sección de una receta abierta: se queda pegada bajo el nombre mientras se recorre su sección. */
const sectionHead =
  'sticky top-[calc(var(--head-h)+var(--card-h,0px))] z-10 -mx-4 mb-2 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-moss-900 dark:text-gray-400'

/** Tarjeta de receta: se despliega con ingredientes (lo que falta en rojo, añadible a la lista) y preparación, y se
 *  edita en el sitio. Avisa a la página de si está abierta o en edición. */
export default function RecipeCard({
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
  const [confirmingDelete, setConfirmingDelete] = useState(false)
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
  const toBuy = useMemo(
    () => ingredientsToBuy(recipe.ingredients, ingredientsById, shoppingItems),
    [recipe.ingredients, ingredientsById, shoppingItems],
  )

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
  // al plegar, las demás recetas reaparecen y la cabecera recupera el buscador y las etiquetas (creciendo con animación):
  // la pantalla sigue a esta tarjeta hasta dejarla justo debajo de la cabecera, con su alto ya final
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (wasOpen.current !== open) {
      // misma duración para la tarjeta, las demás recetas y el scroll, según lo alta que sea esta receta
      const ms = tallCollapseMs(articleRef.current?.querySelector<HTMLElement>('[data-collapse-inner]')?.offsetHeight ?? 0)
      document.documentElement.style.setProperty('--recipe-ms', ms + 'ms')
      scrollToWhileOpening(articleRef.current, ms + 120)
    }
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
              className={inputBase + ' w-full px-2 py-0.5 text-lg font-semibold text-gray-900'}
            />
            <p className="mt-1 min-h-4 text-xs text-gray-500 dark:text-gray-400">{recipeTags.map((t) => t.name).join(' · ')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="min-w-0 flex-1 p-4 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.title}</h3>
                {recipeTags.length > 0 && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{recipeTags.map((t) => t.name).join(' · ')}</p>
                )}
              </button>
              {/* abierta: editar y eliminar, con iconos, a la derecha del título */}
              <IconsReveal show={open && !confirmingDelete} className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTitle(recipe.title)
                      setDraftTagIds(recipe.tagIds ?? [])
                      setEditing(true)
                    }}
                    aria-label={`Editar «${recipe.title}»`}
                    title="Editar la receta"
                    className={rowIconButton}
                  >
                    <PencilIcon />
                  </button>
                  <RemoveButton trash row={false} onRemove={() => setConfirmingDelete(true)} label={`Eliminar «${recipe.title}»`} title="Eliminar la receta" />
              </IconsReveal>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Plegar la receta' : 'Desplegar la receta'}
                className="p-4 pl-3 text-gray-500 dark:text-gray-400"
              >
                <ChevronIcon open={open} />
              </button>
            </div>
            {open && confirmingDelete && (
              <ConfirmDelete
                question={`¿Eliminar la receta «${recipe.title}»?`}
                questionClassName="w-full"
                onConfirm={() => deleteRecipe(recipe.id)}
                onCancel={() => setConfirmingDelete(false)}
                className="px-4 pb-3"
              />
            )}
          </>
        )}
      </div>

      <Collapse open={open} soft>
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

            </>
          )}
        </div>
      </Collapse>
    </article>
  )
}
