import { ADMIN, AUTH_PORT, FIRESTORE_PORT, MEMBER, PROJECT_ID } from './config'

const HOST = '127.0.0.1'

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`)
  return res.json().catch(() => ({}))
}

async function createUser(email: string, password: string): Promise<string> {
  const r = await call('POST', `http://${HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    email,
    password,
    returnSecureToken: true,
  })
  return r.localId as string
}

const T0 = 1_760_000_000_000 // fecha fija de creación (los datos no dependen del reloj)

export const GROUPS = [
  { id: 'g-lacteos', name: 'Lácteos', isFood: true, order: 0 },
  { id: 'g-verduras', name: 'Verduras', isFood: true, order: 1 },
  { id: 'g-limpieza', name: 'Limpieza', isFood: false, order: 2 },
]

// inPantry = disponible; los de «Sin grupo» no llevan groupId
const ING = (id: string, name: string, groupId: string | null, inPantry: boolean, extra: object = {}) => ({
  id,
  data: { name, groupId, inPantry, createdAt: T0, ...extra },
})
export const INGREDIENTS = [
  ING('i-leche', 'Leche', 'g-lacteos', true),
  ING('i-queso', 'Queso', 'g-lacteos', true),
  ING('i-yogur', 'Yogur', 'g-lacteos', false),
  ING('i-tomate', 'Tomate', 'g-verduras', true),
  ING('i-cebolla', 'Cebolla', 'g-verduras', true),
  ING('i-lechuga', 'Lechuga', 'g-verduras', false),
  ING('i-lejia', 'Lejía', 'g-limpieza', true),
  ING('i-sal', 'Sal', null, true),
  ING('i-huevos', 'Huevos', null, true),
]

export const TAGS = ['Fría', 'Postre', 'Rápida', 'Cena', 'Vegetariana', 'Horno', 'Sopa', 'Ligera', 'Dulce', 'Pasta', 'Arroz', 'Carne'].map(
  (name, order) => ({ id: `t-${order}`, name, order }),
)

const ri = (ingredientId: string, quantity = '', unit = '') => ({ ingredientId, quantity, unit })
export const RECIPES = [
  // se puede hacer: todo disponible
  {
    id: 'r-ensalada',
    data: {
      title: 'Ensalada de tomate',
      instructions: 'Trocear el tomate y la cebolla.\nAliñar con sal.',
      ingredients: [ri('i-tomate', '2', 'uds'), ri('i-cebolla', '1', 'ud'), ri('i-sal')],
      tagIds: ['t-0', 't-2'],
      createdAt: T0 + 100,
    },
  },
  {
    id: 'r-tortilla',
    data: {
      title: 'Tortilla de cebolla',
      instructions: 'Pochar la cebolla y cuajar con los huevos.',
      ingredients: [ri('i-huevos', '4', 'uds'), ri('i-cebolla', '2', 'uds')],
      tagIds: ['t-3'],
      createdAt: T0 + 90,
    },
  },
  // NO se puede hacer: falta la lechuga (agotada)
  {
    id: 'r-lechuga',
    data: {
      title: 'Lechuga con yogur',
      instructions: 'Mezclar.',
      ingredients: [ri('i-lechuga', '1', 'ud'), ri('i-yogur', '1', 'ud')],
      tagIds: ['t-0'],
      createdAt: T0 + 80,
    },
  },
  // relleno: hace que la página tenga scroll vertical (para comprobar que la rueda sobre las etiquetas no la mueve)
  ...Array.from({ length: 12 }, (_, n) => ({
    id: `r-relleno-${n + 1}`,
    data: {
      title: `Receta de relleno ${String(n + 1).padStart(2, '0')}`,
      instructions: 'Paso único.',
      ingredients: [ri('i-sal')],
      tagIds: ['t-1'],
      createdAt: T0 + 10 - n,
    },
  })),
]

export const NOTES = [
  { id: 'n-1', data: { text: 'Llamar al fontanero', notify: false, remindAt: null, recipients: [], createdAt: T0 + 2 } },
  { id: 'n-2', data: { text: 'Comprar pilas', notify: false, remindAt: null, recipients: [], createdAt: T0 + 1 } },
]

export const SHOPPING = [
  { id: 's-yogur', data: { ingredientId: 'i-yogur', checked: false, addedAt: T0 } },
  { id: 's-tomate', data: { ingredientId: 'i-tomate', checked: false, addedAt: T0 + 1 } },
]

// Firestore por REST con «Bearer owner» (el emulador lo trata como administrador y se salta las reglas): sin cliente
// del SDK, sin caché ni colas de escritura propias que puedan falsear lo que se lee.
const DOCS = `http://${HOST}:${FIRESTORE_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents`

type FsValue = Record<string, unknown>
function toFs(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, toFs(x)])) } }
}
function fromFs(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return ((v.arrayValue as { values?: FsValue[] }).values ?? []).map(fromFs)
  if ('mapValue' in v) return Object.fromEntries(Object.entries((v.mapValue as { fields?: Record<string, FsValue> }).fields ?? {}).map(([k, x]) => [k, fromFs(x)]))
  return undefined
}
async function put(collection: string, id: string, data: object) {
  await call('PATCH', `${DOCS}/${collection}/${id}`, { fields: Object.fromEntries(Object.entries(data).map(([k, x]) => [k, toFs(x)])) })
}

const EXPECTED_COUNTS: Record<string, number> = { groups: GROUPS.length, ingredients: INGREDIENTS.length, tags: TAGS.length, recipes: RECIPES.length, notes: NOTES.length, shoppingList: SHOPPING.length, users: 2, purchaseHistory: 0 }

/** Vacía Auth y Firestore del emulador y vuelve a sembrar el mismo conjunto de datos (comprobando que quedó exacto). */
export async function resetAndSeed() {
  await seedOnce()
  const counts = await Promise.all(Object.keys(EXPECTED_COUNTS).map(async (c) => [c, (await readCollection(c)).length] as const))
  const bad = counts.filter(([c, n]) => n !== EXPECTED_COUNTS[c])
  if (bad.length) throw new Error(`Siembra inexacta (colección, nº de documentos): ${JSON.stringify(bad)}`)
}

async function seedOnce() {
  await call('DELETE', `http://${HOST}:${FIRESTORE_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`)
  await call('DELETE', `http://${HOST}:${AUTH_PORT}/emulator/v1/projects/${PROJECT_ID}/accounts`)
  const adminUid = await createUser(ADMIN.email, ADMIN.password)
  const memberUid = await createUser(MEMBER.email, MEMBER.password)
  await put('meta', 'setup', { createdAt: T0 })
  await put('users', adminUid, { email: ADMIN.email, role: 'admin', alias: ADMIN.alias, createdAt: T0 })
  await put('users', memberUid, { email: MEMBER.email, role: 'member', createdAt: T0 })
  await Promise.all([
    ...GROUPS.map((g) => put('groups', g.id, { name: g.name, isFood: g.isFood, order: g.order, createdAt: T0 })),
    ...INGREDIENTS.map((i) => put('ingredients', i.id, i.data)),
    ...TAGS.map((t) => put('tags', t.id, { name: t.name, order: t.order, createdAt: T0 })),
    ...RECIPES.map((r) => put('recipes', r.id, r.data)),
    ...NOTES.map((n) => put('notes', n.id, n.data)),
    ...SHOPPING.map((s) => put('shoppingList', s.id, s.data)),
  ])
}

/** Lee una colección entera (para comprobar lo que la interfaz ha escrito). */
export async function readCollection(name: string): Promise<{ id: string; data: Record<string, any> }[]> {
  const out: { id: string; data: Record<string, any> }[] = []
  let token = ''
  do {
    const r = await call('GET', `${DOCS}/${name}?pageSize=300${token ? `&pageToken=${token}` : ''}`)
    for (const d of (r.documents ?? []) as { name: string; fields?: Record<string, FsValue> }[]) {
      out.push({ id: d.name.split('/').pop()!, data: fromFs({ mapValue: { fields: d.fields ?? {} } }) as Record<string, any> })
    }
    token = r.nextPageToken ?? ''
  } while (token)
  return out
}
