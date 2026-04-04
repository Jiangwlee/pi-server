'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessions } from '@pi-server/ui'

export default function ChatPage() {
  const router = useRouter()
  const { loadSessions, createSession } = useSessions()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolveEmptyState() {
      setError(null)
      try {
        const sessions = await loadSessions()
        if (cancelled) return
        if (sessions.length > 0) {
          router.replace('/chat/' + sessions[0].id)
          return
        }
        const created = await createSession()
        if (!cancelled) {
          router.replace('/chat/' + created.id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      }
    }

    void resolveEmptyState()
    return () => {
      cancelled = true
    }
  }, [createSession, loadSessions, router])

  if (error) {
    return <main className="p-8 text-red-600">Failed to initialize session: {error}</main>
  }

  return (
    <main className="p-8 text-zinc-500">Preparing your chat session...</main>
  )
}
