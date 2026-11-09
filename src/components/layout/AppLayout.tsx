import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { ToastProvider } from '../Toast'
import ErrorToast from '../ErrorToast'
import AccountMenu from '../AccountMenu'
import { BookIcon, CartIcon, MoreIcon, NoteIcon, PantryIcon } from '../icons'
import { useDataError, useNotes } from '../../lib/AppDataContext'

const NAV_ITEMS = [
  { to: '/despensa', label: 'Despensa', Icon: PantryIcon },
  { to: '/lista', label: 'Lista', Icon: CartIcon },
  { to: '/recetario', label: 'Recetario', Icon: BookIcon },
  { to: '/notas', label: 'Notas', Icon: NoteIcon },
]

const MORE_PATHS = ['/mas', '/avisos', '/usuarios']

function navLinkClasses(isActive: boolean) {
  return [
    'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-sm md:flex-none md:flex-row md:justify-start md:gap-2 md:px-4 md:py-2 md:text-base md:rounded-lg',
    isActive
      ? 'text-emerald-700 md:bg-emerald-100 md:text-emerald-800 dark:text-emerald-400 dark:md:bg-emerald-900/40 dark:md:text-emerald-300'
      : 'text-gray-500 hover:text-emerald-700 md:hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:md:hover:bg-emerald-900/20',
  ].join(' ')
}

function Brand({ size }: { size: string }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/icons/icon.svg" alt="" className={size + ' rounded-lg'} />
      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">CocinIN</span>
    </div>
  )
}

/** Notas con aviso que vencen hoy y aún no se han enviado: insignia en la pestaña. */
function usePendingToday() {
  const { notes } = useNotes()
  return useMemo(() => {
    // oxlint-disable-next-line react/purity -- depende de la hora actual a propósito
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return notes.filter((n) => n.notify && !n.sent && n.remindAt !== null && n.remindAt <= end.getTime()).length
  }, [notes])
}

function NavItems({ pending }: { pending: number }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => navLinkClasses(isActive)}>
          <span className="relative">
            <item.Icon />
            {item.to === '/notas' && pending > 0 && (
              <span
                aria-label={`${pending} avisos pendientes hoy`}
                className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold leading-none text-white"
              >
                {pending}
              </span>
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  )
}

export default function AppLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // Despensa y Recetario aprovechan pantallas anchas (dos columnas)
  const wide = pathname.startsWith('/despensa') || pathname.startsWith('/recetario')
  const dataError = useDataError()
  const pending = usePendingToday()

  return (
    <ToastProvider>
      <div className="flex h-dvh flex-col md:flex-row">
        <nav className="hidden shrink-0 border-r border-gray-200 bg-white p-3 md:flex md:w-56 md:flex-col md:gap-1 dark:border-moss-800 dark:bg-moss-900">
          <div className="px-2 py-1">
            <Brand size="h-10 w-10" />
          </div>
          <NavItems pending={pending} />
          <div className="mt-auto flex flex-col gap-1 border-t border-gray-100 pt-3 dark:border-moss-800">
            <p className="truncate px-2 pb-1 text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            <AccountMenu
              rowClass="flex items-center gap-2 rounded-lg px-4 py-2 text-left text-sm"
              activeClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              idleClass="text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
            />
          </div>
        </nav>

        <ErrorToast />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className={'mx-auto w-full ' + (wide ? 'max-w-3xl xl:max-w-6xl' : 'max-w-3xl')}>
            {dataError && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                No se pueden cargar los datos: {dataError}
              </p>
            )}
            <Outlet />
          </div>
        </main>

        <nav className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] max-md:[@media(max-height:480px)]:hidden md:hidden dark:border-moss-800 dark:bg-moss-900">
          <NavItems pending={pending} />
          <NavLink to="/mas" className={() => navLinkClasses(MORE_PATHS.includes(pathname))}>
            <MoreIcon />
            <span>Más</span>
          </NavLink>
        </nav>
      </div>
    </ToastProvider>
  )
}
