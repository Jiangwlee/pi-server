import { memo } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import { MarkdownStreamingContext } from './streaming-context.js'

type Pluggable = NonNullable<Options['remarkPlugins']>[number]

export const StreamdownBlock = memo(function StreamdownBlock(
  {
    children,
    components,
    remarkPlugins,
    streaming,
  }: {
    children: string
    components: Components
    remarkPlugins: Pluggable[]
    streaming?: boolean
  },
) {
  return (
    <MarkdownStreamingContext.Provider value={Boolean(streaming)}>
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
        {children}
      </ReactMarkdown>
    </MarkdownStreamingContext.Provider>
  )
}, (previousProps, nextProps) =>
  previousProps.children === nextProps.children
  && previousProps.streaming === nextProps.streaming)
