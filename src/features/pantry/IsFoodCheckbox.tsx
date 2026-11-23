export default function IsFoodCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input autoComplete="off"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 cb h-4 w-4 shrink-0"
      />
      <span>
        Es comida
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          Sus ingredientes salen en las recetas y se pueden congelar.
        </span>
      </span>
    </label>
  )
}
