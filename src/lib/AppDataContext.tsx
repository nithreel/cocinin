import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import {
  groupsCol,
  ingredientsCol,
  purchaseHistoryCol,
  recipesCol,
  shoppingListCol,
  type Group,
  type Ingredient,
  type PurchaseHistoryEntry,
  type Recipe,
  type ShoppingItem,
} from './collections'

interface AppDataValue {
  groups: Group[]
  groupsLoading: boolean
  ingredients: Ingredient[]
  ingredientsLoading: boolean
  shoppingItems: ShoppingItem[]
  shoppingItemsLoading: boolean
  recipes: Recipe[]
  recipesLoading: boolean
  purchaseHistory: PurchaseHistoryEntry[]
  purchaseHistoryLoading: boolean
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingredientsLoading, setIngredientsLoading] = useState(true)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [shoppingItemsLoading, setShoppingItemsLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryEntry[]>([])
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(true)

  useEffect(() => {
    const q = query(groupsCol, orderBy('name'))
    return onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group))
      setGroupsLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = query(ingredientsCol, orderBy('name'))
    return onSnapshot(q, (snap) => {
      setIngredients(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ingredient))
      setIngredientsLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = query(shoppingListCol, orderBy('addedAt'))
    return onSnapshot(q, (snap) => {
      setShoppingItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShoppingItem))
      setShoppingItemsLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = query(recipesCol, orderBy('title'))
    return onSnapshot(q, (snap) => {
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe))
      setRecipesLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = query(purchaseHistoryCol, orderBy('purchasedAt', 'desc'), limit(50))
    return onSnapshot(q, (snap) => {
      setPurchaseHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PurchaseHistoryEntry))
      setPurchaseHistoryLoading(false)
    })
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
        purchaseHistory,
        purchaseHistoryLoading,
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

export function usePurchaseHistory() {
  const { purchaseHistory, purchaseHistoryLoading } = useAppData()
  return { entries: purchaseHistory, loading: purchaseHistoryLoading }
}
