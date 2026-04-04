'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthGuard, SessionList, useSessions } from '@pi-server/ui'

export default function ChatLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessions, loading, loadSessions, createSession, deleteSession } = useSessions()

  useEffect(() => {
    void loadSessions()
  }, [loadSessions, pathname])

  const selectedSessionId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : undefined

  return (
    <AuthGuard
      loadingFallback={<div className="p-8 text-zinc-500">Checking authentication...</div>}
      unauthenticatedFallback={<UnauthenticatedRedirect />}
      errorFallback={<div className="p-8 text-red-600">Authentication failed. Please login again.</div>}
    >
      <main className="grid min-h-screen grid-cols-[280px_1fr]">
        <SessionList
          sessions={sessions}
          loading={loading}
          selectedSessionId={selectedSessionId}
          classNames={{
            root: 'border-r border-zinc-200 p-4',
            header: 'mb-4',
            newButton: 'w-full rounded border px-3 py-2 text-sm',
            empty: 'text-sm text-zinc-500',
            list: 'space-y-2',
            item: 'rounded border p-3',
            itemSelected: 'border-zinc-900 bg-zinc-50',
            itemLabel: 'text-sm font-medium',
            itemMeta: 'mt-1 text-xs text-zinc-500',
            itemDeleteButton: 'mt-2 text-xs text-red-600',
          }}
          onCreateSession={async () => {
            const created = await createSession()
            router.push('/chat/' + created.id)
          }}
          onSelectSession={(id) => {
            router.push('/chat/' + id)
          }}
          onDeleteSession={async (id) => {
            await deleteSession(id)
            if (selectedSessionId === id) {
              router.push('/chat')
            }
          }}
        />
        <section>{children}</section>
      </main>
    </AuthGuard>
  )
}

function UnauthenticatedRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return <div className="p-8 text-zinc-500">Redirecting to login...</div>
}
