// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSessions } from '../../src/hooks/use-sessions.js'
import type { Session } from '../../src/client/types.js'

function makeSession(id: string, label = id): Session {
  return {
    id,
    cwd: '/tmp',
    sessionDir: '/tmp/' + id,
    label,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('useSessions', () => {
  it('loadSessions fetches and stores sessions', async () => {
    const sessions = [makeSession('s1')]
    const client = {
      listSessions: async () => sessions,
      createSession: async () => makeSession('s2'),
      deleteSession: async () => ({ ok: true }),
      updateSessionLabel: async () => makeSession('s1', 'renamed'),
    }

    const { result } = renderHook(() => useSessions({ client }))

    await act(async () => {
      await result.current.loadSessions()
    })

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.sessions[0]?.id).toBe('s1')
      expect(result.current.error).toBeNull()
    })
  })

  it('createSession appends new session state via reload', async () => {
    let sessions = [makeSession('s1')]
    const client = {
      listSessions: async () => sessions,
      createSession: async () => {
        const created = makeSession('s2')
        sessions = [created, ...sessions]
        return created
      },
      deleteSession: async () => ({ ok: true }),
      updateSessionLabel: async () => makeSession('s1', 'renamed'),
    }

    const { result } = renderHook(() => useSessions({ client }))

    await act(async () => {
      await result.current.loadSessions()
      await result.current.createSession()
    })

    await waitFor(() => {
      expect(result.current.sessions.map((s) => s.id)).toEqual(['s2', 's1'])
    })
  })

  it('deleteSession removes target session via reload', async () => {
    let sessions = [makeSession('s1'), makeSession('s2')]
    const client = {
      listSessions: async () => sessions,
      createSession: async () => makeSession('s3'),
      deleteSession: async (id: string) => {
        sessions = sessions.filter((s) => s.id !== id)
        return { ok: true }
      },
      updateSessionLabel: async () => makeSession('s1', 'renamed'),
    }

    const { result } = renderHook(() => useSessions({ client }))

    await act(async () => {
      await result.current.loadSessions()
      await result.current.deleteSession('s1')
    })

    await waitFor(() => {
      expect(result.current.sessions.map((s) => s.id)).toEqual(['s2'])
    })
  })

  it('updateLabel updates session label via reload', async () => {
    let sessions = [makeSession('s1', 'old')]
    const client = {
      listSessions: async () => sessions,
      createSession: async () => makeSession('s2'),
      deleteSession: async () => ({ ok: true }),
      updateSessionLabel: async (id: string, label: string) => {
        sessions = sessions.map((s) => (s.id === id ? { ...s, label } : s))
        return sessions[0] as Session
      },
    }

    const { result } = renderHook(() => useSessions({ client }))

    await act(async () => {
      await result.current.loadSessions()
      await result.current.updateLabel('s1', 'new')
    })

    await waitFor(() => {
      expect(result.current.sessions[0]?.label).toBe('new')
      expect(result.current.error).toBeNull()
    })
  })
})
