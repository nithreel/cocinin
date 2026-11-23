const MAX_ALIAS = 12

/** Saludo según la hora (6-12 días, 12-20 tardes, resto noches); sin alias si falta o es muy largo. */
export function greeting(alias: string, date = new Date()) {
  const h = date.getHours()
  const base = h >= 6 && h < 12 ? 'Buenos días' : h >= 12 && h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const name = alias.trim()
  return name && name.length <= MAX_ALIAS
    ? { before: `¡${base}, `, name, after: '!' }
    : { before: `¡${base}!`, name: '', after: '' }
}
