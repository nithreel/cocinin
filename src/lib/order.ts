/** `order` de un elemento nuevo (grupo, etiqueta…): si ya hay alguno ordenado a mano, va detrás del mayor; si no,
 *  undefined (la lista sigue en orden alfabético). */
export function nextOrder(items: { order?: number }[]): number | undefined {
  return items.some((i) => i.order !== undefined) ? Math.max(...items.map((i) => i.order ?? -1)) + 1 : undefined
}
