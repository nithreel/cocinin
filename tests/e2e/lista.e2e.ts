import type { Page } from '@playwright/test'
import { expect, login, openSection, test } from './helpers'
import { readCollection } from './seed'

const cartCheckbox = (page: Page, name: string) => page.getByRole('checkbox', { name })
const listDocs = async () => (await readCollection('shoppingList')).map((s) => s.data.ingredientId as string).sort()

test.beforeEach(async ({ page }) => {
  await login(page)
  await openSection(page, 'Lista')
})

test.describe('Lista de la compra', () => {
  test('muestra lo que hay en la lista por grupos y lo que falta en «Añadir a la lista»', async ({ page }) => {
    await expect(cartCheckbox(page, 'Yogur')).toBeVisible()
    await expect(cartCheckbox(page, 'Tomate')).toBeVisible()
    await expect(cartCheckbox(page, 'Yogur')).not.toBeChecked()
    // lo agotado que no está en la lista se ofrece abajo
    await expect(page.getByRole('button', { name: 'Añadir Lechuga a la lista' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Añadir Yogur a la lista' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  })

  test('añadir un ingrediente que falta lo pasa a la lista', async ({ page }) => {
    await page.getByRole('button', { name: 'Añadir Lechuga a la lista' }).click()
    await expect(cartCheckbox(page, 'Lechuga')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Añadir Lechuga a la lista' })).toHaveCount(0)
    await expect.poll(listDocs).toEqual(['i-lechuga', 'i-tomate', 'i-yogur'])
    await expect(page.getByText('No te falta nada por ahora')).toBeVisible()
  })

  test('buscar encuentra cualquier ingrediente (también los que tienes) y lo añade', async ({ page }) => {
    await page.getByPlaceholder('Buscar o añadir ingrediente…').fill('leche')
    await page.getByRole('button', { name: 'Añadir Leche a la lista' }).click()
    await expect(cartCheckbox(page, 'Leche')).toBeVisible()
    await expect.poll(listDocs).toContain('i-leche')
  })

  test('buscar algo que no existe ofrece crearlo (agotado) y añadirlo a la lista', async ({ page }) => {
    await page.getByPlaceholder('Buscar o añadir ingrediente…').fill('Aceitunas')
    await expect(page.getByText('(nuevo, agotado)')).toBeVisible()
    await page.getByRole('button', { name: 'Crear Aceitunas y añadirlo a la lista' }).click()
    await expect(cartCheckbox(page, 'Aceitunas')).toBeVisible()
    await expect.poll(async () => (await readCollection('ingredients')).find((i) => i.data.name === 'Aceitunas')?.data.inPantry).toBe(false)
  })

  test('marcar un artículo lo tacha, se guarda y habilita «Confirmar compra»', async ({ page }) => {
    await cartCheckbox(page, 'Yogur').click() // el estado viene de Firestore: se espera con expect, no con check()
    await expect(cartCheckbox(page, 'Yogur')).toBeChecked()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await expect.poll(async () => (await readCollection('shoppingList')).find((s) => s.id === 's-yogur')?.data.checked).toBe(true)
    await page.reload()
    await expect(cartCheckbox(page, 'Yogur')).toBeChecked()
    await cartCheckbox(page, 'Yogur').click()
    await expect(cartCheckbox(page, 'Yogur')).not.toBeChecked()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  })

  test('quitar de la lista elimina solo ese artículo', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: 'Tomate' }).getByRole('button', { name: 'Quitar de la lista' }).click()
    await expect(cartCheckbox(page, 'Tomate')).toHaveCount(0)
    await expect(cartCheckbox(page, 'Yogur')).toBeVisible()
    await expect.poll(listDocs).toEqual(['i-yogur'])
  })

  test('confirmar la compra pasa lo marcado a disponible, lo saca de la lista y lo anota en el historial', async ({ page }) => {
    await cartCheckbox(page, 'Yogur').click() // el estado viene de Firestore: se espera con expect, no con check()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(cartCheckbox(page, 'Yogur')).toHaveCount(0)
    await expect(cartCheckbox(page, 'Tomate')).toBeVisible() // lo no marcado se queda
    await expect.poll(listDocs).toEqual(['i-tomate'])
    await expect.poll(async () => (await readCollection('ingredients')).find((i) => i.id === 'i-yogur')?.data.inPantry).toBe(true)
    // historial (desplegable)
    await page.getByRole('button', { name: /^Historial de compras/ }).click()
    await expect(page.getByRole('button', { name: /^Historial de compras\s*\(1\)/ })).toBeVisible()
    // y en la Despensa el yogur está disponible
    await openSection(page, 'Despensa')
    await expect(page.getByRole('switch', { name: /^Yogur: disponible/ })).toBeVisible()
  })

  test('las secciones de la lista se pliegan', async ({ page }) => {
    await page.getByRole('button', { name: /^Lácteos/ }).first().click()
    await expect(cartCheckbox(page, 'Yogur')).toHaveCount(0)
    await expect(cartCheckbox(page, 'Tomate')).toBeVisible()
  })

  test('agotar algo en la Despensa y pulsar «Añadir a la lista» en el aviso lo manda a la lista', async ({ page }) => {
    await openSection(page, 'Despensa')
    await page.getByRole('switch', { name: /^Leche:/ }).click()
    await page.getByRole('status').getByRole('button', { name: 'Añadir a la lista' }).click()
    await openSection(page, 'Lista')
    await expect(cartCheckbox(page, 'Leche')).toBeVisible()
  })
})
