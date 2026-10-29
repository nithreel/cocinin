<p align="center">
  <img src="docs/icon.png" alt="CocinIN" width="96">
</p>

<h1 align="center">CocinIN</h1>

<p align="center">
  Despensa, lista de la compra y recetario compartidos para toda la casa.<br>
  Se instala como app en el móvil y también funciona desde cualquier navegador.
</p>

<p align="center">
  <img src="docs/hero.png" alt="CocinIN en el ordenador y en el móvil">
</p>

## ¿Qué es?

CocinIN responde a tres preguntas del día a día: **¿qué tenemos en casa?**, **¿qué hay que comprar?** y **¿qué podemos cocinar?** Todo se sincroniza al instante entre las personas de la casa: si alguien tacha algo en el súper, los demás lo ven en su móvil.

- 🥫 **Despensa**: ingredientes por grupos con un interruptor *disponible / agotado*, un copo de nieve para marcarlos como *congelados*, y fecha de compra o de caducidad (con avisos de «caduca en 2 días»).
- 🛒 **Lista de la compra**: lo que te falta, con buscador. Al confirmar la compra, lo comprado vuelve a la despensa y se anota en el historial.
- 📖 **Recetario**: recetas con ingredientes (obligatorios u opcionales) y preparación. Cada receta se marca según tengas o no lo necesario.
- 👥 **Usuarios**: un administrador da de alta a los demás. Cada casa tiene su propia instalación y sus datos son privados.
- 📥 **Importar recetas**: pega el JSON que te prepare cualquier IA con la receta y se añaden al recetario, con vista previa.
- 🔔 **Avisos en el móvil** (opcional): algo se ha gastado, compra hecha, algo va a caducar…
- 🌗 Modo claro y oscuro automático, y copia de seguridad en un clic.

Es una **PWA**: puedes usarla desde el navegador del ordenador o del móvil, o **instalarla como una app** con su icono en la pantalla de inicio, a pantalla completa y sin barra del navegador.

### Instalarla como app

| Dispositivo | Cómo |
| --- | --- |
| Android (Chrome) | Menú ⋮ → **Instalar aplicación** (o *Añadir a la pantalla de inicio*). |
| iPhone / iPad (Safari) | Botón Compartir → **Añadir a pantalla de inicio**. |
| Ordenador (Chrome, Edge) | Icono de instalar en la barra de direcciones. |

## Capturas

<p>
  <img src="docs/screenshots/movil-login.png" alt="Inicio de sesión" width="24%">
  <img src="docs/screenshots/movil-despensa.png" alt="Despensa" width="24%">
  <img src="docs/screenshots/movil-lista.png" alt="Lista de la compra" width="24%">
  <img src="docs/screenshots/movil-receta.png" alt="Receta" width="24%">
</p>

*Los datos de las capturas son de ejemplo.*

Tecnología: React 19 + TypeScript + Vite + Tailwind, y Firebase (Authentication, Firestore y Hosting).

---

## Instalación

Necesitas **Node.js 20 o superior**, **Git** y una **cuenta de Google**. No hace falta tarjeta: todo cabe en el plan gratuito de Firebase (Spark) para uso doméstico.

<details>
<summary>Instalar Node y Git</summary>

**Windows** (PowerShell): `winget install OpenJS.NodeJS.LTS` y `winget install Git.Git`; cierra y vuelve a abrir la terminal. Sin `winget`, usa los instaladores de <https://nodejs.org> y <https://git-scm.com>.
**macOS**: `brew install node git`. **Linux**: `nodejs` (v20+), `npm` y `git` con el gestor de tu distribución.
Comprueba con `node --version` (v20 o superior).

</details>

Los comandos son idénticos en Windows (PowerShell), macOS y Linux:

```sh
git clone https://github.com/nithreel/cocinin.git
cd cocinin
npm install
npm run setup
```

El asistente te pide un **id de proyecto** (será tu dirección: `https://<id>.web.app`, único en todo Firebase), crea el proyecto, la base de datos y las reglas de seguridad, y despliega la web. Te guía en el único paso manual: activar *Correo electrónico/contraseña* en Authentication (1 minuto).

Al terminar, abre tu URL: mientras no exista ningún usuario, el login muestra **Crear usuario**, y el primero que se crea es el **administrador**.

> ⚠️ **Crea tu usuario nada más desplegar.** Hasta entonces, cualquiera que conozca la URL podría registrarse como administrador.

<details>
<summary>Instalación manual, sin el asistente</summary>

1. Crea el proyecto en <https://console.firebase.google.com> (su id será tu URL).
2. **Authentication** → activa **Email/Password**. **Firestore Database** → crear en modo producción, región europea.
3. Configuración del proyecto → *Your apps* → icono `</>` para registrar la app web y copiar `firebaseConfig`.
4. `npm install`, copia `.env.example` a `.env` y `.firebaserc.example` a `.firebaserc` (`copy` en Windows, `cp` en macOS/Linux) y rellénalos con esos valores y tu id.
5. `npx firebase login` y `npm run deploy`.
6. Abre `https://<id>.web.app` y crea enseguida el primer usuario.

</details>

---

## Uso diario

| Acción | Cómo |
| --- | --- |
| Añadir ingrediente | Despensa → «+ Ingrediente». Nace disponible (ON). |
| Agotado / disponible / congelado | Interruptor a la derecha del ingrediente; el copo de nieve lo marca como congelado (cuenta como disponible). |
| Caducidad, cantidad, editar o eliminar | Toca el ingrediente: fechas, cantidad (texto libre, p. ej. «500 g») y botones **Editar** y **Eliminar**. |
| Buscar | El buscador de la Despensa filtra por ingrediente **o por grupo**. |
| Comprar | Lista → «Añadir a la lista» en lo que falta → marca lo comprado → «Confirmar compra». |
| Receta nueva | Recetario → «+ Receta», o **Importar** para pegar un JSON con una o varias recetas (vista previa y «Deshacer importación»). |
| Usuarios y copia de seguridad | **Usuarios** (solo administrador) da de alta y quita personas. **Descargar copia de seguridad** está al final de Despensa y Recetario, para cualquiera. |
| Olvidé la contraseña | Login → «¿Has olvidado la contraseña?» |

---

## Usuarios y seguridad

- Es **miembro** quien tiene un documento `users/{uid}`; las reglas (`firestore.rules`) solo dejan leer y escribir a los miembros. **Solo el admin** (el primero creado) da de alta o quita acceso a otros.
- «Quitar acceso» bloquea al usuario en la app; su cuenta sigue en Authentication y puede borrarse en la consola.
- La configuración web de Firebase (`VITE_FIREBASE_*`) **no es secreta**: la protección real son las reglas de Firestore. Aun así, `.env` no se sube a git.
- **Un proyecto de Firebase por casa**: no compartas proyecto entre casas distintas, se mezclarían los datos.

---

## Avisos en el móvil (opcional)

La app funciona completa sin esto. Si quieres notificaciones (algo se ha gastado, compra hecha, algo va a caducar…), hace falta un servicio pequeño en una máquina tuya siempre encendida con Docker, por ejemplo una Raspberry Pi. Firebase gratis no puede enviarlas por sí solo. Coste: 0 €.

Avisa de: elemento gastado, varios añadidos a la lista, compra hecha, receta nueva, usuario nuevo y caducidad próxima. Cada persona elige cuáles quiere en la campana de la app, y nunca se avisa a quien provoca el cambio.

**Instalación**
1. Descarga la clave de tu proyecto: consola de Firebase → Configuración del proyecto → Cuentas de servicio → *Generar nueva clave privada*, y guárdala como `notifier/secrets/service-account.json` (no la subas ni la compartas).
2. Ejecuta `cd notifier && ./instalar.sh` (en esa máquina) o `./instalar.sh usuario@host` (por ssh). El script hace el resto; si cambia `.env`, ejecuta después `npm run deploy`.
3. En cada móvil: campana → **Activar**. En iPhone, antes añade la app a la pantalla de inicio.

Si la máquina está apagada, los avisos de ese rato se pierden. Más detalles en [`notifier/README.md`](notifier/README.md).

---

## Actualizar y mantener

Cuando haya cambios en este repositorio, tu copia no se actualiza sola. Desde la carpeta `cocinin`:

```sh
git pull
npm install
npm run deploy
```

Tu `.env` y `.firebaserc` no se tocan, así que sigues con tu proyecto y tus datos. La app instalada puede enseñar la versión anterior hasta que la cierres y abras una o dos veces (en el navegador, `Ctrl+Shift+R`). Si `git pull` se queja de cambios locales, guárdalos con `git stash`, haz el `pull` y recupéralos con `git stash pop`.

- Solo las reglas: `npm run deploy:rules`.
- **Sin conexión**: la app guarda una copia local y sincroniza al volver la cobertura.
- **Copia de seguridad**: descárgala de vez en cuando desde Despensa o Recetario.
- **Dominio propio**: Firebase Console → Hosting → *Add custom domain*.
- Límites del plan gratuito (Spark): 50 000 lecturas y 20 000 escrituras al día en Firestore; de sobra para una casa.

<details>
<summary>Problemas frecuentes</summary>

| Síntoma | Solución |
| --- | --- |
| «Falta la configuración de Firebase» | No hay `.env`: ejecuta `npm run setup` o copia `.env.example` y rellénalo. |
| El login pide activar el acceso por correo | Authentication → Sign-in method → habilita Email/Password. |
| «Las reglas de Firestore no están desplegadas» o 403 | `npm run deploy:rules`. |
| «Tu cuenta no tiene acceso a esta cocina» | Que el admin la dé de alta desde **Usuarios**. |
| El id de proyecto se rechaza | Los ids son únicos en todo Firebase; prueba otro. |
| `firebase: command not found` | Usa `npx firebase …`. |
| Windows: «la ejecución de scripts está deshabilitada» | Una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o usa cmd. |
| No veo los cambios tras desplegar | Caché de la PWA: cierra y abre la app, o `Ctrl+Shift+R`. |

</details>

---

## Desarrollo

```sh
npm run dev      # servidor local con recarga (usa tu .env, es decir, tus datos reales)
npm run lint     # oxlint
npm run build    # tsc + vite build
npm test         # pruebas unitarias (caducidades, agrupación)
npm run test:rules  # pruebas de las reglas de seguridad (emulador, Java 21+)
```

Cada `push` y cada pull request pasan por GitHub Actions (`.github/workflows/ci.yml`): lint, compilación y las dos baterías de pruebas.

Para desarrollar **sin tocar datos reales** puedes usar los emuladores de Firebase (necesitan Java 21+; en Windows: `winget install EclipseAdoptium.Temurin.21.JDK`):

```sh
npm run emulators                              # Auth :9099 y Firestore :8089, en otra terminal
```

Y en otra terminal, arranca la app apuntando a ellos:

```sh
# macOS / Linux
VITE_USE_EMULATORS=true npm run dev

# Windows (PowerShell)
$env:VITE_USE_EMULATORS="true"; npm run dev
```

Los emuladores empiezan vacíos: en el login aparecerá «Crear usuario» para crear el administrador local.

Estructura:

```
src/auth/            login, sesión y rutas protegidas (roles admin / member)
src/features/        pantry (despensa), shopping-list, recipes, users
src/lib/             tipos y colecciones de Firestore, datos en vivo, caducidades
src/components/      layout y piezas comunes (menús, buscador, borrado con confirmación)
tests/               unit/ (lógica pura) y rules/ (reglas de Firestore con emulador)
scripts/setup.mjs    asistente de instalación (npm run setup)
firestore.rules      reglas de acceso
```

## Licencia

MIT. Ver `LICENSE`.
