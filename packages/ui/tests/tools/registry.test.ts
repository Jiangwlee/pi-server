import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerToolRenderer,
  getToolRenderer,
  getRegisteredToolNames,
} from '../../src/tools/registry.js'

// Registry is module-level global, so tests may leak state.
// We test additive behavior only.

describe('tool renderer registry', () => {
  const dummyRenderer = {
    render: () => ({ content: null, custom: false }),
  }

  it('returns undefined for unregistered tool', () => {
    expect(getToolRenderer('nonexistent_tool_xyz')).toBeUndefined()
  })

  it('registers and retrieves a renderer', () => {
    registerToolRenderer('test_tool_abc', dummyRenderer)
    expect(getToolRenderer('test_tool_abc')).toBe(dummyRenderer)
  })

  it('overwrites existing registration', () => {
    const another = { render: () => ({ content: 'new', custom: true }) }
    registerToolRenderer('test_tool_abc', another)
    expect(getToolRenderer('test_tool_abc')).toBe(another)
  })

  it('lists registered tool names', () => {
    const names = getRegisteredToolNames()
    expect(names).toContain('test_tool_abc')
  })
})
