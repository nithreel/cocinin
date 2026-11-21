import { useEffect } from 'react'

/** Lo mínimo de la Screen Wake Lock API que se usa (así se puede probar con dobles). */
export interface WakeSentinel {
  released: boolean
  release(): Promise<void>
}
export interface WakeLockApi {
  request(type: 'screen'): Promise<WakeSentinel>
}
export interface VisibilitySource {
  visibilityState: string
  addEventListener(type: 'visibilitychange', fn: () => void): void
  removeEventListener(type: 'visibilitychange', fn: () => void): void
}

export function wakeLockSupported(nav: { wakeLock?: unknown } = navigator) {
  return !!nav.wakeLock
}

/**
 * Mantiene la pantalla encendida mientras la página está visible. El navegador suelta el bloqueo solo al ocultarse la
 * pestaña (o al bloquear el móvil): al volver a estar visible se pide otra vez. Sin soporte, o si el navegador lo
 * rechaza (batería baja, sin permiso), no hace nada. Devuelve la función que lo libera todo.
 */
export function keepScreenOn(api: WakeLockApi | undefined, doc: VisibilitySource): () => void {
  if (!api) return () => {}
  let sentinel: WakeSentinel | null = null
  let stopped = false
  let pending = false

  const acquire = async () => {
    if (stopped || pending || doc.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
    pending = true
    try {
      const s = await api.request('screen')
      // se desactivó mientras se pedía: se suelta enseguida
      if (stopped) void s.release().catch(() => {})
      else sentinel = s
    } catch {
      /* rechazado: se reintenta la próxima vez que la página vuelva a verse */
    } finally {
      pending = false
    }
  }
  const onVisibility = () => void acquire()

  doc.addEventListener('visibilitychange', onVisibility)
  void acquire()
  return () => {
    stopped = true
    doc.removeEventListener('visibilitychange', onVisibility)
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => {})
    sentinel = null
  }
}

/** Hook para toda la app (AppLayout): pantalla encendida mientras `enabled`. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    return keepScreenOn((navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock, document)
  }, [enabled])
}
