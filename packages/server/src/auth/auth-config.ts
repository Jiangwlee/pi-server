// ---
// purpose: Read ~/.pi-server/auth-config.yaml + merge all oauth providers from ~/.pi/agent/auth.json
// exports: readAuthConfig, AuthConfig, Credential, OAuthCredential, ApiKeyCredential, ModelEntry
// ---

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import yaml from 'js-yaml'

export interface OAuthCredential {
  type: 'oauth'
  refresh: string
  access?: string
  expires?: number
  last_update?: string
  [k: string]: unknown
}

export interface ApiKeyCredential {
  type: 'api_key'
  key: string
  baseUrl?: string
  last_update?: string
  [k: string]: unknown
}

export type Credential = OAuthCredential | ApiKeyCredential

export interface ModelEntry {
  id: string
  provider: string
  name: string
  context_window_size: number
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
  const piOauth = readPiOAuthCredentials(piAuthPath)

  for (const [provider, cred] of Object.entries(piOauth)) {
    base.credentials[provider] = cred
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

  const models = (config.models as ModelEntry[]).map((m) => ({
    ...m,
    context_window_size: m.context_window_size ?? 128000,
  }))

  return { credentials: config.credentials as AuthConfig['credentials'], models }
}

function readPiOAuthCredentials(path: string): Record<string, OAuthCredential> {
  if (!existsSync(path)) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }

  if (!parsed || typeof parsed !== 'object') return {}

  const now = new Date().toISOString()
  const out: Record<string, OAuthCredential> = {}

  for (const [provider, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (e.type !== 'oauth') continue
    if (typeof e.refresh !== 'string' || e.refresh.length === 0) continue

    out[provider] = {
      ...(e as Record<string, unknown>),
      type: 'oauth',
      refresh: e.refresh,
      last_update: now,
    } as OAuthCredential
  }

  return out
}
