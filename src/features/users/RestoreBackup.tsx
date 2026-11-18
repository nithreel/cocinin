import { useRef, useState } from 'react'
import { cancelButton, dangerTextButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import { COLLECTION_LABELS, parseBackup, restoreBackup, type ParsedBackup, type RestorableName } from '../../lib/restore'

/** Solo admin: restaura un JSON de «Descargar copia de seguridad», fusionando o reemplazando. */
export default function RestoreBackup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [backup, setBackup] = useState<ParsedBackup | null>(null)
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleFile(file: File | undefined) {
    setMessage(null)
    setBackup(null)
    if (!file) return
    try {
      setBackup(parseBackup(await file.text()))
      setFileName(file.name)
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'No se pudo leer el archivo.' })
    }
  }

  function reset() {
    setBackup(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleRestore() {
    if (!backup) return
    setBusy(true)
    setMessage(null)
    try {
      const n = await restoreBackup(backup, mode)
      setMessage({ ok: true, text: `Copia restaurada (${n} cambios).` })
      reset()
    } catch (e) {
      setMessage({ ok: false, text: `No se pudo restaurar: ${e instanceof Error ? e.message : 'error desconocido'}. Hace falta conexión.` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 max-w-sm rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-700 dark:bg-moss-900">
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Restaurar copia</h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Sube un archivo de «Descargar copia de seguridad». Los usuarios no se restauran.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="hidden"
      />
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className={outlineButton + ' shrink-0'}>
          Elegir archivo…
        </button>
        <span className="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">{backup ? fileName : 'Ningún archivo'}</span>
      </div>

      {backup && (
        <div className="mb-3">
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{fileName} contiene:</p>
          <ul className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            {(Object.keys(backup) as RestorableName[]).map((name) => (
              <li key={name}>
                {backup[name]!.length} {COLLECTION_LABELS[name]}
              </li>
            ))}
          </ul>
          <label className="mb-1 flex items-start gap-2 text-sm text-gray-900 dark:text-gray-100">
            <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-1" />
            <span>Fusionar: añade y sobrescribe lo de la copia; lo demás se queda.</span>
          </label>
          <label className="mb-3 flex items-start gap-2 text-sm text-gray-900 dark:text-gray-100">
            <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1" />
            <span>Reemplazar: además borra lo que no esté en la copia.</span>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy} onClick={handleRestore} className={mode === 'replace' ? dangerTextButton : primaryButton}>
              {busy ? 'Restaurando…' : mode === 'replace' ? 'Reemplazar con la copia' : 'Fusionar con la copia'}
            </button>
            <button type="button" onClick={reset} className={cancelButton}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className={'text-sm ' + (message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {message.text}
        </p>
      )}
    </section>
  )
}
