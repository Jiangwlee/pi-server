import { describe, it, expect } from 'vitest'
import { bashRenderer } from '../../src/components/chat/tools/renderers/BashRenderer.js'
import type { ToolRenderContext } from '../../src/components/chat/tools/types.js'
import type { ChatMessage, ToolCall } from '../../src/client/types.js'

function makeCtx(
  command: string,
  state: 'inprogress' | 'complete' | 'error',
  resultText?: string,
  isError = false,
): ToolRenderContext {
  const toolCall: ToolCall = {
    id: 'call_1',
    name: 'bash',
    arguments: { command },
  }
  const result: ChatMessage | undefined = resultText
    ? {
        role: 'assistant',
        content: [{ type: 'text', text: resultText }],
        isError,
      }
    : undefined

  return { toolCall, result, state, renderType: 'full' }
}

describe('BashRenderer.getMetadata', () => {
  it('returns SvgTerminal icon', () => {
    const meta = bashRenderer.getMetadata!(makeCtx('ls', 'inprogress'))
    expect(meta.icon).toBeTruthy()
    expect((meta.icon as { name?: string })?.name || meta.icon?.toString()).toContain('SvgTerminal')
  })

  it('shows truncated command in status', () => {
    const meta = bashRenderer.getMetadata!(makeCtx('echo hello', 'complete', 'hello'))
    expect(meta.status).toBe('$ echo hello')
  })

  it('truncates long commands to 60 chars', () => {
    const longCmd = 'a'.repeat(100)
    const meta = bashRenderer.getMetadata!(makeCtx(longCmd, 'inprogress'))
    expect((meta.status as string).length).toBeLessThanOrEqual(62 + 2) // "$ " prefix + truncated
    expect((meta.status as string)).toContain('...')
  })

  it('shows exit code on error', () => {
    const meta = bashRenderer.getMetadata!(
      makeCtx('bad-cmd', 'error', 'bad-cmd: not found\n\nCommand exited with code 127', true),
    )
    expect(meta.status).toContain('exit 127')
  })

  it('uses tint surface for success', () => {
    const meta = bashRenderer.getMetadata!(makeCtx('ls', 'complete', '/home'))
    expect(meta.surfaceBackground).toBe('tint')
  })

  it('uses error surface on error', () => {
    const meta = bashRenderer.getMetadata!(makeCtx('ls', 'error', 'fail', true))
    expect(meta.surfaceBackground).toBe('error')
  })

  it('falls back to "bash" when no command', () => {
    const ctx = makeCtx('', 'inprogress')
    const meta = bashRenderer.getMetadata!(ctx)
    expect(meta.status).toBe('bash')
  })
})

describe('BashRenderer.render', () => {
  it('returns custom=true for full view', () => {
    const result = bashRenderer.render(makeCtx('ls', 'complete', '/home'))
    expect(result.custom).toBe(true)
  })

  it('returns custom=true for compact view', () => {
    const ctx = { ...makeCtx('ls', 'inprogress'), renderType: 'compact' as const }
    const result = bashRenderer.render(ctx)
    expect(result.custom).toBe(true)
  })
})

describe('BashRenderer.supportsRenderType', () => {
  it('supports full and compact', () => {
    expect(bashRenderer.supportsRenderType!('full')).toBe(true)
    expect(bashRenderer.supportsRenderType!('compact')).toBe(true)
  })

  it('does not support highlight', () => {
    expect(bashRenderer.supportsRenderType!('highlight')).toBe(false)
  })
})
