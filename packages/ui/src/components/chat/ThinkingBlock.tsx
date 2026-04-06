import { memo, useEffect, useRef, useState } from 'react'
import type { ThinkingContent } from '../../client/types.js'
import SvgSparkle from '../icons/SvgSparkle.js'

export type ThinkingBlockClassNames = {
  root?: string
  toggle?: string
  content?: string
  duration?: string
}

const defaults = {
  toggle: 'flex items-center gap-1.5 text-sm text-[var(--tl-text-03,rgba(0,0,0,0.55))] hover:text-[var(--tl-text-04,rgba(0,0,0,0.75))] cursor-pointer border-none bg-transparent font-inherit py-1',
  content: 'whitespace-pre-wrap text-sm text-secondary mt-1 pl-4 border-l-2 border-border',
  duration: 'text-xs text-muted',
}

export const ThinkingBlock = memo(function ThinkingBlock(
  {
    content,
    streaming,
    className,
    classNames,
    defaultExpanded,
    startTime,
  }: {
    content: ThinkingContent
    streaming?: boolean
    className?: string
    classNames?: ThinkingBlockClassNames
    defaultExpanded?: boolean
    startTime?: number
  },
) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded))
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (streaming) {
      if (!startTimeRef.current) startTimeRef.current = startTime ?? Date.now()
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
    // streaming just ended — capture final elapsed before resetting ref
    if (startTimeRef.current) {
      setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000))
    }
    startTimeRef.current = null
    return undefined
  }, [streaming, startTime])

  // Streaming forces expanded; user toggle only applies when not streaming
  const isExpanded = streaming ? true : expanded

  const toggleCls = classNames?.toggle ?? defaults.toggle
  const durationCls = classNames?.duration ?? defaults.duration

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={toggleCls}
        onClick={() => {
          if (streaming) return
          setExpanded((prev) => !prev)
        }}
      >
        {streaming ? (
          <>
            <span className="animate-pulse">●</span>
            <span>Thinking...</span>
            {elapsed > 0 ? <span className={durationCls}>({elapsed}s)</span> : null}
          </>
        ) : (
          <>
            <SvgSparkle size={14} strokeWidth={1.5} />
            <span>{elapsed > 0 ? `Thought for ${elapsed}s` : 'Thought'}</span>
          </>
        )}
      </button>
      {isExpanded ? (
        <div className={classNames?.content ?? defaults.content}>
          {content.redacted ? '[Redacted]' : content.thinking}
        </div>
      ) : null}
    </div>
  )
})
