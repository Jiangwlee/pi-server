import type { ToolRenderContext, ToolRenderResult, ToolRenderMetadata, ToolRenderer } from '../types.js'
import { CodeBlock } from '../../markdown/CodeBlock.js'
import SvgFileText from '../../../icons/SvgFileText.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPath(ctx: ToolRenderContext): string {
  const args = ctx.toolCall.arguments as { path?: string; file_path?: string }
  return args?.file_path ?? args?.path ?? ''
}

function getOffset(ctx: ToolRenderContext): number | undefined {
  return (ctx.toolCall.arguments as { offset?: number })?.offset ?? undefined
}

function getLimit(ctx: ToolRenderContext): number | undefined {
  return (ctx.toolCall.arguments as { limit?: number })?.limit ?? undefined
}

function getOutputText(ctx: ToolRenderContext): string | null {
  if (!ctx.result) return null
  const texts = ctx.result.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { text: string }).text)
  return texts.length > 0 ? texts.join('\n') : null
}

/** Replace /home/user/ or /Users/user/ prefix with ~/ */
function shortenPath(path: string): string {
  const m = path.match(/^\/(?:home|Users)\/[^/]+\/(.*)$/)
  return m ? `~/${m[1]}` : path
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s
}

/** Detect language from file extension for syntax highlighting */
const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rs: 'rust', go: 'go', rb: 'ruby',
  java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp', h: 'c',
  cs: 'csharp', php: 'php', sh: 'bash', bash: 'bash', zsh: 'bash',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  xml: 'xml', html: 'html', css: 'css', scss: 'scss',
  sql: 'sql', md: 'markdown', graphql: 'graphql',
}

function getLang(path: string): string {
  const basename = path.split('/').pop() ?? ''
  const lowerName = basename.toLowerCase()
  if (lowerName === 'dockerfile') return 'dockerfile'
  if (lowerName === 'makefile') return 'makefile'
  const ext = basename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'text'
}

/**
 * Separate truncation/continuation notices from actual file content.
 * pi-mono appends lines like:
 *   [Showing lines 1-200 of 500. Use offset=201 to continue.]
 *   [3 more lines in file. Use offset=5 to continue.]
 */
function separateContent(text: string): { code: string; notice: string | null } {
  const m = text.match(/\n\n(\[(?:Showing lines .+|.+ more lines .+)\])$/)
  if (m) {
    return { code: text.slice(0, m.index!), notice: m[1] }
  }
  return { code: text, notice: null }
}

// ---------------------------------------------------------------------------
// CodeBlock style overrides — remove vertical margin since parent card handles spacing
// ---------------------------------------------------------------------------

const codeBlockClassNames = {
  root: 'pi-code-block--borderless overflow-hidden',
  header: 'flex items-center justify-between px-3 py-1.5 text-xs',
  code: 'block overflow-x-auto p-3 text-xs leading-relaxed',
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ReadFullView({ ctx }: { ctx: ToolRenderContext }) {
  const output = getOutputText(ctx)
  if (!output) return null

  const path = getPath(ctx)
  const lang = getLang(path)
  const { code, notice } = separateContent(output)

  return (
    <div className="flex flex-col gap-1.5">
      <CodeBlock className={`language-${lang}`} classNames={codeBlockClassNames}>
        {code}
      </CodeBlock>
      {notice && (
        <div
          className="text-xs px-1"
          style={{ color: 'var(--tl-text-03, rgba(0,0,0,0.6))' }}
        >
          {notice}
        </div>
      )}
    </div>
  )
}

function ReadCompactView({ ctx }: { ctx: ToolRenderContext }) {
  const path = getPath(ctx)
  const short = path ? shortenPath(path) : 'file'
  return (
    <div
      className="text-xs truncate"
      style={{ color: 'var(--tl-text-03, rgba(0,0,0,0.6))', opacity: 0.8 }}
    >
      Read {short}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export const readRenderer: ToolRenderer = {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata {
    const path = getPath(ctx)
    const short = path ? truncate(shortenPath(path), 50) : 'file'
    const offset = getOffset(ctx)
    const limit = getLimit(ctx)

    let status = `Read ${short}`
    if (offset != null || limit != null) {
      const start = offset ?? 1
      const end = limit != null ? start + limit - 1 : undefined
      status += `:${start}${end != null ? `-${end}` : ''}`
    }

    return {
      icon: SvgFileText,
      status,
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',
    }
  },

  render(ctx: ToolRenderContext): ToolRenderResult {
    if (ctx.renderType === 'compact') {
      return { content: <ReadCompactView ctx={ctx} />, custom: true }
    }
    return { content: <ReadFullView ctx={ctx} />, custom: true }
  },

  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
