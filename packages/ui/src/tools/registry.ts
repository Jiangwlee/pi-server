import type { ToolRenderer } from './types.js'

const renderers = new Map<string, ToolRenderer>()

export function registerToolRenderer(toolName: string, renderer: ToolRenderer): void {
  renderers.set(toolName, renderer)
}

export function getToolRenderer(toolName: string): ToolRenderer | undefined {
  return renderers.get(toolName)
}

export function getRegisteredToolNames(): string[] {
  return Array.from(renderers.keys())
}
