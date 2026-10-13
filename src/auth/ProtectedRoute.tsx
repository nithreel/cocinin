import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

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
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return <>{children}</>
}
