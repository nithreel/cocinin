import { doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import {
  groupsCol,
  ingredientsCol,
  notesCol,
  purchaseHistoryCol,
  recipesCol,
  shoppingListCol,
  tagsCol,
} from './collections'

/** Colecciones que se restauran. `users` no: está ligado a las cuentas de acceso y no se toca. */
const RESTORABLE = {
  groups: groupsCol,
  ingredients: ingredientsCol,
  shoppingList: shoppingListCol,
  recipes: recipesCol,
  tags: tagsCol,
  purchaseHistory: purchaseHistoryCol,
  notes: notesCol,
}

export type RestorableName = keyof typeof RESTORABLE
export interface BackupDoc {
  id: string
  data: Record<string, unknown>
}
export type ParsedBackup = Partial<Record<RestorableName, BackupDoc[]>>

export const COLLECTION_LABELS: Record<RestorableName, string> = {
  groups: 'grupos',
  ingredients: 'ingredientes',
  shoppingList: 'lista de la compra',
  recipes: 'recetas',
  tags: 'etiquetas',
  purchaseHistory: 'historial de compras',
  notes: 'notas',
}

/** Lee el JSON de «Descargar copia de seguridad». Lanza un Error con mensaje legible si no es una copia válida. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('El archivo no parece una copia de Cocinin.')
  const result: ParsedBackup = {}
  for (const name of Object.keys(RESTORABLE) as RestorableName[]) {
    const list = (raw as Record<string, unknown>)[name]
    if (list === undefined) continue
    if (!Array.isArray(list)) throw new Error(`«${name}» no tiene el formato esperado.`)
    result[name] = list.map((item) => {
      if (typeof item !== 'object' || item === null || typeof (item as { id?: unknown }).id !== 'string' || !(item as { id: string }).id) {
        throw new Error(`Hay un elemento sin id en «${name}».`)
      }
      const { id, ...data } = item as { id: string } & Record<string, unknown>
      return { id, data }
    })
  }
  if (Object.keys(result).length === 0) throw new Error('El archivo no contiene datos de Cocinin.')
  return result
}

/**
 * Escribe la copia en Firestore (espera a que el servidor confirme: hace falta conexión).
 * `merge`: crea o sobrescribe los documentos de la copia y deja los demás.
 * `replace`: además borra de cada colección presente en la copia lo que no esté en ella.
 */
export async function restoreBackup(backup: ParsedBackup, mode: 'merge' | 'replace') {
  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = []
  for (const name of Object.keys(backup) as RestorableName[]) {
    const col = RESTORABLE[name]
    const docs = backup[name] ?? []
    for (const d of docs) ops.push((b) => b.set(doc(col, d.id), d.data))
    if (mode === 'replace') {
      const keep = new Set(docs.map((d) => d.id))
      const snap = await getDocs(col)
      for (const d of snap.docs) if (!keep.has(d.id)) ops.push((b) => b.delete(d.ref))
    }
  }
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + 400)) op(batch)
    await batch.commit()
  }
  return ops.length
}
