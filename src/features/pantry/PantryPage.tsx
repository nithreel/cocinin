import { useMemo, useRef, useState } from 'react'
import { reorderGroups, updateGroup, useGroups, useIngredients, useRecipes } from './data'
import SwapLabelButton from '../../components/SwapLabelButton'
import { useDragReorder } from '../../lib/useDragReorder'
import SearchInput from '../../components/SearchInput'
import Collapse from '../../components/Collapse'
import ListSkeleton from '../../components/ListSkeleton'
import { scrollMainToTop, scrollToWhileOpening } from '../../lib/scroll'
import { useCollapsedSet } from '../../lib/useCollapsedSet'
import StickyHeader from '../../components/StickyHeader'
import { NO_GROUP } from '../../lib/groupByPantryGroup'
import {
  buildPantrySections,
  changedGroupDrafts,
  filterPantrySections,
  hasInvalidDraft,
  organizeSections,
  orderToRestore,
  recipeTitlesByIngredient,
  type GroupDraft,
} from '../../lib/pantrySections'
import IngredientRow from './IngredientRow'
import AddGroupForm from './AddGroupForm'
import AddIngredientForm from './AddIngredientForm'
import GroupHeader from './GroupHeader'

/** Despensa: grupos con sus ingredientes, búsqueda, alta de grupos e ingredientes y modo «organizar» (orden, nombre
 *  y «Es comida» de los grupos). */
export default function PantryPage() {
  const { groups, loading: loadingGroups } = useGroups()
  const { ingredients, loading: loadingIngredients } = useIngredients()
  const { recipes } = useRecipes()
  const [showAddGroup, setShowAddGroup] = useState(false)
  // modo «organizar grupos» (se entra manteniendo pulsado un grupo): grupos plegados, asa para moverlos, lápiz y ✕
  const [organizing, setOrganizing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, GroupDraft>>({})
  const [savingGroups, setSavingGroups] = useState(false)
  const reorder = useDragReorder(groups, (ids) => void reorderGroups(ids))
  // orden de los grupos al entrar, para que «Cancelar» lo restaure
  const orderOnEnter = useRef<string[]>([])
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const { collapsed, toggle: toggleCollapsed, expand } = useCollapsedSet('despensa')
  const [search, setSearch] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const searchActive = search.trim().length > 0

  const recipesByIngredient = useMemo(() => recipeTitlesByIngredient(recipes), [recipes])

  function startOrganize() {
    if (organizing) return
    setShowAddGroup(false)
    setShowAddIngredient(false)
    orderOnEnter.current = groups.map((g) => g.id)
    setOrganizing(true)
  }

  // «Guardar»: aplica los nombres y «Es comida» editados y sale del modo (el orden ya se guardó al soltar cada grupo)
  async function saveOrganize() {
    setSavingGroups(true)
    try {
      await Promise.all(changedGroupDrafts(drafts, groups).map((c) => updateGroup(c.id, c.name, c.isFood)))
      setDrafts({})
      setOrganizing(false)
    } finally {
      setSavingGroups(false)
    }
  }
  const draftsInvalid = hasInvalidDraft(drafts)

  function handleIngredientAdded(id?: string, groupId?: string | null) {
    setShowAddIngredient(false)
    if (!id) return
    setSearch('')
    setHighlightId(id)
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 3000)
    // el grupo destino puede estar plegado: lo desplegamos para llegar al ingrediente
    expand(groupId ?? NO_GROUP)
  }

  const sections = useMemo(() => buildPantrySections(groups, ingredients), [groups, ingredients])

  const visibleSections = useMemo(() => filterPantrySections(sections, search), [sections, search])

  const loading = loadingGroups || loadingIngredients

  // al organizar se ven todos los grupos (sin filtro de búsqueda), en el orden que se está arrastrando, y «Sin grupo» al final
  const displaySections = useMemo(
    () => (organizing ? organizeSections(sections, reorder.shown) : visibleSections),
    [organizing, visibleSections, sections, reorder.shown],
  )

  // Los formularios se abren arriba del todo: si se pulsa con la página desplazada, se vuelve a la cima para verlos.
  function openForm(toggle: (fn: (v: boolean) => boolean) => void) {
    toggle((v) => !v)
    scrollMainToTop()
  }

  return (
    <div>
      {/* Cabecera fija (título, botones y buscador); los formularios se abren debajo, en el flujo normal. */}
      <StickyHeader
        title="Despensa"
        below={
          (ingredients.length > 0 || search) && (
            <Collapse open={!organizing}>
              <SearchInput value={search} onChange={setSearch} className="" />
            </Collapse>
          )
        }
      >
        <SwapLabelButton
          variant="outline"
          labelA="+ Grupo"
          labelB="Cancelar"
          showB={organizing}
          disabled={organizing && savingGroups}
          onClick={
            organizing
              ? () => {
                  // sale sin aplicar los nombres editados y devuelve los grupos al orden con el que se entró
                  // (los grupos eliminados no se recuperan)
                  const before = orderToRestore(orderOnEnter.current, groups)
                  if (before) void reorderGroups(before)
                  setDrafts({})
                  setOrganizing(false)
                }
              : () => openForm(setShowAddGroup)
          }
        />
        <SwapLabelButton
          labelA="+ Ingrediente"
          labelB="Guardar"
          showB={organizing}
          disabled={organizing && (savingGroups || draftsInvalid)}
          onClick={organizing ? () => void saveOrganize() : () => openForm(setShowAddIngredient)}
        />
      </StickyHeader>

      <Collapse open={showAddGroup}>
        <AddGroupForm groups={groups} onDone={() => setShowAddGroup(false)} />
      </Collapse>
      <Collapse open={showAddIngredient}>
        <AddIngredientForm groups={groups} existingNames={ingredients.map((i) => i.name)} onDone={handleIngredientAdded} />
      </Collapse>

      {loading && <ListSkeleton />}

      {!loading && ingredients.length === 0 && groups.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Aún no hay ingredientes. Añade el primero con «+ Ingrediente».
        </p>
      )}

      {!loading && searchActive && visibleSections.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No hay ingredientes que coincidan con «{search.trim()}».</p>
      )}

      <div className={organizing ? 'divide-y divide-gray-100 dark:divide-moss-800' : 'space-y-6'}>
        {displaySections.map((section) => {
          const isCollapsed = organizing || (!searchActive && collapsed.has(section.id))
          const movable = organizing && section.id !== NO_GROUP
          return (
            <section
              key={section.id}
              data-group-id={section.id}
              ref={movable ? reorder.rowRef(section.id) : undefined}
              style={movable ? reorder.rowStyle(section.id) : undefined}
              className={organizing ? 'bg-white py-3 dark:bg-moss-950' + (reorder.draggingId === section.id ? ' relative z-10 rounded-md shadow-md' : '') : undefined}
            >
              <GroupHeader
                section={section}
                isCollapsed={isCollapsed}
                onToggleCollapsed={() => {
                  toggleCollapsed(section.id)
                  if (isCollapsed) scrollToWhileOpening(document.querySelector<HTMLElement>(`[data-group-id="${CSS.escape(section.id)}"]`))
                }}
                organizing={organizing}
                onStartOrganize={startOrganize}
                draft={drafts[section.id]}
                onDraftChange={(d) =>
                  setDrafts((prev) => {
                    const next = { ...prev }
                    if (d) next[section.id] = d
                    else delete next[section.id]
                    return next
                  })
                }
                handle={movable ? reorder.handleFor(section.id) : undefined}
              />
              <Collapse open={!isCollapsed}>
                {section.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 dark:border-moss-700 dark:text-gray-500">
                    Sin ingredientes en este grupo.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
                    {section.items.map((ing) => (
                      <IngredientRow
                        key={ing.id}
                        ingredient={ing}
                        groups={groups}
                        highlight={ing.id === highlightId}
                        usedIn={recipesByIngredient.get(ing.id) ?? []}
                        canFreeze={section.isFood}
                      />
                    ))}
                  </ul>
                )}
              </Collapse>
            </section>
          )
        })}
      </div>

    </div>
  )
}
