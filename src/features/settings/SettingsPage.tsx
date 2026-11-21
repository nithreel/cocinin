import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import StickyHeader from '../../components/StickyHeader'
import Switch from '../../components/Switch'
import { outlineButton } from '../../components/buttonStyles'
import { downloadBackup } from '../../lib/backup'
import { cachedLatestRelease, compareVersions } from '../../lib/releases'
import { updateSettings, useSettings, type MotionMode } from '../../lib/settings'
import { wakeLockSupported } from '../../lib/wakeLock'
import ChangePassword from './ChangePassword'
import RestoreBackup from './RestoreBackup'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
function subscribeSystemMotion(fn: () => void) {
  const mq = matchMedia(REDUCE_QUERY)
  mq.addEventListener('change', fn)
  return () => mq.removeEventListener('change', fn)
}
const systemReduces = () => matchMedia(REDUCE_QUERY).matches

const MOTION_OPTIONS: { value: MotionMode; label: string; hint: (system: boolean) => string }[] = [
  { value: 'system', label: 'Como el sistema', hint: (system) => `Ahora: ${system ? 'reducidas' : 'completas'} (lo decide el ajuste de accesibilidad del móvil o del PC)` },
  { value: 'reduce', label: 'Reducidas', hint: () => 'Sin desplazamientos, rebotes ni transiciones. Para móviles que van lentos' },
  { value: 'full', label: 'Completas', hint: () => 'Todas las animaciones, aunque el sistema pida reducirlas' },
]

const rowText = 'block text-sm text-gray-900 dark:text-gray-100'
const rowHint = 'block text-xs text-gray-500 dark:text-gray-400'

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 px-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-moss-800 dark:border-moss-800 dark:bg-moss-900">
        {children}
      </div>
      {note && <p className="mt-2 px-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>}
    </section>
  )
}

function SwitchRow({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Switch checked={checked} disabled={disabled} onChange={onChange} label={label} />
      <span className="min-w-0">
        <span className={rowText}>{label}</span>
        <span className={rowHint}>{hint}</span>
      </span>
    </div>
  )
}

function DownloadRow({ withUsers }: { withUsers: boolean }) {
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
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className={rowText}>Descargar copia</span>
        <span className={state === 'error' ? 'block text-xs text-red-600 dark:text-red-400' : rowHint}>
          {state === 'error' ? 'No se pudo descargar. Inténtalo de nuevo.' : 'Un archivo JSON con todos los datos de la cocina'}
        </span>
      </span>
      <button type="button" onClick={handleClick} disabled={state === 'busy'} className={outlineButton + ' shrink-0 disabled:opacity-50'}>
        {state === 'busy' ? 'Descargando…' : 'Descargar'}
      </button>
    </div>
  )
}

/** Estado de la versión: solo con lo que ya se sabe (la consulta diaria del admin a GitHub), sin preguntar de nuevo. */
function versionStatus(isAdmin: boolean) {
  const latest = isAdmin ? cachedLatestRelease() : null
  if (!latest) return null
  return compareVersions(latest.tag, __APP_VERSION__) > 0 ? { ok: false, text: `Hay una versión nueva en GitHub: ${latest.tag}` } : { ok: true, text: 'Al día' }
}

/** Ajustes: los de este dispositivo (localStorage) y los de la cuenta. */
export default function SettingsPage() {
  const { isAdmin } = useAuth()
  const settings = useSettings()
  const system = useSyncExternalStore(subscribeSystemMotion, systemReduces)
  const canWake = wakeLockSupported()
  // en PC Chrome tiene navigator.vibrate pero no vibra nada: solo en pantallas táctiles
  const canVibrate = typeof navigator.vibrate === 'function' && matchMedia('(pointer: coarse)').matches
  const status = versionStatus(isAdmin)

  return (
    <div>
      <StickyHeader title="Ajustes" />

      <Section title="Animaciones" note="Se guarda en este dispositivo.">
        <div role="radiogroup" aria-label="Animaciones" className="divide-y divide-gray-100 dark:divide-moss-800">
          {MOTION_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <input
                type="radio"
                name="motion"
                checked={settings.motion === o.value}
                onChange={() => updateSettings({ motion: o.value })}
                className="h-4 w-4 shrink-0 accent-emerald-600 dark:[color-scheme:dark]"
              />
              <span className="min-w-0">
                <span className={rowText}>{o.label}</span>
                <span className={rowHint}>{o.hint(system)}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Pantalla" note="Se guarda en este dispositivo.">
        <SwitchRow
          label="Mantener la pantalla encendida"
          hint={canWake ? 'Mientras Cocinin esté abierto, para seguir una receta sin que se apague' : 'Este navegador no lo permite'}
          checked={canWake && settings.wakeLock}
          disabled={!canWake}
          onChange={(v) => updateSettings({ wakeLock: v })}
        />
        {canVibrate && (
          <SwitchRow
            label="Vibración"
            hint="Al mantener pulsado (organizar grupos, notas)"
            checked={settings.vibration}
            onChange={(v) => updateSettings({ vibration: v })}
          />
        )}
      </Section>

      <Section title="Cuenta">
        <ChangePassword />
      </Section>

      <Section title="Copia de seguridad">
        <DownloadRow withUsers={isAdmin} />
        {isAdmin && <RestoreBackup />}
      </Section>

      <Section title="Acerca de">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className={rowText}>Versión</span>
          <span className="min-w-0 text-right text-sm">
            <span className="text-gray-700 dark:text-gray-300">v{__APP_VERSION__}</span>
            {status && (
              <span className={'block text-xs ' + (status.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                {status.text}
              </span>
            )}
          </span>
        </div>
      </Section>
    </div>
  )
}
