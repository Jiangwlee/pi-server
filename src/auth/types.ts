import type { Context } from 'hono'

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    requestId: string
  }
}

export interface AuthUser {
  id: string
  email: string | null
  authProvider: string
  displayName: string
}
