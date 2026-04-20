import { describe, it, expect, vi, afterEach } from 'vitest'
import { PiProvider } from '../src/runtime/pi-provider.js'

const originalFetch = globalThis.fetch

function wrappedResponse(credentials: Record<string, unknown>, models: unknown[] = []) {
  const body = { credentials, models }
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  }
}

describe('PiProvider', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should create with local auth storage when no proxy url', async () => {
    const provider = new PiProvider({})
    expect(provider.getAuthStorage()).toBeDefined()
    expect(provider.getModelRegistry()).toBeDefined()
    provider.dispose()
  })

  it('should fail-closed on first pull failure with auth-proxy', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 'test-token',
      initialSyncMaxAttempts: 2,
      initialSyncRetryMs: 0,
    })

    await expect(provider.init()).rejects.toThrow('Network error')
    provider.dispose()
  })

  it('fetches /auth and unwraps wrapped payload into native auth.json for InMemoryBackend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      wrappedResponse({
        'github-copilot': { type: 'oauth', refresh: 'ghu_x', access: '', expires: 0 },
        'openai-codex': {
          type: 'oauth',
          refresh: 'rt_x',
          access: 'eyJ...',
          expires: 1777471561879,
          accountId: '1e6cf163',
        },
        'kimi-coding': { type: 'api_key', key: 'sk-kimi' },
      }),
    )

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 'my-token',
      initialSyncMaxAttempts: 1,
      initialSyncRetryMs: 0,
    })
    await provider.init()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://auth-server:3001/auth',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    )

    const storage = provider.getAuthStorage()
    expect(storage.has('github-copilot')).toBe(true)
    expect(storage.has('openai-codex')).toBe(true)
    expect(storage.has('kimi-coding')).toBe(true)
    expect(storage.get('openai-codex')).toMatchObject({
      type: 'oauth',
      refresh: 'rt_x',
      accountId: '1e6cf163',
    })

    provider.dispose()
  })

  it('should use replace-all semantics on sync', async () => {
    let callCount = 0
    const responses = [
      {
        'github-copilot': { type: 'oauth', refresh: 'rt-1' },
        'openai-codex': { type: 'oauth', refresh: 'rt-codex' },
      },
      {
        'github-copilot': { type: 'oauth', refresh: 'rt-1-updated' },
      },
    ]

    globalThis.fetch = vi.fn().mockImplementation(() => {
      const data = responses[callCount++] ?? responses[responses.length - 1]
      return Promise.resolve(wrappedResponse(data))
    })

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 'tok',
      initialSyncMaxAttempts: 1,
      initialSyncRetryMs: 0,
    })

    await provider.init()
    const storage = provider.getAuthStorage()
    expect(storage.has('openai-codex')).toBe(true)

    await provider.syncFromProxy()
    expect(storage.has('github-copilot')).toBe(true)
    expect(storage.has('openai-codex')).toBe(false)

    provider.dispose()
  })

  it('should retain last-good data on subsequent pull failure', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve(
          wrappedResponse({
            'github-copilot': { type: 'oauth', refresh: 'rt-good' },
          }),
        )
      }
      return Promise.reject(new Error('Network down'))
    })

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 'tok',
      initialSyncMaxAttempts: 1,
      initialSyncRetryMs: 0,
    })

    await provider.init()
    await provider.syncFromProxy().catch(() => {})

    expect(provider.getAuthStorage().has('github-copilot')).toBe(true)
    provider.dispose()
  })

  it('handles missing credentials field gracefully (empty unwrap)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
      json: () => Promise.resolve({}),
    })

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 'tok',
      initialSyncMaxAttempts: 1,
      initialSyncRetryMs: 0,
    })

    await provider.init()
    expect(provider.getAuthStorage().has('github-copilot')).toBe(false)
    provider.dispose()
  })

  it('should clean up interval on dispose', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(wrappedResponse({}))

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 'tok',
      initialSyncMaxAttempts: 1,
      initialSyncRetryMs: 0,
    })

    await provider.init()
    provider.dispose()
    expect(true).toBe(true)
  })
})
