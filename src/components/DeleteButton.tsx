import { useState } from 'react'
import { cancelButton, dangerButton, dangerTextButton } from './buttonStyles'

/** Confirmación de borrado común a toda la app: botón rojo definitivo y «No» en gris. */
export function ConfirmDelete({
  question = '¿Eliminar?',
  questionClassName = '',
  confirmLabel = 'Sí, eliminar',
  busy = false,
  onConfirm,
  onCancel,
  className = '',
}: {
  question?: string
  /** p. ej. «w-full» para que la pregunta ocupe su propia línea */
  questionClassName?: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}) {
  return (
    <div className={'flex flex-wrap items-center gap-2 text-sm ' + className}>
      {question && <span className={'text-gray-700 dark:text-gray-300 ' + questionClassName}>{question}</span>}
      <button type="button" disabled={busy} onClick={onConfirm} className={dangerButton}>
        {busy ? 'Eliminando…' : confirmLabel}
      </button>
      <button type="button" disabled={busy} onClick={onCancel} className={cancelButton}>
        No
      </button>
    </div>
  )
}

export default function DeleteButton({
  onConfirm,
  label = 'Eliminar',
  confirmLabel,
}: {
  onConfirm: () => Promise<void>
  label?: string
  confirmLabel?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  if (confirming) {
    return (
      <ConfirmDelete
        question="¿Seguro?"
        confirmLabel={confirmLabel}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
        className="shrink-0"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setConfirming(true)
      }}
      className={dangerTextButton + ' shrink-0'}
    >
      {label}
    </button>
  )
}
