import { useRef } from 'react'
import { XIcon } from './icons'

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar ingrediente…',
  className = 'mb-4',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className={'relative ' + className}>
      <input
        ref={inputRef}
        type="search"
        autoComplete="off"
        data-kb-align="start"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          // no le quita el foco al campo (el teclado sigue abierto) y lo devuelve tras limpiar
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label="Limpiar búsqueda"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <XIcon />
        </button>
      )}
    </div>
  )
}
