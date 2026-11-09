import { ChevronIcon } from './icons'

/** Cabecera plegable de sección (grupo, «Te falta», historial): chevron que gira + nombre + contador. */
export default function SectionHeader({
  name,
  count,
  open,
  onToggle,
  className = '',
}: {
  name: string
  count: number
  open: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={
        'flex min-w-0 items-center gap-1.5 py-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ' +
        className
      }
    >
      <ChevronIcon open={open} />
      <span className="truncate">{name}</span>
      <span className="shrink-0 font-normal normal-case">({count})</span>
    </button>
  )
}
