/** Marcador de carga: tres filas apagadas en lugar de «Cargando…» (sin animación si se pide reducir movimiento). */
export default function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="listbox motion-safe:animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-moss-700" />
          <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-moss-700" style={{ maxWidth: `${55 + ((i * 17) % 35)}%` }} />
        </div>
      ))}
    </div>
  )
}
