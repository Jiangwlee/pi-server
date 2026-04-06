import { memo } from 'react'
import type { ThinkingLevel } from '../../client/types.js'
import { SvgSparkle } from '../icons/index.js'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
} from '../primitives/Popover.js'

const THINKING_LEVELS: { value: ThinkingLevel; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No extended thinking' },
  { value: 'minimal', label: 'Minimal', description: '1K tokens' },
  { value: 'low', label: 'Low', description: '5K tokens' },
  { value: 'medium', label: 'Medium', description: '10K tokens' },
  { value: 'high', label: 'High', description: '20K tokens' },
  { value: 'xhigh', label: 'XHigh', description: '32K tokens' },
]

export type ThinkingLevelSelectorProps = {
  value: ThinkingLevel
  onChange: (level: ThinkingLevel) => void
  disabled?: boolean
  className?: string
}

export const ThinkingLevelSelector = memo(function ThinkingLevelSelector({
  value,
  onChange,
  disabled,
  className,
}: ThinkingLevelSelectorProps) {
  const current = THINKING_LEVELS.find((l) => l.value === value) ?? THINKING_LEVELS[3]
  const isActive = value !== 'off'

  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Thinking: ${current.label}`}
          className={[
            'flex h-8 items-center gap-1.5 rounded-md border-none bg-transparent px-2 text-xs cursor-pointer',
            'transition-colors duration-fast hover:bg-hover',
            isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
            'disabled:opacity-40 disabled:cursor-default',
            className,
          ].filter(Boolean).join(' ')}
        >
          <SvgSparkle size={14} />
          <span>{current.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" width="sm">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-text-secondary mb-1">Thinking Budget</p>
        </div>
        <div className="h-px bg-border mb-1" />
        {THINKING_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={[
              'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-none',
              'transition-colors duration-fast hover:bg-hover',
              value === level.value
                ? 'text-accent font-medium'
                : 'text-text-primary',
            ].join(' ')}
          >
            <span>{level.label}</span>
            <span className="text-xs text-text-muted">{level.description}</span>
          </button>
        ))}
      </PopoverContent>
    </PopoverRoot>
  )
})
