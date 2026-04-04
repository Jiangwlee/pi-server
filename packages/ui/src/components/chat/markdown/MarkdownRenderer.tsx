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

function MarkdownCodeComponent(
  {
    children,
    className,
  }: {
    children?: ReactNode
    className?: string
  },
) {
  const streaming = useContext(MarkdownStreamingContext)
  return (
    <CodeBlock className={className} streaming={streaming}>
      {children}
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
        return <>{preChildren}</>
      },
      code({ children: codeChildren, className: codeClassName }) {
        return <MarkdownCodeComponent className={codeClassName}>{codeChildren}</MarkdownCodeComponent>
      },
    }
  }, [])

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

  const blocks = useMemo(() => splitMarkdownBlocks(children), [children])

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
