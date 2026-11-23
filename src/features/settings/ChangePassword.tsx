import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../../firebase'
import Collapse from '../../components/Collapse'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import { inputField } from '../../components/inputStyles'

const inputClasses = inputField + ' w-full'

function errorMessage(err: unknown) {
  if (err instanceof FirebaseError) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') return 'La contraseña actual no es correcta.'
    if (err.code === 'auth/weak-password') return 'La contraseña nueva es demasiado débil (mínimo 6 caracteres).'
    if (err.code === 'auth/too-many-requests') return 'Demasiados intentos. Espera un rato y vuelve a probar.'
    if (err.code === 'auth/network-request-failed') return 'Sin conexión: hace falta red para cambiar la contraseña.'
  }
  return 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'
}

/** Cambio de contraseña del usuario con sesión (pide la actual, para confirmar que eres tú). */
export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function close() {
    setOpen(false)
    setCurrent('')
    setNext('')
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const user = auth.currentUser
    if (!user?.email) return
    setBusy(true)
    setError(null)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
      await updatePassword(user, next)
      close()
      setDone(true)
      setTimeout(() => setDone(false), 5000)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm text-gray-900 dark:text-gray-100">Contraseña</span>
          {done ? (
            <span role="status" className="block text-xs text-emerald-700 dark:text-emerald-400">Contraseña cambiada ✓</span>
          ) : (
            <span className="block text-xs text-gray-500 dark:text-gray-400">Se pide la actual para confirmar que eres tú</span>
          )}
        </span>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className={outlineButton + ' shrink-0'}>
            Cambiar
          </button>
        )}
      </div>
      <Collapse open={open}>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-2 pt-3">
          <input type="password" required autoFocus autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Contraseña actual" aria-label="Contraseña actual" className={inputClasses} />
          <input type="password" required minLength={6} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Contraseña nueva (mínimo 6)" aria-label="Contraseña nueva" className={inputClasses} />
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={close} className={cancelButton}>
              Cancelar
            </button>
          </div>
        </form>
      </Collapse>
    </div>
  )
}
