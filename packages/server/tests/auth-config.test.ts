import { describe, it, expect } from 'vitest'
import { readAuthConfig } from '../src/auth/auth-config.js'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function makeTmpDir(): string {
  const dir = join(tmpdir(), `auth-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeYaml(dir: string, content: string): string {
  const path = join(dir, 'auth-config.yaml')
  writeFileSync(path, content, 'utf-8')
  return path
}

function writePiAuth(dir: string, data: Record<string, unknown>): string {
  const path = join(dir, 'auth.json')
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
  return path
}

const VALID_YAML = `
credentials:
  kimi-coding:
    type: api_key
    key: sk-kimi
    last_update: "2026-04-12T10:30:00Z"
  litellm:
    type: api_key
    key: sk-litellm
    baseUrl: "http://localhost:10000"
models:
  - id: claude-sonnet-4.6
    provider: github-copilot
    name: Claude Sonnet 4.6
  - id: qwen3-32b
    provider: litellm
    name: Qwen3 32B
`

const PI_AUTH_DATA = {
  'github-copilot': {
    type: 'oauth',
    refresh: 'ghu_test_token',
    access: 'tid=abc',
    expires: 1775737374000,
  },
  'openai-codex': {
    type: 'oauth',
    refresh: 'rt_xxx',
    access: 'eyJ...',
    expires: 1776152371964,
  },
}

describe('readAuthConfig', () => {
  it('merges github-copilot from Pi auth.json into YAML config', () => {
    const dir = makeTmpDir()
    try {
      const yamlPath = writeYaml(dir, VALID_YAML)
      const piPath = writePiAuth(dir, PI_AUTH_DATA)
      const config = readAuthConfig(yamlPath, piPath)

      expect(config.credentials['github-copilot']).toMatchObject({
        type: 'oauth',
        key: 'ghu_test_token',
      })
      expect(config.credentials['kimi-coding'].key).toBe('sk-kimi')
      expect(config.credentials['litellm'].baseUrl).toBe('http://localhost:10000')
      expect(config.models).toHaveLength(2)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('works when auth-config.yaml does not exist (Pi auth.json only)', () => {
    const dir = makeTmpDir()
    try {
      const yamlPath = join(dir, 'nonexistent.yaml')
      const piPath = writePiAuth(dir, PI_AUTH_DATA)
      const config = readAuthConfig(yamlPath, piPath)

      expect(config.credentials['github-copilot']).toMatchObject({
        type: 'oauth',
        key: 'ghu_test_token',
      })
      expect(config.models).toEqual([])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('works when Pi auth.json does not exist (YAML only)', () => {
    const dir = makeTmpDir()
    try {
      const yamlPath = writeYaml(dir, VALID_YAML)
      const piPath = join(dir, 'nonexistent-auth.json')
      const config = readAuthConfig(yamlPath, piPath)

      expect(config.credentials['github-copilot']).toBeUndefined()
      expect(config.credentials['kimi-coding'].key).toBe('sk-kimi')
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('Pi auth.json overrides github-copilot in YAML', () => {
    const dir = makeTmpDir()
    try {
      const yamlWithCopilot = `
credentials:
  github-copilot:
    type: oauth
    key: ghu_old_from_yaml
  kimi-coding:
    type: api_key
    key: sk-kimi
models: []
`
      const yamlPath = writeYaml(dir, yamlWithCopilot)
      const piPath = writePiAuth(dir, PI_AUTH_DATA)
      const config = readAuthConfig(yamlPath, piPath)

      expect(config.credentials['github-copilot'].key).toBe('ghu_test_token')
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('returns empty config when both files are missing', () => {
    const dir = makeTmpDir()
    try {
      const config = readAuthConfig(
        join(dir, 'no.yaml'),
        join(dir, 'no.json'),
      )
      expect(config.credentials).toEqual({})
      expect(config.models).toEqual([])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('throws on invalid YAML', () => {
    const dir = makeTmpDir()
    try {
      const path = writeYaml(dir, ':::invalid yaml:::')
      expect(() => readAuthConfig(path, join(dir, 'no.json'))).toThrow()
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('throws when YAML exists but credentials field is missing', () => {
    const dir = makeTmpDir()
    try {
      const path = writeYaml(dir, 'models:\n  - id: foo\n    provider: bar\n    name: Foo')
      expect(() => readAuthConfig(path, join(dir, 'no.json'))).toThrow('missing or invalid "credentials"')
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('throws when YAML exists but models field is missing', () => {
    const dir = makeTmpDir()
    try {
      const path = writeYaml(dir, 'credentials:\n  foo:\n    type: api_key\n    key: sk-xxx')
      expect(() => readAuthConfig(path, join(dir, 'no.json'))).toThrow('missing or invalid "models"')
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('ignores Pi auth.json entries without refresh field', () => {
    const dir = makeTmpDir()
    try {
      const yamlPath = join(dir, 'no.yaml')
      const piPath = writePiAuth(dir, {
        'github-copilot': { type: 'oauth', access: 'tid=abc', expires: 0 },
      })
      const config = readAuthConfig(yamlPath, piPath)
      expect(config.credentials['github-copilot']).toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
