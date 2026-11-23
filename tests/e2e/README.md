# Tests de navegador (end-to-end)

Red de seguridad de interfaz: describen el comportamiento **actual** de la app (v1.6.3) para detectar regresiones al
refactorizar. Abren la app de verdad en Chromium, contra **emuladores de Firebase** con datos de prueba; nunca tocan el
Firebase de producción, la Raspberry ni datos reales.

## Ejecutar

```bash
npm run test:e2e                      # todo (81 tests, ≈ 1,7 min)
npm run test:e2e -- despensa          # solo los ficheros cuyo nombre contenga «despensa»
npm run test:e2e -- -g "tema"         # solo los tests cuyo título contenga «tema»
npm run test:e2e -- --headed --workers=1 recetario   # ver el navegador (hace falta pantalla)
```

Un solo comando: `run.mjs` levanta los emuladores (Auth `9099`, Firestore `8089`, proyecto `demo-cocinin-e2e`, con Java 21 vía
`mise exec java@temurin-21`) y Vite (puerto `5199`, con variables de proceso que fuerzan los emuladores y un proyecto falso
aunque exista `.env`), ejecuta Playwright y al terminar mata todo (por grupo de procesos) y borra el HOME falso.

Requisitos: Chromium del sistema (`/usr/bin/chromium`, o `CHROME_PATH=/ruta/al/chrome`), `mise` con Java 21 y puertos
`9099`, `8089` y `5199` libres (cierra `npm run emulators` / `npm run dev` antes; el lanzador avisa si están ocupados).
No se descarga ningún navegador.

Variables opcionales: `CHROME_PATH`, `E2E_WEB_PORT` (5199), `E2E_TMP` (carpeta para el HOME falso, trazas y capturas;
por defecto la temporal del sistema).

## Cómo está montado

| Fichero | Qué es |
|---|---|
| `run.mjs` | Lanzador: emuladores + Vite + Playwright + limpieza. |
| `playwright.config.ts` | Un solo worker (emulador compartido), Chromium del sistema, **HOME falso** para el navegador. |
| `config.ts` | Puertos, proyecto demo y credenciales de prueba (`admin@e2e.test` alias «Marta», `miembro@e2e.test` sin alias). |
| `seed.ts` | Vacía y siembra Auth y Firestore (por REST, como administrador del emulador) antes de **cada** test (3 grupos, 9 ingredientes, 15 recetas, 12 etiquetas, 2 notas, 2 artículos en la lista) y comprueba que quedó exacto. `readCollection()` lee la BD para verificar lo que escribió la interfaz. |
| `helpers.ts` | `test` ampliado (la siembra es un fixture automático: **no** la muevas a un `test.beforeEach` de este módulo, solo se aplicaría al primer fichero): red solo a localhost (todo lo demás se aborta y hace fallar el test), fallo ante errores JS no capturados, contexto limpio por test (escritorio 1280×800, tema claro, animaciones reducidas), `newPage()` para otro tamaño/tema/sesión, y `login`, `openSection`, `openSettings`. |
| `*.e2e.ts` | Los tests, por pantalla. |
| `BUGS.md` | Comportamientos sospechosos que han destapado, con la corrección propuesta (sin aplicar). |

Criterios: selectores por rol, texto o `aria-label` (nada de clases CSS); esperas por condición (`expect`, `expect.poll`),
no pausas fijas (la única pausa es la pulsación larga de 500 ms, que es el comportamiento que se prueba); las escrituras de
la app no esperan al servidor, así que se verifican con `expect.poll(() => readCollection(...))`. Los controles cuyo estado
viene de Firestore (casillas de la lista) se pulsan con `click()` + `expect(...).toBeChecked()`, no con `check()`.

## Qué cubren

- **auth**: login, error, ver/ocultar contraseña, rutas protegidas, admin vs. miembro, cerrar sesión.
- **despensa**: interruptor disponible/agotado, congelado y descongelando, carrito a la lista, grupos plegables (y recordados), añadir/editar/borrar ingrediente y grupo, modo organizar (pulsación larga, renombrar, mover con ↓, eliminar), búsqueda.
- **lista**: añadir, crear desde la búsqueda, marcar, quitar, confirmar compra (+ historial), secciones plegables.
- **recetario**: abrir/cerrar, lo que falta y el carrito, Todas/Puedo hacerla, etiquetas (AND), búsqueda, gestor de etiquetas, **rueda y arrastre en la fila de etiquetas sin mover la página**, añadir/editar/borrar receta, importar (vista previa, etiqueta nueva, deshacer, ingrediente desconocido, JSON roto, título repetido).
- **notas**: crear, hecha + eliminar hechas, organizar (editar / eliminar).
- **ajustes**: tema Claro/Oscuro/Sistema (`data-theme`), animaciones (`data-reduce-motion`), copia de seguridad, miembro vs. admin, saludo con alias según la hora (incluye los límites 06/12/20 h).
- **navegacion**: barra lateral (escritorio), pestañas (móvil 390 px, táctil), barra ⚙, historial del navegador.

No cubren (a propósito): avisos push, notificaciones de notas con hora (requieren clave VAPID), Usuarios (alta de cuentas),
restaurar copia, «gastar pronto», caducidades, arrastrar con el ratón para reordenar (se prueba con el teclado ↑↓).

## Ante un fallo

Playwright guarda captura y *trace* del test fallido en `$E2E_TMP/cocinin-e2e-results` (o en la carpeta temporal);
ábrelo con `npx playwright show-trace <ruta>/trace.zip`.
Si cambias la interfaz a propósito, actualiza el texto/rol que usa el test; los tests no deberían depender de nada más.

## Selectores que faltan (para no tocar `src/` ahora)

Todo se ha podido localizar por rol/texto/aria-label, salvo:
- Fila de ingrediente / receta / nota: no hay `data-testid`; se localiza por el nombre del interruptor o del título.
- Grupo de la Despensa: se usa `[data-group-id]` (ya existe en `PantryPage`) solo para comprobar el orden.
- «Receta plegada por otra abierta»: se detecta con el atributo `inert` del contenedor, no con una clase.

## Dependencias

Solo `@playwright/test` (devDependency; trae `playwright-core`). Se usa su runner, sus aserciones con espera automática
(`toBeVisible`, `toHaveAttribute`…), `test.fixme` y las trazas. No se descarga ningún navegador (se usa el Chromium del sistema).
Sin ella habría que montar a mano las esperas, que es justo lo que vuelve frágiles estos tests.
