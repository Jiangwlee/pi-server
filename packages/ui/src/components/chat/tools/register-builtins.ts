/**
 * Auto-register built-in tool renderers.
 * Import this module once at app startup (side-effect import).
 */
import { registerToolRenderer } from './registry.js'
import { bashRenderer } from './renderers/BashRenderer.js'
import { readRenderer } from './renderers/ReadRenderer.js'

registerToolRenderer('bash', bashRenderer)
registerToolRenderer('read', readRenderer)
