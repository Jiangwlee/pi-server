export type User = {
  id: string
  email?: string
  authProvider?: string
  displayName: string
}

export type Session = {
  id: string
  cwd: string
  sessionDir: string
  label: string
  createdAt: number
  updatedAt: number
}

export type Model = {
  id: string
  name?: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type CreateSessionRequest = {
  cwd?: string
  sessionDir?: string
  label?: string
}

export type SendRequest = {
  message: string
}

export type SessionStatus = 'idle' | 'running' | 'error'

export type SessionHistoryEntry = {
  message?: {
    role?: string
    content?: unknown
  }
  type?: string
}

export type SSEEventType = 'pi' | 'status' | 'error'

export type SSEEnvelope = {
  event: SSEEventType
  data: unknown
  id?: string
}

export type ApiClientOptions = {
  basePath?: string
}
