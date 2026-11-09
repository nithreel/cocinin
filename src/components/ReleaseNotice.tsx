import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { cancelButton, linkButton } from './buttonStyles'
import { compareVersions, fetchLatestRelease, type LatestRelease } from '../lib/releases'

const REPO = import.meta.env.VITE_UPDATE_REPO || 'nithreel/cocinin'
const DISABLED = import.meta.env.VITE_DISABLE_UPDATE_CHECK === 'true'
const KEY = 'cocinin:release'
const DAY = 24 * 60 * 60 * 1000

function readStore(): { checkedAt?: number; latest?: LatestRelease | null; dismissed?: string } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeStore(patch: object) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readStore(), ...patch }))
  } catch {
    /* sin almacenamiento: se vuelve a consultar en la próxima visita */
  }
}

/**
 * Aviso para el admin: hay una release más reciente en GitHub que la instalada. Una consulta al día
 * (la API pública de GitHub, sin claves). Solo se muestra al admin, que es quien actualiza la instalación.
 */
export default function ReleaseNotice() {
  const { isAdmin } = useAuth()
  const [latest, setLatest] = useState<LatestRelease | null>(null)
  const [dismissed, setDismissed] = useState(() => readStore().dismissed)

  useEffect(() => {
    if (!isAdmin || DISABLED) return
    const store = readStore()
    if (store.checkedAt && Date.now() - store.checkedAt < DAY) {
      setLatest(store.latest ?? null)
      return
    }
    let cancelled = false
    fetchLatestRelease(REPO)
      .then((release) => {
        writeStore({ checkedAt: Date.now(), latest: release })
        if (!cancelled) setLatest(release)
      })
      .catch(() => {
        /* sin conexión o límite de GitHub: se reintenta en la próxima visita */
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (!latest || latest.tag === dismissed || compareVersions(latest.tag, __APP_VERSION__) <= 0) return null
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
    >
      <span>
        Hay una versión nueva de CocinIN en GitHub: {latest.tag} (esta instalación es la v{__APP_VERSION__}). Para actualizar, ejecuta npm run actualizar en la carpeta del proyecto.
      </span>
      <span className="flex items-center gap-1">
        <a href={latest.url} target="_blank" rel="noreferrer" className={linkButton}>
          Ver novedades
        </a>
        <button
          type="button"
          onClick={() => {
            writeStore({ dismissed: latest.tag })
            setDismissed(latest.tag)
          }}
          className={cancelButton}
        >
          Descartar
        </button>
      </span>
    </div>
  )
}
