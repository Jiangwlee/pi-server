import { Hono } from 'hono'
import type { PiProvider } from '../runtime/pi-provider.js'
import '../auth/types.js'

export function createModelRoutes(piProvider: PiProvider): Hono {
  const app = new Hono()

  app.get('/api/models', (c) => {
    const registry = piProvider.getModelRegistry()
    const models = registry.getAvailable()
    return c.json(models)
  })

  return app
}
