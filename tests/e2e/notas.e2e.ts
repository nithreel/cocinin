import { expect, login, openSection, test } from './helpers'
import { readCollection } from './seed'

const noteDocs = async () => await readCollection('notes')

test.beforeEach(async ({ page }) => {
  await login(page)
  await openSection(page, 'Notas')
})

test.describe('Notas', () => {
  test('muestra las notas existentes', async ({ page }) => {
    await expect(page.getByText('Llamar al fontanero')).toBeVisible()
    await expect(page.getByText('Comprar pilas')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Marcar como hecha' })).toHaveCount(2)
  })

  test('+ Nota crea una nota (arriba, la más reciente) y Cancelar no crea nada', async ({ page }) => {
    await page.getByRole('button', { name: '+ Nota' }).click()
    await page.getByLabel('Nota', { exact: true }).fill('Sacar la basura')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    expect((await noteDocs()).some((n) => n.data.text === 'Sacar la basura')).toBe(false)

    await page.getByRole('button', { name: '+ Nota' }).click()
    await page.getByLabel('Nota', { exact: true }).fill('Sacar la basura')
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText('Sacar la basura')).toBeVisible()
    await expect.poll(async () => (await noteDocs()).find((n) => n.data.text === 'Sacar la basura')?.data).toMatchObject({ notify: false, remindAt: null })
    // las simples van de más nueva a más antigua
    const texts = await page.getByRole('listitem').allInnerTexts()
    expect(texts.map((t) => t.trim())).toEqual(['Sacar la basura', 'Llamar al fontanero', 'Comprar pilas'])
  })

  test('marcar como hecha tacha la nota y aparece «Eliminar» para borrar las hechas (con confirmación)', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0)
    await page.getByRole('listitem').filter({ hasText: 'Comprar pilas' }).getByRole('checkbox', { name: 'Marcar como hecha' }).click()
    await expect.poll(async () => (await noteDocs()).find((n) => n.id === 'n-2')?.data.done).toBe(true)
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(page.getByText('¿Eliminar la nota?')).toBeVisible()
    await page.getByRole('button', { name: 'No', exact: true }).click()
    expect((await noteDocs()).length).toBe(2)
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await page.getByRole('button', { name: 'Sí, eliminar' }).click()
    await expect(page.getByText('Comprar pilas')).toHaveCount(0)
    await expect.poll(async () => (await noteDocs()).map((n) => n.id)).toEqual(['n-1'])
  })

  test('pulsación larga (clic derecho) entra en «organizar»: editar una nota y salir con Listo', async ({ page }) => {
    await page.getByText('Llamar al fontanero').click({ button: 'right' })
    await expect(page.getByRole('button', { name: 'Listo' })).toBeVisible()
    await page.getByRole('listitem').filter({ hasText: 'Llamar al fontanero' }).getByRole('button', { name: 'Editar la nota' }).click()
    await page.getByLabel('Nota', { exact: true }).fill('Llamar al electricista')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Llamar al electricista')).toBeVisible()
    await expect.poll(async () => (await noteDocs()).find((n) => n.id === 'n-1')?.data.text).toBe('Llamar al electricista')
    await page.getByRole('button', { name: 'Listo' }).click()
    await expect(page.getByRole('button', { name: '+ Nota' })).toBeVisible()
  })

  test('en «organizar», eliminar una nota pide confirmación', async ({ page }) => {
    await page.getByText('Comprar pilas').click({ button: 'right' })
    await page.getByRole('listitem').filter({ hasText: 'Comprar pilas' }).getByRole('button', { name: 'Eliminar la nota' }).click()
    await expect(page.getByText('¿Eliminar la nota?')).toBeVisible()
    await page.getByRole('button', { name: 'Sí, eliminar' }).click()
    await expect(page.getByText('Comprar pilas')).toHaveCount(0)
    await expect.poll(async () => (await noteDocs()).map((n) => n.id)).toEqual(['n-1'])
  })
})
