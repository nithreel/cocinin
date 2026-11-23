import { useState, type FormEvent } from 'react'
import { addIngredient, type ExpiryInput } from './data'
import type { ExpiryMode } from '../../lib/collections'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import { normalizeText } from '../../lib/search'
import { NO_GROUP } from '../../lib/groupByPantryGroup'
import ExpiryFields from './ExpiryFields'
import { inputField } from '../../components/inputStyles'

/** Formulario de ingrediente nuevo. Avisa si el nombre ya existe (sin tildes ni mayúsculas); pulsar «Añadir» otra
 *  vez lo crea igualmente. `onDone` recibe el id y el grupo para resaltarlo. */
export default function AddIngredientForm({
  groups,
  existingNames,
  onDone,
}: {
  groups: { id: string; name: string }[]
  /** nombres que ya hay, para avisar de duplicados («Leche» / «leche») */
  existingNames: string[]
  onDone: (id?: string, groupId?: string | null) => void
}) {
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState(NO_GROUP)
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('none')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // nombre ya avisado como duplicado: si se vuelve a pulsar «Añadir», se crea igualmente
  const [warnedName, setWarnedName] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const key = normalizeText(name).trim()
    if (warnedName !== key && existingNames.some((n) => normalizeText(n).trim() === key)) {
      setWarnedName(key)
      return
    }
    setSubmitting(true)
    try {
      const expiry: ExpiryInput = { mode: expiryMode, date: expiryDate || null, quantity }
      const targetGroup = groupId === NO_GROUP ? null : groupId
      const id = await addIngredient(name.trim(), targetGroup, expiry)
      onDone(id, targetGroup)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-moss-700 dark:bg-moss-900">
      <div className="flex flex-wrap gap-2">
        <input autoComplete="off"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setWarnedName(null)
          }}
          placeholder="Nombre del ingrediente"
          className={inputField + ' min-w-40 flex-1'}
        />
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className={inputField}
        >
          <option value={NO_GROUP}>Sin grupo</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} quantity={quantity} onQuantityChange={setQuantity} />
      </div>
      {warnedName !== null && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          Ya existe un ingrediente con ese nombre. Pulsa «Añadir» otra vez si quieres crearlo igualmente.
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={primaryButton}
        >
          Añadir
        </button>
        <button type="button" onClick={() => onDone()} className={cancelButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
