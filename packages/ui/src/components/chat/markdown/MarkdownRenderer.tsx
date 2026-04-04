import { memo, useContext, useMemo, type ReactNode } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remend from 'remend'
import { marked } from 'marked'
import { CodeBlock } from './CodeBlock.js'
import { StreamdownBlock } from './StreamdownBlock.js'
import { MarkdownStreamingContext } from './streaming-context.js'

type Pluggable = NonNullable<Options['remarkPlugins']>[number]

type MarkdownBlock = {
  key: number
  raw: string
}

type LexerToken = {
  raw?: string
}

export function splitMarkdownBlocks(content: string): MarkdownBlock[] {
  const fixed = remend(content)
  const tokens = marked.lexer(fixed) as LexerToken[]

  let offset = 0
  const blocks: MarkdownBlock[] = []

  for (const token of tokens) {
    const raw = typeof token.raw === 'string' ? token.raw : ''
    if (raw.length === 0) continue

    blocks.push({ key: offset, raw })
    offset += raw.length
  }

  return blocks
}

/**
 * Extract code text and language from the <code> child element that
 * react-markdown places inside <pre> for fenced code blocks.
 */
function useCode(raw: ReactNode): { content: string; lang: string } | undefined {
  if (!raw || typeof raw !== 'object' || !('props' in (raw as object))) return undefined
  const props = (raw as { props?: { children?: unknown; className?: string } }).props
  if (!props) return undefined
  const children = props.children
  const content = Array.isArray(children) ? (children[0] as string) : typeof children === 'string' ? children : ''
  if (!content) return undefined
  const lang = props.className?.replace('language-', '') || 'text'
  return { content, lang }
}

function MarkdownPreComponent({ children }: { children?: ReactNode }) {
  const streaming = useContext(MarkdownStreamingContext)
  const code = useCode(children)
  if (!code) return <pre>{children}</pre>
  return (
    <CodeBlock className={code.lang ? `language-${code.lang}` : undefined} streaming={streaming}>
      {code.content}
    </CodeBlock>
  )
}

export const MarkdownRenderer = memo(function MarkdownRenderer(
  {
    children,
    streaming,
    className,
  }: {
    children: string
    streaming?: boolean
    className?: string
  },
) {
  const remarkPlugins = useMemo<Pluggable[]>(() => [remarkGfm, remarkBreaks], [])

  const staticComponents = useMemo<Components>(() => {
    return {
      pre({ children: preChildren }) {
        return <MarkdownPreComponent>{preChildren}</MarkdownPreComponent>
      },
    }
  }, [])

  const blocks = useMemo(() => streaming ? splitMarkdownBlocks(children) : [], [children, streaming])

  if (!streaming) {
    return (
      <div className={className}>
        <MarkdownStreamingContext.Provider value={false}>
          <ReactMarkdown components={staticComponents} remarkPlugins={remarkPlugins}>
            {children}
          </ReactMarkdown>
        </MarkdownStreamingContext.Provider>
      </div>
    )
  }

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const isTail = index === blocks.length - 1
        return (
          <StreamdownBlock
            key={block.key}
            components={staticComponents}
            remarkPlugins={remarkPlugins}
            streaming={isTail}
          >
            {block.raw}
          </StreamdownBlock>
        )
      })}
    </div>
  )
})
