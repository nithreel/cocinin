import { useEffect, useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import DeleteButton from '../../components/DeleteButton'
import { usersCol, type Member } from '../../lib/collections'
import { memberName } from '../../lib/members'
import { createAccount } from '../../firebase'
import StickyHeader from '../../components/StickyHeader'
import { cancelButton, primaryButton } from '../../components/buttonStyles'

function MemberRow({ m, isSelf }: { m: Member; isSelf: boolean }) {
  const [editing, setEditing] = useState(false)
  const [alias, setAlias] = useState(m.alias ?? '')
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await updateDoc(doc(usersCol, m.id), { alias: alias.trim() })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <li className="px-4 py-2">
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={30}
            placeholder={`Alias de ${m.email}`}
            aria-label={`Alias de ${m.email}`}
            className={inputClasses + ' min-w-32 flex-1'}
          />
          <button type="submit" disabled={busy} className={primaryButton}>
            Guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className={cancelButton}>
            Cancelar
          </button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2">
      <span className="min-w-0">
        <span className="block truncate text-gray-900 dark:text-gray-100">
          {memberName(m)}
          {isSelf && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(tú)</span>}
          {m.role === 'admin' && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">Admin</span>}
        </span>
        {m.alias?.trim() && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{m.email}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => setEditing(true)} className={cancelButton}>
          {m.alias?.trim() ? 'Editar alias' : 'Alias'}
        </button>
        {!isSelf && m.role !== 'admin' && (
          <DeleteButton onConfirm={() => deleteDoc(doc(usersCol, m.id))} label="Quitar acceso" confirmLabel="Sí, quitar" />
        )}
      </span>
    </li>
  )
}

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
  'w-full field'

export default function UsersPage() {
  const { user, isAdmin } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    return onSnapshot(query(usersCol, orderBy('createdAt')), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member))
      setLoading(false)
    })
  }, [])

  if (!isAdmin) return <Navigate to="/despensa" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const cleanEmail = email.trim()
      const uid = await createAccount(cleanEmail, password)
      await setDoc(doc(usersCol, uid), { email: cleanEmail, role: 'member', createdAt: Date.now(), by: user?.uid ?? null })
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
      <StickyHeader title="Usuarios" />

      {loading && <p className="text-gray-500 dark:text-gray-400">Cargando…</p>}

      <ul className="mb-6 mt-1 listbox">
        {members.map((m) => (
          <MemberRow key={m.id} m={m} isSelf={m.id === user?.uid} />
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
          className={primaryButton}
        >
          {submitting ? 'Creando…' : 'Crear usuario'}
        </button>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          "Quitar acceso" bloquea al usuario en la app; su cuenta de Firebase sigue existiendo y puede borrarse desde
          la consola de Firebase Authentication.
        </p>
      </form>
    </div>
  )
}
