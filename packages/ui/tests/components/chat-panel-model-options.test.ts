import { describe, expect, it } from 'vitest'
import { getModelOptionLabel, getModelOptionValue } from '../../src/components/chat/ChatPanel.js'

describe('ChatPanel model option helpers', () => {
  it('includes provider in option value and label when present', () => {
    const model = {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      provider: 'openai',
    }

    expect(getModelOptionValue(model)).toBe('openai:gpt-4.1')
    expect(getModelOptionLabel(model)).toBe('openai / GPT-4.1')
  })

  it('falls back to id when name/provider are absent', () => {
    const model = {
      id: 'sonnet-4',
    }

    expect(getModelOptionValue(model)).toBe('sonnet-4')
    expect(getModelOptionLabel(model)).toBe('sonnet-4')
  })
})
