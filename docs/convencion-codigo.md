# Convención de código

Recoge lo que ya hace el código (auditoría de `src/`, `tests/unit/`, `notifier/` y `scripts/`, noviembre de 2026),
no un estilo nuevo. El formato lo deciden `tsc` (modo estricto) y `oxlint` (`.oxlintrc.json`).

## Idioma
- **Comentarios, textos de la interfaz, mensajes de error, nombres de los tests (`describe`/`it`) y commits: en
  español.** Hoy no hay ningún comentario en inglés.
- **Identificadores en inglés** (`addIngredient`, `useCollapsedSet`, `PantryPage`). Excepciones fijadas por datos ya
  guardados: campos de Firestore (`importada`), tipos de aviso (`gastado`, `nota`) y claves de almacenamiento
  (`cocinin:ajustes`). No se renombran.

## Comentarios
- `/** … */` documenta una **declaración** (función, componente, hook, constante, tipo o campo de una interfaz)
  cuando el porqué no es obvio. Ejemplo: `/** Disponible para cocinar: lo tienes (congelado también) y no está caducado. */`
  encima de `isUsable`. Si el nombre lo dice todo (`deleteNote`), no hace falta.
- `//` explica una línea o un bloque **dentro** del código, y sirve también para las cabeceras de sección
  (`// --- Almacén global ---`) y los bloques del notifier y del asistente de instalación.
- Se comenta el porqué, no el qué.

## Ficheros y exports
- Componente: `PascalCase.tsx`, con el componente principal como `export default` (47 ficheros). Las piezas
  secundarias del mismo fichero se exportan por nombre (`ConfirmDelete` junto a `DeleteButton`, `ToastProvider`).
  Los contextos (`AuthContext.tsx`, `AppDataContext.tsx`) exportan proveedor y hooks por nombre; `icons.tsx` es un
  catálogo.
- Lógica y utilidades: `camelCase.ts` en `src/lib/`, con exports por nombre. Un hook que es lo principal de su
  fichero va en `useAlgo.ts` (`useLongPress.ts`); un hook auxiliar puede vivir con su módulo (`useSettings` en
  `settings.ts`).
- Lógica pura en `.ts` (nunca exportada desde un `.tsx` de componente, para no romper el refresco en caliente) y
  con test.
- Escrituras de Firestore de cada pantalla en `features/<área>/data.ts`.
- Tests: `tests/unit/<módulo>.test.ts`, con el nombre del módulo que prueban (`recipeStatus.test.ts` prueba
  `lib/recipeStatus.ts`). Excepciones por área: `notifier.test.ts` y `hosting.test.ts` (`firebase.json`).

## Nombres
- Funciones de acción con verbo: `addToShoppingList`, `toggleFrozen`, `startEdit`. Los manejadores de eventos de
  formulario o de botón con lógica se llaman `handleX` (`handleSubmit`, `handleDelete`).
- Props de callback: `onX` (`onDone`, `onChange`, `onToggleCollapsed`).
- Booleanos: adjetivo o participio para el estado (`open`, `editing`, `busy`, `loading`, `saving`), `showX` para
  lo que se despliega (`showForm`) y `is`/`has`/`can` para lo derivado o las props (`isAdmin`, `hasChecked`,
  `canFreeze`).

## Imports
Primero los paquetes (`react`, `firebase/…`, `react-router-dom`), después las rutas relativas. Dentro de cada grupo
no hay un orden fijo. `import type` para lo que solo es tipo.

## Tamaño
Orientativo: un fichero de componente hasta unas 300 líneas y un componente hasta unas 250; si pasa de ahí, se
extraen subcomponentes o lógica pura a `lib/` (ver `docs/refactor-1.7.0.md`). Las clases de los botones salen de
`components/buttonStyles.ts`.

## Tipos y errores
- Sin `any` (tampoco en los tests): `unknown` y se acota, o un tipo local.
- `console.error` solo en un `catch` o en el callback de error, y junto a algo que lo vea la persona (un mensaje en
  pantalla, `dataError` o el aviso global de `ErrorToast`). El notifier y el asistente usan `console` como su salida.
- Un `catch` que no hace nada lleva un comentario con el porqué (`// modo privado, almacenamiento bloqueado…`).
- Las escrituras no esperan al servidor (`void setDoc(...)`): sus fallos llegan al aviso global, no a un `try/catch`
  local.

## Pendiente de decisión (no aplicado)
- `IngredientRow.tsx` (319 líneas; componente de 291) y `ImportRecipes.tsx` (324; 227) pasan del tamaño orientativo,
  igual que los componentes `RecipeForm` (276) y `RecipeCard` (271). Recomendación: trocear `IngredientRow` (panel de
  fechas aparte) cuando se toque por otro motivo; los demás son un solo flujo y pueden quedarse.
- 74 de 205 funciones exportadas no llevan `/** */`. Casi todas se explican por su nombre; recomendación: documentar
  solo al tocarlas, no en bloque.
- Las clases de los campos de texto se repiten 23 veces con variantes. Un `inputStyles.ts` como `buttonStyles.ts`
  sería coherente, pero toca 10 ficheros: mejor en una versión aparte, comprobando el CSS generado.
