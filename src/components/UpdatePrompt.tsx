import { useRegisterSW } from 'virtual:pwa-register/react'
import { primaryButton } from './buttonStyles'

const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * Aviso de versión nueva de CocinIN: un banner propio (no el aviso flotante, que se pisa con otros avisos como
 * «Leche agotado»). Franja fija arriba, sin descartar ni deslizar, hasta que se actualiza; actualizar recarga la app.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // la app puede pasar días abierta: se pregunta al servidor por versiones nuevas cada hora
    onRegisteredSW(_url, registration) {
      if (registration) window.setInterval(() => void registration.update(), CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null
  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 md:px-8 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
    >
      <span>Hay una versión nueva de CocinIN.</span>
      <button type="button" onClick={() => void updateServiceWorker(true)} className={primaryButton}>
        Actualizar
      </button>
    </div>
  )
}
