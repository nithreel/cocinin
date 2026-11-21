import { useSyncExternalStore } from 'react'

/** Ajustes de ESTE dispositivo (localStorage, nunca Firestore): cada móvil o PC elige los suyos. */
export type MotionMode = 'system' | 'reduce' | 'full'

export interface DeviceSettings {
  /** animaciones: seguir al sistema (por defecto), reducidas o completas */
  motion: MotionMode
  /** mantener la pantalla encendida mientras la app está abierta (Screen Wake Lock) */
  wakeLock: boolean
  /** vibrar al mantener pulsado */
  vibration: boolean
}

export const SETTINGS_KEY = 'cocinin:ajustes'

export const DEFAULT_SETTINGS: DeviceSettings = { motion: 'system', wakeLock: false, vibration: true }

const MOTION_MODES: readonly MotionMode[] = ['system', 'reduce', 'full']

/** Lee el JSON guardado; lo ausente, corrupto o de otro tipo vuelve a su valor por defecto. */
export function parseSettings(raw: string | null | undefined): DeviceSettings {
  let data: unknown = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }
  const obj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return {
    motion: MOTION_MODES.includes(obj.motion as MotionMode) ? (obj.motion as MotionMode) : DEFAULT_SETTINGS.motion,
    wakeLock: typeof obj.wakeLock === 'boolean' ? obj.wakeLock : DEFAULT_SETTINGS.wakeLock,
    vibration: typeof obj.vibration === 'boolean' ? obj.vibration : DEFAULT_SETTINGS.vibration,
  }
}

/** ¿Hay que reducir el movimiento? «Sistema» sigue a `prefers-reduced-motion`; las otras dos lo fuerzan. */
export function resolveReduceMotion(mode: MotionMode, systemReduces: boolean) {
  return mode === 'reduce' || (mode === 'system' && systemReduces)
}

/** Almacenamiento mínimo (localStorage o uno falso en los tests). */
export interface SettingsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readSettings(storage: SettingsStorage | null | undefined): DeviceSettings {
  try {
    return parseSettings(storage?.getItem(SETTINGS_KEY))
  } catch {
    // modo privado, almacenamiento bloqueado…: valores por defecto
    return { ...DEFAULT_SETTINGS }
  }
}

/** Guarda; si no se puede (modo privado, cuota), el ajuste vale solo hasta cerrar la app. */
export function writeSettings(storage: SettingsStorage | null | undefined, settings: DeviceSettings) {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* sin almacenamiento */
  }
}

// --- Almacén global (useSyncExternalStore) ---

function browserStorage(): SettingsStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

let current: DeviceSettings | null = null
const listeners = new Set<() => void>()

/** Ajustes actuales (el mismo objeto hasta que cambia alguno: lo exige useSyncExternalStore). */
export function getSettings(): DeviceSettings {
  current ??= readSettings(browserStorage())
  return current
}

export function updateSettings(patch: Partial<DeviceSettings>) {
  current = { ...getSettings(), ...patch }
  writeSettings(browserStorage(), current)
  applyMotion()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

/** Pone o quita `data-reduce-motion` en <html>: el CSS (index.css) y `prefersReducedMotion()` leen solo ese atributo. */
function applyMotion() {
  const system = typeof matchMedia === 'function' && matchMedia(REDUCE_QUERY).matches
  document.documentElement.toggleAttribute('data-reduce-motion', resolveReduceMotion(getSettings().motion, system))
}

/** Al arrancar, antes del primer render (main.tsx): sin parpadeo de animaciones. Sigue los cambios del sistema
 *  y los de otra pestaña de la app abierta en el mismo dispositivo. */
export function initSettings() {
  applyMotion()
  if (typeof matchMedia === 'function') matchMedia(REDUCE_QUERY).addEventListener('change', applyMotion)
  window.addEventListener('storage', (e) => {
    if (e.key !== SETTINGS_KEY) return
    current = parseSettings(e.newValue)
    applyMotion()
    listeners.forEach((l) => l())
  })
}

/** Vibración corta (pulsación larga), si el dispositivo puede y el ajuste lo permite. */
export function vibrate(ms: number) {
  if (getSettings().vibration) navigator.vibrate?.(ms)
}
