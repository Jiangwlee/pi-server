'use client'

import { useRouter } from 'next/navigation'
import { LoginForm } from '@pi-server/ui'

export default function LoginPage() {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl">Login</h1>
      <LoginForm
        classNames={{
          root: 'flex flex-col gap-4',
          field: 'flex flex-col gap-1',
          input: 'rounded border px-3 py-2',
          actions: 'flex items-center gap-3',
          error: 'text-red-600',
        }}
        onSuccess={() => router.push('/chat')}
      />
    </main>
  )
}
