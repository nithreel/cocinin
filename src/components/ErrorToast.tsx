import { useEffect } from 'react'
import { useToast } from './Toast'
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
  const show = useToast()

  useEffect(() => {
    function onRejection(e: PromiseRejectionEvent) {
      console.error(e.reason)
      e.preventDefault()
      show({ message: describe(e.reason), kind: 'error' })
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [show])

  return null
}
