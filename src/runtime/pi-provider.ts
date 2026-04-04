import {
  AuthStorage,
  InMemoryAuthStorageBackend,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent'

interface PiProviderOptions {
  authProxyUrl?: string
  authProxyToken?: string
}

export class PiProvider {
  private authStorage: AuthStorage
  private modelRegistry: ModelRegistry
  private backend: InMemoryAuthStorageBackend | null = null
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private proxyUrl: string | null
  private proxyToken: string | null

  constructor(options: PiProviderOptions) {
    this.proxyUrl = options.authProxyUrl ?? null
    this.proxyToken = options.authProxyToken ?? null

    if (this.proxyUrl) {
      this.backend = new InMemoryAuthStorageBackend()
      this.authStorage = AuthStorage.fromStorage(this.backend)
    } else {
      this.authStorage = AuthStorage.create()
    }

    this.modelRegistry = new ModelRegistry(this.authStorage)
  }

  async init(): Promise<void> {
    if (!this.proxyUrl) return

    // Fail-closed: first pull must succeed
    await this.syncFromProxy()

    // Start periodic sync (30s)
    this.syncInterval = setInterval(() => {
      this.syncFromProxy().catch((err) => {
        console.error('[pi-provider] Sync failed, retaining last-good data:', err.message)
      })
    }, 30_000)
  }

  async syncFromProxy(): Promise<void> {
    if (!this.proxyUrl || !this.backend) return

    const res = await fetch(`${this.proxyUrl}/auth.json`, {
      headers: {
        Authorization: `Bearer ${this.proxyToken}`,
        'User-Agent': 'pi-server',
      },
    })

    if (!res.ok) {
      throw new Error(`Auth proxy returned ${res.status}`)
    }

    const data = await res.json()

    // Replace-all semantics: write full remote data, overwriting local
    this.backend.withLock(() => ({
      result: undefined,
      next: JSON.stringify(data, null, 2),
    }))

    this.authStorage.reload()
    this.modelRegistry.refresh()
  }

  getAuthStorage(): AuthStorage {
    return this.authStorage
  }

  getModelRegistry(): ModelRegistry {
    return this.modelRegistry
  }

  dispose(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
