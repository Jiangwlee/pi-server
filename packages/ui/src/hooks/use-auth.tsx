import React, { createContext, useContext, useMemo, useState } from 'react'
import { ApiClient } from '../client/api-client.js'
import type { User } from '../client/types.js'

type AuthClient = {
  me: () => Promise<User>
  login: (input: { email: string; password: string }) => Promise<User>
  logout: () => Promise<unknown>
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider(
  { children, client }: { children: React.ReactNode; client?: AuthClient },
): React.JSX.Element {
  const authClient: AuthClient = useMemo(() => client ?? new ApiClient(), [client])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkAuth(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const current = await authClient.me()
      setUser(current)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setUser(null)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function login(email: string, password: string): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const nextUser = await authClient.login({ email, password })
      setUser(nextUser)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function logout(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      await authClient.logout()
      setUser(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
