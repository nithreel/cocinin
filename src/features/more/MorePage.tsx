import { useAuth } from '../../auth/AuthContext'
import AccountMenu from '../../components/AccountMenu'
import StickyHeader from '../../components/StickyHeader'

/** Pestaña «Más» del móvil: lo que no es de uso diario (avisos, usuarios, copia, salir). */
export default function MorePage() {
  const { user } = useAuth()
  return (
    <div>
      <StickyHeader title="Más" />
      <p className="mb-3 truncate text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
      <div className="listbox flex flex-col">
        <AccountMenu
          rowClass="flex min-h-12 items-center gap-3 px-4 text-left text-gray-900 dark:text-gray-100"
          activeClass="text-emerald-700 dark:text-emerald-400"
          idleClass=""
        />
      </div>
    </div>
  )
}
