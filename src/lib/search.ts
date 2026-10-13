/** Minúsculas y sin tildes ni diacríticos: «Sésamo» y «sesamo» se consideran iguales. */
export function normalizeText(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function matchesSearch(text: string, term: string) {
  return normalizeText(text).includes(normalizeText(term).trim())
}
