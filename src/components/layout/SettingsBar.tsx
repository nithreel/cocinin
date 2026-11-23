import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDelete } from '../DeleteButton'
import { dangerTextButton, primaryButton } from '../buttonStyles'
import { allWritesSynced } from '../../lib/pendingWrites'
import { BellIcon, DownloadIcon, GearIcon, LogoutIcon, SlidersIcon, UsersIcon } from '../icons'
import { downloadBackup } from '../../lib/backup'
import { transitionClick } from '../../lib/pageTransition'
import { prefersReducedMotion } from '../../lib/motion'
import { greeting } from '../../lib/greeting'

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
export default function SettingsBar({ up = false }: { up?: boolean }) {
  const { isAdmin, alias } = useAuth()
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
          <p className="min-w-0 flex-1 truncate px-2 text-xs text-gray-500 dark:text-gray-400">{(() => {
              const g = greeting(alias)
              return (
                <>
                  {g.before}
                  {g.name && <strong className="font-bold text-emerald-900 dark:text-white">{g.name}</strong>}
                  {g.after}
                </>
              )
            })()}
          </p>
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
