'use client'

import '../styles/globals.css'
import type { ReactNode } from 'react'
import { AuthProvider } from '@pi-server/ui'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
