'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm, useAuth } from '@pi-server/ui'

export default function LoginPage() {
  const router = useRouter()
  const { user, checkAuth } = useAuth()

  useEffect(() => {
    void checkAuth().catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      router.replace('/chat')
    }
  }, [router, user])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-panel p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-text-primary">Sign in</h1>
        <LoginForm
          classNames={{
            root: 'flex flex-col gap-5',
            field: 'flex flex-col gap-1.5',
            input: 'rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-shadow duration-fast focus:shadow-focus-ring',
            actions: 'flex items-center gap-3 pt-1',
            error: 'text-sm text-danger',
          }}
          onSuccess={() => router.push('/chat')}
        />
      </div>
    </main>
  )
}
