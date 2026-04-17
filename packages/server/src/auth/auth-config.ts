// ---
// purpose: Read ~/.pi-server/auth-config.yaml + merge github-copilot from ~/.pi/agent/auth.json
// exports: readAuthConfig, AuthConfig, Credential, ModelEntry
// ---

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import yaml from 'js-yaml'

export interface Credential {
  type: string
  key: string
  baseUrl?: string
  last_update?: string
}

export interface ModelEntry {
  id: string
  provider: string
  name: string
}

export interface AuthConfig {
  credentials: Record<string, Credential>
  models: ModelEntry[]
}

const AUTH_CONFIG_PATH = join(homedir(), '.pi-server', 'auth-config.yaml')
const PI_AUTH_PATH = join(homedir(), '.pi', 'agent', 'auth.json')

export function readAuthConfig(
  configPath: string = AUTH_CONFIG_PATH,
  piAuthPath: string = PI_AUTH_PATH,
): AuthConfig {
  const base = readAuthConfigYaml(configPath)
  const piCopilot = readPiCopilotCredential(piAuthPath)

  if (piCopilot) {
    base.credentials['github-copilot'] = piCopilot
  }

  return base
}

function readAuthConfigYaml(path: string): AuthConfig {
  if (!existsSync(path)) {
    return { credentials: {}, models: [] }
  }

  const raw = readFileSync(path, 'utf-8')
  const parsed = yaml.load(raw)

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid auth-config: expected a YAML object')
  }

  const config = parsed as Record<string, unknown>

  if (!config.credentials || typeof config.credentials !== 'object') {
    throw new Error('Invalid auth-config: missing or invalid "credentials" field')
  }

  if (!Array.isArray(config.models)) {
    throw new Error('Invalid auth-config: missing or invalid "models" field')
  }

  return config as unknown as AuthConfig
}

interface PiAuthEntry {
  type: string
  refresh?: string
  access?: string
  expires?: number
}

function readPiCopilotCredential(path: string): Credential | null {
  if (!existsSync(path)) return null

  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, PiAuthEntry>
    const copilot = data['github-copilot']
    if (!copilot?.refresh) return null

    return {
      type: 'oauth',
      key: copilot.refresh,
      last_update: new Date().toISOString(),
    }
  } catch {
    return null
  }
}
