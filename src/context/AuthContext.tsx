/**
 * AuthContext — stores the current platform user session.
 * On mount, reads the JWT stored in localStorage and decodes the role.
 * The full login flow is implemented in a future step; for now this provides
 * the role-based conditional rendering needed by Sidebar and pages.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type AdminRole = 'user' | 'admin' | 'owner'

export interface AuthUser {
  id: string
  username: string
  email: string
  full_name: string | null
  role: AdminRole
  must_change_password: boolean
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
  hasRole: (...roles: AdminRole[]) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

const TOKEN_KEY = 'worsyn-token'
const USER_KEY  = 'worsyn-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]     = useState<string | null>(null)
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on boot
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser  = localStorage.getItem(USER_KEY)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch {
      // corrupted storage — ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  function setSession(newToken: string, newUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  function hasRole(...roles: AdminRole[]): boolean {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setSession, clearSession, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
