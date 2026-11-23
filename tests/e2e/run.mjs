#!/usr/bin/env node
// Un solo comando: levanta emuladores de Firebase y el servidor de desarrollo, ejecuta los tests de navegador y lo apaga todo.
//   npm run test:e2e            (todo)
//   npm run test:e2e -- recetario   (solo los ficheros cuyo nombre contenga «recetario»; admite más argumentos de Playwright, p. ej. -g "tema")
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PROJECT = 'demo-cocinin-e2e'
const AUTH = 9099
const FIRESTORE = 8089
const WEB = Number(process.env.E2E_WEB_PORT ?? 5199)

const children = []
function start(cmd, args, opts = {}) {
  // detached: el hijo lidera su propio grupo y se mata entero (incluido el Java del emulador) por PID de grupo
  const child = spawn(cmd, args, { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts })
  children.push(child)
  return child
}
function killAll() {
  for (const c of children) {
    if (c.exitCode === null && c.pid) {
      try {
        process.kill(-c.pid, 'SIGTERM')
      } catch {}
    }
  }
}
process.on('SIGINT', () => (killAll(), process.exit(130)))
process.on('SIGTERM', () => (killAll(), process.exit(143)))

const portInUse = (port) =>
  new Promise((res) => {
    const s = net.connect(port, '127.0.0.1')
    s.once('connect', () => (s.destroy(), res(true)))
    s.once('error', () => res(false))
  })
async function waitPort(port, label, ms = 120_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await portInUse(port)) return
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`${label} no arrancó en ${ms / 1000} s`)
}

async function main() {
  for (const [p, n] of [[AUTH, 'Auth (9099)'], [FIRESTORE, 'Firestore (8089)'], [WEB, `servidor web (${WEB})`]]) {
    if (await portInUse(p)) throw new Error(`El puerto de ${n} ya está ocupado (¿tienes los emuladores o «npm run dev» abiertos?). Ciérralos y repite.`)
  }

  console.log('> Emuladores de Firebase (proyecto demo, sin red)…')
  const emu = start('mise', ['exec', 'java@temurin-21', '--', 'npx', 'firebase', 'emulators:start', '--only', 'auth,firestore', '--project', PROJECT])
  let emuLog = ''
  emu.stdout.on('data', (d) => (emuLog += d))
  emu.stderr.on('data', (d) => (emuLog += d))
  emu.on('exit', (code) => code && console.error('Emulador terminó con código', code, emuLog.slice(-1500)))

  console.log('> Servidor de desarrollo (Vite, apuntando a los emuladores)…')
  const vite = start('npx', ['vite', '--host', '127.0.0.1', '--port', String(WEB), '--strictPort'], {
    // las variables de proceso mandan sobre .env: así NUNCA se usa el Firebase real
    env: {
      ...process.env,
      VITE_USE_EMULATORS: 'true',
      VITE_FIREBASE_API_KEY: 'fake-e2e-key',
      VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
      VITE_FIREBASE_PROJECT_ID: PROJECT,
      VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT}.appspot.com`,
      VITE_FIREBASE_MESSAGING_SENDER_ID: '0',
      VITE_FIREBASE_APP_ID: '1:0:web:e2e',
      VITE_VAPID_PUBLIC_KEY: '',
      VITE_DISABLE_UPDATE_CHECK: 'true',
    },
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d))
  vite.stderr.on('data', (d) => (viteLog += d))

  // HOME falso para el navegador (se borra al terminar)
  const home = mkdtempSync(join(process.env.E2E_TMP ?? tmpdir(), 'cocinin-e2e-home-'))
  for (const d of ['.config', '.cache', '.local/share']) mkdirSync(join(home, d), { recursive: true })

  let code = 1
  try {
    await Promise.all([waitPort(AUTH, 'Auth'), waitPort(FIRESTORE, 'Firestore'), waitPort(WEB, 'Vite')])
    console.log('> Ejecutando tests…\n')
    const filters = process.argv.slice(2)
    const test = spawn('npx', ['playwright', 'test', '-c', 'tests/e2e/playwright.config.ts', ...filters], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, E2E_HOME: home },
    })
    code = await new Promise((res) => test.on('exit', (c) => res(c ?? 1)))
  } catch (e) {
    console.error(String(e))
    console.error('--- emulador ---\n' + emuLog.slice(-1500) + '\n--- vite ---\n' + viteLog.slice(-1500))
  } finally {
    killAll()
    rmSync(home, { recursive: true, force: true })
  }
  // da un momento a que mueran los grupos
  await new Promise((r) => setTimeout(r, 800))
  process.exit(code)
}
main().catch((e) => (console.error(e.message), killAll(), process.exit(1)))
