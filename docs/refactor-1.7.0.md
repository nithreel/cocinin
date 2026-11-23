# Refactor 1.7.0 — análisis y plan

Punto de partida: `main` en v1.6.3. Objetivo: reorganizar el código del núcleo **sin cambiar nada visible**
(funcionalidad, textos, clases CSS efectivas, rutas, esquema de Firestore, reglas, notifier).

## Cómo se comprueba que no cambia nada

Tras cada paso:

1. `npx tsc -b`, `npx oxlint` (los mismos 5 avisos que en v1.6.3: AuthContext:60, Toast:15, Pop:6 y 8,
   ReleaseNotice:39), `npm test` y `npx vite build`.
2. **CSS idéntico**: el nombre del CSS generado lleva el hash de su contenido (`index-D2foGLR7.css` en v1.6.3).
   Si se conservan todas las clases, el nombre no cambia.
3. **Literales idénticos**: un script recorre el AST de `src/` y lista todas las cadenas, plantillas y textos JSX
   (troceados por espacios, sin rutas de import). El conjunto debe ser el mismo antes y después: así no se pierde ni
   aparece ningún texto, `aria-label`, `role` ni clase (los tests de navegador dependen de ellos).

## Medición (v1.6.3)

Cifras por fichero: líneas, hooks (`useState`, `useEffect`, `useLayoutEffect`, `useMemo`, `useRef`, `useCallback`)
y componentes definidos.

| Fichero | Líneas | state | effect | layout | memo | ref | cb | Componentes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `features/pantry/PantryPage.tsx` | 1112 | 30 | 3 | 0 | 4 | 2 | 0 | 7 |
| `features/recipes/RecipesPage.tsx` | 553 | 15 | 3 | 2 | 6 | 4 | 2 | 2 |
| `components/layout/AppLayout.tsx` | 461 | 7 | 5 | 0 | 0 | 5 | 1 | 6 |
| `features/shopping-list/ShoppingListPage.tsx` | 410 | 5 | 1 | 0 | 7 | 1 | 0 | 2 |
| `features/recipes/ImportRecipes.tsx` | 330 | 10 | 0 | 0 | 2 | 0 | 0 | 4 |
| `features/notes/NotesPage.tsx` | 330 | 14 | 1 | 0 | 2 | 0 | 0 | 3 |
| `features/recipes/RecipeForm.tsx` | 303 | 8 | 0 | 0 | 7 | 0 | 0 | 1 |
| `features/recipes/TagsManager.tsx` | 224 | 8 | 0 | 0 | 0 | 0 | 0 | 2 |
| `features/users/UsersPage.tsx` | 204 | 10 | 1 | 0 | 0 | 0 | 0 | 2 |
| `features/settings/SettingsPage.tsx` | 189 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| `lib/AppDataContext.tsx` | 186 | 13 | 7 | 0 | 0 | 0 | 0 | 1 |
| `features/alerts/AlertsPage.tsx` | 176 | 5 | 1 | 0 | 0 | 0 | 0 | 1 |
| `auth/LoginPage.tsx` | 161 | 6 | 0 | 0 | 0 | 0 | 0 | 1 |

El resto de `src/` (37 ficheros) está por debajo de 150 líneas y con una sola responsabilidad.

### Diagnóstico por fichero

**PantryPage.tsx (1112 líneas, 7 componentes, 30 `useState`).** Es el único fichero claramente desproporcionado.
Contiene: `ExpiryFields` (70 l.), `IngredientRow` (408 l., 11 `useState`, 3 `useEffect`: fila, panel de fechas,
edición, borrado, carrito, congelar), `IsFoodCheckbox`, `AddGroupForm`, `AddIngredientForm` (87 l.),
`GroupHeader` (188 l.: insignias, asa de arrastre, edición en el sitio, borrado) y la página (238 l.: agrupar por
secciones, búsqueda, modo «organizar», borradores, cancelar con restauración de orden). Además mezcla lógica pura
sin tests dentro de `useMemo` y manejadores: construir secciones (incluye grupos vacíos, a diferencia de
`groupByPantryGroup`), filtrar por búsqueda, recetas que usan cada ingrediente, el `order` del grupo nuevo, qué
borradores hay que guardar y qué orden restaurar al cancelar. **Merece trocearse**: un componente por fichero y la
lógica a `lib/pantrySections.ts` con tests.

**RecipesPage.tsx (553 l.).** `RecipeCard` ocupa 275 líneas con su propia animación, medición del alto y carrito;
la página, 215. La lógica de estado de receta (`isUsable`, `getRecipeStatus`, `countMissingRequired`, lo que falta
por comprar, filtro de búsqueda/etiquetas/«Puedo hacerla») es pura y sin tests. Los dos conjuntos `editingIds` y
`openIds` repiten el mismo patrón (estado + `useCallback` estable). **Merece**: `RecipeCard.tsx`, `lib/recipeStatus.ts`
con tests y un hook `useIdSet` (callback estable, imprescindible porque `RecipeCard` lo usa en las dependencias de
sus efectos).

**AppLayout.tsx (461 l., 6 componentes).** Tres bloques sin relación: la barra de ajustes (`SettingsBar` +
`LogoutButton` + `BackupIcon` + `TopLink`, 270 l.), el ajuste del alto con el teclado del móvil (efecto de 60 l.)
y el esqueleto de navegación (que pinta dos veces la misma lista de pestañas). **Merece**: `SettingsBar.tsx`,
hook `useKeyboardViewport` y un `NavItems` para las pestañas repetidas.

**ShoppingListPage.tsx (410 l.).** Tres secciones (carrito, «Añadir a la lista», historial). El historial es
independiente (su propio estado: plegado, límite, consulta paginada y plegado de lotes) y tiene dos funciones puras
sin tests (`groupPurchaseHistory`, `formatRelativeDate`). **Merece en parte**: extraer `PurchaseHistory.tsx`,
`SectionHeader.tsx` y `lib/purchaseHistory.ts` con tests. El carrito y «Añadir a la lista» comparten estado con la
página (búsqueda, animación de confirmar): se quedan.

**NotesPage.tsx (330 l.).** `NoteForm` (115 l.) es un formulario autónomo; `useMembers` duplica el listener de
`users` de `UsersPage`; el orden de las notas y los nombres de destinatarios son lógica pura sin tests.
**Merece**: `NoteForm.tsx`, `lib/useMembers.ts` compartido (sin añadir manejo de errores: sería un cambio) y
`lib/noteOrder.ts` con tests. Ojo: los destinatarios se mostraban con el correo **cortado en la @**, distinto de
`memberName` (correo completo); el refactor lo conservó y después se unificó con `memberName` (fallo 5, corregido).

**AppDataContext.tsx (186 l., 13 `useState`, 7 `useEffect`).** Seis listeners casi idénticos. Un hook genérico
ahorraría unas 50 líneas, pero hay dos asimetrías que hay que respetar (solo `groups` e `ingredients` limpian
`dataError`; el reloj de 60 s necesita los setters de `ingredients` y `recipes`). **Opcional, al final**, si queda
limpio.

**Estilo «pastilla» repetido** (botón redondeado con borde verde al activarse): 3 copias (filtro de etiquetas y
botón «Etiquetas» del Recetario, etiquetas de `RecipeForm`). **Opcional**: llevarlo a `buttonStyles.ts`, conforme a
la norma de la skill (todo botón con esos estilos).

### Lo que se deja como está (y por qué)

| Fichero | Motivo |
|---|---|
| `RecipeForm.tsx` (303 l.) | Un solo componente cohesionado (el formulario). Sus 7 `useMemo` son derivaciones encadenadas del mismo estado; trocearlo obligaría a pasar media docena de props sin ganar claridad. |
| `ImportRecipes.tsx` (330 l.) | Un flujo único (copiar instrucciones → pegar → vista previa → importar/deshacer). La lógica pura ya está en `lib/importRecipes.ts` y `lib/tags.ts` con tests. |
| `TagsManager.tsx` (224 l.) | Fila + lista, ya separados en dos componentes. Tamaño razonable. |
| `UsersPage.tsx` (204 l.) | Solo cambia el listener de `users` (pasa a `useMembers`). |
| `SettingsPage`, `AlertsPage`, `LoginPage` | Menos de 200 líneas, una responsabilidad, ya divididos en subcomponentes pequeños. |
| `icons.tsx` (197 l.) | Catálogo de iconos: el tamaño es el número de iconos. |
| Clases de los campos de texto (23 copias del anillo de foco) | Se dejó en el refactor por tocar muchos ficheros. **Hecho después** a petición de nith: `components/inputStyles.ts` (`inputBase`, `inputField`, `inputCompact`), con el mismo CSS generado. |
| Cierre al tocar fuera (fila de Despensa y «Cerrar sesión») | Parecidos pero no iguales (uno comprueba una sola referencia y no cierra si es nula; el otro dos). Unificarlos cambia un caso límite: se deja. |

## Plan priorizado

| # | Paso | Beneficio | Riesgo | Notas |
|---|---|---|---|---|
| 1 | PantryPage: lógica pura a `lib/pantrySections.ts` + tests | Alto | Bajo | Copia literal de las expresiones (`order ?? -1` + 1, `isFood ?? true`, comparación con `join()`). |
| 2 | PantryPage: un componente por fichero en `features/pantry/` | Alto | Bajo | Mover sin cambiar JSX. |
| 3 | RecipesPage: `lib/recipeStatus.ts` + tests, `useIdSet`, `RecipeCard.tsx` | Alto | Bajo-medio | Callbacks estables. |
| 4 | ShoppingList: `lib/purchaseHistory.ts` + tests, `PurchaseHistory.tsx`, `SectionHeader.tsx` | Medio | Bajo | `now` inyectable en `formatRelativeDate` para testear. |
| 5 | AppLayout: `SettingsBar.tsx`, `useKeyboardViewport`, `NavItems` | Medio | Bajo | |
| 6 | Notas/usuarios: `useMembers`, `lib/noteOrder.ts` + tests, `NoteForm.tsx` | Medio | Bajo | Conservar el corte en la @ (luego se quitó: fallo 5). |
| 7 | (Opcional) `AppDataContext`: hook genérico de listener | Medio-bajo | Medio | Solo si respeta las dos asimetrías sin rodeos. |
| 8 | (Opcional) estilo pastilla en `buttonStyles.ts` | Bajo | Bajo | Con extras por sitio (RecipeForm no lleva `shrink-0 whitespace-nowrap`). |

Los fallos o rarezas encontrados por el camino **no se corrigen aquí**: van a `docs/refactor-1.7.0-bugs.md` con su
propuesta.

## Resultado del refactor (antes de corregir fallos)

Cifras al acabar el refactor; las actuales están en «Estado final». Hechos los 8 pasos. En cada uno: `tsc -b` sin errores, oxlint con los mismos 5 avisos, tests en verde, build
correcto, **mismo CSS** (`index-D2foGLR7.css`) y **mismo conjunto de literales** (0 textos/clases perdidos o nuevos).
Tests: de 89 a 115 (26 nuevos en `pantrySections`, `recipeStatus`, `purchaseHistory` y `noteOrder`).

| Antes (v1.6.3) | Líneas | Después | Líneas |
|---|---:|---|---:|
| `PantryPage.tsx` (7 componentes, 30 `useState`) | 1112 | `PantryPage.tsx` (7 `useState`) | 215 |
| | | `IngredientRow.tsx` (9 `useState`, antes 11) | 318 |
| | | `GroupHeader.tsx` | 203 |
| | | `AddIngredientForm.tsx` / `IngredientEditForm.tsx` / `IngredientActions.tsx` | 95 / 86 / 84 |
| | | `ExpiryFields.tsx` / `AddGroupForm.tsx` / `IsFoodCheckbox.tsx` | 73 / 52 / 24 |
| | | `lib/pantrySections.ts` (puro, 13 tests) | 101 |
| `RecipesPage.tsx` | 553 | `RecipesPage.tsx` | 198 |
| | | `RecipeCard.tsx` | 299 |
| | | `lib/recipeStatus.ts` (puro, 6 tests) / `lib/useIdSet.ts` | 57 / 20 |
| `AppLayout.tsx` | 461 | `AppLayout.tsx` | 109 |
| | | `SettingsBar.tsx` / `lib/useKeyboardViewport.ts` | 295 / 70 |
| `ShoppingListPage.tsx` | 410 | `ShoppingListPage.tsx` | 277 |
| | | `PurchaseHistory.tsx` / `SectionHeader.tsx` | 92 / 31 |
| | | `lib/purchaseHistory.ts` (puro, 4 tests) | 31 |
| `NotesPage.tsx` | 330 | `NotesPage.tsx` / `NoteForm.tsx` | 192 / 126 |
| `UsersPage.tsx` | 204 | `UsersPage.tsx` | 197 |
| | | `lib/useMembers.ts` / `lib/noteOrder.ts` (puro, 3 tests) | 16 / 16 |
| `AppDataContext.tsx` (13 `useState`, 7 `useEffect`) | 186 | `AppDataContext.tsx` (hook `useLiveQuery`) | 162 |
| `RecipeForm.tsx` | 303 | `RecipeForm.tsx` (usa `pillButton`) | 298 |

Ningún fichero tocado pasaba de 320 líneas; el mayor de `src/` era `ImportRecipes.tsx` (330), que se deja por ser
un solo flujo. `src/` creció de 8558 a 8746 líneas (cabeceras de import y comentarios de los ficheros nuevos).

Los fallos encontrados por el camino se anotaron en `docs/refactor-1.7.0-bugs.md`; después nith decidió cuáles
corregir (ver «Estado final»).

## Estado final

Después del refactor, en la misma rama y en commits aparte:

- **Fallos** (`docs/refactor-1.7.0-bugs.md`): corregidos el 1 (historial vacío), el 2 (aviso de datos), el 4 («Crear
  los que faltan», con un segundo arreglo para no perder el bloqueo contra la doble pulsación) y el 5 (nombres de
  destinatarios con `memberName`). El 3 no se corrige (decisión de nith); el 6 (más `try/catch` muertos, en
  etiquetas e importación) queda anotado para que lo decida nith.
- **Convención de código** escrita en `docs/convencion-codigo.md` y aplicada: tests un fichero por módulo, sin `any`,
  imports de paquetes primero, las 205 funciones exportadas documentadas con `/** */`, campos con
  `components/inputStyles.ts` y `nextOrder` común para grupos y etiquetas (`lib/order.ts`).
- **Cifras actuales:** 129 tests en 20 ficheros (89 en v1.6.3). Ficheros mayores de `src/`: `ImportRecipes.tsx` 336,
  `IngredientRow.tsx` 320, `RecipeCard.tsx` 302, `RecipeForm.tsx` 301 (excepciones aceptadas por nith). Páginas:
  Despensa 217, Lista 279, Recetario 200, Notas 193; `AppLayout` 111; `AppDataContext` 175. `src/` suma 8898 líneas
  (8558 en v1.6.3), por los comentarios de documentación y las cabeceras de los ficheros nuevos.
- **Comprobaciones** en cada commit: `tsc -b` sin errores, oxlint con los 5 avisos de siempre, tests y build en
  verde y el mismo CSS generado (`index-D2foGLR7.css`). Los literales solo cambian donde un fallo corregido cambia un
  texto (el mensaje inalcanzable del 4 y el corte en la @ del 5).
