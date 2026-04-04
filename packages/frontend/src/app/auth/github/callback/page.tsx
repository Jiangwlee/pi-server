'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@pi-server/ui'

export default function GithubCallbackPage() {
  const router = useRouter()
  const { checkAuth } = useAuth()

  useEffect(() => {
    let cancelled = false
    async function resolveAuth() {
      try {
        await checkAuth()
        if (!cancelled) router.replace('/chat')
      } catch {
        if (!cancelled) router.replace('/login')
      }
    }
    void resolveAuth()
    return () => {
      cancelled = true
    }
  }, [checkAuth, router])

  return <main className="p-8 text-zinc-500">Completing GitHub sign-in...</main>
}
