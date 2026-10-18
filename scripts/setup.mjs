#!/usr/bin/env node
// Instalador de CocinIN: crea (o reutiliza) tu proyecto Firebase, genera .env y
// .firebaserc, activa Firestore, guía el alta de Auth y despliega reglas y web.
// Uso: npm install && npm run setup
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'

// Todo se ejecuta con el propio Node (sin npx ni shell): así funciona igual en Windows, macOS y Linux.
const require = createRequire(import.meta.url)
const FIREBASE_BIN = join(dirname(require.resolve('firebase-tools/package.json')), 'lib', 'bin', 'firebase.js')

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = async (q, def = '') => ((await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim() || def)
const log = (m) => console.log(`\n▸ ${m}`)

function fb(args, { inherit = false, project } = {}) {
  const full = [FIREBASE_BIN, ...args, ...(project ? ['--project', project] : [])]
  const r = spawnSync(process.execPath, full, { encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe' })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

function fail(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

// 1. Sesión de Firebase
log('Comprobando sesión de Firebase…')
if (!/Logged in as/.test(fb(['login:list']).out)) {
  console.log('Se abrirá el navegador para que inicies sesión con tu cuenta de Google.')
  if (!fb(['login'], { inherit: true }).ok) fail('No se pudo iniciar sesión en Firebase.')
}

// 2. Proyecto
log('Proyecto Firebase')
console.log('El id del proyecto decide tu URL: https://<id>.web.app (debe ser único en todo Firebase).')
let projectId
for (;;) {
  projectId = (await ask('Id del proyecto (minúsculas, números y guiones, p. ej. cocinin-maria)')).toLowerCase()
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
    console.log('Id no válido: 6-30 caracteres, empieza por letra.')
    continue
  }
  const list = fb(['projects:list', '--json']).out
  if (list.includes(`"projectId": "${projectId}"`) || list.includes(`"projectId":"${projectId}"`)) {
    console.log('Ya tienes ese proyecto: lo reutilizo.')
    break
  }
  const created = fb(['projects:create', projectId, '--display-name', 'CocinIN'])
  if (created.ok) break
  // la lista de proyectos puede ir con retraso: si podemos consultar sus apps, el proyecto es nuestro
  if (/already/i.test(created.out) && fb(['apps:list', 'WEB', '--json'], { project: projectId }).ok) {
    console.log('Ya tienes ese proyecto: lo reutilizo.')
    break
  }
  // el mensaje de la CLI es genérico: la causa real está en firebase-debug.log
  let debugLog = ''
  try {
    debugLog = readFileSync('firebase-debug.log', 'utf8')
  } catch {}
  if (/accept Terms of Service/i.test(created.out + debugLog.split('\n').slice(-40).join('\n'))) {
    // los términos solo los puede aceptar la persona: abrimos la página y esperamos
    console.log('Falta aceptar los términos de Google Cloud con esta cuenta (solo se hace una vez).')
    console.log('Se abre https://console.cloud.google.com : acepta los términos que te salgan y vuelve aquí.')
    const open = process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', ''] : ['xdg-open']
    spawnSync(open[0], [...open.slice(1), 'https://console.cloud.google.com/'], { stdio: 'ignore' })
    await ask('Pulsa Enter cuando los hayas aceptado para reintentarlo')
    const retry = fb(['projects:create', projectId, '--display-name', 'CocinIN'])
    if (retry.ok) break
  }
  if (/add Firebase to Google Cloud/i.test(created.out)) {
    // el proyecto de Cloud ya existe; falta aceptar los términos de Firebase para activarlo
    console.log('El proyecto se creó en Google Cloud, pero falta aceptar los términos de Firebase con esta cuenta.')
    console.log('Se abre https://console.firebase.google.com : acepta los términos (crear un proyecto de prueba también vale) y vuelve aquí.')
    const open = process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', ''] : ['xdg-open']
    spawnSync(open[0], [...open.slice(1), 'https://console.firebase.google.com/'], { stdio: 'ignore' })
    await ask('Pulsa Enter cuando los hayas aceptado para reintentarlo')
    if (fb(['projects:addfirebase', projectId]).ok) break
  }
  console.log(`No se pudo crear (${created.out.split('\n').find((l) => /Error|already/i.test(l)) ?? 'id ocupado'}). Detalle en firebase-debug.log. Prueba con otro id.`)
}

writeFileSync('.firebaserc', JSON.stringify({ projects: { default: projectId } }, null, 2) + '\n')

// 3. App web + .env
log('Registrando la app web y generando .env…')
const apps = JSON.parse(fb(['apps:list', 'WEB', '--json'], { project: projectId }).out.match(/\{[\s\S]*\}/)?.[0] ?? '{"result":[]}')
let appId = apps.result?.[0]?.appId
if (!appId) {
  const made = fb(['apps:create', 'WEB', 'CocinIN', '--json'], { project: projectId })
  appId = JSON.parse(made.out.match(/\{[\s\S]*\}/)?.[0] ?? '{}').result?.appId
}
if (!appId) fail('No se pudo registrar la app web.')
const sdk = fb(['apps:sdkconfig', 'WEB', appId, '--json'], { project: projectId }).out
const cfg = JSON.parse(sdk.match(/\{[\s\S]*\}/)?.[0] ?? '{}').result?.sdkConfig
if (!cfg?.apiKey) fail('No se pudo leer la configuración web.')
writeFileSync(
  '.env',
  [
    `VITE_FIREBASE_API_KEY=${cfg.apiKey}`,
    `VITE_FIREBASE_AUTH_DOMAIN=${cfg.authDomain}`,
    `VITE_FIREBASE_PROJECT_ID=${cfg.projectId}`,
    `VITE_FIREBASE_STORAGE_BUCKET=${cfg.storageBucket ?? ''}`,
    `VITE_FIREBASE_MESSAGING_SENDER_ID=${cfg.messagingSenderId}`,
    `VITE_FIREBASE_APP_ID=${cfg.appId}`,
    '',
  ].join('\n'),
)

// La API de Firestore se activa con la sesión de la CLI. Si algo falla, se avisa y se sigue en manual.
async function googleHeaders() {
  // configstore guarda la sesión en %APPDATA% (Windows) o en ~/.config (Linux/macOS)
  const bases = [process.env.APPDATA, process.env.XDG_CONFIG_HOME, join(homedir(), '.config')].filter(Boolean)
  const file = bases.map((b) => join(b, 'configstore', 'firebase-tools.json')).find((f) => existsSync(f))
  if (!file) throw new Error('sin sesión de la CLI')
  const refresh = JSON.parse(readFileSync(file, 'utf8')).tokens?.refresh_token
  const api = require('firebase-tools/lib/api.js')
  const tok = await (
    await fetch('https://www.googleapis.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh, client_id: api.clientId(), client_secret: api.clientSecret() }),
    })
  ).json()
  if (!tok.access_token) throw new Error('no se pudo renovar la sesión')
  return { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json', 'x-goog-user-project': projectId }
}

async function enableApi(headers, service) {
  const r = await fetch(`https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${service}:enable`, { method: 'POST', headers, body: '{}' })
  return r.ok
}

let headers = null
try {
  headers = await googleHeaders()
} catch {
  headers = null
}

// 4. Firestore
log('Activando Firestore…')
if (headers) await enableApi(headers, 'firestore.googleapis.com')
let db = { ok: false, out: '' }
for (let intento = 0; intento < 8; intento++) {
  db = fb(['firestore:databases:create', '(default)', '--location', 'eur3'], { project: projectId })
  // la API tarda unos segundos en propagarse tras activarse
  if (db.ok || /already exists/i.test(db.out) || !/has not been used|disabled|not enabled/i.test(db.out)) break
  await new Promise((r) => setTimeout(r, 8000))
}
if (!db.ok && !/already exists/i.test(db.out)) {
  console.log(`No se pudo crear la base de datos automáticamente:\n${db.out.trim().split('\n').slice(-3).join('\n')}`)
  console.log(`Créala a mano en https://console.firebase.google.com/project/${projectId}/firestore (modo producción) y pulsa Enter.`)
  await ask('')
}

// 5. Auth con correo/contraseña
// La API que lo activa (Identity Platform) exige plan de pago, así que en el plan gratuito
// es el único paso que debe hacerse a mano en la consola: un clic.
log('Activar el acceso con correo y contraseña (paso manual, 1 minuto)')
console.log(`  1. Abre https://console.firebase.google.com/project/${projectId}/authentication`)
console.log('  2. Pulsa «Comenzar» (Get started).')
console.log('  3. En «Correo electrónico/contraseña» pulsa Habilitar y Guardar.')
await ask('Pulsa Enter cuando esté hecho')

// 6. Despliegue
rl.close()
log('Compilando y desplegando…')
const npm = process.env.npm_execpath // definido al lanzar con `npm run setup`
const steps = [
  npm ? [process.execPath, [npm, 'run', 'build']] : ['npm', ['run', 'build'], { shell: true }],
  [process.execPath, [FIREBASE_BIN, 'deploy', '--only', 'firestore:rules,hosting', '--project', projectId]],
]
for (const [cmd, args, opts] of steps) {
  if (spawnSync(cmd, args, { stdio: 'inherit', ...opts }).status !== 0) fail('Falló el paso de compilar o desplegar (mira el error de arriba).')
}

console.log(`\n✔ Listo. Abre https://${projectId}.web.app y crea el primer usuario: será el administrador.`)
