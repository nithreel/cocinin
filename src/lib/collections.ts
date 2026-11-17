import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase'

export interface Group {
  id: string
  name: string
  createdAt: number
  /** grupo de comida: sus ingredientes salen en las recetas y se pueden congelar (por defecto sí) */
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
  /** momento (ms) en que se sacó del congelador para descongelar en la nevera; null/ausente = no está descongelando */
  thawedAt?: number | null
  /** marcado a mano «gastar pronto» (abierto, a punto de pasarse…) */
  useSoon?: boolean
  /** cuándo (ms) se marcó «gastar pronto»; ausente en las marcas anteriores a este campo */
  useSoonAt?: number | null
  createdAt: number
  expiryMode?: ExpiryMode
  expiryDate?: string | null
  stockedDate?: string | null
  /** cantidad que queda (texto libre, p. ej. «500 g»); vacío por defecto */
  quantity?: string | null
  /** uid de quien lo marcó como agotado por última vez (para no avisarle a él) */
  by?: string | null
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
  /** ids de las etiquetas (colección `tags`) */
  tagIds?: string[]
  /** formato antiguo (texto); solo se lee una vez para migrarlo a `tagIds` */
  tags?: string[]
  createdAt: number
  /** id del lote si vino del importador (permite deshacer la importación) */
  importada?: string
}

/** Etiqueta del recetario (Postre, Fría…): se crean y gestionan aparte, como los grupos. */
export interface Tag {
  id: string
  name: string
  createdAt: number
  /** posición elegida a mano; las que no la tienen van al final por orden alfabético */
  order?: number
}

export interface PurchaseHistoryEntry {
  id: string
  ingredientName: string
  purchasedAt: number
}

/** Qué avisos recibe un dispositivo. */
export interface PushPrefs {
  gastado: boolean
  lista: boolean
  compra: boolean
  receta: boolean
  usuario: boolean
  caducidad: boolean
  descongelado: boolean
  nota: boolean
}

/** Suscripción push de un dispositivo (id = hash del endpoint). La envía la Raspberry, no la app. */
export interface PushSubscriptionDoc {
  uid: string
  endpoint: string
  keys: { p256dh: string; auth: string }
  prefs: PushPrefs
  createdAt: number
}

/** Nota con recordatorio opcional: avisa por push a los usuarios elegidos a la hora indicada. */
export interface Note {
  id: string
  text: string
  createdAt: number
  /** ¿salta aviso? */
  notify: boolean
  /** momento del aviso (ms desde epoch); null si no hay aviso */
  remindAt: number | null
  /** uids que reciben el aviso */
  recipients: string[]
  /** lo marca el servicio de avisos cuando ya lo ha enviado */
  sent?: boolean
}

export type Role = 'admin' | 'member'

export interface Member {
  id: string
  email: string
  /** nombre corto que pone el admin (p. ej. «Dani»); se muestra en vez del correo */
  alias?: string
  role?: Role
  createdAt: number
}

export const groupsCol = collection(db, 'groups')
export const ingredientsCol = collection(db, 'ingredients')
export const shoppingListCol = collection(db, 'shoppingList')
export const recipesCol = collection(db, 'recipes')
export const tagsCol = collection(db, 'tags')
export const purchaseHistoryCol = collection(db, 'purchaseHistory')
export const pushSubscriptionsCol = collection(db, 'pushSubscriptions')
export const notesCol = collection(db, 'notes')
export const usersCol = collection(db, 'users')
export const setupDoc = doc(db, 'meta', 'setup')
