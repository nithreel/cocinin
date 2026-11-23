# Refactor 1.7.0 — fallos y rarezas encontrados

Se anotaron durante el refactor sin tocarlos, para que el refactor fuera verificable por sí solo. Después nith los
valoró y se corrigieron en commits aparte (uno por fallo), salvo el 3.

| # | Fallo | Estado |
|---|---|---|
| 1 | Historial vacío con una compra de 100+ artículos | **Corregido** (`wholePurchases` en `lib/purchaseHistory.ts`, 3 tests) |
| 2 | Aviso de datos que se borra con un listener aún caído | **Corregido** (error por listener, `lib/dataErrors.ts`, 4 tests) |
| 3 | Historial y usuarios sin manejo de errores | **No corregido**, por decisión de nith |
| 4 | «Crear los que faltan»: error inalcanzable y «Creando…» | **Corregido** (sin test: es un componente). La primera corrección perdía el bloqueo contra la doble pulsación; arreglado después: `busy` ya no se restablece al crear y «Cancelar» lo restablece |
| 5 | Destinatarios de notas con el correo cortado | **Corregido**: ahora `memberName` (alias o correo completo) |
| 6 | Etiquetas e importación: `try/catch` que nunca salta (como el 4) | **Pendiente de decisión** (anotado tras la auditoría externa) |

Lo que sigue es la descripción original de cada uno, con el diff que se propuso.

---

## 1. [Corregido] Historial de compras vacío si la última compra de la página tiene 100 artículos o más

**Dónde:** `src/features/shopping-list/data.ts`, `wholePurchases()` (lo usa `usePurchaseHistory`).

**Qué pasa:** al llegar al límite de la consulta (100 entradas), se descarta entera la compra más antigua por si viene
incompleta. Si **todas** las entradas descargadas son de la misma compra (una compra de 100 artículos o más, o la
única compra que cabe en la página), se descartan todas: el historial sale «Aún no hay compras confirmadas.» y, como
en ese caso no se pinta el botón «Cargar compras anteriores», no hay forma de verlo.

**Cómo reproducirlo:** confirmar una compra con 100 artículos o más (o, en el emulador, crear 100 entradas de
`purchaseHistory` con el mismo `purchasedAt`) y desplegar «Historial de compras».

**Corrección propuesta:** si al descartar no queda nada, devolver lo descargado (aunque la compra venga cortada, es
mejor que nada; «Cargar compras anteriores» la completa).

```diff
 function wholePurchases(entries: PurchaseHistoryEntry[], limit: number) {
   if (entries.length < limit) return entries
   const oldest = entries[entries.length - 1].purchasedAt
-  return entries.filter((e) => e.purchasedAt !== oldest)
+  const whole = entries.filter((e) => e.purchasedAt !== oldest)
+  // una sola compra ocupa toda la página: mejor mostrarla (cortada) que dejar el historial vacío y sin botón
+  return whole.length > 0 ? whole : entries
 }
```

Con un test en `tests/unit` (habría que exportar `wholePurchases` o moverla a `lib/purchaseHistory.ts`).

---

## 2. [Corregido] El aviso «No se pueden cargar los datos» se borra aunque el listener que falló siga muerto

**Dónde:** `src/lib/AppDataContext.tsx` (opción `clearsError` de `useLiveQuery`; en v1.6.3, los `setDataError(null)`
de los efectos de `groups` e `ingredients`).

**Qué pasa:** cuando un listener de Firestore falla, Firestore lo **cierra** (no se recupera solo). Si falla, por
ejemplo, el de `recipes` o `notes`, sale el aviso; pero en cuanto llega cualquier cambio de grupos o ingredientes, el
aviso se borra, aunque las recetas o notas ya no se actualicen. Al revés, un fallo de `shoppingList`, `recipes`,
`tags` o `notes` nunca se borra aunque se lea bien después (no hay segunda lectura, pero el criterio es asimétrico).

**Cómo reproducirlo:** en el emulador, cambiar temporalmente la regla de `notes` para denegar la lectura, abrir la
app (sale el aviso) y cambiar cualquier ingrediente: el aviso desaparece y las notas siguen sin cargar.

**Corrección propuesta:** un error por listener y mostrar el primero que quede.

```diff
-  const [dataError, setDataError] = useState<string | null>(null)
+  const [errors, setErrors] = useState<Record<string, string>>({})
+  const dataError = Object.values(errors)[0] ?? null
+  const reportError = useCallback((key: string, message: string | null) =>
+    setErrors((prev) => {
+      if (message === null) {
+        if (!(key in prev)) return prev
+        const { [key]: _, ...rest } = prev
+        return rest
+      }
+      return { ...prev, [key]: message }
+    }), [])
```

y en `useLiveQuery` pasar una clave por colección y llamar `reportError(key, null)` en cada lectura correcta (todas,
no solo grupos e ingredientes) y `reportError(key, err.message)` en el error.

---

## 3. [No corregido: decisión de nith] Historial de compras y lista de usuarios: sin manejador de error, «cargando» para siempre

**Dónde:** `usePurchaseHistory` (`src/features/shopping-list/data.ts`) y `useMembers` (`src/lib/useMembers.ts`, antes
duplicado en `NotesPage` y `UsersPage`).

**Qué pasa:** `onSnapshot` no recibe callback de error. Si la lectura se deniega (p. ej. a alguien a quien acaban de
quitar del hogar), Usuarios se queda en «Cargando…» y el historial no muestra nada, sin ningún mensaje; el
error solo sale en la consola como «Uncaught Error in snapshot listener».

**Cómo reproducirlo:** en el emulador, denegar la lectura de `purchaseHistory` (o de `users`) y desplegar el
historial (o abrir Usuarios).

**Corrección propuesta:**

```diff
 // useMembers
-    return onSnapshot(query(usersCol, orderBy('createdAt')), (snap) => {
-      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member))
-      setLoading(false)
-    })
+    return onSnapshot(
+      query(usersCol, orderBy('createdAt')),
+      (snap) => {
+        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member))
+        setLoading(false)
+      },
+      (err) => {
+        console.error(err)
+        setLoading(false)
+      },
+    )
```

```diff
 // usePurchaseHistory
-    return onSnapshot(q, (snap) => {
-      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PurchaseHistoryEntry)
-      setState({ entries: wholePurchases(all, limit), mayHaveMore: all.length >= limit })
-    })
+    return onSnapshot(
+      q,
+      (snap) => {
+        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PurchaseHistoryEntry)
+        setState({ entries: wholePurchases(all, limit), mayHaveMore: all.length >= limit })
+      },
+      (err) => {
+        console.error(err)
+        setState({ entries: [], mayHaveMore: false })
+      },
+    )
```

---

## 4. [Corregido] Importar recetas, «Crear los que faltan»: el mensaje de error nunca sale y «Creando…» no se restablece

**Dónde:** `src/features/recipes/ImportRecipes.tsx`, `CreateMissing.create()`.

**Qué pasa:** `addIngredient` no lanza nunca (escribe con `void setDoc`, sin esperar), así que el `catch` con «No se
pudieron crear los ingredientes» es inalcanzable: un fallo real va al aviso global de escrituras. Además, `busy` solo
vuelve a `false` en el `catch`; si tras crear la receta siguiera bloqueada y el componente montado, el botón se
quedaría en «Creando…» deshabilitado. Hoy no se nota porque, al crearse los ingredientes, la receta deja de tener
`missing` y el componente se desmonta.

**Cómo reproducirlo:** no se ve en uso normal; se ve leyendo el código (o forzando un fallo de escritura: el mensaje
local no aparece).

**Corrección propuesta:** quitar el `try/catch` muerto y poner `setBusy(false)` en un `finally`, o dejar
explícito en un comentario que los fallos van al aviso global.

```diff
   async function create() {
     setBusy(true)
     setError(null)
-    try {
-      // Sin existencias: son cosas que no tienes; así la receta no sale como «completa» por error.
-      for (const n of names) await addIngredient(n, picked[n], { mode: 'none', date: null, quantity: '' }, false)
-    } catch (e) {
-      console.error(e)
-      setError('No se pudieron crear los ingredientes. Inténtalo de nuevo.')
-      setBusy(false)
-    }
+    // Sin existencias: son cosas que no tienes; así la receta no sale como «completa» por error.
+    // Las escrituras no esperan al servidor: un fallo llega al aviso global, no aquí.
+    for (const n of names) addIngredient(n, picked[n], { mode: 'none', date: null, quantity: '' }, false)
+    setBusy(false)
   }
```

(Con este cambio sobra el estado `error` de `CreateMissing` y su párrafo.)

---

## 5. [Corregido] Nombres de destinatarios de una nota distintos del resto de la app

**Dónde:** `recipientNames` en `src/lib/noteOrder.ts` (antes en línea en `NoteCard`).

**Qué pasa:** en la línea de aviso de una nota, un miembro sin alias sale como el correo **hasta la @** («ana»),
mientras que en el formulario de la nota y en Usuarios sale con `memberName`, que devuelve el **correo completo**
(«ana@example.com»). Puede ser intencionado (la línea es corta), pero es incoherente.

**Decisión de nith:** unificar en `memberName` (alias o correo completo), como el resto de la app.

---

## 6. [Pendiente de decisión] Etiquetas e importación: `try/catch` que nunca salta

Encontrado por la auditoría externa de la rama. Es el mismo caso que el 4.

**Dónde:**
- `src/features/recipes/TagsManager.tsx`: `save()` (llama a `renameTag`), el alta de etiqueta (`addTag`) y el
  callback de `useDragReorder` (`reorderTags(ids).catch(...)`).
- `src/features/recipes/ImportRecipes.tsx`, `handleImport()`: `addImportedRecipes`.

**Qué pasa:** esas funciones de `features/recipes/data.ts` escriben con `void setDoc/updateDoc/batch.commit()` y no
esperan al servidor, así que nunca lanzan. Sus `catch` («No se pudo guardar», «No se pudo crear la etiqueta», «No se
pudo cambiar el orden», «No se pudo importar» y devolver el texto pegado) son código muerto: un fallo real llega al
aviso global de escrituras (`ErrorToast`). En cambio `deleteTag` y `undoImport` **sí** pueden lanzar (leen de la caché
con `getDocsFromCache`, que rechaza si no puede), así que sus `catch` sí sirven y se quedan.

**Cómo reproducirlo:** no se ve en uso normal; se ve leyendo el código o forzando un fallo de escritura en el
emulador (denegar `tags` en las reglas): el mensaje local no aparece, sale el aviso global.

**Corrección propuesta:** quitar los `try/catch` muertos y dejar un comentario de dónde llega el fallo. No cambia nada
visible en uso normal.

```diff
 // TagsManager.tsx, save()
     setBusy(true)
-    try {
-      await renameTag(tag.id, n)
-      setEditing(false)
-      setError(null)
-    } catch (err) {
-      console.error(err)
-      setError('No se pudo guardar. Inténtalo de nuevo.')
-    } finally {
-      setBusy(false)
-    }
+    // no espera al servidor: un fallo llega al aviso global de escrituras
+    await renameTag(tag.id, n)
+    setEditing(false)
+    setError(null)
+    setBusy(false)
```

```diff
 // TagsManager.tsx, alta de etiqueta
     setBusy(true)
-    try {
-      await addTag(n, nextOrder(tags))
-      setName('')
-      setError(null)
-    } catch (err) {
-      console.error(err)
-      setError('No se pudo crear la etiqueta. Inténtalo de nuevo.')
-    } finally {
-      setBusy(false)
-    }
+    await addTag(n, nextOrder(tags))
+    setName('')
+    setError(null)
+    setBusy(false)
```

```diff
 // TagsManager.tsx, orden
-  const { shown, draggingId, rowStyle, handleFor, rowRef } = useDragReorder(sortTags(tags), (ids) => {
-    reorderTags(ids).catch((err) => {
-      console.error(err)
-      setError('No se pudo cambiar el orden. Inténtalo de nuevo.')
-    })
-  })
+  const { shown, draggingId, rowStyle, handleFor, rowRef } = useDragReorder(sortTags(tags), (ids) => void reorderTags(ids))
```

```diff
 // ImportRecipes.tsx, handleImport()
-    const previousText = text
     setText('')
     setChecked({})
-    try {
-      const batchId = await addImportedRecipes(toAdd, plan.newTags)
-      setDone({ batchId, count: toAdd.length })
-    } catch (e) {
-      setText(previousText)
-      console.error(e)
-      setError('No se pudo importar. Inténtalo de nuevo.')
-    } finally {
-      setBusy(false)
-    }
+    // no espera al servidor: un fallo llega al aviso global de escrituras
+    const batchId = await addImportedRecipes(toAdd, plan.newTags)
+    setDone({ batchId, count: toAdd.length })
+    setBusy(false)
```

Alternativa, si nith prefiere conservar los mensajes locales: que esas funciones de `data.ts` devuelvan la promesa de
`commit()`/`setDoc()` en vez de descartarla con `void`. Pero entonces, sin cobertura, la pantalla se quedaría
esperando hasta recuperar la red, que es justo lo que el `void` evita.

