/**
 * @pi-server/ui entrypoint
 * - Exposes the UI package public API surface.
 * - Current scope: client layer only (api client + SSE parsing + shared types).
 * - Hooks/components will be added in later vertical slices.
 */
export * from './client/index.js'
