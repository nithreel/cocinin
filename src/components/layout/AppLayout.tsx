import { NavLink, Outlet } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import ErrorToast from '../ErrorToast'
import { BellIcon, BookIcon, CartIcon, DownloadIcon, LogoutIcon, NoteIcon, PantryIcon, UsersIcon } from '../icons'
import { downloadBackup } from '../../lib/backup'
import { useDataError } from '../../lib/AppDataContext'

const NAV_ITEMS = [
  { to: '/despensa', label: 'Despensa', Icon: PantryIcon },
  { to: '/lista', label: 'Lista', Icon: CartIcon },
  { to: '/recetario', label: 'Recetario', Icon: BookIcon },
  { to: '/notas', label: 'Notas', Icon: NoteIcon },
]

function navLinkClasses(isActive: boolean) {
  return [
    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-sm md:flex-none md:flex-row md:justify-start md:gap-2 md:px-4 md:py-2 md:text-base md:rounded-lg',
    isActive
      ? 'text-emerald-700 md:bg-emerald-100 md:text-emerald-800 dark:text-emerald-400 dark:md:bg-emerald-900/40 dark:md:text-emerald-300'
      : 'text-gray-500 hover:text-emerald-700 md:hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:md:hover:bg-emerald-900/20',
  ].join(' ')
}

const iconBase =
  "relative flex h-9 w-9 items-center justify-center rounded-lg after:absolute after:-inset-0.5 after:content-[''] hover:bg-gray-100 dark:hover:bg-moss-800"
const iconIdle = ' text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
const iconActive = ' text-emerald-700 dark:text-emerald-400'
const iconButton = iconBase + iconIdle

function TopLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      className={({ isActive }) => iconBase + (isActive ? iconActive : iconIdle)}
    >
      {children}
    </NavLink>
  )
}

/** Descarga la base de datos (JSON). Los correos de los miembros solo van en la copia del admin. */
function BackupIcon({ withUsers }: { withUsers: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  async function handleClick() {
    setState('busy')
    try {
      await downloadBackup(withUsers)
      setState('idle')
    } catch {
      setState('error')
    }
  }
  const label = state === 'error' ? 'No se pudo descargar; reintentar' : 'Descargar copia de seguridad'
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'busy'}
      aria-label={label}
      title={label}
      className={(state === 'error' ? iconBase + ' text-red-600' : iconButton) + ' disabled:opacity-50 motion-safe:disabled:animate-pulse'}
    >
      <DownloadIcon />
    </button>
  )
}

/** Iconos de la barra: Usuarios (solo admin), copia, avisos y cerrar sesión. */
function TopIcons() {
  const { isAdmin, signOut } = useAuth()
  return (
    <>
      {isAdmin && (
        <TopLink to="/usuarios" label="Usuarios">
          <UsersIcon />
        </TopLink>
      )}
      <BackupIcon withUsers={isAdmin} />
      <TopLink to="/avisos" label="Avisos">
        <BellIcon />
      </TopLink>
      <button type="button" onClick={() => signOut()} aria-label="Cerrar sesión" title="Cerrar sesión" className={iconButton}>
        <LogoutIcon />
      </button>
    </>
  )
}

function Brand({ size }: { size: string }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/icons/icon.svg" alt="" className={size + ' rounded-lg'} />
      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">CocinIN</span>
    </div>
  )
}

export default function AppLayout() {
  const { user } = useAuth()
  const dataError = useDataError()

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <nav className="hidden shrink-0 border-r border-gray-200 bg-white p-3 md:flex md:w-56 md:flex-col md:gap-1 dark:border-moss-800 dark:bg-moss-900">
        <div className="px-2 py-1">
          <Brand size="h-10 w-10" />
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
        <div className="mt-auto border-t border-gray-100 pt-3 dark:border-moss-800">
          <p className="mb-1 truncate px-2 text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          <div className="flex items-center justify-between">
            <TopIcons />
          </div>
        </div>
      </nav>

      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-1 md:hidden dark:border-moss-800 dark:bg-moss-900">
        <Brand size="h-7 w-7" />
        <div className="flex items-center">
          <TopIcons />
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

      <nav className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] max-md:[@media(max-height:480px)]:hidden md:hidden dark:border-moss-800 dark:bg-moss-900">
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
