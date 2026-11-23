// Estilos de botón compartidos, para que «Cancelar» y «Guardar» se vean igual en toda la app.
export const cancelButton =
  'ripple relative rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-moss-800'

export const primaryButton =
  'ripple relative rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50'

/** Acción destructiva en texto (Eliminar, Quitar acceso…): siempre en rojo, con fondo suave al pasar el cursor. */
export const dangerTextButton =
  'ripple relative rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'

/** Confirmación definitiva de un borrado. */
export const dangerButton =
  'ripple relative rounded-md bg-red-400 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50'

/** Botón secundario con borde («+ Grupo», «Importar»). */
export const outlineButton =
  'ripple relative rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800'

/** Botón de acción de fila (quitar): del tamaño de un interruptor (24 px); en móvil la zona táctil crece sin verse. */
export const rowIconButton =
  "ripple relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 after:absolute after:-inset-2 after:content-[''] dark:text-gray-400 dark:hover:bg-moss-800 dark:hover:text-gray-200"

/** Enlace/acción discreta en verde. */
export const linkButton =
  'inline-flex items-center rounded-md px-2 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950'

/** Pastilla que se activa y desactiva (filtros y etiquetas del Recetario): verde y rellena mientras está pulsada. */
export function pillButton(on: boolean) {
  return (
    'ripple relative rounded-full border px-3 py-1 text-sm ' +
    (on
      ? 'border-emerald-700 bg-emerald-700 text-white'
      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800')
  )
}
