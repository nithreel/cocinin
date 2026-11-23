import { useRef } from 'react'
import { XIcon } from './icons'
import { inputField } from './inputStyles'

/** Campo de búsqueda con aspa para limpiar; al limpiar el foco se queda en el campo (el teclado del móvil sigue
 *  abierto). */
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
        className={inputField + ' w-full pr-10 [&::-webkit-search-cancel-button]:appearance-none'}
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
