import React from 'react'
import { useAuth } from '../../hooks/use-auth.js'

export function AuthGuard(
  { children, loadingFallback = null, unauthenticatedFallback = null }: {
    children: React.ReactNode
    loadingFallback?: React.ReactNode
    unauthenticatedFallback?: React.ReactNode
  },
): React.JSX.Element | null {
  const { user, loading } = useAuth()
  if (loading) return loadingFallback as React.JSX.Element | null
  if (!user) return unauthenticatedFallback as React.JSX.Element | null
  return <>{children}</>
}
