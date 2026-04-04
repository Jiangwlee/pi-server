import path from 'node:path'
import { mkdirSync } from 'node:fs'

export function validateRelativePath(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  if (path.isAbsolute(trimmed)) {
    throw new Error(`Absolute paths are not allowed: ${trimmed}`)
  }

  const normalized = path.normalize(trimmed)
  if (normalized.startsWith('..') || normalized.includes(`${path.sep}..`)) {
    throw new Error(`Path traversal is not allowed: ${trimmed}`)
  }

  return normalized
}

function getUserRoot(dataDir: string, userId: string): string {
  return path.resolve(dataDir, 'users', userId)
}

function ensureWithinRoot(resolved: string, root: string, original: string): void {
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Path escapes user root: ${original}`)
  }
}

export function resolveSessionPath(dataDir: string, userId: string, sessionDir: string): string {
  const validated = validateRelativePath(sessionDir)
  const root = getUserRoot(dataDir, userId)
  const resolved = path.resolve(root, validated, 'session.jsonl')
  ensureWithinRoot(resolved, root, sessionDir)
  return resolved
}

export function resolveWorkspacePath(dataDir: string, userId: string, cwd: string): string {
  const validated = validateRelativePath(cwd)
  const root = getUserRoot(dataDir, userId)
  const resolved = path.resolve(root, validated)
  ensureWithinRoot(resolved, root, cwd)
  return resolved
}

export function ensureDirs(sessionPath: string, workspacePath: string): void {
  mkdirSync(path.dirname(sessionPath), { recursive: true })
  mkdirSync(workspacePath, { recursive: true })
}
