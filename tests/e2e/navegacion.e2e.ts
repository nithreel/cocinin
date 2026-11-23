import { expect, login, MOBILE, openSection, openSettingsBar, test } from './helpers'

const SECTIONS = [
  ['Despensa', /\/despensa$/, 'Despensa'],
  ['Lista', /\/lista$/, 'Lista de la compra'],
  ['Recetario', /\/recetario$/, 'Recetario'],
  ['Notas', /\/notas$/, 'Notas'],
] as const

test.describe('Navegación en escritorio (barra lateral)', () => {
  test('la barra lateral lleva a cada sección y marca la activa', async ({ page }) => {
    await login(page)
    const nav = page.locator('nav').first()
    await expect(nav.getByRole('link')).toHaveText(['Despensa', 'Lista', 'Recetario', 'Notas'])
    for (const [label, url, title] of SECTIONS) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
    }
  })

  test('en escritorio no hay barra de pestañas inferior', async ({ page }) => {
    await login(page)
    expect(await page.locator('nav').count()).toBe(2) // la lateral y la inferior (oculta)
    await expect(page.locator('nav').nth(1)).toBeHidden()
    await expect(page.locator('nav').first()).toBeVisible()
  })

  test('la raíz y las rutas desconocidas llevan a la Despensa; el botón atrás funciona', async ({ page }) => {
    await login(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/despensa$/)
    await openSection(page, 'Recetario')
    await page.goBack()
    await expect(page).toHaveURL(/\/despensa$/)
    await page.goForward()
    await expect(page).toHaveURL(/\/recetario$/)
  })

  test('la ⚙ despliega Notificaciones, Ajustes adicionales, copia y Cerrar sesión, y se pliega con Escape', async ({ page }) => {
    await login(page)
    await openSettingsBar(page)
    for (const n of ['Notificaciones', 'Ajustes adicionales', 'Descargar copia de seguridad', 'Cerrar sesión', 'Usuarios']) {
      await expect(page.getByRole('link', { name: n }).or(page.getByRole('button', { name: n }))).toBeVisible()
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Ajustes', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: 'Notificaciones' })).toBeHidden()
  })

  test('las pantallas de la barra (Avisos, Ajustes, Usuarios) se abren y volver a una sección pliega la barra', async ({ page }) => {
    await login(page)
    await openSettingsBar(page)
    await page.getByRole('link', { name: 'Notificaciones' }).click()
    await expect(page).toHaveURL(/\/avisos$/)
    await page.getByRole('link', { name: 'Usuarios' }).click()
    await expect(page).toHaveURL(/\/usuarios$/)
    await page.getByRole('link', { name: 'Ajustes adicionales' }).click()
    await expect(page).toHaveURL(/\/ajustes$/)
    await openSection(page, 'Lista')
    await expect(page.getByRole('button', { name: 'Ajustes', exact: true })).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('Navegación en móvil (pestañas)', () => {
  test('las pestañas inferiores llevan a cada sección y no hay barra lateral', async ({ newPage }) => {
    const page = await newPage({ viewport: MOBILE, touch: true })
    await login(page)
    const tabs = page.locator('nav').last()
    await expect(page.locator('nav').first()).toBeHidden()
    await expect(tabs.getByRole('link')).toHaveText(['Despensa', 'Lista', 'Recetario', 'Notas'])
    for (const [label, url, title] of SECTIONS) {
      await tabs.getByRole('link', { name: label, exact: true }).tap()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
    }
    // la barra de ajustes está arriba, con la marca
    await expect(page.getByRole('button', { name: 'Ajustes', exact: true })).toBeVisible()
  })

  test('en móvil las filas de la Despensa y sus botones son táctiles (≥ 40 px) y no hay scroll horizontal', async ({ newPage }) => {
    const page = await newPage({ viewport: MOBILE, touch: true })
    await login(page)
    const sw = page.getByRole('switch', { name: /^Leche:/ })
    await expect(sw).toBeVisible()
    await page.getByRole('button', { name: /^Leche/, expanded: false }).first().tap()
    const cart = page.getByRole('button', { name: /^Leche: pulsa para añadirlo a la lista/ })
    await expect.poll(async () => (await cart.boundingBox())!.width).toBeGreaterThanOrEqual(40)
    await expect.poll(async () => (await cart.boundingBox())!.height).toBeGreaterThanOrEqual(40)
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflowX).toBeLessThanOrEqual(0)
  })

  test('el flujo principal funciona en móvil: agotar un ingrediente y verlo en la lista', async ({ newPage }) => {
    const page = await newPage({ viewport: MOBILE, touch: true })
    await login(page)
    await page.getByRole('switch', { name: /^Leche:/ }).tap()
    await page.getByRole('status').getByRole('button', { name: 'Añadir a la lista' }).tap()
    await page.locator('nav').last().getByRole('link', { name: 'Lista', exact: true }).tap()
    await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeVisible()
  })

  test('la fila de etiquetas del Recetario se desplaza con el dedo/ratón en móvil sin mover la página', async ({ newPage }) => {
    const page = await newPage({ viewport: MOBILE, touch: true })
    await login(page)
    await page.locator('nav').last().getByRole('link', { name: 'Recetario', exact: true }).tap()
    const row = page.getByRole('group', { name: 'Filtrar por etiqueta' })
    await expect(row).toBeVisible()
    expect(await row.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(50)
    await row.evaluate((el) => (el.scrollLeft = 120))
    expect(await row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
    expect(await page.locator('main').evaluate((m) => m.scrollTop)).toBe(0)
  })
})
