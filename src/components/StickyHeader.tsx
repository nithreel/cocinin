import type { ReactNode } from 'react'

/**
 * Cabecera fija de pantalla: título (y botones) siempre a la vista. Va como primer hijo de la página;
 * compensa el padding de <main> para que no se vea contenido pasando por encima. Su alto (pt+h-8+pb menos el padding de main) es --head-h.
 */
export default function StickyHeader({ title, children, below }: { title: string; children?: ReactNode; below?: ReactNode }) {
  return (
    <div className="sticky -top-4 z-30 -mt-4 bg-white pb-3 pt-4 md:-top-8 md:-mt-8 md:pt-8 dark:bg-moss-950">
      <div className="flex h-8 items-center justify-between gap-2">
        <h2 className="truncate text-xl font-semibold md:text-2xl text-gray-900 dark:text-gray-100">{title}</h2>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
      {below && <div className="mt-3">{below}</div>}
    </div>
  )
}
