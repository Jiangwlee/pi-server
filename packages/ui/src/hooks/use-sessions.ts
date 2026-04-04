import { useCallback, useMemo, useState } from 'react'
import { ApiClient } from '../client/api-client.js'
import type { CreateSessionRequest, Session } from '../client/types.js'

type SessionsClient = {
  listSessions: () => Promise<Session[]>
  createSession: (input?: CreateSessionRequest) => Promise<Session>
  deleteSession: (id: string) => Promise<unknown>
  updateSessionLabel: (id: string, label: string) => Promise<Session>
}

type UseSessionsOptions = {
  client?: SessionsClient
}

type UseSessionsResult = {
  sessions: Session[]
  loading: boolean
  error: string | null
  loadSessions: () => Promise<Session[]>
  createSession: (input?: CreateSessionRequest) => Promise<Session>
  deleteSession: (id: string) => Promise<void>
  updateLabel: (id: string, label: string) => Promise<void>
}

export function useSessions(options: UseSessionsOptions = {}): UseSessionsResult {
  const client = useMemo(() => options.client ?? new ApiClient(), [options.client])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async (): Promise<Session[]> => {
    setLoading(true)
    setError(null)
    try {
      const list = await client.listSessions()
      setSessions(list)
      return list
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [client])

  const createSession = useCallback(async (input: CreateSessionRequest = {}): Promise<Session> => {
    setLoading(true)
    setError(null)
    try {
      const created = await client.createSession(input)
      const list = await client.listSessions()
      setSessions(list)
      return created
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [client])

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await client.deleteSession(id)
      const list = await client.listSessions()
      setSessions(list)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [client])

  const updateLabel = useCallback(async (id: string, label: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await client.updateSessionLabel(id, label)
      const list = await client.listSessions()
      setSessions(list)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [client])

  return {
    sessions,
    loading,
    error,
    loadSessions,
    createSession,
    deleteSession,
    updateLabel,
  }
}
