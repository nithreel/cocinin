import { useMemo, useState } from 'react'
import { useGroups, useIngredients } from '../pantry/data'
import { addRecipe, deleteRecipe, updateRecipe, useRecipes } from './data'
import RecipeForm from './RecipeForm'
import ImportRecipes from './ImportRecipes'
import DeleteButton from '../../components/DeleteButton'
import { cancelButton } from '../../components/buttonStyles'
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

const statusBorderClasses: Record<RecipeStatus, string> = {
  full: 'border-l-emerald-500',
  partial: 'border-l-amber-500',
  missing: 'border-l-red-400',
}

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
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  return (
    <article
      className={
        'overflow-clip rounded-lg border-y border-r border-t-gray-200 border-r-gray-200 border-b-gray-200 border-l-4 bg-white dark:border-t-moss-800 dark:border-r-moss-800 dark:border-b-moss-800 dark:bg-moss-900 ' +
        statusBorderClasses[status]
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.title}</h3>
        <span className="text-gray-500 dark:text-gray-400" aria-hidden="true">
          {open ? '▲' : '▼'}
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
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ingredientes
              </h4>
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
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-500 dark:text-gray-400'
                      }
                    >
                      {ing?.name ?? '(ingrediente eliminado: edita la receta para quitarlo)'}
                      {ri.quantity && ` — ${ri.quantity}${ri.unit ? ` ${ri.unit}` : ''}`}
                      {ri.optional && ' (opcional)'}
                    </li>
                  )
                })}
              </ul>

              {recipe.instructions && (
                <div className="border-t-2 border-gray-200 pt-4 dark:border-moss-700">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Preparación
                  </h4>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{recipe.instructions}</p>
                </div>
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Recetario</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowImport((v) => !v)} className={cancelButton}>
            Importar
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            + Receta
          </button>
        </div>
      </div>

      {showImport && <ImportRecipes ingredients={ingredients} groups={groups} recipes={recipes} onClose={() => setShowImport(false)} />}

      {showForm && (
        <RecipeForm
          ingredients={ingredients}
          groups={groups}
          onSubmit={(values) => addRecipe(values.title, values.instructions, values.ingredients)}
          onDone={() => setShowForm(false)}
        />
      )}

      {loading && <p className="text-gray-500 dark:text-gray-400">Cargando…</p>}

      {!loading && recipes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Aún no hay recetas. Crea la primera con "+ Receta".</p>
      )}

      <div className="space-y-4">
        {recipes.map((recipe) => (
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
