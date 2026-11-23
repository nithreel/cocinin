import { useRef, useState, type CSSProperties } from 'react'
import { leaveRow, restoreIfStill } from '../lib/motion'
import { cancelButton, dangerButton, dangerTextButton } from './buttonStyles'

/** Confirmación de borrado común a toda la app: botón rojo definitivo y «No» en gris. */
export function ConfirmDelete({
  question = '¿Eliminar?',
  questionClassName = '',
  confirmLabel = 'Sí, eliminar',
  busy = false,
  leave = true,
  onConfirm,
  onCancel,
  className = '',
}: {
  question?: string
  /** p. ej. «w-full» para que la pregunta ocupe su propia línea */
  questionClassName?: string
  confirmLabel?: string
  busy?: boolean
  /** ¿la fila desaparece al confirmar? Con `false` (p. ej. «Hacer admin») no se desliza fuera */
  leave?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  className?: string
}) {
  // desde el primer clic (también durante el deslizamiento de la fila) los dos botones quedan bloqueados
  const [pending, setPending] = useState(false)
  const started = useRef(false)
  const locked = busy || pending

  async function handleConfirm(e: React.MouseEvent<HTMLButtonElement>) {
    if (started.current) return
    started.current = true
    setPending(true)
    const row = leave ? e.currentTarget.closest<HTMLElement>('li, article') : null
    const leaving = leaveRow(row)
    try {
      if (leaving) await new Promise((r) => setTimeout(r, 300))
      await onConfirm()
      // la fila debería haber desaparecido; si sigue ahí tras un momento, vuelve a verse
      restoreIfStill(row, leaving)
    } catch (err) {
      leaving?.cancel()
      throw err
    } finally {
      started.current = false
      setPending(false)
    }
  }

  return (
    <div className={'confirm-in flex flex-wrap items-center gap-2 text-sm ' + className}>
      {question && <span className={'text-gray-700 dark:text-gray-300 ' + questionClassName}>{question}</span>}
      <button type="button" disabled={locked} onClick={handleConfirm} className={dangerButton} style={{ '--i': 1 } as CSSProperties}>
        {busy ? 'Eliminando…' : confirmLabel}
      </button>
      <button type="button" disabled={locked} onClick={onCancel} className={cancelButton} style={{ '--i': 2 } as CSSProperties}>
        No
      </button>
    </div>
  )
}

/** Botón «Eliminar» que pide confirmación en el sitio («¿Eliminar…? Sí / No») antes de llamar a `onConfirm`. */
export default function DeleteButton({
  onConfirm,
  label = 'Eliminar',
  question = '¿Eliminar?',
  confirmClassName = 'shrink-0',
}: {
  onConfirm: () => Promise<void>
  label?: string
  /** qué se elimina, con su nombre si lo tiene: «¿Eliminar la receta «Lentejas»?» */
  question?: string
  /** p. ej. «basis-full» para que la confirmación pase a su propia línea si no cabe junto al botón */
  confirmClassName?: string
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
        question={question}
        questionClassName="w-full"
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
        className={confirmClassName}
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
