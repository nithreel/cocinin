import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../../firebase'
import { cancelButton, primaryButton } from '../../components/buttonStyles'

const inputClasses =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100'

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
    <section className="mt-6 max-w-sm rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Mi contraseña</h3>
      {done && <p role="status" className="mb-2 text-sm text-emerald-700 dark:text-emerald-400">Contraseña cambiada ✓</p>}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={cancelButton}>
          Cambiar contraseña
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Contraseña actual" aria-label="Contraseña actual" className={inputClasses} />
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
      )}
    </section>
  )
}
