import { useCallback, useMemo, useState } from 'react'
import { ApiClient } from '../client/api-client.js'
import type { Model } from '../client/types.js'

type ModelsClient = {
  models: () => Promise<Model[]>
}

type UseModelsOptions = {
  client?: ModelsClient
}

type UseModelsResult = {
  models: Model[]
  loading: boolean
  error: string | null
  loadModels: () => Promise<Model[]>
}

export function useModels(options: UseModelsOptions = {}): UseModelsResult {
  const client = useMemo(() => options.client ?? new ApiClient(), [options.client])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadModels = useCallback(async (): Promise<Model[]> => {
    setLoading(true)
    setError(null)
    try {
      const list = await client.models()
      setModels(list)
      return list
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [client])

  return {
    models,
    loading,
    error,
    loadModels,
  }
}
