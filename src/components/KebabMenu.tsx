import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { rowIconButton } from './buttonStyles'
import { KebabIcon } from './icons'

export interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

export function MenuPopup({
  items,
  onClose,
  className = 'right-0 top-8',
}: {
  items: MenuItem[]
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  // al abrir, el foco pasa al primer elemento (teclado y lectores de pantalla)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [])

  function handleKey(e: KeyboardEvent) {
    const entries = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const i = entries.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      entries[(i + 1) % entries.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      entries[(i - 1 + entries.length) % entries.length]?.focus()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      ref={ref}
      role="menu"
      onKeyDown={handleKey}
      className={'absolute z-30 w-40 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-moss-700 dark:bg-moss-800 ' + className}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
            item.onClick()
          }}
          className={
            'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:hover:bg-moss-700 dark:focus:bg-moss-700 ' +
            (item.danger ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-200')
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function KebabMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleDown(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleDown)
    return () => document.removeEventListener('pointerdown', handleDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Más opciones"
        aria-haspopup="menu"
        aria-expanded={open}
        className={rowIconButton}
      >
        <KebabIcon />
      </button>
      {open && <MenuPopup items={items} onClose={() => setOpen(false)} />}
    </div>
  )
}
