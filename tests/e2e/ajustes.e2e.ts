import type { Page } from '@playwright/test'
import { ADMIN, MEMBER } from './config'
import { expect, login, openSettings, test } from './helpers'

const html = (page: Page) => page.locator('html')
const radio = (page: Page, group: 'Tema' | 'Animaciones', name: string) => page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: new RegExp(`^${name}`) })

test.describe('Ajustes: tema', () => {
  test('Claro y Oscuro aplican data-theme en <html> y se recuerdan al recargar', async ({ page }) => {
    await login(page)
    await openSettings(page)
    await expect(html(page)).toHaveAttribute('data-theme', 'light') // el navegador de prueba va en claro
    await radio(page, 'Tema', 'Oscuro').check()
    await expect(html(page)).toHaveAttribute('data-theme', 'dark')
    await expect(radio(page, 'Tema', 'Oscuro')).toBeChecked()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
    await expect(html(page)).toHaveAttribute('data-theme', 'dark')
    await expect(radio(page, 'Tema', 'Oscuro')).toBeChecked()
    await radio(page, 'Tema', 'Claro').check()
    await expect(html(page)).toHaveAttribute('data-theme', 'light')
  })

  test('«Como el sistema» sigue al modo claro/oscuro del navegador, también en directo', async ({ newPage }) => {
    const page = await newPage({ colorScheme: 'dark' })
    await login(page)
    await expect(html(page)).toHaveAttribute('data-theme', 'dark') // por defecto, el del sistema
    await openSettings(page)
    await expect(radio(page, 'Tema', 'Como el sistema')).toBeChecked()
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(html(page)).toHaveAttribute('data-theme', 'light')
    await radio(page, 'Tema', 'Oscuro').check() // forzar oscuro ignora el sistema
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  })

  test('el tema oscuro pinta el fondo oscuro', async ({ page }) => {
    await login(page)
    await openSettings(page)
    const bg = () => page.locator('body').evaluate((b) => getComputedStyle(b).backgroundColor)
    const light = await bg()
    await radio(page, 'Tema', 'Oscuro').check()
    await expect.poll(bg).not.toBe(light)
  })
})

test.describe('Ajustes: animaciones', () => {
  test('Reducidas / Completas / Como el sistema ponen o quitan data-reduce-motion', async ({ newPage }) => {
    const page = await newPage({ reducedMotion: 'no-preference' })
    await login(page)
    await openSettings(page)
    await expect(html(page)).not.toHaveAttribute('data-reduce-motion', /.*/)
    await expect(page.getByText('Ahora: completas')).toBeVisible()
    await radio(page, 'Animaciones', 'Reducidas').check()
    await expect(html(page)).toHaveAttribute('data-reduce-motion', '')
    await page.reload()
    await expect(html(page)).toHaveAttribute('data-reduce-motion', '') // se recuerda
    await radio(page, 'Animaciones', 'Completas').check()
    await expect(html(page)).not.toHaveAttribute('data-reduce-motion', /.*/)
    await radio(page, 'Animaciones', 'Como el sistema').check()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(html(page)).toHaveAttribute('data-reduce-motion', '')
    await expect(page.getByText('Ahora: reducidas')).toBeVisible()
    await radio(page, 'Animaciones', 'Completas').check() // forzar completas aunque el sistema pida reducir
    await expect(html(page)).not.toHaveAttribute('data-reduce-motion', /.*/)
  })
})

test.describe('Ajustes: cuenta y versión', () => {
  test('muestra la versión y descarga la copia de seguridad (JSON con los datos)', async ({ page }) => {
    await login(page)
    await openSettings(page)
    await expect(page.getByText(/^v\d+\.\d+\.\d+/)).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar', exact: true }).click()])
    expect(download.suggestedFilename()).toMatch(/^cocinin-copia-\d{4}-\d{2}-\d{2}\.json$/)
    const path = await download.path()
    const data = JSON.parse((await import('node:fs')).readFileSync(path, 'utf8'))
    expect(data.ingredients).toHaveLength(9)
    expect(data.recipes).toHaveLength(15)
    expect(data.users).toHaveLength(2) // el admin incluye usuarios; la copia de un miembro no
  })

  test('un miembro no ve la restauración de copia y su copia no lleva usuarios', async ({ page }) => {
    await login(page, MEMBER)
    await openSettings(page)
    await expect(page.getByText('Restaurar')).toHaveCount(0)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar', exact: true }).click()])
    const data = JSON.parse((await import('node:fs')).readFileSync((await download.path())!, 'utf8'))
    expect(data.users).toBeUndefined()
  })

  test('cambiar la contraseña: error con la actual incorrecta', async ({ page }) => {
    await login(page)
    await openSettings(page)
    await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
    await page.getByLabel('Contraseña actual').fill('incorrecta-1')
    await page.getByLabel('Contraseña nueva').fill('nueva-clave-1')
    await page.getByRole('button', { name: /^(Guardar|Cambiar contraseña)$/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible()
  })
})

test.describe('Saludo de la barra lateral según la hora', () => {
  const at = async (page: Page, hhmm: string, who = ADMIN) => {
    await page.clock.setFixedTime(new Date(`2026-11-23T${hhmm}:00+01:00`)) // hora de Madrid (CET)
    await login(page, who)
  }
  const greeting = (page: Page) => page.locator('nav p').filter({ hasText: /^¡Buen/ })

  for (const [hhmm, text] of [
    ['08:30', '¡Buenos días, Marta!'],
    ['15:00', '¡Buenas tardes, Marta!'],
    ['22:15', '¡Buenas noches, Marta!'],
  ] as const) {
    test(`a las ${hhmm}: ${text}`, async ({ page }) => {
      await at(page, hhmm)
      await expect(greeting(page)).toHaveText(text)
      await expect(greeting(page).locator('strong')).toHaveText('Marta') // el alias va en negrita
    })
  }

  test('los límites: 05:59 noches, 06:00 días, 11:59 días, 12:00 tardes, 19:59 tardes, 20:00 noches', async ({ page }) => {
    const expected: Record<string, string> = { '05:59': 'Buenas noches', '06:00': 'Buenos días', '11:59': 'Buenos días', '12:00': 'Buenas tardes', '19:59': 'Buenas tardes', '20:00': 'Buenas noches' }
    await at(page, '05:59')
    for (const [hhmm, base] of Object.entries(expected)) {
      await page.clock.setFixedTime(new Date(`2026-11-23T${hhmm}:00+01:00`))
      await page.reload()
      await expect(greeting(page)).toHaveText(`¡${base}, Marta!`)
    }
  })

  test('sin alias el saludo va sin nombre', async ({ page }) => {
    await at(page, '15:00', MEMBER)
    await expect(greeting(page)).toHaveText('¡Buenas tardes!')
    await expect(greeting(page).locator('strong')).toHaveCount(0)
  })

  test('el saludo no aparece en móvil (solo en la barra lateral de escritorio)', async ({ newPage }) => {
    const page = await newPage({ viewport: { width: 390, height: 780 }, touch: true })
    await login(page)
    await expect(page.getByText(/^¡Buen/)).toBeHidden() // la barra lateral existe en el DOM pero oculta
  })
})
