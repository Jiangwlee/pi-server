'use client'

import { AuthGuard } from '@pi-server/ui'

export default function ChatPage() {
  return (
    <AuthGuard unauthenticatedFallback={<div>Please login first.</div>}>
      <main className="p-8">Chat placeholder</main>
    </AuthGuard>
  )
}
