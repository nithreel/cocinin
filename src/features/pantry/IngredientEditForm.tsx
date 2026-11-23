import { useState, type FormEvent } from 'react'
import { updateIngredient, type ExpiryInput } from './data'
import type { ExpiryMode, Group, Ingredient } from '../../lib/collections'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import { NO_GROUP } from '../../lib/groupByPantryGroup'
import ExpiryFields from './ExpiryFields'
import { inputCompact } from '../../components/inputStyles'

/** Fila de la Despensa en modo edición: nombre, grupo, fecha y cantidad. Arranca con los datos actuales del ingrediente. */
export default function IngredientEditForm({
  ingredient,
  groups,
  onDone,
}: {
  ingredient: Ingredient
  groups: Group[]
  onDone: () => void
}) {
  const [name, setName] = useState(ingredient.name)
  const [groupId, setGroupId] = useState(ingredient.groupId ?? NO_GROUP)
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>(ingredient.expiryMode ?? 'none')
  const [expiryDate, setExpiryDate] = useState(ingredient.expiryDate ?? ingredient.stockedDate ?? '')
  const [quantity, setQuantity] = useState(ingredient.quantity ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const expiry: ExpiryInput = { mode: expiryMode, date: expiryDate || null, quantity }
      await updateIngredient(ingredient.id, name.trim(), groupId === NO_GROUP ? null : groupId, expiry)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="py-2 pl-3 pr-3">
      <form onSubmit={handleSave} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCompact + ' min-w-32 flex-1'}
          />
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={inputCompact}
          >
            <option value={NO_GROUP}>Sin grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExpiryFields mode={expiryMode} date={expiryDate} onModeChange={setExpiryMode} onDateChange={setExpiryDate} quantity={quantity} onQuantityChange={setQuantity} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className={primaryButton}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onDone}
            className={cancelButton}
          >
            Cancelar
          </button>
        </div>
      </form>
    </li>
  )
}
