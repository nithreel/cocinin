import type { Page } from '@playwright/test'
import { expect, login, mainScrollTop, openSection, test } from './helpers'
import { readCollection } from './seed'

const card = (page: Page, title: string) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) })
const titleBtn = (page: Page, title: string) => page.getByRole('heading', { name: title }).locator('xpath=ancestor::button[1]')
const tagChip = (page: Page, name: string) => page.getByRole('group', { name: 'Filtrar por etiqueta' }).getByRole('button', { name, exact: true })
const recipeDocs = async () => await readCollection('recipes')

test.beforeEach(async ({ page }) => {
  await login(page)
  await openSection(page, 'Recetario')
})

test.describe('Recetario: leer', () => {
  test('lista las recetas con sus etiquetas bajo el título', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Ensalada de tomate' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tortilla de cebolla' })).toBeVisible()
    await expect(titleBtn(page, 'Ensalada de tomate')).toContainText('Fría · Rápida')
    await expect(page.getByRole('article')).toHaveCount(15)
  })

  test('abrir una receta muestra ingredientes con cantidades y preparación; se cierra con el chevron', async ({ page }) => {
    await titleBtn(page, 'Ensalada de tomate').click()
    const c = card(page, 'Ensalada de tomate')
    await expect(c.getByText('Tomate — 2 uds')).toBeVisible()
    await expect(c.getByText('Cebolla — 1 ud')).toBeVisible()
    await expect(c.getByText('Trocear el tomate y la cebolla.')).toBeVisible()
    // con una receta abierta, el buscador y los filtros se pliegan (el comentario de RecipesPage.tsx:394 dice que el
    // buscador se queda, pero el código lo pliega con ellos: ver BUGS.md, nota 2)
    await expect(page.getByRole('button', { name: 'Puedo hacerla' })).toHaveCount(0)
    await expect(page.getByPlaceholder('Buscar receta o ingrediente…')).toHaveCount(0)
    await c.getByRole('button', { name: 'Plegar la receta' }).click()
    await expect(c.getByText('Tomate — 2 uds')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Puedo hacerla' })).toBeVisible()
    await expect(page.getByPlaceholder('Buscar receta o ingrediente…')).toBeVisible()
  })

  test('el título también cierra la receta y las demás se ocultan mientras hay una abierta', async ({ page }) => {
    await titleBtn(page, 'Tortilla de cebolla').click()
    // las demás se pliegan (siguen en el DOM, pero inertes: no se pueden pulsar ni enfocar)
    const inert = (title: string) => page.locator('div[inert]').filter({ has: page.getByRole('heading', { name: title }) })
    await expect(inert('Ensalada de tomate')).toHaveCount(1)
    await expect(inert('Tortilla de cebolla')).toHaveCount(0)
    await titleBtn(page, 'Tortilla de cebolla').click()
    await expect(inert('Ensalada de tomate')).toHaveCount(0)
  })

  test('lo que falta se marca en la receta y el carrito lo añade a la lista', async ({ page }) => {
    await titleBtn(page, 'Lechuga con yogur').click()
    const c = card(page, 'Lechuga con yogur')
    await expect(c.getByText('Lechuga — 1 ud')).toBeVisible()
    await c.getByRole('button', { name: /^Añadir a la lista de la compra lo que falta \(\d+\)/ }).click()
    await expect.poll(async () => (await readCollection('shoppingList')).some((s) => s.data.ingredientId === 'i-lechuga')).toBe(true)
  })
})

test.describe('Recetario: filtros y búsqueda', () => {
  test('«Puedo hacerla» deja solo las recetas con todos los ingredientes disponibles', async ({ page }) => {
    const toggle = page.getByRole('group', { name: 'Filtrar recetas' })
    await expect(toggle.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
    await toggle.getByRole('button', { name: 'Puedo hacerla' }).click()
    await expect(toggle.getByRole('button', { name: 'Puedo hacerla' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Lechuga con yogur' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Ensalada de tomate' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(14)
    await toggle.getByRole('button', { name: 'Todas' }).click()
    await expect(page.getByRole('article')).toHaveCount(15)
  })

  test('las etiquetas filtran y se combinan (deben cumplirse todas)', async ({ page }) => {
    await tagChip(page, 'Fría').click()
    await expect(tagChip(page, 'Fría')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('article')).toHaveCount(2) // Ensalada y Lechuga
    await tagChip(page, 'Rápida').click()
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Ensalada de tomate' })).toBeVisible()
    await tagChip(page, 'Fría').click()
    await tagChip(page, 'Rápida').click()
    await expect(page.getByRole('article')).toHaveCount(15)
  })

  test('el buscador mira el título y los ingredientes; sin coincidencias lo dice', async ({ page }) => {
    const search = page.getByPlaceholder('Buscar receta o ingrediente…')
    await search.fill('tortilla')
    await expect(page.getByRole('article')).toHaveCount(1)
    await search.fill('LECHUGA') // por ingrediente y título
    await expect(page.getByRole('heading', { name: 'Lechuga con yogur' })).toBeVisible()
    await search.fill('zzzz')
    await expect(page.getByText('No hay recetas que coincidan con «zzzz».')).toBeVisible()
  })

  test('el botón Etiquetas abre el gestor y permite crear una etiqueta', async ({ page }) => {
    await page.getByRole('button', { name: 'Etiquetas', exact: true }).click()
    await page.getByPlaceholder('Nueva etiqueta').fill('Picante')
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await expect.poll(async () => (await readCollection('tags')).map((t) => t.data.name)).toContain('Picante')
    await expect(tagChip(page, 'Picante')).toBeAttached()
  })
})

test.describe('Recetario: la fila de etiquetas (rueda y arrastre)', () => {
  const rowBox = async (page: Page) => {
    const row = page.getByRole('group', { name: 'Filtrar por etiqueta' })
    await expect(row).toBeVisible()
    const pre = await row.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
    expect(pre.sw, 'la fila de etiquetas debe desbordar para poder desplazarse').toBeGreaterThan(pre.cw + 50)
    return { row, box: (await row.boundingBox())! }
  }
  const scrollable = async (page: Page) => {
    await expect(page.getByRole('article')).toHaveCount(15)
    const overflow = () => page.locator('main').evaluate((el) => el.scrollHeight - el.clientHeight)
    // si la página no desbordase, la prueba no demostraría nada
    await expect.poll(overflow, { message: 'la página debe tener scroll vertical' }).toBeGreaterThan(100)
  }

  test('la rueda sobre la fila la desplaza de lado y la página no baja', async ({ page }) => {
    await scrollable(page)
    const { row, box } = await rowBox(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    expect(await mainScrollTop(page)).toBe(0)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
    expect(await mainScrollTop(page)).toBe(0)
    // hasta el borde derecho y más allá: la fila se queda al final y la página sigue sin moverse
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 400)
    await expect.poll(() => row.evaluate((el) => Math.round(el.scrollWidth - el.clientWidth - el.scrollLeft))).toBeLessThanOrEqual(1)
    await page.mouse.wheel(0, 400)
    expect(await mainScrollTop(page)).toBe(0)
    // y de vuelta hacia la izquierda hasta el borde
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -400)
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBe(0)
    await page.mouse.wheel(0, -400)
    expect(await mainScrollTop(page)).toBe(0)
  })

  test('con la página ya desplazada, la rueda sobre la fila tampoco la mueve', async ({ page }) => {
    await scrollable(page)
    // se baja la página con la rueda fuera de la fila (sobre la lista de recetas)
    await page.mouse.move(640, 600)
    await page.mouse.wheel(0, 300)
    await expect.poll(() => mainScrollTop(page)).toBeGreaterThan(100)
    const before = await mainScrollTop(page)
    const { row, box } = await rowBox(page) // la cabecera con los filtros es fija: sigue a la vista
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
    await page.mouse.wheel(0, -2000)
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBe(0)
    expect(await mainScrollTop(page)).toBe(before)
  })

  test('arrastrar con el ratón la desplaza sin activar la etiqueta sobre la que se suelta', async ({ page }) => {
    const { row, box } = await rowBox(page)
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width - 60, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 160, y, { steps: 6 })
    await page.mouse.move(box.x + 100, y, { steps: 6 })
    await page.mouse.up()
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)
    expect(await row.getByRole('button', { pressed: true }).count()).toBe(0) // el clic del arrastre se descarta
    expect(await mainScrollTop(page)).toBe(0)
    // un clic normal sigue funcionando después
    await tagChip(page, 'Carne').click()
    await expect(tagChip(page, 'Carne')).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Recetario: añadir, editar, borrar e importar', () => {
  test('+ Receta exige al menos un ingrediente y luego crea la receta con etiqueta y cantidades', async ({ page }) => {
    await page.getByRole('button', { name: '+ Receta' }).click()
    await page.getByLabel('Título').fill('Pisto casero')
    await page.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(page.getByText('Marca al menos un ingrediente de la receta.')).toBeVisible()
    await page.getByRole('group', { name: 'Etiquetas de la receta' }).getByRole('button', { name: 'Cena', exact: true }).click()
    await page.getByRole('group', { name: 'Qué ingredientes ver' }).getByRole('button', { name: 'Todos' }).click()
    await page.getByRole('checkbox', { name: 'Tomate' }).check()
    await page.getByPlaceholder('Cantidad').fill('3')
    await page.getByPlaceholder('Unidad').fill('uds')
    await page.getByLabel('Preparación').fill('Sofreír todo.')
    await page.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(page.getByRole('heading', { name: 'Pisto casero' })).toBeVisible()
    await expect.poll(async () => (await recipeDocs()).find((r) => r.data.title === 'Pisto casero')?.data).toMatchObject({
      instructions: 'Sofreír todo.',
      tagIds: ['t-3'],
      ingredients: [{ ingredientId: 'i-tomate', quantity: '3', unit: 'uds' }],
    })
  })

  test('+ Receta > Cancelar no crea nada', async ({ page }) => {
    await page.getByRole('button', { name: '+ Receta' }).click()
    await page.getByLabel('Título').fill('No me guardes')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByLabel('Título')).toHaveCount(0)
    expect((await recipeDocs()).some((r) => r.data.title === 'No me guardes')).toBe(false)
  })

  test('editar una receta: cambia el título y las cantidades', async ({ page }) => {
    await titleBtn(page, 'Ensalada de tomate').click()
    await page.getByRole('button', { name: 'Editar «Ensalada de tomate»' }).click()
    await page.getByLabel('Título de la receta').fill('Ensalada mixta')
    await page.getByPlaceholder('Cantidad').first().fill('5')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('heading', { name: 'Ensalada mixta' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ensalada de tomate' })).toHaveCount(0)
    await expect.poll(async () => (await recipeDocs()).find((r) => r.id === 'r-ensalada')?.data.title).toBe('Ensalada mixta')
    const saved = (await recipeDocs()).find((r) => r.id === 'r-ensalada')!.data
    expect(saved.ingredients.map((i: { quantity: string }) => i.quantity)).toContain('5')
  })

  test('eliminar una receta pide confirmación', async ({ page }) => {
    await titleBtn(page, 'Tortilla de cebolla').click()
    await page.getByRole('button', { name: 'Eliminar «Tortilla de cebolla»' }).click()
    await expect(page.getByText('¿Eliminar la receta «Tortilla de cebolla»?')).toBeVisible()
    await page.getByRole('button', { name: 'No', exact: true }).click()
    expect((await recipeDocs()).some((r) => r.id === 'r-tortilla')).toBe(true)
    await page.getByRole('button', { name: 'Eliminar «Tortilla de cebolla»' }).click()
    await page.getByRole('button', { name: 'Sí, eliminar' }).click()
    await expect(page.getByRole('heading', { name: 'Tortilla de cebolla' })).toHaveCount(0)
    await expect.poll(async () => (await recipeDocs()).some((r) => r.id === 'r-tortilla')).toBe(false)
  })

  const IMPORT_OK = JSON.stringify({ recipes: [{ title: 'Salsa rápida', instructions: 'Mezclar.', ingredients: [{ name: 'Tomate', quantity: '2', unit: 'uds', optional: false }, { name: 'Sal', quantity: '', unit: '', optional: true }], tags: ['Fría', 'Salsas'] }] })

  test('importar: vista previa, importar (con etiqueta nueva) y deshacer', async ({ page }) => {
    await page.getByRole('button', { name: 'Importar', exact: true }).click()
    await page.getByPlaceholder('Pega aquí el JSON devuelto').fill(IMPORT_OK)
    await expect(page.getByRole('checkbox', { name: 'Salsa rápida' })).toBeChecked()
    await expect(page.getByText('(nueva)')).toBeVisible() // «Salsas» no existe aún
    await page.getByRole('button', { name: 'Importar 1' }).click()
    await expect(page.getByText('Receta importada.')).toBeVisible()
    await expect.poll(async () => (await recipeDocs()).find((r) => r.data.title === 'Salsa rápida')?.data.ingredients.length).toBe(2)
    await expect.poll(async () => (await readCollection('tags')).map((t) => t.data.name)).toContain('Salsas')
    await page.getByRole('button', { name: 'Deshacer importación' }).click()
    await expect.poll(async () => (await recipeDocs()).some((r) => r.data.title === 'Salsa rápida')).toBe(false)
  })

  test('importar: un ingrediente que no existe bloquea la receta; un JSON roto da error', async ({ page }) => {
    await page.getByRole('button', { name: 'Importar', exact: true }).click()
    const box = page.getByPlaceholder('Pega aquí el JSON devuelto')
    await box.fill(JSON.stringify([{ title: 'Con trufa', ingredients: [{ name: 'Trufa', quantity: '1', unit: 'ud', optional: false }] }]))
    await expect(page.getByText(/No se importa: faltan en la Despensa Trufa/)).toBeVisible()
    await expect(page.locator('section').getByRole('button', { name: 'Importar', exact: true })).toBeDisabled()
    await box.fill('esto no es json')
    await expect(page.getByText('Eso no es un JSON válido.')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(box).toHaveCount(0)
  })

  test('importar: un título repetido se avisa y no se marca por defecto', async ({ page }) => {
    await page.getByRole('button', { name: 'Importar', exact: true }).click()
    await page.getByPlaceholder('Pega aquí el JSON devuelto').fill(JSON.stringify([{ title: 'Tortilla de cebolla', ingredients: [{ name: 'Huevos', quantity: '2', unit: '', optional: false }] }]))
    await expect(page.getByText('Ya hay una receta con este título.')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Tortilla de cebolla' })).not.toBeChecked()
  })
})
