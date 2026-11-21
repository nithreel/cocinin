import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth/AuthContext'
import { ToastProvider } from '../Toast'
import ErrorToast from '../ErrorToast'
import UpdatePrompt from '../UpdatePrompt'
import ReleaseNotice from '../ReleaseNotice'
import { ConfirmDelete } from '../DeleteButton'
import { dangerTextButton, primaryButton } from '../buttonStyles'
import { allWritesSynced } from '../../lib/pendingWrites'
import { BellIcon, BookIcon, CartIcon, DownloadIcon, GearIcon, LogoutIcon, NoteIcon, PantryIcon, SlidersIcon, UsersIcon } from '../icons'
import { downloadBackup } from '../../lib/backup'
import { useDataError } from '../../lib/AppDataContext'
import { transitionClick } from '../../lib/pageTransition'
import { prefersReducedMotion } from '../../lib/motion'
import { smoothBehavior } from '../../lib/scroll'
import { useSettings } from '../../lib/settings'
import { useWakeLock } from '../../lib/wakeLock'

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

/** En la barra lateral (escritorio) los iconos se despliegan como lista con texto. */
const listButton =
  'ripple relative flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-moss-800 dark:hover:text-gray-100'

const activeIcon = ' !text-emerald-700 dark:!text-emerald-400'

/** Páginas que se abren desde la barra de ajustes: con una abierta, la ⚙ se ve en verde aunque esté plegada. */
const BAR_PAGES = ['/avisos', '/usuarios', '/ajustes']

function TopLink({ to, label, labeled, children }: { to: string; label: string; labeled: boolean; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      onClick={transitionClick(navigate, to)}
      className={({ isActive }) => (labeled ? listButton : iconButton) + (isActive ? activeIcon : '')}
    >
      {children}
      {labeled && <span>{label}</span>}
    </NavLink>
  )
}

/** Descarga la base de datos (JSON). Los correos de los miembros solo van en la copia del admin. */
function BackupIcon({ withUsers, labeled }: { withUsers: boolean; labeled: boolean }) {
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
      className={(labeled ? listButton : iconButton) + ' disabled:animate-pulse disabled:opacity-50' + (state === 'error' ? ' !text-red-600' : '')}
    >
      <DownloadIcon />
      {labeled && <span>{state === 'error' ? 'Reintentar copia' : 'Descargar copia'}</span>}
    </button>
  )
}

/** Cerrar sesión pide confirmación en un pequeño panel junto al icono. */
function LogoutButton({ up, labeled, onOpenChange }: { up: boolean; labeled: boolean; onOpenChange: (open: boolean) => void }) {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  // hay cambios hechos sin cobertura que aún no han subido: salir los perdería (se borra la caché local)
  const [unsynced, setUnsynced] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // la barra de ajustes no se pliega mientras esta confirmación está abierta
  useEffect(() => onOpenChange(open), [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    function onDown(e: Event) {
      const t = e.target as Node
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return
      close()
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

  // en la cabecera del móvil, anclada al borde derecho de la pantalla (el icono queda a la izquierda de la fila y un
  // panel pegado a él se saldría); en el escritorio, junto al botón
  const panel = (
    <div
      ref={panelRef}
      role="alertdialog"
      aria-label="Confirmar cierre de sesión"
      className={
        'z-50 w-max max-w-[calc(100vw-1rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-moss-700 dark:bg-moss-800 ' +
        (up ? 'absolute bottom-full left-0 mb-2' : 'fixed right-2 top-[calc(3rem+env(safe-area-inset-top))]')
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
  )

  return (
    <div ref={ref} className={labeled ? 'relative w-full' : 'relative'}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cerrar sesión"
        aria-expanded={open}
        title="Cerrar sesión"
        className={labeled ? listButton : iconButton}
      >
        <LogoutIcon />
        {labeled && <span>Cerrar sesión</span>}
      </button>
      {open && (up ? panel : createPortal(panel, document.body))}
    </div>
  )
}

/** Barra de ajustes: una ⚙ que despliega (y pliega) copia, avisos, usuarios (solo admin), cerrar sesión y ajustes
 *  adicionales. En la cabecera del móvil salen de detrás de la rueda hacia la izquierda; en la barra lateral del
 *  escritorio (200 px, no caben seis iconos en fila) se despliegan hacia arriba como lista con texto.
 *  Siempre empieza plegada; se pliega con la ⚙, Escape, al navegar o al tocar fuera (no con «¿Cerrar sesión?» abierto). */
function SettingsBar({ up = false }: { up?: boolean }) {
  const { user, isAdmin } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  // sigue montada mientras los iconos vuelven a la rueda
  const [mounted, setMounted] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  const rootRef = useRef<HTMLDivElement>(null)
  const gearRef = useRef<HTMLButtonElement>(null)
  const confirmOpen = useRef(false)
  const onConfirmChange = useCallback((v: boolean) => {
    confirmOpen.current = v
  }, [])
  const id = useId()

  if (open && !mounted) setMounted(true)
  // al navegar a una pantalla de la propia barra (Notificaciones, Usuarios, Ajustes) sigue desplegada, para poder seguir
  // moviéndose por ella; al ir a Despensa, Lista, Recetario o Notas se pliega
  if (pathname !== lastPath) {
    setLastPath(pathname)
    if (!BAR_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) setOpen(false)
  }

  const items: { key: string; node: ReactNode }[] = [
    // de izquierda a derecha (la rueda queda al final)
    { key: 'salir', node: <LogoutButton up={up} labeled={up} onOpenChange={onConfirmChange} /> },
    ...(isAdmin ? [{ key: 'usuarios', node: <TopLink to="/usuarios" label="Usuarios" labeled={up}><UsersIcon /></TopLink> }] : []),
    { key: 'avisos', node: <TopLink to="/avisos" label="Notificaciones" labeled={up}><BellIcon /></TopLink> },
    { key: 'ajustes', node: <TopLink to="/ajustes" label="Ajustes adicionales" labeled={up}><SlidersIcon /></TopLink> },
    { key: 'copia', node: <BackupIcon withUsers={isAdmin} labeled={up} /> },
  ]
  const n = items.length

  useEffect(() => {
    if (open) return
    // sin animaciones se desmonta ya; si no, cuando el último icono ha vuelto a la rueda
    const t = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : 220 + n * 30)
    return () => window.clearTimeout(t)
  }, [open, n])

  useEffect(() => {
    if (!open) return
    // solo se pliega sola al pulsar una pestaña principal (también si ya estás en ella) o la propia rueda; tocar el
    // contenido de la pantalla no la pliega
    function onDown(e: Event) {
      if (confirmOpen.current) return
      if (e.target instanceof Element && e.target.closest('.nav-link')) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || confirmOpen.current) return
      setOpen(false)
      gearRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onBarPage = BAR_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const gear = (
    <button
      ref={gearRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={open ? 'Ocultar ajustes' : 'Ajustes'}
      aria-expanded={open}
      aria-controls={id}
      title={open ? 'Ocultar ajustes' : 'Ajustes'}
      className={'gear-btn relative z-10 shrink-0 ' + iconButton + (onBarPage || open ? activeIcon : '')}
    >
      <GearIcon />
    </button>
  )
  const group = mounted && (
    <div
      id={id}
      inert={!open}
      className={
        (up ? 'bar-up mb-1 flex flex-col gap-0.5 ' : 'flex items-center ') + (open ? 'bar-in' : 'bar-out')
      }
      style={{ '--n': n } as CSSProperties}
    >
      {items.map((it, i) => (
        <div key={it.key} className={up ? 'flex' : 'flex shrink-0'} style={{ '--d': n - i } as CSSProperties}>
          {it.node}
        </div>
      ))}
    </div>
  )

  if (up) {
    return (
      <div ref={rootRef}>
        {group}
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate px-2 text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          {gear}
        </div>
      </div>
    )
  }
  return (
    <div ref={rootRef} className="flex min-w-0 items-center">
      {group}
      {gear}
    </div>
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
  const dataError = useDataError()
  // «Mantener la pantalla encendida» (ajuste del dispositivo) vale en toda la app
  useWakeLock(useSettings().wakeLock)

  // Con el teclado del móvil abierto, la app mide solo lo que se ve (no lo que tapa el teclado):
  // así la lista se encoge y los resultados quedan por encima del teclado, en tiempo real.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const isField = (el: Element | null) =>
      !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range)$/.test((el as HTMLInputElement).type)))
    // solo en pantallas táctiles: en un PC con la ventana baja no hay teclado en pantalla
    const coarse = window.matchMedia('(pointer: coarse)')
    let wasKb = false
    const apply = () => {
      root.style.setProperty('--app-h', `${vv.height}px`)
      const field = isField(document.activeElement)
      // teclado abierto = campo enfocado y pantalla visible mucho menor que la física
      const small = coarse.matches && vv.height < screen.height * 0.8
      const kb = field && small
      // teclado cerrado con «Atrás»: el campo sigue enfocado y el siguiente toque lo reabriría (y la pantalla
      // saltaría bajo el dedo), así que se le quita el foco
      if (wasKb && field && !small) (document.activeElement as HTMLElement).blur()
      wasKb = kb
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
          t.scrollIntoView({ block: top ? 'start' : 'center', behavior: smoothBehavior() })
        }
      }, 350)
    }
    document.addEventListener('focusin', onFocus)
    // con retardo: si no, al tocar un botón con el teclado abierto la pantalla se recoloca antes de soltar y el toque se pierde
    let outTimer = 0
    const onFocusOut = () => {
      window.clearTimeout(outTimer)
      outTimer = window.setTimeout(apply, 300)
    }
    document.addEventListener('focusout', onFocusOut)
    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onFocusOut)
      window.clearTimeout(outTimer)
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
        <main className="page-view scroll-pt-[calc(var(--head-h,0px)+1rem+1px)] scroll-pb-20 flex-1 overflow-y-auto p-4 md:p-8">
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
