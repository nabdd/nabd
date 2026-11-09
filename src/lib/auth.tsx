import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, getToken, LOGOUT_EVENT, setToken } from './api'
import type { Hospital } from './types'

interface AuthState {
  hospital: Hospital | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const HOSPITAL_KEY = 'nabd-hospital'
const readHospital = (): Hospital | null => {
  try {
    const raw = localStorage.getItem(HOSPITAL_KEY)
    return raw && getToken() ? (JSON.parse(raw) as Hospital) : null
  } catch {
    return null
  }
}

const Ctx = createContext<AuthState | null>(null)
export const useAuth = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hospital, setHospital] = useState<Hospital | null>(readHospital)

  const logout = useCallback(() => {
    setToken(null)
    try {
      localStorage.removeItem(HOSPITAL_KEY)
    } catch {
      /* ignore */
    }
    setHospital(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; hospital: Hospital }>('/auth/login', { method: 'POST', body: { email, password }, auth: false })
    setToken(r.token)
    try {
      localStorage.setItem(HOSPITAL_KEY, JSON.stringify(r.hospital))
    } catch {
      /* ignore */
    }
    setHospital(r.hospital)
  }, [])

  // Any 401 from the API (expired or revoked session) signs the user out everywhere.
  useEffect(() => {
    window.addEventListener(LOGOUT_EVENT, logout)
    return () => window.removeEventListener(LOGOUT_EVENT, logout)
  }, [logout])

  const value = useMemo(() => ({ hospital, login, logout }), [hospital, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { hospital } = useAuth()
  const loc = useLocation()
  if (!hospital) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}
