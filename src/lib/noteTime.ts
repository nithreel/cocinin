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

/** Próxima hora en punto, para proponer el recordatorio al crear una nota. */
export function defaultRemindAt(now = Date.now()) {
  const d = new Date(now)
  d.setMinutes(0, 0, 0)
  return d.getTime() + 3_600_000
}

/** ¿Cambia el aviso (activación, hora o destinatarios)? Solo entonces hay que rearmarlo. */
export function reminderChanged(
  before: { notify: boolean; remindAt: number | null; recipients: string[] },
  after: { notify: boolean; remindAt: number | null; recipients: string[] },
) {
  if (before.notify !== after.notify || before.remindAt !== after.remindAt) return true
  const a = [...before.recipients].sort().join()
  const b = [...after.recipients].sort().join()
  return a !== b
}

/** «17:30 · martes 12 nov» */
export function formatRemind(ms: number) {
  const d = new Date(ms)
  const day = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${day}`
}
