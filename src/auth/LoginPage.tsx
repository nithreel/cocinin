import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { useAuth } from './AuthContext'

function errorMessage(err: unknown) {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email o contraseña incorrectos.'
      case 'auth/invalid-email':
        return 'El email no es válido.'
      case 'auth/email-already-in-use':
        return 'Ese email ya tiene cuenta. Inicia sesión.'
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil (mínimo 6 caracteres).'
      case 'auth/operation-not-allowed':
        return 'Activa el acceso con email/contraseña en Firebase Authentication.'
      case 'permission-denied':
        return 'Las reglas de Firestore no están desplegadas (firebase deploy --only firestore:rules).'
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Prueba de nuevo en unos minutos.'
      default:
        return 'No se ha podido completar la operación. Inténtalo de nuevo.'
    }
  }
  return 'No se ha podido completar la operación. Inténtalo de nuevo.'
}

export default function LoginPage() {
  const { user, isMember, needsSetup, signIn, resetPassword, createFirstUser } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const setupMode = needsSetup === true

  if (user && isMember) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/despensa'
    return <Navigate to={redirectTo} replace />
  }

  async function handleReset() {
    setError(null)
    setInfo(null)
    if (!email.trim()) {
      setError('Escribe tu email y vuelve a pulsar.')
      return
    }
    try {
      await resetPassword(email.trim())
    } catch (err) {
      // No revelamos si el correo existe: solo avisamos de fallos que no lo desvelan.
      if (err instanceof FirebaseError && err.code === 'auth/invalid-email') {
        setError(errorMessage(err))
        return
      }
    }
    setInfo('Si ese email tiene cuenta, te hemos enviado un enlace para crear una contraseña nueva.')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      if (setupMode) await createFirstUser(email, password)
      else await signIn(email, password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gray-50 p-4 dark:bg-moss-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-moss-800 dark:bg-moss-900"
      >
        <img src="/icons/icon.svg" alt="CocinIN" className="mb-3 h-16 w-16 rounded-2xl" />
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {setupMode ? 'Bienvenido. Crea el primer usuario para empezar.' : 'Inicia sesión para continuar'}
        </p>

        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete={setupMode ? 'new-password' : 'current-password'}
          minLength={setupMode ? 6 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />

        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-400">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? (setupMode ? 'Creando…' : 'Entrando…') : setupMode ? 'Crear usuario' : 'Entrar'}
        </button>
        {!setupMode && (
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ¿Has olvidado la contraseña?
          </button>
        )}
      </form>
    </div>
  )
}
