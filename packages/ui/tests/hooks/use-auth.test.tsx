// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../../src/hooks/use-auth.js'
import type { User } from '../../src/client/types.js'

function makeWrapper(client: {
  me: () => Promise<User>
  login: (input: { email: string; password: string }) => Promise<User>
  logout: () => Promise<unknown>
}) {
  return ({ children }: { children: ReactNode }) => (
    <AuthProvider client={client}>{children}</AuthProvider>
  )
}

describe('useAuth', () => {
  it('checkAuth loads current user', async () => {
    const client = {
      me: async () => ({ id: 'u1', displayName: 'demo' }),
      login: async () => ({ id: 'u1', displayName: 'demo' }),
      logout: async () => ({ ok: true }),
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      await result.current.checkAuth()
    })

    await waitFor(() => {
      expect(result.current.user?.id).toBe('u1')
      expect(result.current.error).toBeNull()
    })
  })

  it('login updates user state', async () => {
    const client = {
      me: async () => ({ id: 'u1', displayName: 'demo' }),
      login: async () => ({ id: 'u2', displayName: 'alice' }),
      logout: async () => ({ ok: true }),
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      await result.current.login('a@example.com', 'x')
    })

    expect(result.current.user?.id).toBe('u2')
    expect(result.current.error).toBeNull()
  })

  it('logout clears user state', async () => {
    const client = {
      me: async () => ({ id: 'u1', displayName: 'demo' }),
      login: async () => ({ id: 'u2', displayName: 'alice' }),
      logout: async () => ({ ok: true }),
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      await result.current.login('a@example.com', 'x')
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
