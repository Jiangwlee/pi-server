import { memo } from 'react'
import type { ThinkingLevel } from '../../client/types.js'

export type ThinkingLevelSelectorClassNames = {
  root?: string
  select?: string
  label?: string
}

const THINKING_LEVELS: { value: ThinkingLevel; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
]

export const ThinkingLevelSelector = memo(function ThinkingLevelSelector({
  value,
  onChange,
  disabled,
  className,
  classNames,
}: {
  value: ThinkingLevel
  onChange: (level: ThinkingLevel) => void
  disabled?: boolean
  className?: string
  classNames?: ThinkingLevelSelectorClassNames
}) {
  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <select
        className={classNames?.select}
        value={value}
        onChange={(e) => onChange(e.target.value as ThinkingLevel)}
        disabled={disabled}
        aria-label="Thinking level"
      >
        {THINKING_LEVELS.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
    </div>
  )
})
