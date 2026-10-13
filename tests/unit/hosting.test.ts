import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// El HTML se sirve por la reescritura ** desde cada ruta de la app, y Hosting solo aplica
// `no-cache` a las rutas que se enumeran en firebase.json. Si se añade una ruta en App.tsx
// sin su regla, la PWA volvería a servir una versión vieja durante 1 hora.
describe('firebase.json: no-cache en todas las rutas de la app', () => {
  const routes = [...readFileSync('src/App.tsx', 'utf8').matchAll(/path="([^"]+)"/g)].map((m) => m[1])
  const headers: { source: string; headers: { key: string; value: string }[] }[] = JSON.parse(
    readFileSync('firebase.json', 'utf8'),
  ).hosting.headers
  const noCache = new Set(
    headers.filter((h) => h.headers.some((x) => x.key === 'Cache-Control' && x.value === 'no-cache')).map((h) => h.source),
  )

  it('App.tsx declara rutas (si no, el test está leyendo mal)', () => {
    expect(routes.length).toBeGreaterThan(0)
  })

  it.each(['/', '/index.html', '/sw.js', ...routes])('%s tiene no-cache', (source) => {
    expect(noCache.has(source)).toBe(true)
  })
})
