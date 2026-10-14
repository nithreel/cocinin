import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase'

export interface Group {
  id: string
  name: string
  createdAt: number
  isFood?: boolean
}

export type ExpiryMode = 'none' | 'date' | 'sinceStocked'

export interface Ingredient {
  id: string
  name: string
  groupId: string | null
  inPantry: boolean
  /** en el congelador: implica que está disponible (inPantry) */
  frozen?: boolean
  createdAt: number
  expiryMode?: ExpiryMode
  expiryDate?: string | null
  stockedDate?: string | null
}

export interface ShoppingItem {
  id: string
  ingredientId: string
  checked: boolean
  addedAt: number
}

export interface RecipeIngredient {
  ingredientId: string
  quantity: string
  unit: string
  optional?: boolean
}

export interface Recipe {
  id: string
  title: string
  instructions: string
  ingredients: RecipeIngredient[]
  createdAt: number
}

export interface PurchaseHistoryEntry {
  id: string
  ingredientName: string
  purchasedAt: number
}

export type Role = 'admin' | 'member'

export interface Member {
  id: string
  email: string
  role?: Role
  createdAt: number
}

export const groupsCol = collection(db, 'groups')
export const ingredientsCol = collection(db, 'ingredients')
export const shoppingListCol = collection(db, 'shoppingList')
export const recipesCol = collection(db, 'recipes')
export const purchaseHistoryCol = collection(db, 'purchaseHistory')
export const usersCol = collection(db, 'users')
export const setupDoc = doc(db, 'meta', 'setup')
