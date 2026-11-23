import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDelete } from '../../components/DeleteButton'
import KebabMenu from '../../components/KebabMenu'
import { usersCol, type Member } from '../../lib/collections'
import { memberName } from '../../lib/members'
import { useMembers } from '../../lib/useMembers'
import { createAccount } from '../../firebase'
import StickyHeader from '../../components/StickyHeader'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import { inputField } from '../../components/inputStyles'

function MemberRow({ m, isSelf }: { m: Member; isSelf: boolean }) {
  const [editing, setEditing] = useState(false)
  const [alias, setAlias] = useState(m.alias ?? '')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<'promote' | 'remove' | null>(null)

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
          <input autoComplete="off"
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
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
      <span className="min-w-0">
        <span className="block truncate text-gray-900 dark:text-gray-100">
          {memberName(m)}
          {isSelf && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(tú)</span>}
          {m.role === 'admin' && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">Admin</span>}
        </span>
        {m.alias?.trim() && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{m.email}</span>}
      </span>
      <KebabMenu
        items={[
          { label: m.alias?.trim() ? 'Editar alias' : 'Poner alias', onClick: () => setEditing(true) },
          ...(!isSelf && m.role !== 'admin' ? [{ label: 'Hacer admin', onClick: () => setPending('promote') }] : []),
          ...(!isSelf ? [{ label: 'Quitar acceso', onClick: () => setPending('remove'), danger: true }] : []),
        ]}
      />
      {pending && (
        <ConfirmDelete
          className="w-full basis-full"
          question={
            pending === 'promote'
              ? `¿Nombrar admin a ${memberName(m)}?`
              : m.role === 'admin'
                ? `${memberName(m)} es administrador. ¿Quitarle el acceso?`
                : `¿Quitar el acceso a ${memberName(m)}?`
          }
          questionClassName="w-full"
          confirmLabel={pending === 'promote' ? 'Sí, nombrar' : 'Sí, quitar'}
          leave={pending !== 'promote'}
          onConfirm={() => {
            if (pending === 'promote') void updateDoc(doc(usersCol, m.id), { role: 'admin' })
            else void deleteDoc(doc(usersCol, m.id))
            setPending(null)
          }}
          onCancel={() => setPending(null)}
        />
      )}
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
  return 'No se pudo añadir el usuario. Inténtalo de nuevo.'
}

const inputClasses = inputField + ' w-full'

/** Gestión de usuarios (solo admin: App.tsx manda a Despensa a los demás). Cambiar contraseña y restaurar copia
 *  están en Ajustes. */
export default function UsersPage() {
  const { user } = useAuth()
  const { members, loading } = useMembers()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

      <ul className="mb-6 mt-1 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
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
          {submitting ? 'Añadiendo…' : 'Añadir usuario'}
        </button>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          "Quitar acceso" bloquea al usuario en la app; su cuenta de Firebase sigue existiendo y puede borrarse desde
          la consola de Firebase Authentication.
        </p>
      </form>
    </div>
  )
}
