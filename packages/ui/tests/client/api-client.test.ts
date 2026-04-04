import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiClient, ApiError } from '../../src/client/api-client.js'

describe('ApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses default /backend basePath and credentials include', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'u1', displayName: 'test' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient()
    await client.me()

    expect(fetchMock).toHaveBeenCalledWith('/backend/auth/me', expect.objectContaining({
      credentials: 'include',
      method: 'GET',
    }))
  })

  it('calls login endpoint with json body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'u1', displayName: 'test' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient({ basePath: '/backend' })
    await client.login({ email: 'a@b.com', password: 'x' })

    expect(fetchMock).toHaveBeenCalledWith('/backend/auth/login', expect.objectContaining({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    }))
  })

  it('throws ApiError with status/body for non-ok response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: () => Promise.resolve('{"error":"Session is busy"}'),
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient()

    await expect(client.send('s1', { message: 'x' })).rejects.toMatchObject<ApiError>({
      name: 'ApiError',
      status: 409,
      body: '{"error":"Session is busy"}',
    })
  })
})
