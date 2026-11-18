/** Minúsculas y sin tildes ni diacríticos: «Sésamo» y «sesamo» se consideran iguales. */
export function normalizeText(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function matchesSearch(text: string, term: string) {
  return normalizeText(text).includes(normalizeText(term).trim())
}

/** Orden alfabético en español, sin distinguir mayúsculas ni tildes («aceite» antes que «Zanahoria»). */
export function sortByText<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => key(a).localeCompare(key(b), 'es', { sensitivity: 'base' }))
}
