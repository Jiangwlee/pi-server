import {
  AuthStorage,
  InMemoryAuthStorageBackend,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent'
import { logger } from '../logger.js'

interface PiProviderOptions {
  authProxyUrl?: string
  authProxyToken?: string
  initialSyncMaxAttempts?: number
  initialSyncRetryMs?: number
}

export class PiProvider {
  private authStorage: AuthStorage
  private modelRegistry: ModelRegistry
  private backend: InMemoryAuthStorageBackend | null = null
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private proxyUrl: string | null
  private proxyToken: string | null
  private initialSyncMaxAttempts: number
  private initialSyncRetryMs: number

  constructor(options: PiProviderOptions) {
    this.proxyUrl = options.authProxyUrl ?? null
    this.proxyToken = options.authProxyToken ?? null
    this.initialSyncMaxAttempts = Math.max(options.initialSyncMaxAttempts ?? 20, 1)
    this.initialSyncRetryMs = Math.max(options.initialSyncRetryMs ?? 1000, 0)

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

    // Fail-closed: first pull must succeed, with bounded retries for startup races.
    await this.syncFromProxyWithRetry()

    // Start periodic sync (30s)
    this.syncInterval = setInterval(() => {
      this.syncFromProxy().catch((err) => {
        logger.warn({ proxyUrl: this.proxyUrl, err }, 'pi_provider.sync_failed_retaining_last_good')
      })
    }, 30_000)
  }

  async syncFromProxy(): Promise<void> {
    if (!this.proxyUrl || !this.backend) return

    const res = await fetch(`${this.proxyUrl}/auth`, {
      headers: {
        Authorization: `Bearer ${this.proxyToken}`,
        'User-Agent': 'pi-server',
      },
    })

    if (!res.ok) {
      logger.warn({ proxyUrl: this.proxyUrl, status: res.status }, 'pi_provider.sync_http_error')
      throw new Error(`Auth proxy returned ${res.status}`)
    }

    const wrapped = (await res.json()) as { credentials?: Record<string, unknown> } | null
    // credentials entries are already in Pi SDK native auth.json shape ({ [provider]: { type, ...fields } });
    // unwrap only — no field mapping.
    const nativeAuthJson =
      wrapped && typeof wrapped === 'object' && wrapped.credentials ? wrapped.credentials : {}

    // Replace-all semantics: write full remote data, overwriting local
    this.backend.withLock(() => ({
      result: undefined,
      next: JSON.stringify(nativeAuthJson, null, 2),
    }))

    this.authStorage.reload()
    this.modelRegistry.refresh()
    logger.debug(
      { proxyUrl: this.proxyUrl, providers: Object.keys(nativeAuthJson) },
      'pi_provider.sync_succeeded',
    )
  }

  private async syncFromProxyWithRetry(): Promise<void> {
    let lastError: unknown = null

    for (let attempt = 1; attempt <= this.initialSyncMaxAttempts; attempt++) {
      try {
        await this.syncFromProxy()
        if (attempt > 1) {
          logger.info({ proxyUrl: this.proxyUrl, attempts: attempt }, 'pi_provider.initial_sync_recovered')
        }
        return
      } catch (err) {
        lastError = err
        const willRetry = attempt < this.initialSyncMaxAttempts
        logger.warn({
          proxyUrl: this.proxyUrl,
          attempt,
          maxAttempts: this.initialSyncMaxAttempts,
          willRetry,
          retryDelayMs: this.initialSyncRetryMs,
          err,
        }, 'pi_provider.initial_sync_failed')
        if (!willRetry) break
        if (this.initialSyncRetryMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.initialSyncRetryMs))
        }
      }
    }

    throw lastError
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
