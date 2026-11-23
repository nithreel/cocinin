import { ADMIN, BASE_URL, MEMBER } from './config'
import { expect, login, test } from './helpers'

test.describe('Inicio de sesión', () => {
  test('sin sesión, una ruta protegida lleva al login', async ({ page }) => {
    await page.goto(BASE_URL + '/despensa')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByText('Inicia sesión para continuar')).toBeVisible()
  })

  test('credenciales correctas entran en la Despensa y muestran los datos', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/despensa$/)
    await expect(page.getByRole('switch', { name: /^Leche:/ })).toBeVisible()
  })

  test('contraseña incorrecta muestra un error y se queda en el login', async ({ page }) => {
    await page.goto(BASE_URL + '/login')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Contraseña', { exact: true }).fill('mal-mal-mal')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('el botón Ver/Ocultar cambia la visibilidad de la contraseña', async ({ page }) => {
    await page.goto(BASE_URL + '/login')
    const pass = page.getByLabel('Contraseña', { exact: true })
    await expect(pass).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Ver' }).click()
    await expect(pass).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar' }).click()
    await expect(pass).toHaveAttribute('type', 'password')
  })

  test('el admin ve «Usuarios» en la barra de ajustes; un miembro no, y /usuarios le devuelve a Despensa', async ({ newPage }) => {
    const admin = await newPage()
    await login(admin)
    await admin.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await expect(admin.getByRole('link', { name: 'Usuarios' })).toBeVisible()

    const member = await newPage()
    await login(member, MEMBER)
    await member.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await expect(member.getByRole('link', { name: 'Notificaciones' })).toBeVisible()
    await expect(member.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    await member.goto(BASE_URL + '/usuarios')
    await expect(member).toHaveURL(/\/despensa$/)
  })

  test('cerrar sesión pide confirmación y vuelve al login', async ({ page, knownErrors }) => {
    // BUGS.md #1: al cerrar sesión salta un error no capturado de Firestore (cliente ya terminado); es inofensivo
    knownErrors.push(/already been terminated/)
    await login(page)
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Confirmar cierre de sesión' })).toBeVisible()
    await page.getByRole('button', { name: 'Sí, salir' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    // y sin sesión ya no se entra
    await page.goto(BASE_URL + '/lista')
    await expect(page).toHaveURL(/\/login$/)
  })
})
