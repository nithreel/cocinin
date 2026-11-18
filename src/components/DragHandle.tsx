import type { HTMLAttributes } from 'react'

/** Asa de arrastre (tres rayas) para las listas reordenables. */
export default function DragHandle({ label, handle }: { label: string; handle: HTMLAttributes<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...handle}
      className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M2 3.5h10M2 7h10M2 10.5h10" />
      </svg>
    </button>
  )
}
