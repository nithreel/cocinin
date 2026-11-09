/** Interruptor: indicador y botón a la vez (el color del propio interruptor dice el estado). */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 max-md:after:absolute max-md:after:-inset-2.5 max-md:after:content-[''] " +
        (checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-moss-600')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-6' : 'translate-x-1')
        }
      />
    </button>
  )
}
