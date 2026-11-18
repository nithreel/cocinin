import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
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

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingredientsLoading, setIngredientsLoading] = useState(true)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [shoppingItemsLoading, setShoppingItemsLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [tags, setTags] = useState<Tag[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  function handleError(stopLoading: () => void) {
    return (err: Error) => {
      console.error(err)
      setDataError(err.message)
      stopLoading()
    }
  }

  useEffect(() => {
    const q = query(groupsCol, orderBy('name'))
    return onSnapshot(q, (snap) => {
      setDataError(null)
      setGroups(sortGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group)))
      setGroupsLoading(false)
    }, handleError(() => setGroupsLoading(false)))
  }, [])

  useEffect(() => {
    const q = query(ingredientsCol, orderBy('name'))
    return onSnapshot(q, (snap) => {
      setDataError(null)
      setIngredients(sortByText(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ingredient), (i) => i.name))
      setIngredientsLoading(false)
    }, handleError(() => setIngredientsLoading(false)))
  }, [])

  useEffect(() => {
    const q = query(shoppingListCol, orderBy('addedAt'))
    return onSnapshot(q, (snap) => {
      setShoppingItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShoppingItem))
      setShoppingItemsLoading(false)
    }, handleError(() => setShoppingItemsLoading(false)))
  }, [])

  useEffect(() => {
    const q = query(recipesCol, orderBy('title'))
    return onSnapshot(q, (snap) => {
      setRecipes(sortByText(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe), (r) => r.title))
      setRecipesLoading(false)
    }, handleError(() => setRecipesLoading(false)))
  }, [])

  useEffect(() => {
    const q = query(tagsCol, orderBy('name'))
    return onSnapshot(q, (snap) => {
      setTags(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tag))
      setTagsLoading(false)
    }, handleError(() => setTagsLoading(false)))
  }, [])

  useEffect(() => {
    const q = query(notesCol, orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Note))
      setNotesLoading(false)
    }, handleError(() => setNotesLoading(false)))
  }, [])

  // Los estados de caducidad y descongelado dependen de la hora: cada minuto se vuelve a pintar con la app abierta.
  useEffect(() => {
    const timer = setInterval(() => {
      setIngredients((prev) => [...prev])
      setRecipes((prev) => [...prev])
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

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

export function useGroups() {
  const { groups, groupsLoading } = useAppData()
  return { groups, loading: groupsLoading }
}

export function useIngredients() {
  const { ingredients, ingredientsLoading } = useAppData()
  return { ingredients, loading: ingredientsLoading }
}

export function useShoppingList() {
  const { shoppingItems, shoppingItemsLoading } = useAppData()
  return { items: shoppingItems, loading: shoppingItemsLoading }
}

export function useRecipes() {
  const { recipes, recipesLoading } = useAppData()
  return { recipes, loading: recipesLoading }
}

export function useTags() {
  const { tags, tagsLoading } = useAppData()
  return { tags, loading: tagsLoading }
}

export function useNotes() {
  const { notes, notesLoading } = useAppData()
  return { notes, loading: notesLoading }
}

export function useDataError() {
  return useAppData().dataError
}
