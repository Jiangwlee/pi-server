'use client'

import { useParams } from 'next/navigation'

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>()

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Session {params.sessionId}</h1>
      <p className="mt-2 text-zinc-500">Chat panel will be implemented in Task 7.</p>
    </main>
  )
}
