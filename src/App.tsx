import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './auth/LoginPage'
import AppLayout from './components/layout/AppLayout'
import PantryPage from './features/pantry/PantryPage'
import ShoppingListPage from './features/shopping-list/ShoppingListPage'
import UsersPage from './features/users/UsersPage'
import AlertsPage from './features/alerts/AlertsPage'
import NotesPage from './features/notes/NotesPage'
import SettingsPage from './features/settings/SettingsPage'
import RecipesPage from './features/recipes/RecipesPage'
import { isFirebaseConfigured } from './firebase'
import { AppDataProvider } from './lib/AppDataContext'

/** Pantallas solo del admin: el resto vuelve a Despensa (antes de abrir sus listeners). */
function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/despensa" replace />
}

export default function App() {
  if (!isFirebaseConfigured) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center text-gray-600 dark:text-gray-300">
        Falta la configuración de Firebase: copia .env.example a .env y rellénalo (ver README).
      </div>
    )
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppDataProvider>
                <AppLayout />
              </AppDataProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/despensa" replace />} />
          <Route path="/despensa" element={<PantryPage />} />
          <Route path="/lista" element={<ShoppingListPage />} />
          <Route path="/recetario" element={<RecipesPage />} />
          <Route path="/notas" element={<NotesPage />} />
          <Route path="/avisos" element={<AlertsPage />} />
          <Route path="/usuarios" element={<AdminOnly><UsersPage /></AdminOnly>} />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
