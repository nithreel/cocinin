import type { Ingredient } from '../../lib/collections'
import { AlertIcon, CartIcon, SnowflakeIcon } from '../../components/icons'
import { keepFocus } from '../../lib/keepFocus'

/** Botones del panel de un ingrediente: «gastar pronto» (si lo tienes), carrito y congelar (si es comida o ya lo está). */
export default function IngredientActions({
  ingredient,
  onList,
  canFreeze,
  busy,
  onToggleUseSoon,
  onToggleOnList,
  onToggleFrozen,
}: {
  ingredient: Ingredient
  onList: boolean
  canFreeze: boolean
  busy: boolean
  onToggleUseSoon: () => void
  onToggleOnList: () => void
  onToggleFrozen: () => void
}) {
  return (
    <>
      {ingredient.inPantry && (
              <button
                type="button"
                aria-pressed={!!ingredient.useSoon}
                aria-label={`${ingredient.name}: ${ingredient.useSoon ? 'marcado para gastar pronto, pulsa para quitarlo' : 'pulsa para marcarlo como «gastar pronto»'}`}
                title={ingredient.useSoon ? 'Gastar pronto (pulsa para quitar)' : 'Marcar como «gastar pronto»'}
                onClick={onToggleUseSoon}
                disabled={busy}
                className={
                  'ripple relative flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50 max-md:h-10 max-md:w-10 ' +
                  (ingredient.useSoon
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-amber-400')
                }
              >
                <AlertIcon />
              </button>
            )}
      <button
        type="button"
        aria-pressed={onList}
        aria-label={`${ingredient.name}: ${onList ? 'está en la lista de la compra, pulsa para quitarlo' : 'pulsa para añadirlo a la lista de la compra'}`}
        title={onList ? 'En la lista (pulsa para quitar)' : 'Añadir a la lista de la compra'}
        onMouseDown={keepFocus}
        onClick={onToggleOnList}
        className={
          'ripple relative flex h-8 w-8 items-center justify-center rounded-full transition-colors max-md:h-10 max-md:w-10 ' +
          (onList
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            : 'text-gray-400 hover:bg-gray-100 hover:text-emerald-700 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-emerald-400')
        }
      >
        <CartIcon />
      </button>
      {(canFreeze || ingredient.frozen) && (
        <button
          type="button"
          aria-pressed={!!ingredient.frozen}
          aria-label={
            ingredient.frozen
              ? `${ingredient.name}: en el congelador, pulsa para descongelar (en nevera)`
              : `${ingredient.name}: pulsa para marcarlo como congelado`
          }
          title={ingredient.frozen ? 'En el congelador: pulsa para descongelar' : 'Marcar como congelado'}
          onMouseDown={keepFocus}
          onClick={onToggleFrozen}
          disabled={busy}
          className={
            'ripple relative flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50 max-md:h-10 max-md:w-10 ' +
            (ingredient.frozen
              ? 'bg-frost-100 text-frost-700 dark:bg-frost-950 dark:text-frost-400'
              : 'text-gray-400 hover:bg-gray-100 hover:text-frost-700 dark:text-gray-500 dark:hover:bg-moss-800 dark:hover:text-frost-400')
          }
        >
          <SnowflakeIcon />
        </button>
      )}
          </>
  )
}
