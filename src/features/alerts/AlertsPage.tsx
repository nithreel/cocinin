import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { cancelButton, outlineButton, primaryButton } from '../../components/buttonStyles'
import type { PushPrefs } from '../../lib/collections'
import {
  DEFAULT_PREFS,
  disablePush,
  enablePush,
  getPushState,
  savePrefs,
  showLocalTestNotification,
  type PushState,
} from '../../lib/push'

const KINDS: { key: keyof PushPrefs; label: string; hint: string }[] = [
  { key: 'gastado', label: 'Elemento gastado', hint: 'Cuando algo de la despensa se marca como agotado' },
  { key: 'lista', label: 'Lista de la compra', hint: 'Cuando se están añadiendo varios elementos' },
  { key: 'compra', label: 'Compra hecha', hint: 'Cuando se confirma la compra' },
  { key: 'receta', label: 'Receta nueva', hint: 'Cuando entra una receta en el recetario' },
  { key: 'usuario', label: 'Usuario nuevo', hint: 'Cuando se añade alguien a la familia' },
  { key: 'caducidad', label: 'Caducidad', hint: 'Cuando un ingrediente pasa a caducar en 3 días o menos' },
]

const MESSAGES: Partial<Record<PushState, string>> = {
  unsupported:
    'Este navegador no admite avisos. En iPhone hay que añadir CocinIN a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y abrirla desde ahí.',
  unconfigured: 'Esta instalación no tiene configurada la clave VAPID (VITE_VAPID_PUBLIC_KEY).',
  denied: 'Los avisos están bloqueados para esta app. Actívalos en los ajustes del navegador o del sistema.',
}

export default function AlertsPage() {
  const { user } = useAuth()
  const [state, setState] = useState<PushState | null>(null)
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tested, setTested] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPushState()
      .then((r) => {
        if (cancelled) return
        setState(r.state)
        setPrefs(r.prefs)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setState('off')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      if (!user) return
      const ok = await enablePush(user.uid, prefs)
      setState(ok ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off')
    })

  const disable = () =>
    run(async () => {
      await disablePush()
      setState('off')
    })

  function toggle(key: keyof PushPrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    if (state === 'on') void run(() => savePrefs(next))
  }

  const test = () =>
    run(async () => {
      await showLocalTestNotification()
      setTested(true)
      setTimeout(() => setTested(false), 3000)
    })

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">Avisos</h2>

      {state === null && <p className="text-gray-500 dark:text-gray-400">Cargando…</p>}

      {state && MESSAGES[state] && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {MESSAGES[state]}
        </p>
      )}

      {(state === 'off' || state === 'on') && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-moss-800 dark:bg-moss-900">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Avisos en este dispositivo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {state === 'on' ? 'Activados' : 'Desactivados'} · cada dispositivo se activa por separado
              </p>
            </div>
            {state === 'on' ? (
              <button type="button" disabled={busy} onClick={disable} className={outlineButton}>
                Desactivar
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={enable} className={primaryButton}>
                Activar
              </button>
            )}
          </div>

          <ul
            className={
              'mb-4 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900 ' +
              (state === 'on' ? '' : 'opacity-60')
            }
          >
            {KINDS.map((k) => (
              <li key={k.key}>
                <label className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900 dark:text-gray-100">{k.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{k.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs[k.key]}
                    disabled={busy}
                    onChange={() => toggle(k.key)}
                    className="h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 dark:border-moss-600 dark:bg-moss-800"
                  />
                </label>
              </li>
            ))}
          </ul>

          {state === 'on' && (
            <button type="button" disabled={busy} onClick={test} className={cancelButton}>
              {tested ? 'Enviado ✓' : 'Probar en este dispositivo'}
            </button>
          )}
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
