import type {
  ApiClientOptions,
  CreateSessionRequest,
  LoginRequest,
  Model,
  SendRequest,
  Session,
  SessionHistoryEntry,
  SessionStatus,
  User,
} from './types.js'

export class ApiError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(`API request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export class ApiClient {
  private basePath: string

  constructor(options: ApiClientOptions = {}) {
    this.basePath = options.basePath ?? '/backend'
  }

  async login(input: LoginRequest): Promise<User> {
    return this.request('/auth/login', {
      method: 'POST',
      body: input,
    })
  }

  async logout(): Promise<{ ok: true }> {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  async me(): Promise<User> {
    return this.request('/auth/me', {
      method: 'GET',
    })
  }

  async listSessions(): Promise<Session[]> {
    return this.request('/api/sessions', { method: 'GET' })
  }

  async createSession(input: CreateSessionRequest = {}): Promise<Session> {
    return this.request('/api/sessions', {
      method: 'POST',
      body: input,
    })
  }

  async updateSessionLabel(id: string, label: string): Promise<Session> {
    return this.request(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: { label },
    })
  }

  async deleteSession(id: string): Promise<{ ok: true }> {
    return this.request(`/api/sessions/${id}`, { method: 'DELETE' })
  }

  async send(id: string, input: SendRequest): Promise<{ ok: true }> {
    return this.request(`/api/sessions/${id}/send`, {
      method: 'POST',
      body: input,
    })
  }

  async abort(id: string): Promise<{ ok: true }> {
    return this.request(`/api/sessions/${id}/abort`, {
      method: 'POST',
    })
  }

  async status(id: string): Promise<{ status: SessionStatus }> {
    return this.request(`/api/sessions/${id}/status`, { method: 'GET' })
  }

  async history(id: string): Promise<{ messages: SessionHistoryEntry[] }> {
    return this.request(`/api/sessions/${id}/history`, { method: 'GET' })
  }

  async models(): Promise<Model[]> {
    return this.request('/api/models', { method: 'GET' })
  }

  private async request<T>(
    path: string,
    options: {
      method: string
      body?: unknown
    },
  ): Promise<T> {
    const headers: Record<string, string> = {}
    let body: string | undefined
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(options.body)
    }

    const res = await fetch(`${this.basePath}${path}`, {
      method: options.method,
      credentials: 'include',
      headers,
      body,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new ApiError(res.status, text)
    }

    return await res.json() as T
  }
}
