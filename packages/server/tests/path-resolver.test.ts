import { describe, it, expect } from 'vitest'
import { resolveSessionPath, resolveWorkspacePath, validateRelativePath } from '../src/runtime/path-resolver.js'

describe('validateRelativePath', () => {
  it('should accept normal relative paths', () => {
    expect(validateRelativePath('my-project')).toBe('my-project')
    expect(validateRelativePath('a/b/c')).toBe('a/b/c')
  })

  it('should reject ../ traversal', () => {
    expect(() => validateRelativePath('../etc')).toThrow()
    expect(() => validateRelativePath('a/../../b')).toThrow()
    expect(() => validateRelativePath('..')).toThrow()
  })

  it('should reject absolute paths', () => {
    expect(() => validateRelativePath('/etc/passwd')).toThrow()
    expect(() => validateRelativePath('/home/user')).toThrow()
  })

  it('should use default value for empty input', () => {
    expect(validateRelativePath('')).toBe('')
    expect(validateRelativePath('  ')).toBe('')
  })
})

describe('resolveSessionPath', () => {
  it('should resolve session path under user root', () => {
    const result = resolveSessionPath('/data', 'user-123', 'proj/sess1/')
    expect(result).toBe('/data/users/user-123/proj/sess1/session.jsonl')
  })

  it('should ensure result is within user root', () => {
    expect(() => resolveSessionPath('/data', 'user-123', '../other-user/sess')).toThrow()
  })
})

describe('resolveWorkspacePath', () => {
  it('should resolve workspace path under user root', () => {
    const result = resolveWorkspacePath('/data', 'user-123', 'my-project')
    expect(result).toBe('/data/users/user-123/my-project')
  })

  it('should ensure result is within user root', () => {
    expect(() => resolveWorkspacePath('/data', 'user-123', '../escape')).toThrow()
  })
})
