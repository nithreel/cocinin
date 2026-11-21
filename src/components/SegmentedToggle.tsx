/** Selector de dos opciones con pastilla deslizante: al cambiar, la pastilla se desliza y rebota al llegar
 *  (mismo rebote que el pomo de los interruptores). */
export default function SegmentedToggle<T extends string | boolean>({
  value,
  onChange,
  options,
  label,
  className = '',
}: {
  value: T
  onChange: (value: T) => void
  options: readonly [readonly [T, string], readonly [T, string]]
  label: string
  className?: string
}) {
  const index = options[1][0] === value ? 1 : 0
  return (
    <div
      role="group"
      aria-label={label}
      className={'relative grid grid-cols-2 overflow-hidden rounded-md bg-gray-100 p-0.5 text-sm dark:bg-moss-800 ' + className}
    >
      <span
        aria-hidden="true"
        className="seg-thumb absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded bg-white shadow-sm dark:bg-moss-700"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {options.map(([key, text]) => (
        <button
          key={String(key)}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={
            'relative z-10 min-w-0 truncate rounded px-2 py-[3px] ' +
            (value === key
              ? 'font-medium text-gray-900 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100')
          }
        >
          {text}
        </button>
      ))}
    </div>
  )
}
