import { useEffect, useState } from 'react'
import { FirebaseError } from 'firebase/app'

function describe(reason: unknown) {
  if (reason instanceof FirebaseError) {
    switch (reason.code) {
      case 'permission-denied':
        return 'No tienes permiso para hacer este cambio. ¿Te han quitado el acceso?'
      case 'unavailable':
        return 'Sin conexión con el servidor. Revisa tu conexión: el cambio puede no haberse guardado.'
    }
  }
  return 'No se ha podido completar la acción. Inténtalo de nuevo.'
}

/**
 * Muestra un aviso cuando una escritura (añadir, editar, borrar…) falla y nadie la ha capturado.
 * Así los errores de Firestore no pasan desapercibidos en ninguna pantalla.
 */
export default function ErrorToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    function onRejection(e: PromiseRejectionEvent) {
      console.error(e.reason)
      e.preventDefault()
      setMessage(describe(e.reason))
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => setMessage(null), 7000)
    return () => window.clearTimeout(t)
  }, [message])

  if (!message) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg md:bottom-6"
    >
      {message}
    </div>
  )
}
