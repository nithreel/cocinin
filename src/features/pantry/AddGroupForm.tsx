import { useState, type FormEvent } from 'react'
import { addGroup } from './data'
import type { Group } from '../../lib/collections'
import { cancelButton, primaryButton } from '../../components/buttonStyles'
import { nextGroupOrder } from '../../lib/pantrySections'
import IsFoodCheckbox from './IsFoodCheckbox'

export default function AddGroupForm({ groups, onDone }: { groups: Group[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [isFood, setIsFood] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      // si ya hay un orden elegido a mano, el grupo nuevo va al final
      await addGroup(name.trim(), isFood, nextGroupOrder(groups))
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-moss-700 dark:bg-moss-900">
      <div className="flex gap-2">
        <input autoComplete="off"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del grupo"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
        />
      </div>
      <IsFoodCheckbox checked={isFood} onChange={setIsFood} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={primaryButton}
        >
          Añadir
        </button>
        <button type="button" onClick={onDone} className={cancelButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
