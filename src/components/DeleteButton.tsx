import { useState } from 'react'

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4 10-10" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export default function DeleteButton({
  onConfirm,
  label = 'Eliminar',
  variant = 'text',
}: {
  onConfirm: () => Promise<void>
  label?: string
  variant?: 'text' | 'icon'
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (variant === 'icon') {
    if (confirming) {
      return (
        <span className="inline-flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={busy}
            aria-label="Confirmar eliminación"
            title="Confirmar eliminación"
            onClick={async (e) => {
              e.stopPropagation()
              setBusy(true)
              try {
                await onConfirm()
              } finally {
                setBusy(false)
              }
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            aria-label="Cancelar"
            title="Cancelar"
            onClick={(e) => {
              e.stopPropagation()
              setConfirming(false)
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-moss-800"
          >
            <XIcon />
          </button>
        </span>
      )
    }

    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation()
          setConfirming(true)
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
      >
        <XIcon />
      </button>
    )
  }

  if (confirming) {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 text-sm">
        <button
          type="button"
          disabled={busy}
          onClick={async (e) => {
            e.stopPropagation()
            setBusy(true)
            try {
              await onConfirm()
            } finally {
              setBusy(false)
            }
          }}
          className="font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          {busy ? 'Eliminando…' : '¿Confirmar?'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setConfirming(false)
          }}
          className="text-gray-400 hover:underline dark:text-gray-500"
        >
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setConfirming(true)
      }}
      className="shrink-0 text-sm text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
    >
      {label}
    </button>
  )
}
