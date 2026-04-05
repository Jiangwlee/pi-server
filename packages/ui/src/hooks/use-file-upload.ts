import { useCallback, useMemo, useState } from 'react'
import { ApiClient, ApiError } from '../client/api-client.js'
import type { UploadedFile } from '../client/types.js'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

type UseFileUploadOptions = {
  sessionId: string
  client?: ApiClient
  basePath?: string
  maxFiles?: number
}

type UseFileUploadResult = {
  files: UploadedFile[]
  uploading: boolean
  error: string | null
  upload: (file: File) => Promise<void>
  remove: (fileId: string) => void
  clear: () => void
  fileIds: string[]
}

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadResult {
  const { sessionId, basePath = '/backend', maxFiles = 10 } = options
  const client = useMemo(() => options.client ?? new ApiClient({ basePath }), [options.client, basePath])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<void> => {
    setError(null)

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP`)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 20MB`)
      return
    }

    setFiles((prev) => {
      if (prev.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return prev
      }
      return prev
    })

    setUploading(true)
    try {
      const uploaded = await client.upload(file, sessionId)
      setFiles((prev) => {
        if (prev.length >= maxFiles) return prev
        return [...prev, uploaded]
      })
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const parsed = JSON.parse(err.body)
          setError(parsed.error ?? err.message)
        } catch {
          setError(err.message)
        }
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setUploading(false)
    }
  }, [client, sessionId, maxFiles])

  const remove = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const clear = useCallback(() => {
    setFiles([])
    setError(null)
  }, [])

  const fileIds = useMemo(() => files.map((f) => f.id), [files])

  return {
    files,
    uploading,
    error,
    upload,
    remove,
    clear,
    fileIds,
  }
}
