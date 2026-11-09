import { localDateString } from './expiry'

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha «YYYY-MM-DD» y hora «HH:MM» locales de un instante. */
export function splitDateTime(ms: number) {
  const d = new Date(ms)
  return { date: localDateString(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

/** Instante a partir de fecha y hora locales; NaN si falta alguna. */
export function joinDateTime(date: string, time: string) {
  if (!date || !time) return NaN
  return new Date(`${date}T${time}:00`).getTime()
}

/** Hora actual, para proponer el recordatorio al crear una nota. */
export function defaultRemindAt(now = Date.now()) {
  return now
}

/** «17:30 · martes 12 nov» */
export function formatRemind(ms: number) {
  const d = new Date(ms)
  const day = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${day}`
}
