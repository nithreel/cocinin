import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'
import { BASE_URL, CHROME_PATH } from './config'

// HOME falso para el navegador: no toca la configuración real de nadie (run.mjs lo crea y lo borra; suelto, se crea aquí)
const home = process.env.E2E_HOME ?? mkdtempSync(join(process.env.E2E_TMP ?? tmpdir(), 'cocinin-e2e-home-'))
for (const d of ['.config', '.cache', '.local/share']) mkdirSync(join(home, d), { recursive: true })

// Chromium crea un socket en TMPDIR y el límite de la ruta es ~107 caracteres: con un TMPDIR largo no arranca
const shortTmp = tmpdir().length > 40 ? '/tmp' : tmpdir()

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.ts',
  fullyParallel: false,
  workers: 1, // un solo emulador compartido: los tests se ejecutan uno tras otro
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: join(process.env.E2E_TMP ?? tmpdir(), 'cocinin-e2e-results'),
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: CHROME_PATH, // Chromium del sistema: no se descarga ningún navegador
      env: { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_CACHE_HOME: join(home, '.cache'), XDG_DATA_HOME: join(home, '.local/share'), TMPDIR: shortTmp } as Record<string, string>,
    },
  },
})
