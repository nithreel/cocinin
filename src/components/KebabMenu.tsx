import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

export function MenuPopup({ items, onClose, className = 'right-0 top-7' }: { items: MenuItem[]; onClose: () => void; className?: string }) {
  return (
    <div
      role="menu"
      className={'absolute z-10 w-36 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-moss-700 dark:bg-moss-800 ' + className}
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
            'block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-moss-700 ' +
            (item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200')
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
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-moss-800 dark:hover:text-gray-300"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      {open && <MenuPopup items={items} onClose={() => setOpen(false)} />}
    </div>
  )
}
