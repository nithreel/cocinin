# Hallazgos de los tests de navegador

Solo se anotan; **no se ha tocado `src/`**. Los tests que los rozan siguen en verde sobre el comportamiento actual.

## 1. Error de JavaScript no capturado al cerrar sesión (baja)

- **Dónde:** `src/auth/AuthContext.tsx`, `signOut()` (~líneas 120-129: `terminate(db)` + `clearIndexedDbPersistence(db)`).
- **Cómo reproducirlo:** iniciar sesión, ⚙ → «Cerrar sesión» → «Sí, salir». En la consola salta
  `FirebaseError: The client has already been terminated.` como error no capturado (`window.onerror`).
  Test que lo cubre: `auth.e2e.ts` › «cerrar sesión pide confirmación y vuelve al login» (tolera ese error con
  `knownErrors`; quita esa línea cuando se corrija y el test volverá a exigir cero errores).
- **Qué esperaba:** cierre de sesión sin errores en consola.
- **Efecto real:** ninguno visible (la página navega a `/login` después y la caché se limpia). Pero ensucia Sentry/consola
  si algún día se añade, y oculta errores reales.
- **Causa (comprobada):** quitando `terminate`/`clearIndexedDbPersistence` el error desaparece. Algo (los listeners de
  `AppDataProvider`, que React desmonta al quedar `user = null`, o una consulta en curso) toca Firestore después de
  `terminate`. Con una espera de 400 ms antes de terminar el cliente también desaparece, lo que apunta a la carrera
  «desmontar listeners ↔ terminar cliente»; con `setTimeout(0)` NO desaparece.
- **Corrección propuesta (sin aplicar):** esperar a que los listeners estén cancelados antes de terminar el cliente.
  Lo más limpio es que `AppDataProvider` publique cuándo ha cancelado sus listeners y `signOut` lo espere; la versión
  mínima, comprobada en una copia, es:
  ```diff
       await firebaseSignOut(auth)
  +    // dejar que React desmonte los listeners (AppDataProvider) antes de terminar el cliente de Firestore
  +    await new Promise((r) => setTimeout(r, 400))
       // En un dispositivo compartido no deben quedar datos de la cocina en la caché local.
       try {
         await terminate(db)
  ```
  (400 ms es un parche; sube el tiempo de cierre de sesión. Mejor la señal explícita.)

## 2. Comentario desactualizado en el Recetario (nota, no es un fallo)

- **(Corregido en 1.7.0)** **Dónde:** `src/features/recipes/RecipesPage.tsx:394`: «con una receta desplegada, los filtros (Todas/Puedo hacerla y
  etiquetas) se pliegan; **el buscador se queda**».
- **Qué pasa:** el código pliega también el buscador (todo `below` va dentro de `<Collapse open={!formActive && !compact …}>`;
  coherente con el comentario de la línea 138, «la cabecera recupera el buscador y las etiquetas»). El test describe el
  comportamiento real (buscador oculto con una receta abierta).
- **Propuesta:** corregir el comentario («los filtros y el buscador se pliegan») o, si la intención era dejar el buscador,
  sacar `SearchInput` fuera del `Collapse`. Decídelo tú; el test `recetario.e2e.ts` › «abrir una receta…» fija el
  comportamiento actual.

## Observaciones sin acción

- Las casillas de la Lista de la compra son controladas por el estado de Firestore: tras pulsar, el cambio llega un
  instante después (no es instantáneo como una casilla normal). Playwright `check()` lo detecta como «no cambió»; los tests
  usan `click()` + `expect(...).toBeChecked()`. Inofensivo, pero a tener en cuenta si el refactor cambia cómo se aplican
  las escrituras optimistas.
- `login()` espera a ver un interruptor de la Despensa: la cabecera «Despensa» aparece antes que los datos.
