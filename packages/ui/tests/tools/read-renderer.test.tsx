import { describe, it, expect } from 'vitest'
import { readRenderer } from '../../src/components/chat/tools/renderers/ReadRenderer.js'
import type { ToolRenderContext } from '../../src/components/chat/tools/types.js'
import type { ChatMessage, ToolCall } from '../../src/client/types.js'

function makeCtx(
  args: Record<string, unknown>,
  state: 'inprogress' | 'complete' | 'error',
  resultText?: string,
  isError = false,
): ToolRenderContext {
  const toolCall: ToolCall = {
    id: 'call_1',
    name: 'read',
    arguments: args,
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

describe('ReadRenderer.getMetadata', () => {
  it('returns SvgFileText icon', () => {
    const meta = readRenderer.getMetadata!(makeCtx({ path: 'foo.ts' }, 'inprogress'))
    expect(meta.icon).toBeTruthy()
    expect((meta.icon as { name?: string })?.name || meta.icon?.toString()).toContain('SvgFileText')
  })

  it('shows shortened path in status', () => {
    const meta = readRenderer.getMetadata!(
      makeCtx({ path: '/home/bruce/Projects/pi-server/src/foo.ts' }, 'complete', 'content'),
    )
    expect(meta.status).toBe('Read ~/Projects/pi-server/src/foo.ts')
  })

  it('handles macOS-style home paths', () => {
    const meta = readRenderer.getMetadata!(
      makeCtx({ path: '/Users/john/Downloads/test.md' }, 'complete', 'content'),
    )
    expect(meta.status).toBe('Read ~/Downloads/test.md')
  })

  it('shows line range when offset/limit provided', () => {
    const meta = readRenderer.getMetadata!(
      makeCtx({ path: 'src/foo.ts', offset: 10, limit: 20 }, 'inprogress'),
    )
    expect(meta.status).toBe('Read src/foo.ts:10-29')
  })

  it('shows offset without end when no limit', () => {
    const meta = readRenderer.getMetadata!(
      makeCtx({ path: 'src/foo.ts', offset: 50 }, 'inprogress'),
    )
    expect(meta.status).toBe('Read src/foo.ts:50')
  })

  it('truncates long paths to 50 chars', () => {
    const longPath = 'a/'.repeat(30) + 'file.ts'
    const meta = readRenderer.getMetadata!(makeCtx({ path: longPath }, 'inprogress'))
    expect((meta.status as string).length).toBeLessThanOrEqual(60) // "Read " + truncated path
    expect((meta.status as string)).toContain('...')
  })

  it('uses tint surface for success', () => {
    const meta = readRenderer.getMetadata!(makeCtx({ path: 'foo.ts' }, 'complete', 'content'))
    expect(meta.surfaceBackground).toBe('tint')
  })

  it('uses error surface on error', () => {
    const meta = readRenderer.getMetadata!(makeCtx({ path: 'foo.ts' }, 'error', 'fail', true))
    expect(meta.surfaceBackground).toBe('error')
  })

  it('falls back to "file" when no path', () => {
    const meta = readRenderer.getMetadata!(makeCtx({}, 'inprogress'))
    expect(meta.status).toBe('Read file')
  })

  it('supports file_path argument alias', () => {
    const meta = readRenderer.getMetadata!(
      makeCtx({ file_path: 'src/bar.py' }, 'inprogress'),
    )
    expect(meta.status).toBe('Read src/bar.py')
  })
})

describe('ReadRenderer.render', () => {
  it('returns custom=true for full view', () => {
    const result = readRenderer.render(makeCtx({ path: 'foo.ts' }, 'complete', 'const x = 1'))
    expect(result.custom).toBe(true)
  })

  it('returns custom=true for compact view', () => {
    const ctx = { ...makeCtx({ path: 'foo.ts' }, 'inprogress'), renderType: 'compact' as const }
    const result = readRenderer.render(ctx)
    expect(result.custom).toBe(true)
  })

  it('returns content element even when no result text', () => {
    const result = readRenderer.render(makeCtx({ path: 'foo.ts' }, 'inprogress'))
    expect(result.content).toBeTruthy()
    expect(result.custom).toBe(true)
  })
})

describe('ReadRenderer.supportsRenderType', () => {
  it('supports full and compact', () => {
    expect(readRenderer.supportsRenderType!('full')).toBe(true)
    expect(readRenderer.supportsRenderType!('compact')).toBe(true)
  })

  it('does not support highlight', () => {
    expect(readRenderer.supportsRenderType!('highlight')).toBe(false)
  })
})
