import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ToastProvider } from '../Toast'
import ErrorToast from '../ErrorToast'
import UpdatePrompt from '../UpdatePrompt'
import ReleaseNotice from '../ReleaseNotice'
import { BookIcon, CartIcon, NoteIcon, PantryIcon } from '../icons'
import { useDataError } from '../../lib/AppDataContext'
import { transitionClick } from '../../lib/pageTransition'
import { useSettings } from '../../lib/settings'
import { useWakeLock } from '../../lib/wakeLock'
import { useKeyboardViewport } from '../../lib/useKeyboardViewport'
import SettingsBar from './SettingsBar'

const NAV_ITEMS = [
  { to: '/despensa', label: 'Despensa', Icon: PantryIcon },
  { to: '/lista', label: 'Lista', Icon: CartIcon },
  { to: '/recetario', label: 'Recetario', Icon: BookIcon },
  { to: '/notas', label: 'Notas', Icon: NoteIcon },
]

function navLinkClasses(isActive: boolean) {
  return [
    'nav-link ripple relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-sm md:flex-none md:flex-row md:justify-start md:gap-2 md:px-4 md:py-2 md:text-base md:rounded-lg',
    isActive
      ? 'nav-active text-emerald-700 md:bg-emerald-100 md:text-emerald-800 dark:text-emerald-400 dark:md:bg-emerald-900/40 dark:md:text-emerald-300'
      : 'text-gray-500 hover:text-emerald-700 md:hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:md:hover:bg-emerald-900/20',
  ].join(' ')
}

/** Las pestañas principales (barra lateral en escritorio y barra inferior en el móvil). */
function NavItems() {
  const navigate = useNavigate()
  return (
    <>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={transitionClick(navigate, item.to)}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            <item.Icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
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

/** Esqueleto de las pantallas con sesión: barra lateral (escritorio) o cabecera y pestañas (móvil), avisos de
 *  versión y error de datos, y la página en `<main>`. */
export default function AppLayout() {
  const dataError = useDataError()
  // «Mantener la pantalla encendida» (ajuste del dispositivo) vale en toda la app
  useWakeLock(useSettings().wakeLock)

  // Con el teclado del móvil abierto, la app mide solo lo que se ve (ver useKeyboardViewport).
  useKeyboardViewport()

  return (
    <ToastProvider>
    <div className="flex h-[var(--app-h,100dvh)] flex-col md:flex-row">
      <nav className="hidden shrink-0 border-r border-gray-200 bg-white p-3 md:flex md:w-56 md:flex-col md:gap-1 dark:border-moss-800 dark:bg-moss-900">
        <div className="px-2 py-1">
          <Brand size="h-10 w-10" />
        </div>
        <NavItems />
        <div className="mt-auto border-t border-gray-100 pt-3 dark:border-moss-800">
          <SettingsBar up />
        </div>
      </nav>

      <header className="kb-hide flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-1 md:hidden dark:border-moss-800 dark:bg-moss-900">
        <Brand size="h-7 w-7" />
        <SettingsBar />
      </header>

      <ErrorToast />

      {/* Avisos de versión fijos arriba (no se mueven con el scroll ni se solapan con la cabecera de cada pantalla) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <UpdatePrompt />
        <ReleaseNotice />
        <main className="page-view [overflow-anchor:none] scroll-pt-[calc(var(--head-h,0px)+1rem+1px)] scroll-pb-20 flex-1 overflow-y-auto p-4 md:p-8">
          {dataError && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              No se pueden cargar los datos: {dataError}
            </p>
          )}
          <div className="mx-auto w-full max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="kb-hide flex shrink-0 border-t border-gray-200 bg-white md:hidden dark:border-moss-800 dark:bg-moss-900">
        <NavItems />
      </nav>
    </div>
    </ToastProvider>
  )
}
