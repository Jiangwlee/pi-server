import { memo } from 'react'
import type { Model } from '../../client/types.js'

export type ModelSelectorClassNames = {
  root?: string
  select?: string
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
  const display = model.name ?? model.id
  if (model.provider) return `${model.provider} / ${display}`
  return display
}

const defaults = {
  select: 'text-sm bg-transparent border border-border rounded-md px-2 py-1 cursor-pointer',
}

export const ModelSelector = memo(function ModelSelector(
  { models, value, onChange, className, classNames }: ModelSelectorProps,
) {
  if (models.length === 0) return null

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <select
        className={classNames?.select ?? defaults.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {models.map((model) => (
          <option key={getModelOptionValue(model)} value={getModelOptionValue(model)}>
            {getModelOptionLabel(model)}
          </option>
        ))}
      </select>
    </div>
  )
})
