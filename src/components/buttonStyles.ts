// Estilos de botón compartidos, para que «Cancelar» y «Guardar» se vean igual en toda la app.
export const cancelButton =
  'inline-flex items-center justify-center max-md:min-h-11 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-moss-800'

export const primaryButton =
  'inline-flex items-center justify-center max-md:min-h-11 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50'

/** Acción destructiva en texto (Eliminar, Quitar acceso…): siempre en rojo, con fondo suave al pasar el cursor. */
export const dangerTextButton =
  'inline-flex items-center justify-center max-md:min-h-11 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'

/** Confirmación definitiva de un borrado. */
export const dangerButton =
  'inline-flex items-center justify-center max-md:min-h-11 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'

/** Botón secundario con borde («+ Grupo», «Importar»). */
export const outlineButton =
  'inline-flex items-center justify-center max-md:min-h-11 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800'

/** Botón de acción de fila (quitar): del tamaño de un interruptor (24 px); en móvil la zona táctil crece sin verse. */
export const rowIconButton =
  "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 after:absolute after:-inset-2 after:content-[''] dark:text-gray-400 dark:hover:bg-moss-800 dark:hover:text-gray-200"

/** Igual, en verde y con borde: la acción positiva de la fila (añadir a la lista). */
export const rowAddButton =
  "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 after:absolute after:-inset-2 after:content-[''] dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950"

/** Enlace/acción discreta en verde («Crear los que faltan…»). */
export const linkButton =
  'inline-flex items-center rounded-md px-2 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 max-md:min-h-11 dark:text-emerald-400 dark:hover:bg-emerald-950'
