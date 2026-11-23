/* oxlint-disable react-hooks/rules-of-hooks, no-empty-pattern -- `use` y `{}` son la API de fixtures de Playwright, no React */
import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { ADMIN, BASE_URL } from './config'
import { resetAndSeed } from './seed'

export { expect }

export const DESKTOP = { width: 1280, height: 800 }
export const MOBILE = { width: 390, height: 780 }

type PageOpts = { viewport?: { width: number; height: number }; colorScheme?: 'light' | 'dark'; reducedMotion?: 'reduce' | 'no-preference'; touch?: boolean }

/** Contexto nuevo (sin almacenamiento previo). La red solo sale a localhost: lo demás (Firebase real, GitHub…) se aborta y se anota. */
async function openContext(browser: Browser, blocked: string[], opts: PageOpts = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? DESKTOP,
    colorScheme: opts.colorScheme ?? 'light',
    reducedMotion: opts.reducedMotion ?? 'reduce', // animaciones reducidas por defecto: tests más rápidos y estables
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    hasTouch: opts.touch,
    isMobile: opts.touch,
    acceptDownloads: true,
  })
  await ctx.route('**/*', (route) => {
    const url = route.request().url()
    if (/^(http:\/\/(127\.0\.0\.1|localhost)[:/]|data:|blob:)/.test(url)) return route.continue()
    blocked.push(url)
    return route.abort()
  })
  return ctx
}

export const test = base.extend<{ seeded: void; blocked: string[]; knownErrors: RegExp[]; newPage: (opts?: PageOpts) => Promise<Page> }>({
  // Datos de prueba nuevos antes de cada test (los emuladores se comparten: se corre con un solo worker).
  // Es un fixture automático y NO un `test.beforeEach` en este módulo: un hook declarado aquí solo se aplicaría al
  // primer fichero que lo importe (los demás ficheros arrastrarían los datos de los tests anteriores).
  seeded: [
    async ({}, use) => {
      await resetAndSeed()
      await use()
    },
    { auto: true },
  ],
  blocked: [
    async ({}, use) => {
      const blocked: string[] = []
      await use(blocked)
      expect(blocked, 'peticiones a servidores externos (bloqueadas)').toEqual([])
    },
    { auto: true },
  ],
  /** errores de página ya documentados en BUGS.md que un test concreto tolera */
  knownErrors: async ({}, use) => use([]),
  // `context` y `page` de Playwright, pero con la red acotada y el mismo contexto base que `newPage`
  context: async ({ browser, blocked, seeded }, use) => {
    void seeded // el contexto (y el login de los beforeEach) se crea después de sembrar
    const ctx = await openContext(browser, blocked)
    await use(ctx)
    await ctx.close()
  },
  page: async ({ context, knownErrors }, use) => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await use(page)
    expect(errors.filter((e) => !knownErrors.some((k) => k.test(e))), 'errores de JavaScript sin capturar en la página').toEqual([])
  },
  // para tests que necesitan otro tamaño, otro tema o varias sesiones a la vez
  newPage: async ({ browser, blocked, seeded }, use) => {
    void seeded
    const ctxs: BrowserContext[] = []
    await use(async (opts) => {
      const ctx = await openContext(browser, blocked, opts)
      ctxs.push(ctx)
      return ctx.newPage()
    })
    await Promise.all(ctxs.map((c) => c.close()))
  },
})

/** Inicia sesión por la pantalla de login y espera a ver la Despensa con sus datos. */
export async function login(page: Page, who: { email: string; password: string } = ADMIN) {
  await page.goto(BASE_URL + '/login')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(who.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Despensa' })).toBeVisible()
  // la cabecera sale antes que los datos: se espera a ver el primer ingrediente (si no, el test corre con la lista aún vacía)
  await expect(page.getByRole('switch').first()).toBeVisible()
}

/** Abre una sección con el enlace de la barra (lateral en escritorio, inferior en móvil). */
export async function openSection(page: Page, name: 'Despensa' | 'Lista' | 'Recetario' | 'Notas') {
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { name: name === 'Lista' ? 'Lista de la compra' : name })).toBeVisible()
}

/** Despliega la barra de ajustes (la ⚙). */
export async function openSettingsBar(page: Page) {
  const gear = page.getByRole('button', { name: 'Ajustes', exact: true })
  if (await gear.isVisible()) await gear.click()
  await expect(page.getByRole('link', { name: 'Notificaciones' })).toBeVisible()
}

/** Ajustes adicionales (tema, animaciones…). */
export async function openSettings(page: Page) {
  await openSettingsBar(page)
  await page.getByRole('link', { name: 'Ajustes adicionales' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
}

/** Scroll vertical de <main> (quien hace scroll en la app es <main>, no la ventana). */
export const mainScrollTop = (page: Page) => page.locator('main').evaluate((m) => m.scrollTop)
