import { cancelButton } from '../../components/buttonStyles'
import DragHandle from '../../components/DragHandle'
import { XIcon } from '../../components/icons'
import type { Group } from '../../lib/collections'
import { useDragReorder } from '../../lib/useDragReorder'
import { reorderGroups } from './data'

/** Panel para elegir el orden de los grupos (Despensa y Lista): arrastra el asa o usa ↑ ↓, igual que las etiquetas. */
export default function GroupsOrder({ groups, onClose }: { groups: Group[]; onClose: () => void }) {
  const { shown, draggingId, rowStyle, handleFor, rowRef } = useDragReorder(groups, (ids) => void reorderGroups(ids))

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Orden de los grupos</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className={cancelButton + ' -mr-2'}>
          <XIcon />
        </button>
      </div>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Se usa en la Despensa y en la lista de la compra (por ejemplo, el recorrido del súper).
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-moss-800">
        {shown.map((g) => (
          <li
            key={g.id}
            ref={rowRef(g.id)}
            style={rowStyle(g.id)}
            className={'flex items-center gap-2 py-2 ' + (draggingId === g.id ? 'relative z-10 rounded-md bg-emerald-50 shadow-md dark:bg-moss-800' : '')}
          >
            <DragHandle label={`Mover «${g.name}» (arrastra, o usa ↑ ↓)`} handle={handleFor(g.id)} />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{g.name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
