/**
 * State layer — event aggregation, turn grouping, and tool state resolution.
 *
 * Responsibilities:
 *   - Aggregate raw AgentEvents into ChatMessage[] and ToolExecution[]
 *   - Group messages into conversation turns (user / agent / tool steps)
 *   - Resolve tool execution state (inprogress / complete / error)
 *
 * Boundaries:
 *   - May import from Transport (client/) for protocol types
 *   - Must NOT import from Render (components/)
 *   - Render layer consumes State output, never the reverse
 */
export * from './use-chat.js'
export * from './group-messages.js'
export { resolveToolState } from './resolve-tool-state.js'
export type { ToolRenderState } from './resolve-tool-state.js'
