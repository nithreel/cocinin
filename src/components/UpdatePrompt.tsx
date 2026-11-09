import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from './Toast'

const CHECK_EVERY_MS = 60 * 60 * 1000

/** Avisa cuando hay una versión nueva de CocinIN y deja actualizar con un toque (recarga la app). */
export default function UpdatePrompt() {
  const show = useToast()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // la app puede pasar días abierta: se pregunta al servidor por versiones nuevas cada hora
    onRegisteredSW(_url, registration) {
      if (registration) window.setInterval(() => void registration.update(), CHECK_EVERY_MS)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      show({
        message: 'Hay una versión nueva de CocinIN',
        actionLabel: 'Actualizar',
        onAction: () => void updateServiceWorker(true),
        duration: 0,
      })
    }
  }, [needRefresh, show, updateServiceWorker])

  return null
}
