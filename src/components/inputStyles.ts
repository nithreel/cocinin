// Estilos de campo compartidos (texto, fecha, selector, área de texto), como buttonStyles.ts para los botones.
// Cada sitio compone la base con su tamaño y sus extras (ancho, margen…): `inputCompact + ' w-40'`.

/** Base de todo campo: borde gris, anillo verde al enfocar y colores del tema oscuro. Sin tamaño ni relleno. */
export const inputBase =
  'rounded-md border border-gray-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100'

/** Campo normal de formulario (nombre, correo, buscador…). */
export const inputField = inputBase + ' px-3 py-1.5 text-sm'

/** Campo compacto, dentro de una fila o de un panel (fechas, cantidades, selector de grupo). */
export const inputCompact = inputBase + ' px-2 py-1 text-sm'
