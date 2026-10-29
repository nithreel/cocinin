import { useState } from 'react'
import { downloadBackup } from '../lib/backup'
import { cancelButton } from './buttonStyles'

/** Descarga la copia de seguridad sin los correos de los miembros; la puede bajar cualquier usuario. */
export default function BackupButton({ className = cancelButton }: { className?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function handleClick() {
    setBusy(true)
    setError(false)
    try {
      await downloadBackup(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" disabled={busy} onClick={handleClick} className={className + ' disabled:opacity-50'}>
      {busy ? 'Descargando…' : error ? 'No se pudo descargar, reintentar' : 'Descargar copia de seguridad'}
    </button>
  )
}
