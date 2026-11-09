import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Cabecera fija de pantalla: título (y botones) siempre a la vista. Va como primer hijo de la página;
 * compensa el padding de <main> para que no se vea contenido pasando por encima.
 * Publica su alto real (sin ese padding) en --head-h: las subcabeceras se pegan justo debajo, tenga o no buscador.
 */
export default function StickyHeader({ title, children, below }: { title: string; children?: ReactNode; below?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const main = el?.closest('main')
    if (!el || !main) return
    const apply = () => {
      const pad = parseFloat(getComputedStyle(main).paddingTop) || 0
      document.documentElement.style.setProperty('--head-h', `${el.offsetHeight - pad}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
      document.documentElement.style.removeProperty('--head-h')
    }
  }, [])

  return (
    <div ref={ref} className="sticky -top-4 z-30 -mt-4 bg-white pb-3 pt-4 md:-top-8 md:-mt-8 md:pt-8 dark:bg-moss-950">
      <div className="flex h-8 items-center justify-between gap-2">
        <h2 className="truncate text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
      {below && <div className="mt-3">{below}</div>}
    </div>
  )
}
