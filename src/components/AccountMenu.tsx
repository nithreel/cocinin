import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { downloadBackup } from '../lib/backup'
import { BellIcon, DownloadIcon, LogoutIcon, UsersIcon } from './icons'
import { ConfirmDelete } from './DeleteButton'

/**
 * Acciones de cuenta (Avisos, Usuarios, copia de seguridad, cerrar sesión). Se usa en la barra lateral de
 * escritorio y en la pestaña «Más» del móvil, para que sean idénticas en los dos sitios.
 */
export default function AccountMenu({
  rowClass,
  activeClass,
  idleClass,
}: {
  rowClass: string
  activeClass: string
  idleClass: string
}) {
  const { isAdmin, signOut } = useAuth()
  const [backup, setBackup] = useState<'idle' | 'busy' | 'error'>('idle')
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  async function handleBackup() {
    setBackup('busy')
    try {
      await downloadBackup(isAdmin)
      setBackup('idle')
    } catch {
      setBackup('error')
    }
  }

  const link = (to: string, label: string, icon: ReactNode) => (
    <NavLink to={to} className={({ isActive }) => rowClass + ' ' + (isActive ? activeClass : idleClass)}>
      {icon}
      <span>{label}</span>
    </NavLink>
  )

  return (
    <>
      {link('/avisos', 'Avisos', <BellIcon />)}
      {isAdmin && link('/usuarios', 'Usuarios', <UsersIcon />)}
      <button type="button" onClick={handleBackup} disabled={backup === 'busy'} className={rowClass + ' ' + idleClass + ' disabled:opacity-50'}>
        <DownloadIcon />
        <span className={backup === 'error' ? 'text-red-700 dark:text-red-400' : ''}>
          {backup === 'busy' ? 'Descargando…' : backup === 'error' ? 'No se pudo descargar; reintentar' : 'Copia de seguridad'}
        </span>
      </button>
      {confirmingLogout ? (
        <div className={rowClass + ' ' + idleClass}>
          <LogoutIcon />
          <ConfirmDelete
            question="¿Cerrar sesión?"
            confirmLabel="Sí, salir"
            onConfirm={() => signOut()}
            onCancel={() => setConfirmingLogout(false)}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmingLogout(true)} className={rowClass + ' ' + idleClass}>
          <LogoutIcon />
          <span>Cerrar sesión</span>
        </button>
      )}
    </>
  )
}
