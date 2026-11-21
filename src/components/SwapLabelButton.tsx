import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { outlineButton, primaryButton } from './buttonStyles'

/** Botón principal cuyo texto se cambia por otro con fundido, y cuyo ancho se ajusta animado (con rebote) al del nuevo texto. */
export default function SwapLabelButton({
  labelA,
  labelB,
  showB,
  onClick,
  disabled,
  variant = 'primary',
}: {
  labelA: ReactNode
  labelB: ReactNode
  showB: boolean
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'outline'
}) {
  const aRef = useRef<HTMLSpanElement>(null)
  const bRef = useRef<HTMLSpanElement>(null)
  const [w, setW] = useState<{ a: number; b: number } | null>(null)

  useLayoutEffect(() => {
    const a = aRef.current
    const b = bRef.current
    if (!a || !b) return
    const measure = () => setW({ a: a.offsetWidth, b: b.offsetWidth })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(a)
    ro.observe(b)
    return () => ro.disconnect()
  }, [])

  const label = 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap transition-opacity duration-200 '
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-live="polite"
      // 24 px = el relleno horizontal (px-3) del botón principal
      style={w ? { width: (showB ? w.b : w.a) + 24 } : undefined}
      className={(variant === 'outline' ? outlineButton : primaryButton) + ' h-8 overflow-hidden !py-0 transition-[width] duration-[420ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] max-md:h-8'}
    >
      <span ref={aRef} aria-hidden={showB} className={label + (showB ? 'opacity-0' : 'opacity-100')}>
        {labelA}
      </span>
      <span ref={bRef} aria-hidden={!showB} className={label + (showB ? 'opacity-100' : 'opacity-0')}>
        {labelB}
      </span>
    </button>
  )
}
