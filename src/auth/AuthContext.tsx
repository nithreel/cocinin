import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { setupDoc, usersCol } from '../lib/collections'

interface AuthContextValue {
  user: User | null
  /** true si el usuario con sesión figura en /users (tiene acceso a los datos) */
  isMember: boolean
  /** true si es el administrador: único que gestiona usuarios */
  isAdmin: boolean
  loading: boolean
  /** null mientras se comprueba; true si aún no existe ningún usuario */
  needsSetup: boolean | null
  signIn: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  createFirstUser: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [memberLoading, setMemberLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setMemberLoading(Boolean(firebaseUser))
      setAuthLoading(false)
    })
  }, [])

  // Membresía en vivo: si te quitan de /users pierdes el acceso al momento.
  useEffect(() => {
    if (!user) {
      setIsMember(false)
      setIsAdmin(false)
      return
    }
    return onSnapshot(
      doc(usersCol, user.uid),
      (snap) => {
        setIsMember(snap.exists())
        setIsAdmin(snap.data()?.role === 'admin')
        setMemberLoading(false)
      },
      () => {
        setIsMember(false)
        setIsAdmin(false)
        setMemberLoading(false)
      },
    )
  }, [user])

  // Sin sesión: ¿hay que crear el primer usuario?
  useEffect(() => {
    if (authLoading || user) return
    let cancelled = false
    getDoc(setupDoc)
      .then((snap) => !cancelled && setNeedsSetup(!snap.exists()))
      .catch(() => !cancelled && setNeedsSetup(false))
    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function createFirstUser(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // Un solo lote: las reglas exigen que meta/setup y users/{uid} se creen a la vez.
    const batch = writeBatch(db)
    batch.set(setupDoc, { createdAt: Date.now() })
    batch.set(doc(usersCol, cred.user.uid), { email, role: 'admin', createdAt: Date.now() })
    try {
      await batch.commit()
    } catch (err) {
      // Si falla, no dejamos una cuenta huérfana sin acceso.
      await cred.user.delete().catch(() => undefined)
      throw err
    }
    setNeedsSetup(false)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  const loading = authLoading || memberLoading

  return (
    <AuthContext.Provider value={{ user, isMember, isAdmin, loading, needsSetup, signIn, resetPassword, createFirstUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
