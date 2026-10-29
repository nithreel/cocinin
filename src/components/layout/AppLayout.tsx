import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import ErrorToast from '../ErrorToast'
import { BellIcon, BookIcon, CartIcon, LogoutIcon, PantryIcon, UsersIcon } from '../icons'
import { useDataError } from '../../lib/AppDataContext'

const USERS_ITEM = { to: '/usuarios', label: 'Usuarios', Icon: UsersIcon }

const BASE_NAV_ITEMS = [
  { to: '/despensa', label: 'Despensa', Icon: PantryIcon },
  { to: '/lista', label: 'Lista', Icon: CartIcon },
  { to: '/recetario', label: 'Recetario', Icon: BookIcon },
]

function navLinkClasses(isActive: boolean) {
  return [
    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-sm md:flex-none md:flex-row md:justify-start md:gap-2 md:px-4 md:py-2 md:text-base md:rounded-lg',
    isActive
      ? 'text-emerald-700 md:bg-emerald-100 md:text-emerald-800 dark:text-emerald-400 dark:md:bg-emerald-900/40 dark:md:text-emerald-300'
      : 'text-gray-500 hover:text-emerald-700 md:hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:md:hover:bg-emerald-900/20',
  ].join(' ')
}

const iconButton =
  'flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-moss-800 dark:hover:text-gray-200'

/** Acceso a la pantalla de avisos; se resalta cuando está abierta. */
function AlertsLink() {
  return (
    <NavLink
      to="/avisos"
      aria-label="Avisos"
      title="Avisos"
      className={({ isActive }) => iconButton + (isActive ? ' !text-emerald-700 dark:!text-emerald-400' : '')}
    >
      <BellIcon />
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, isAdmin, signOut } = useAuth()
  const dataError = useDataError()
  const NAV_ITEMS = isAdmin ? [...BASE_NAV_ITEMS, USERS_ITEM] : BASE_NAV_ITEMS

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <nav className="hidden shrink-0 border-r border-gray-200 bg-white p-3 md:flex md:w-56 md:flex-col md:gap-1 dark:border-moss-800 dark:bg-moss-900">
        <div className="px-2 py-1">
          <img src="/icons/icon.svg" alt="CocinIN" className="h-10 w-10 rounded-lg" />
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            <item.Icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="mt-auto flex items-center gap-1 border-t border-gray-100 pt-3 dark:border-moss-800">
          <p className="min-w-0 flex-1 truncate px-2 text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          <AlertsLink />
          <button type="button" onClick={() => signOut()} aria-label="Cerrar sesión" title="Cerrar sesión" className={iconButton}>
            <LogoutIcon />
          </button>
        </div>
      </nav>

      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden dark:border-moss-800 dark:bg-moss-900">
        <img src="/icons/icon.svg" alt="CocinIN" className="h-9 w-9 rounded-lg" />
        <div className="flex items-center gap-1">
          <AlertsLink />
          <button type="button" onClick={() => signOut()} aria-label="Cerrar sesión" title="Cerrar sesión" className={iconButton}>
            <LogoutIcon />
          </button>
        </div>
      </header>

      <ErrorToast />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {dataError && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            No se pueden cargar los datos: {dataError}
          </p>
        )}
        <div className="mx-auto w-full max-w-3xl">
          <Outlet />
        </div>
      </main>

      <nav className="flex shrink-0 border-t border-gray-200 bg-white md:hidden dark:border-moss-800 dark:bg-moss-900">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            <item.Icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
