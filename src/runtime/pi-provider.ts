import {
  AuthStorage,
  InMemoryAuthStorageBackend,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent'
import type { Logger } from '../logger.js'
import { createLogger, withError } from '../logger.js'

interface PiProviderOptions {
  authProxyUrl?: string
  authProxyToken?: string
  logger?: Logger
}

export class PiProvider {
  private authStorage: AuthStorage
  private modelRegistry: ModelRegistry
  private backend: InMemoryAuthStorageBackend | null = null
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private proxyUrl: string | null
  private proxyToken: string | null
  private logger: Logger

  constructor(options: PiProviderOptions) {
    this.proxyUrl = options.authProxyUrl ?? null
    this.proxyToken = options.authProxyToken ?? null
    this.logger = options.logger ?? createLogger('info', 'json')

    if (this.proxyUrl) {
      this.backend = new InMemoryAuthStorageBackend()
      this.authStorage = AuthStorage.fromStorage(this.backend)
    } else {
      this.authStorage = AuthStorage.create()
    }

    this.modelRegistry = ModelRegistry.create(this.authStorage)
  }

  async init(): Promise<void> {
    if (!this.proxyUrl) return

    // Fail-closed: first pull must succeed
    await this.syncFromProxy()

    // Start periodic sync (30s)
    this.syncInterval = setInterval(() => {
      this.syncFromProxy().catch((err) => {
        this.logger.warn('pi_provider.sync_failed_retaining_last_good', withError({
          proxyUrl: this.proxyUrl,
        }, err))
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
      this.logger.warn('pi_provider.sync_http_error', {
        proxyUrl: this.proxyUrl,
        status: res.status,
      })
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
    this.logger.debug('pi_provider.sync_succeeded', { proxyUrl: this.proxyUrl })
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
