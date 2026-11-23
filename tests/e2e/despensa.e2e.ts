import type { Page } from '@playwright/test'
import { expect, login, test } from './helpers'
import { readCollection } from './seed'

const row = (page: Page, name: string) => page.getByRole('switch', { name: new RegExp(`^${name}:`) })
const ingredientDoc = async (name: string) => (await readCollection('ingredients')).find((i) => i.data.name === name)
/** Abre el panel de una fila pulsando su nombre. */
const openPanel = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`), expanded: false }).first().click()

test.beforeEach(async ({ page }) => {
  await login(page)
})

test.describe('Despensa: lista y estado', () => {
  test('muestra los grupos con su contador y «Sin grupo» al final', async ({ page }) => {
    for (const g of ['Lácteos', 'Verduras', 'Limpieza', 'Sin grupo']) await expect(page.getByRole('button', { name: new RegExp(`^${g}`) }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Lácteos\s*\(3\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Verduras\s*\(3\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sin grupo\s*\(2\)/ })).toBeVisible()
    // orden de los grupos: el elegido a mano, y «Sin grupo» el último
    const ids = await page.locator('[data-group-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-group-id')))
    expect(ids).toEqual(['g-lacteos', 'g-verduras', 'g-limpieza', expect.any(String)])
  })

  test('el interruptor pasa un ingrediente de disponible a agotado y vuelta, y se guarda', async ({ page }) => {
    const leche = row(page, 'Leche')
    await expect(leche).toHaveAttribute('aria-checked', 'true')
    await expect(leche).toHaveAccessibleName('Leche: disponible, pulsa para marcar como agotado')
    await leche.click()
    await expect(leche).toHaveAttribute('aria-checked', 'false')
    await expect(leche).toHaveAccessibleName('Leche: agotado, pulsa para marcar como disponible')
    await expect(page.getByRole('status')).toContainText('Leche agotado')
    await expect.poll(async () => (await ingredientDoc('Leche'))?.data.inPantry).toBe(false)
    await leche.click()
    await expect(leche).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => (await ingredientDoc('Leche'))?.data.inPantry).toBe(true)
  })

  test('un ingrediente agotado de la semilla sale agotado y se puede marcar disponible', async ({ page }) => {
    const yogur = row(page, 'Yogur')
    await expect(yogur).toHaveAttribute('aria-checked', 'false')
    await yogur.click()
    await expect(yogur).toHaveAccessibleName('Yogur: disponible, pulsa para marcar como agotado')
  })

  test('congelar: el interruptor pasa a «congelado», el grupo cuenta el copo y se puede descongelar', async ({ page }) => {
    await openPanel(page, 'Queso')
    await page.getByRole('button', { name: 'Queso: pulsa para marcarlo como congelado' }).click()
    await expect(row(page, 'Queso')).toHaveAccessibleName('Queso: congelado, pulsa para marcar como agotado')
    await expect(page.getByLabel('1 ingrediente congelado')).toBeVisible()
    await expect.poll(async () => (await ingredientDoc('Queso'))?.data.frozen).toBe(true)
    // sacarlo del congelador: pasa a «descongelando» (en nevera) y sigue disponible
    await page.getByRole('button', { name: 'Queso: en el congelador, pulsa para descongelar (en nevera)' }).click()
    await expect(page.getByLabel('1 ingrediente descongelando')).toBeVisible()
    await expect(row(page, 'Queso')).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => (await ingredientDoc('Queso'))?.data.frozen).toBe(false)
  })

  test('los grupos que no son de comida no ofrecen congelar', async ({ page }) => {
    await openPanel(page, 'Lejía')
    await expect(page.getByRole('button', { name: /^Lejía: pulsa para añadirlo a la lista/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Lejía: pulsa para marcarlo como congelado/ })).toHaveCount(0)
  })

  test('el carrito de una fila lo añade a la lista de la compra y lo quita', async ({ page }) => {
    await openPanel(page, 'Leche')
    await page.getByRole('button', { name: 'Leche: pulsa para añadirlo a la lista de la compra' }).click()
    await expect(page.getByRole('status')).toContainText('Leche añadido a la lista')
    await expect.poll(async () => (await readCollection('shoppingList')).some((s) => s.data.ingredientId === 'i-leche')).toBe(true)
    await page.getByRole('button', { name: 'Leche: está en la lista de la compra, pulsa para quitarlo' }).click()
    await expect.poll(async () => (await readCollection('shoppingList')).some((s) => s.data.ingredientId === 'i-leche')).toBe(false)
  })
})

test.describe('Despensa: grupos plegables', () => {
  test('pulsar el grupo pliega y despliega sus ingredientes, y se recuerda al recargar', async ({ page }) => {
    await expect(row(page, 'Leche')).toBeVisible()
    await page.getByRole('button', { name: /^Lácteos/ }).click()
    await expect(row(page, 'Leche')).toHaveCount(0)
    await expect(row(page, 'Tomate')).toBeVisible() // los demás grupos no se tocan
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Despensa' })).toBeVisible()
    await expect(row(page, 'Tomate')).toBeVisible()
    await expect(row(page, 'Leche')).toHaveCount(0)
    await page.getByRole('button', { name: /^Lácteos/ }).click()
    await expect(row(page, 'Leche')).toBeVisible()
  })
})

test.describe('Despensa: añadir, editar y borrar', () => {
  test('+ Ingrediente crea un ingrediente disponible en el grupo elegido', async ({ page }) => {
    await page.getByRole('button', { name: '+ Ingrediente' }).click()
    await page.getByPlaceholder('Nombre del ingrediente').fill('Mantequilla')
    await page.locator('form select').first().selectOption({ label: 'Lácteos' })
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await expect(row(page, 'Mantequilla')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: /^Lácteos\s*\(4\)/ })).toBeVisible()
    await expect.poll(async () => (await ingredientDoc('Mantequilla'))?.data).toMatchObject({ groupId: 'g-lacteos', inPantry: true })
  })

  test('un nombre repetido avisa y solo se crea al pulsar Añadir otra vez', async ({ page }) => {
    await page.getByRole('button', { name: '+ Ingrediente' }).click()
    await page.getByPlaceholder('Nombre del ingrediente').fill('leche')
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await expect(page.getByText('Ya existe un ingrediente con ese nombre')).toBeVisible()
    expect((await readCollection('ingredients')).length).toBe(9)
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await expect.poll(async () => (await readCollection('ingredients')).length).toBe(10)
  })

  test('+ Ingrediente > Cancelar cierra el formulario sin crear nada', async ({ page }) => {
    await page.getByRole('button', { name: '+ Ingrediente' }).click()
    await page.getByPlaceholder('Nombre del ingrediente').fill('Fantasma')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByPlaceholder('Nombre del ingrediente')).toHaveCount(0)
    expect(await ingredientDoc('Fantasma')).toBeUndefined()
  })

  test('editar un ingrediente: cambia nombre y grupo', async ({ page }) => {
    await openPanel(page, 'Cebolla')
    await page.getByRole('button', { name: 'Editar «Cebolla»' }).click()
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Guardar', exact: true }) })
    await form.getByRole('textbox').first().fill('Cebolleta')
    await form.locator('select').first().selectOption({ label: 'Lácteos' })
    await form.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(row(page, 'Cebolleta')).toBeVisible()
    await expect(row(page, 'Cebolla')).toHaveCount(0)
    await expect.poll(async () => (await ingredientDoc('Cebolleta'))?.data.groupId).toBe('g-lacteos')
  })

  test('editar la cantidad desde el panel de la fila', async ({ page }) => {
    await openPanel(page, 'Leche')
    await page.getByLabel('Cantidad que tienes').fill('500 g')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('500 g')).toBeVisible()
    await expect.poll(async () => (await ingredientDoc('Leche'))?.data.quantity).toBe('500 g')
  })

  test('eliminar un ingrediente avisa de las recetas que lo usan y pide confirmación', async ({ page }) => {
    await openPanel(page, 'Tomate')
    await page.getByRole('button', { name: 'Eliminar «Tomate»' }).click()
    await expect(page.getByText('Se usa en la receta: Ensalada de tomate')).toBeVisible()
    await page.getByRole('button', { name: 'No', exact: true }).click()
    await expect(row(page, 'Tomate')).toBeVisible()
    await page.getByRole('button', { name: 'Eliminar «Tomate»' }).click()
    await page.getByRole('button', { name: 'Sí, eliminar' }).click()
    await expect(row(page, 'Tomate')).toHaveCount(0)
    await expect.poll(async () => await ingredientDoc('Tomate')).toBeUndefined()
  })

  test('+ Grupo crea un grupo vacío', async ({ page }) => {
    await page.getByRole('button', { name: '+ Grupo' }).click()
    await page.getByPlaceholder('Nombre del grupo').fill('Congelados')
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Congelados/ })).toBeVisible()
    await expect(page.getByText('Sin ingredientes en este grupo.')).toBeVisible()
    await expect.poll(async () => (await readCollection('groups')).map((g) => g.data.name)).toContain('Congelados')
  })
})

test.describe('Despensa: modo organizar grupos', () => {
  const enterOrganize = async (page: Page, group = 'Lácteos') => {
    await page.getByRole('button', { name: new RegExp(`^${group}`) }).click({ button: 'right' }) // el clic derecho entra igual que la pulsación larga
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
  }

  test('una pulsación larga (ratón mantenido) entra en el modo organizar; Cancelar sale', async ({ page }) => {
    const header = page.getByRole('button', { name: /^Lácteos/ })
    const box = (await header.boundingBox())!
    await page.mouse.move(box.x + 40, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(700) // la pulsación larga dura 500 ms por diseño
    await page.mouse.up()
    await expect(page.getByRole('button', { name: 'Mover «Lácteos» (arrastra, o usa ↑ ↓)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar «Lácteos»' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('button', { name: /Mover «Lácteos»/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '+ Grupo' })).toBeVisible()
  })

  test('renombrar un grupo y Guardar', async ({ page }) => {
    await enterOrganize(page)
    await page.getByRole('button', { name: 'Editar «Verduras»' }).click()
    await page.getByLabel('Nombre del grupo').fill('Hortalizas')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Hortalizas/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Verduras/ })).toHaveCount(0)
    await expect.poll(async () => (await readCollection('groups')).map((g) => g.data.name)).toContain('Hortalizas')
  })

  test('mover un grupo con ↓ cambia el orden; Cancelar lo restaura', async ({ page }) => {
    const order = () => page.locator('[data-group-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-group-id')))
    await enterOrganize(page)
    await page.getByRole('button', { name: 'Mover «Lácteos» (arrastra, o usa ↑ ↓)' }).focus()
    await page.keyboard.press('ArrowDown')
    await expect.poll(order).toEqual(['g-verduras', 'g-lacteos', 'g-limpieza', expect.any(String)])
    await expect.poll(async () => (await readCollection('groups')).find((g) => g.id === 'g-lacteos')?.data.order).toBe(1)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect.poll(order).toEqual(['g-lacteos', 'g-verduras', 'g-limpieza', expect.any(String)])
  })

  test('eliminar un grupo: sus ingredientes pasan a «Sin grupo»', async ({ page }) => {
    await enterOrganize(page, 'Limpieza')
    await page.getByRole('button', { name: 'Eliminar «Limpieza»' }).click()
    await expect(page.getByText('¿Eliminar «Limpieza»? Sus 1 ingredientes pasan a Sin grupo.')).toBeVisible()
    await page.getByRole('button', { name: 'Sí, eliminar' }).click()
    await expect(page.getByRole('button', { name: /^Limpieza/ })).toHaveCount(0)
    await expect.poll(async () => (await ingredientDoc('Lejía'))?.data.groupId).toBeNull()
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Sin grupo\s*\(3\)/ })).toBeVisible()
  })
})

test.describe('Despensa: búsqueda', () => {
  test('filtra por nombre sin distinguir mayúsculas ni tildes, y limpia', async ({ page }) => {
    const search = page.getByPlaceholder('Buscar ingrediente…')
    await search.fill('TOMA')
    await expect(row(page, 'Tomate')).toBeVisible()
    await expect(row(page, 'Leche')).toHaveCount(0)
    await search.fill('lejia') // sin tilde
    await expect(row(page, 'Lejía')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
    await expect(search).toHaveValue('')
    await expect(row(page, 'Leche')).toBeVisible()
    await expect(row(page, 'Tomate')).toBeVisible()
  })

  test('si coincide el nombre del grupo entra el grupo entero; sin resultados lo dice', async ({ page }) => {
    const search = page.getByPlaceholder('Buscar ingrediente…')
    await search.fill('lacteo')
    for (const n of ['Leche', 'Queso', 'Yogur']) await expect(row(page, n)).toBeVisible()
    await expect(row(page, 'Tomate')).toHaveCount(0)
    await search.fill('zzzz')
    await expect(page.getByText('No hay ingredientes que coincidan con «zzzz».')).toBeVisible()
  })

  test('buscar despliega los grupos plegados', async ({ page }) => {
    await page.getByRole('button', { name: /^Lácteos/ }).click()
    await expect(row(page, 'Leche')).toHaveCount(0)
    await page.getByPlaceholder('Buscar ingrediente…').fill('leche')
    await expect(row(page, 'Leche')).toBeVisible()
  })
})
