import { useEffect, useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import DeleteButton from '../../components/DeleteButton'
import { usersCol, type Member } from '../../lib/collections'
import { createAccount } from '../../firebase'
import { downloadBackup } from '../../lib/backup'

function errorMessage(err: unknown) {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'Ese email ya tiene cuenta en Firebase. Si es de otra cocina, usa otro email.'
      case 'auth/invalid-email':
        return 'El email no es válido.'
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil (mínimo 6 caracteres).'
    }
  }
  return 'No se ha podido crear el usuario. Inténtalo de nuevo.'
}

const inputClasses =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100'

export default function UsersPage() {
  const { user, isAdmin } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    return onSnapshot(query(usersCol, orderBy('createdAt')), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member))
      setLoading(false)
    })
  }, [])

  if (!isAdmin) return <Navigate to="/despensa" replace />

  async function handleExport() {
    setExporting(true)
    try {
      await downloadBackup()
    } finally {
      setExporting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const cleanEmail = email.trim()
      const uid = await createAccount(cleanEmail, password)
      await setDoc(doc(usersCol, uid), { email: cleanEmail, role: 'member', createdAt: Date.now() })
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">Usuarios</h2>

      {loading && <p className="text-gray-400 dark:text-gray-500">Cargando…</p>}

      <ul className="mb-6 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
              {m.email}
              {m.id === user?.uid && <span className="ml-2 text-xs text-gray-400">(tú)</span>}
              {m.role === 'admin' && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">Admin</span>}
            </span>
            {m.id !== user?.uid && m.role !== 'admin' && (
              <DeleteButton onConfirm={() => deleteDoc(doc(usersCol, m.id))} label="Quitar acceso" />
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSubmit}
        className="max-w-sm rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900"
      >
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Añadir usuario</h3>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="new-email">
          Email
        </label>
        <input
          id="new-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClasses + ' mb-3'}
        />
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="new-password">
          Contraseña inicial
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClasses + ' mb-3'}
        />
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear usuario'}
        </button>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          "Quitar acceso" bloquea al usuario en la app; su cuenta de Firebase sigue existiendo y puede borrarse desde
          la consola de Firebase Authentication.
        </p>
      </form>

      <section className="mt-8 max-w-sm rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Copia de seguridad</h3>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Descarga un archivo JSON con la despensa, la lista, las recetas y el historial.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-moss-700 dark:text-gray-300 dark:hover:bg-moss-800"
        >
          {exporting ? 'Exportando…' : 'Exportar copia'}
        </button>
      </section>
    </div>
  )
}
