import { keepFocus } from '../../lib/keepFocus'
import { CaretIcon } from '../../components/icons'

/** Cabecera plegable de un apartado de la lista (flecha, nombre y recuento opcional). */
export default function SectionHeader({
  name,
  count,
  isCollapsed,
  onToggle,
}: {
  name: string
  count?: number
  isCollapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={keepFocus}
      onClick={onToggle}
      aria-expanded={!isCollapsed}
      className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <span aria-hidden="true" className="text-gray-500 dark:text-gray-400">
        <CaretIcon open={!isCollapsed} />
      </span>
      {name}
      {count !== undefined && <span className="font-normal normal-case text-gray-500 dark:text-gray-400">({count})</span>}
    </button>
  )
}
