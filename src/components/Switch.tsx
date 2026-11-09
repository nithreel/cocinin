/** Interruptor: indicador y botón a la vez (el color del propio interruptor dice el estado). */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
  tone = 'emerald',
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
  /** frost = congelado */
  tone?: 'emerald' | 'frost'
}) {
  const on = tone === 'frost' ? 'bg-frost-400' : 'bg-emerald-500'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none disabled:opacity-50 after:absolute after:-inset-2 after:content-[''] " +
        (checked ? on : 'bg-gray-400 dark:bg-moss-600')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform motion-reduce:transition-none ' +
          (checked ? 'translate-x-6' : 'translate-x-1')
        }
      />
    </button>
  )
}
