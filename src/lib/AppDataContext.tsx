import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { onSnapshot, orderBy, query, type Query } from 'firebase/firestore'
import {
  groupsCol,
  ingredientsCol,
  notesCol,
  recipesCol,
  shoppingListCol,
  tagsCol,
  type Group,
  type Ingredient,
  type Note,
  type Recipe,
  type ShoppingItem,
  type Tag,
} from './collections'
import { sortByText } from './search'
import { firstDataError, setDataErrorFor, type DataErrors } from './dataErrors'

interface AppDataValue {
  groups: Group[]
  groupsLoading: boolean
  ingredients: Ingredient[]
  ingredientsLoading: boolean
  shoppingItems: ShoppingItem[]
  shoppingItemsLoading: boolean
  recipes: Recipe[]
  recipesLoading: boolean
  tags: Tag[]
  tagsLoading: boolean
  notes: Note[]
  notesLoading: boolean
  /** mensaje si algún listener falla (p. ej. permission-denied); null si todo va bien */
  dataError: string | null
}

const AppDataContext = createContext<AppDataValue | null>(null)

/** Primero los ordenados a mano (`order`), luego el resto alfabéticamente. */
function sortGroups(groups: Group[]) {
  return sortByText(groups, (g) => g.name).sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
}

/**
 * Escucha una consulta de Firestore mientras la app está abierta. Un fallo (p. ej. permission-denied) se anota con
 * la clave de este listener y deja de «cargar»; una lectura correcta solo borra el error propio, así el aviso sigue
 * mientras quede algún listener caído. Devuelve también el setter, para el repintado de cada minuto.
 */
function useLiveQuery<T>(
  key: string,
  makeQuery: () => Query,
  reportError: (key: string, message: string | null) => void,
  { sort }: { sort?: (items: T[]) => T[] } = {},
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    return onSnapshot(makeQuery(), (snap) => {
      reportError(key, null)
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
      setItems(sort ? sort(docs) : docs)
      setLoading(false)
    }, (err: Error) => {
      console.error(err)
      reportError(key, err.message)
      setLoading(false)
    })
    // la consulta y las opciones son fijas en cada llamada: se escucha una sola vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [items, loading, setItems] as const
}

/** Listeners de todas las colecciones compartidas, abiertos mientras dura la sesión; cada pantalla lee de aquí con
 *  los hooks de abajo. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<DataErrors>({})
  const dataError = firstDataError(errors)
  const reportError = useCallback((key: string, message: string | null) => setErrors((prev) => setDataErrorFor(prev, key, message)), [])

  const [groups, groupsLoading] = useLiveQuery<Group>('groups', () => query(groupsCol, orderBy('name')), reportError, {
    sort: sortGroups,
  })
  const [ingredients, ingredientsLoading, setIngredients] = useLiveQuery<Ingredient>(
    'ingredients',
    () => query(ingredientsCol, orderBy('name')),
    reportError,
    { sort: (items) => sortByText(items, (i) => i.name) },
  )
  const [shoppingItems, shoppingItemsLoading] = useLiveQuery<ShoppingItem>('shoppingList', () => query(shoppingListCol, orderBy('addedAt')), reportError)
  const [recipes, recipesLoading, setRecipes] = useLiveQuery<Recipe>('recipes', () => query(recipesCol, orderBy('title')), reportError, {
    sort: (items) => sortByText(items, (r) => r.title),
  })
  const [tags, tagsLoading] = useLiveQuery<Tag>('tags', () => query(tagsCol, orderBy('name')), reportError)
  const [notes, notesLoading] = useLiveQuery<Note>('notes', () => query(notesCol, orderBy('createdAt', 'desc')), reportError)

  // Los estados de caducidad y descongelado dependen de la hora: cada minuto se vuelve a pintar con la app abierta.
  useEffect(() => {
    const timer = setInterval(() => {
      setIngredients((prev) => [...prev])
      setRecipes((prev) => [...prev])
    }, 60_000)
    return () => clearInterval(timer)
    // los setters de useState son estables: el reloj se arranca una sola vez
  }, [setIngredients, setRecipes])

  return (
    <AppDataContext.Provider
      value={{
        groups,
        groupsLoading,
        ingredients,
        ingredientsLoading,
        shoppingItems,
        shoppingItemsLoading,
        recipes,
        recipesLoading,
        tags,
        tagsLoading,
        notes,
        notesLoading,
        dataError,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider')
  return ctx
}

/** Grupos: primero los de orden manual, luego alfabéticos. */
export function useGroups() {
  const { groups, groupsLoading } = useAppData()
  return { groups, loading: groupsLoading }
}

/** Ingredientes en orden alfabético; se repintan cada minuto (caducidades y descongelado dependen de la hora). */
export function useIngredients() {
  const { ingredients, ingredientsLoading } = useAppData()
  return { ingredients, loading: ingredientsLoading }
}

/** Artículos de la lista, por orden de llegada. */
export function useShoppingList() {
  const { shoppingItems, shoppingItemsLoading } = useAppData()
  return { items: shoppingItems, loading: shoppingItemsLoading }
}

/** Recetas en orden alfabético; se repintan cada minuto, como los ingredientes. */
export function useRecipes() {
  const { recipes, recipesLoading } = useAppData()
  return { recipes, loading: recipesLoading }
}

/** Etiquetas en el orden de Firestore (por nombre); para pintarlas se ordenan con `sortTags` (orden manual). */
export function useTags() {
  const { tags, tagsLoading } = useAppData()
  return { tags, loading: tagsLoading }
}

/** Notas, la más nueva primero; el orden de pantalla lo da `orderNotes`. */
export function useNotes() {
  const { notes, notesLoading } = useAppData()
  return { notes, loading: notesLoading }
}

/** Mensaje del primer listener caído, o null si todos leen bien. */
export function useDataError() {
  return useAppData().dataError
}
