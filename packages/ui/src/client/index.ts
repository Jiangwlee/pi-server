/**
 * Client layer entrypoint (React-independent).
 * Re-exports:
 * - request/response contracts from `types`
 * - REST API wrapper from `api-client`
 * - SSE frame parser utilities from `sse-client`
 */
export * from './types.js'
export * from './api-client.js'
export * from './sse-client.js'
