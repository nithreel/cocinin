import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { primaryButton } from '../components/buttonStyles'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isMember, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center text-gray-400">
        Cargando…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isMember) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 p-6 text-center text-gray-600 dark:text-gray-300">
        <p>Tu cuenta ({user.email}) no tiene acceso a esta cocina.</p>
        <p className="text-sm text-gray-400">Pide a un miembro que te añada desde la sección Usuarios.</p>
        <button
          type="button"
          onClick={() => signOut()}
          className={primaryButton}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return <>{children}</>
}
