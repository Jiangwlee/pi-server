import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/use-auth.js'

export function AuthGuard(
  {
    children,
    loadingFallback = null,
    unauthenticatedFallback = null,
    errorFallback = null,
    requireCheck = true,
  }: {
    children: React.ReactNode
    loadingFallback?: React.ReactNode
    unauthenticatedFallback?: React.ReactNode
    errorFallback?: React.ReactNode
    requireCheck?: boolean
  },
): React.JSX.Element | null {
  const { user, loading, error, checkAuth } = useAuth()
  const [checked, setChecked] = useState(!requireCheck)

  useEffect(() => {
    if (!requireCheck || checked || user) return
    let cancelled = false
    checkAuth()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [checkAuth, checked, requireCheck, user])

  if ((!checked && !user) || loading) return loadingFallback as React.JSX.Element | null
  if (error && !user) return (errorFallback ?? unauthenticatedFallback) as React.JSX.Element | null
  if (!user) return unauthenticatedFallback as React.JSX.Element | null
  return <>{children}</>
}
