import { useEffect, useState } from 'react'
import { keepFocus } from '../lib/keepFocus'

/** Interruptor: indicador y botón a la vez (el color del propio interruptor dice el estado).
 *  El color nuevo entra con un barrido (con rebote). Encender/apagar sigue el sentido del pomo; entre estados encendidos,
 *  al subir (aviso, congelado) entra de derecha a izquierda y al bajar de izquierda a derecha. Congelado + aviso (en cualquier orden): azul completo y, un instante
 *  después, el amarillo entra a medias como remate redondo del lado derecho. */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
  tone = 'emerald',
  capTone,
  offTone = 'gray',
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
  /** frost = congelado; amber = con aviso (caducidad o descongelado) */
  tone?: 'emerald' | 'frost' | 'amber'
  /** segundo color (congelado con aviso): remate redondo, concéntrico con el pomo, en el extremo derecho */
  capTone?: 'amber'
  /** color apagado: gris (preferencias) o rojo suave (agotado) */
  offTone?: 'gray' | 'red'
}) {
  const on = tone === 'frost' ? 'bg-frost-400' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
  const off = offTone === 'red' ? 'bg-red-300 dark:bg-[#9c514f]' : 'bg-gray-400 dark:bg-moss-600'
  const color = checked ? on : off
  const wantCap = checked && capTone ? 'bg-amber-500' : null
  // «rango» del estado: apagado < encendido < aviso < congelado < congelado con aviso
  const rank = checked ? (wantCap ? 4 : tone === 'frost' ? 3 : tone === 'amber' ? 2 : 1) : 0

  const [st, setSt] = useState<{
    cur: string
    prev: string
    rank: number
    dir: string
    n: number
    capWant: string | null
    cap: string | null
    capMode: '' | 'in' | 'out' | 'hold'
    capDelay: boolean
  }>({ cur: color, prev: color, rank, dir: 'r', n: 0, capWant: wantCap, cap: wantCap, capMode: '', capDelay: false })

  if (st.cur !== color || st.rank !== rank || st.capWant !== wantCap) {
    const baseChanged = st.cur !== color
    const next = { ...st, rank, capWant: wantCap }
    if (baseChanged) {
      next.prev = st.cur
      next.cur = color
      // excepción: al quitar el congelado de un doble indicador, el amarillo sigue creciendo de derecha a izquierda
      const unfreezeKeepsWarning = !!st.capWant && !wantCap && checked
      // encender/apagar (verde, rojo y los demás desde/hacia apagado) sigue el sentido del pomo blanco:
      // al encender entra por la izquierda (el pomo va a la derecha); al apagar, por la derecha
      next.dir = st.rank === 0 && rank > 0 ? 'l' : rank === 0 && st.rank > 0 ? 'r' : unfreezeKeepsWarning || rank > st.rank ? 'r' : 'l'
      next.n = st.n + 1
    }
    if (wantCap && !st.capWant) {
      next.cap = wantCap
      next.capMode = 'in'
      next.capDelay = baseChanged
    } else if (!wantCap && st.capWant) {
      if (!checked) {
        next.cap = null
        next.capMode = ''
      } else {
        // sigue puesto mientras el barrido del color base lo cubre; si no hay barrido, se retira solo
        next.capMode = baseChanged ? 'hold' : 'out'
      }
    }
    setSt(next)
  }

  useEffect(() => {
    if (st.capMode !== 'out' && st.capMode !== 'hold') return
    const t = setTimeout(() => setSt((s) => ({ ...s, cap: null, capMode: '' })), st.capMode === 'out' ? 300 : 440)
    return () => clearTimeout(t)
  }, [st.capMode])

  return (
    <button
      type="button"
      role="switch"
      onMouseDown={keepFocus}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full disabled:opacity-50 after:absolute after:-inset-2 after:content-['']"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className={'absolute inset-0 ' + st.prev} />
        <span
          key={st.n}
          className={'absolute inset-0 ' + st.cur + (st.n > 0 ? (st.dir === 'l' ? ' wipe-l' : ' wipe-r') : '')}
        />
        {st.cap && (
          <span
            className={
              'cap ' +
              st.cap +
              (st.capMode === 'in' ? (st.capDelay ? ' cap-in cap-delay' : ' cap-in') : st.capMode === 'out' ? ' cap-out' : '')
            }
          />
        )}
      </span>
      <span
        className={
          'switch-knob relative inline-block h-4 w-4 rounded-full bg-white shadow ' +
          (checked ? 'translate-x-6' : 'translate-x-1')
        }
      />
    </button>
  )
}
