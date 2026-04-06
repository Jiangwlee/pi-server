import { memo } from 'react'
import type { Model } from '../../client/types.js'
import { SvgChevronDown } from '../icons/index.js'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
} from '../primitives/Popover.js'

export type ModelSelectorClassNames = {
  root?: string
  trigger?: string
}

export type ModelSelectorProps = {
  models: Model[]
  value: string
  onChange: (value: string) => void
  className?: string
  classNames?: ModelSelectorClassNames
}

export function getModelOptionValue(model: Model): string {
  if (model.provider) return `${model.provider}:${model.id}`
  return model.id
}

export function getModelOptionLabel(model: Model): string {
  return model.name ?? model.id
}

export const ModelSelector = memo(function ModelSelector(
  { models, value, onChange, className, classNames }: ModelSelectorProps,
) {
  if (models.length === 0) return null

  const selected = models.find((m) => getModelOptionValue(m) === value)
  const label = selected ? getModelOptionLabel(selected) : (value || 'Select model')

  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Model: ${label}`}
          className={[
            'flex h-8 max-w-[10rem] items-center gap-1 rounded-md border-none bg-transparent px-2 text-xs cursor-pointer',
            'transition-colors duration-fast text-text-secondary hover:bg-hover hover:text-text-primary',
            classNames?.trigger ?? classNames?.root ?? className,
          ].filter(Boolean).join(' ')}
        >
          <span className="truncate">{label}</span>
          <SvgChevronDown size={12} className="flex-shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" width="md">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-text-secondary mb-1">Model</p>
        </div>
        <div className="h-px bg-border mb-1" />
        <div className="overflow-y-auto max-h-[min(24rem,60vh)]">
        {models.map((model) => {
          const val = getModelOptionValue(model)
          const isSelected = val === value
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={[
                'flex w-full flex-col items-start rounded-md px-2 py-1.5 text-sm outline-none',
                'transition-colors duration-fast hover:bg-hover',
                isSelected ? 'text-accent font-medium' : 'text-text-primary',
              ].join(' ')}
            >
              <span>{getModelOptionLabel(model)}</span>
              {model.provider ? (
                <span className="text-xs text-text-muted">{model.provider}</span>
              ) : null}
            </button>
          )
        })}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
})
