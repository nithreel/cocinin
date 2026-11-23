import { useState } from 'react'
import { deleteGroup } from './data'
import { ConfirmDelete } from '../../components/DeleteButton'
import RemoveButton from '../../components/RemoveButton'
import IconsReveal from '../../components/IconsReveal'
import { CaretIcon, PencilIcon, SnowflakeIcon } from '../../components/icons'
import Collapse from '../../components/Collapse'
import Pop, { useSettled } from '../../components/Pop'
import { keepFocus } from '../../lib/keepFocus'
import { useLongPress } from '../../lib/useLongPress'
import { rowIconButton } from '../../components/buttonStyles'
import { groupBadgeCounts } from '../../lib/expiry'
import type { GroupDraft, PantrySection } from '../../lib/pantrySections'
import IsFoodCheckbox from './IsFoodCheckbox'

export default function GroupHeader({
  section,
  isCollapsed,
  onToggleCollapsed,
  organizing,
  onStartOrganize,
  draft,
  onDraftChange,
  handle,
}: {
  section: PantrySection
  isCollapsed: boolean
  onToggleCollapsed: () => void
  /** modo «organizar grupos»: asa para mover, lápiz para renombrar y ✕ para eliminar */
  organizing: boolean
  onStartOrganize: () => void
  /** borrador de nombre y «Es comida» mientras se edita en el sitio (undefined = no se está editando) */
  draft: GroupDraft | undefined
  onDraftChange: (draft: GroupDraft | null) => void
  handle?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const settled = useSettled()
  // congelados (❄) y descongelando (❄ tachado) van aparte; los descongelando con aviso cuentan también en el ámbar
  const { warnCount, frozenCount, thawCount } = groupBadgeCounts(section.items)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const longPress = useLongPress(onStartOrganize)
  const canOrganize = section.deletable

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGroup(section.id)
    } finally {
      setDeleting(false)
    }
  }

  const badges = (
    <>
      <span className="shrink-0 font-normal normal-case text-gray-500 dark:text-gray-400">({section.items.length})</span>
      {frozenCount > 0 && (
        <Pop
          animate={settled}
          trigger={frozenCount}
          title={`${frozenCount} congelado${frozenCount === 1 ? '' : 's'}`}
          aria-label={`${frozenCount} ingrediente${frozenCount === 1 ? '' : 's'} congelado${frozenCount === 1 ? '' : 's'}`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-frost-100 px-2 text-xs font-semibold normal-case text-frost-700 dark:bg-frost-950 dark:text-frost-400"
        >
          <SnowflakeIcon className="h-3 w-3" /> {frozenCount}
        </Pop>
      )}
      {thawCount > 0 && (
        <Pop
          animate={settled}
          trigger={thawCount}
          title={`${thawCount} descongelando`}
          aria-label={`${thawCount} ingrediente${thawCount === 1 ? '' : 's'} descongelando`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-frost-100 px-2 text-xs font-semibold normal-case text-frost-700 dark:bg-frost-950 dark:text-frost-400"
        >
          <SnowflakeIcon className="h-3 w-3" crossed /> {thawCount}
        </Pop>
      )}
      {warnCount > 0 && (
        <Pop
          animate={settled}
          trigger={warnCount}
          title={`${warnCount} con aviso`}
          aria-label={`${warnCount} ingrediente${warnCount === 1 ? '' : 's'} con aviso`}
          className="shrink-0 rounded-full bg-amber-100 px-2 text-xs font-semibold normal-case text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        >
          ⚠ {warnCount}
        </Pop>
      )}
    </>
  )

  // la flecha > se convierte en tres rayas (asa de arrastre) al organizar
  const lead = (
    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400">
      <span
        aria-hidden="true"
        className={'absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ' + (organizing ? 'scale-50 rotate-90 opacity-0' : 'opacity-100')}
      >
        <CaretIcon open={!isCollapsed} />
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
        className={'absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ' + (organizing && canOrganize ? 'opacity-100' : 'scale-50 -rotate-90 opacity-0')}
      >
        <path d="M2 3.5h10M2 7h10M2 10.5h10" />
      </svg>
      {organizing && canOrganize && handle && (
        <button
          type="button"
          aria-label={`Mover «${section.name}» (arrastra, o usa ↑ ↓)`}
          {...handle}
          className="absolute -inset-2 cursor-grab touch-none active:cursor-grabbing"
        />
      )}
    </span>
  )

  const titleClasses = 'flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
  return (
    <div className={organizing ? '' : 'sticky top-[var(--head-h)] z-10 mb-1 bg-white py-1 dark:bg-moss-950'}>
      <div className={'flex items-center justify-between gap-2' + (organizing ? ' min-h-10' : '')}>
        {organizing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {lead}
            {draft ? (
              <input
                autoComplete="off"
                autoFocus
                value={draft.name}
                onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
                aria-label="Nombre del grupo"
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-0.5 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-moss-700 dark:bg-moss-800 dark:text-gray-100"
              />
            ) : (
              <div className={titleClasses}>
                <span className="truncate">{section.name}</span>
                {badges}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => {
              // tras una pulsación larga el clic que sigue no debe plegar ni desplegar
              if (longPress.consumeFired()) return
              onToggleCollapsed()
            }}
            {...(canOrganize ? longPress.handlers : {})}
            title={canOrganize ? 'Mantén pulsado para organizar los grupos' : undefined}
            aria-expanded={!isCollapsed}
            className={titleClasses + ' select-none hover:text-gray-700 dark:hover:text-gray-200'}
          >
            {lead}
            <span className="truncate">{section.name}</span>
            {badges}
          </button>
        )}
        <IconsReveal show={organizing && canOrganize && !confirmingDelete} className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => onDraftChange(draft ? null : { name: section.name, isFood: section.isFood })}
            aria-label={`Editar «${section.name}»`}
            aria-pressed={!!draft}
            title="Editar el grupo"
            className={rowIconButton + (draft ? ' !text-emerald-600 dark:!text-emerald-400' : '')}
          >
            <PencilIcon />
          </button>
          <RemoveButton trash row={false} onRemove={() => setConfirmingDelete(true)} label={`Eliminar «${section.name}»`} title="Eliminar el grupo" />
        </IconsReveal>
      </div>
      {organizing && canOrganize && confirmingDelete && (
        <ConfirmDelete
          question={
            section.items.length > 0
              ? `¿Eliminar «${section.name}»? Sus ${section.items.length} ingredientes pasan a Sin grupo.`
              : `¿Eliminar «${section.name}»?`
          }
          questionClassName="w-full"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
          className="mt-1"
        />
      )}
      <Collapse open={organizing && !!draft}>
        <div className="pb-1 pl-7 pt-2">
          <IsFoodCheckbox checked={draft?.isFood ?? section.isFood} onChange={(v) => draft && onDraftChange({ ...draft, isFood: v })} />
        </div>
      </Collapse>
    </div>
  )
}
