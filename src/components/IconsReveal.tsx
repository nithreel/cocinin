import { useEffect, useState, type ReactNode } from 'react'

/** Iconos de acción (editar / eliminar) que brotan con rebote al aparecer y se encogen al desaparecer, en vez de
 *  aparecer y desaparecer de golpe. Sigue montado durante la animación de salida. */
export default function IconsReveal({ show, className = '', children }: { show: boolean; className?: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(show)
  // al mostrarse se monta ya (en el mismo render); al ocultarse se desmonta cuando acaba la salida
  if (show && !mounted) setMounted(true)
  useEffect(() => {
    if (show) return
    const t = window.setTimeout(() => setMounted(false), 240)
    return () => window.clearTimeout(t)
  }, [show])
  if (!show && !mounted) return null
  return <div className={(show ? 'icon-in ' : 'icon-out ') + className}>{children}</div>
}
