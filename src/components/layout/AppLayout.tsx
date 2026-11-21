import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { ToastProvider } from '../Toast'
import ErrorToast from '../ErrorToast'
import UpdatePrompt from '../UpdatePrompt'
import ReleaseNotice from '../ReleaseNotice'
import { ConfirmDelete } from '../DeleteButton'
import { dangerTextButton, primaryButton } from '../buttonStyles'
import { allWritesSynced } from '../../lib/pendingWrites'
import { BellIcon, BookIcon, CartIcon, DownloadIcon, LogoutIcon, NoteIcon, PantryIcon, UsersIcon } from '../icons'
import { downloadBackup } from '../../lib/backup'
import { useDataError } from '../../lib/AppDataContext'
import { transitionClick } from '../../lib/pageTransition'

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

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-moss-800 dark:hover:text-gray-200'

const activeIcon = ' !text-emerald-700 dark:!text-emerald-400'

function TopLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      onClick={transitionClick(navigate, to)}
      className={({ isActive }) => iconButton + (isActive ? activeIcon : '')}
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
      className={iconButton + ' disabled:animate-pulse disabled:opacity-50' + (state === 'error' ? ' !text-red-600' : '')}
    >
      <DownloadIcon />
    </button>
  )
}

/** Cerrar sesión pide confirmación en un pequeño panel junto al icono. */
function LogoutButton({ up }: { up: boolean }) {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  // hay cambios hechos sin cobertura que aún no han subido: salir los perdería (se borra la caché local)
  const [unsynced, setUnsynced] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function handleLogout() {
    setChecking(true)
    const synced = await allWritesSynced()
    setChecking(false)
    if (synced) void signOut()
    else setUnsynced(true)
  }

  function close() {
    setOpen(false)
    setUnsynced(false)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cerrar sesión"
        aria-expanded={open}
        title="Cerrar sesión"
        className={iconButton}
      >
        <LogoutIcon />
      </button>
      {open && (
        <div
          role="alertdialog"
          aria-label="Confirmar cierre de sesión"
          className={
            'absolute z-50 w-max max-w-[calc(100vw-1rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-moss-700 dark:bg-moss-800 ' +
            (up ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2')
          }
        >
          {unsynced ? (
            <>
              <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                Hay cambios sin subir (sin conexión). Si sales ahora, se perderán.
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={close} className={primaryButton}>
                  Esperar
                </button>
                <button type="button" onClick={() => void signOut()} className={dangerTextButton}>
                  Salir igualmente
                </button>
              </div>
            </>
          ) : (
            <ConfirmDelete
              question="¿Cerrar sesión?"
              confirmLabel={checking ? 'Comprobando…' : 'Sí, salir'}
              leave={false}
              className="flex-nowrap whitespace-nowrap"
              onConfirm={() => void handleLogout()}
              onCancel={close}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Iconos de la barra: Usuarios (el admin los gestiona; el resto solo cambia su contraseña), copia, avisos y cerrar sesión. */
function TopIcons({ up = false }: { up?: boolean }) {
  const { isAdmin } = useAuth()
  return (
    <>
      <TopLink to="/usuarios" label="Usuarios">
        <UsersIcon />
      </TopLink>
      <BackupIcon withUsers={isAdmin} />
      <TopLink to="/avisos" label="Avisos">
        <BellIcon />
      </TopLink>
      <LogoutButton up={up} />
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
  const navigate = useNavigate()
  const { user } = useAuth()
  const dataError = useDataError()

  // Con el teclado del móvil abierto, la app mide solo lo que se ve (no lo que tapa el teclado):
  // así la lista se encoge y los resultados quedan por encima del teclado, en tiempo real.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const isField = (el: Element | null) =>
      !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range)$/.test((el as HTMLInputElement).type)))
    const apply = () => {
      root.style.setProperty('--app-h', `${vv.height}px`)
      // teclado abierto = campo enfocado y pantalla visible mucho menor que la física
      const kb = isField(document.activeElement) && vv.height < screen.height * 0.8
      root.toggleAttribute('data-kb', kb)
      // pantalla muy baja (móvil en horizontal con teclado): nada fijo, para que quepa el campo
      root.toggleAttribute('data-kb-low', kb && vv.height < 300)
      // iOS desplaza la página al abrir el teclado; la app ocupa justo la parte visible
      if (vv.offsetTop > 0) window.scrollTo(0, 0)
    }
    // al enfocar un campo, llevarlo al centro de lo visible cuando el teclado ya está abierto
    const onFocus = (e: FocusEvent) => {
      if (!isField(e.target as Element)) return
      const t = e.target as HTMLElement
      window.setTimeout(() => {
        apply()
        if (root.hasAttribute('data-kb')) {
          // buscadores: arriba, para dejar sitio a los resultados; el resto, al centro de lo visible
          const top = t.dataset.kbAlign === 'start' || root.hasAttribute('data-kb-low')
          t.scrollIntoView({ block: top ? 'start' : 'center', behavior: 'smooth' })
        }
      }, 350)
    }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', apply)
    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', apply)
      root.removeAttribute('data-kb')
      root.removeAttribute('data-kb-low')
      root.style.removeProperty('--app-h')
    }
  }, [])

  return (
    <ToastProvider>
    <div className="flex h-[var(--app-h,100dvh)] flex-col md:flex-row">
      <nav className="hidden shrink-0 border-r border-gray-200 bg-white p-3 md:flex md:w-56 md:flex-col md:gap-1 dark:border-moss-800 dark:bg-moss-900">
        <div className="px-2 py-1">
          <Brand size="h-10 w-10" />
        </div>
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
        <div className="mt-auto border-t border-gray-100 pt-3 dark:border-moss-800">
          <p className="mb-1 truncate px-2 text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          <div className="flex items-center justify-between">
            <TopIcons up />
          </div>
        </div>
      </nav>

      <header className="kb-hide flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-1 md:hidden dark:border-moss-800 dark:bg-moss-900">
        <Brand size="h-7 w-7" />
        <div className="flex items-center">
          <TopIcons />
        </div>
      </header>

      <ErrorToast />

      {/* Avisos de versión fijos arriba (no se mueven con el scroll ni se solapan con la cabecera de cada pantalla) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <UpdatePrompt />
        <ReleaseNotice />
        <main className="page-view scroll-pt-[calc(var(--head-h,0px)+1rem)] scroll-pb-20 flex-1 overflow-y-auto p-4 md:p-8">
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
      </nav>
    </div>
    </ToastProvider>
  )
}
