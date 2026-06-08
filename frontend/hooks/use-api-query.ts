'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  apiRequest,
  buildApiRequestCacheKey,
  peekApiCache,
} from '@/lib/api'

type UseApiQueryOptions<T> = {
  accessToken?: string | null
  enabled?: boolean
  /** Se true, não exibe loading quando há cache válido. */
  skipLoadingWhenCached?: boolean
}

type UseApiQueryResult<T> = {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<T | null>
}

export function useApiQuery<T>(
  path: string | null,
  options: UseApiQueryOptions<T> = {},
): UseApiQueryResult<T> {
  const {
    accessToken,
    enabled = true,
    skipLoadingWhenCached = true,
  } = options

  const cacheKey = path && accessToken
    ? buildApiRequestCacheKey(path, 'GET', accessToken)
    : null

  const readCache = useCallback((): T | null => {
    if (!cacheKey) return null
    const cached = peekApiCache<T>(cacheKey)
    return cached === undefined ? null : cached
  }, [cacheKey])

  const [data, setData] = useState<T | null>(() => readCache())
  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !path || !accessToken) return false
    if (skipLoadingWhenCached && readCache() !== null) return false
    return true
  })
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchData = useCallback(async (): Promise<T | null> => {
    if (!path || !accessToken) return null

    const requestId = ++requestIdRef.current
    const cached = readCache()
    if (cached === null) {
      setIsLoading(true)
    }

    try {
      const result = await apiRequest<T>(path, { accessToken })
      if (requestId !== requestIdRef.current) return result
      setData(result)
      setError(null)
      return result
    } catch (err) {
      if (requestId !== requestIdRef.current) return null
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados')
      if (cached === null) setData(null)
      return null
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [accessToken, path, readCache])

  useEffect(() => {
    if (!enabled || !path || !accessToken) {
      setIsLoading(false)
      return
    }

    const cached = readCache()
    if (cached !== null) {
      setData(cached)
      if (skipLoadingWhenCached) {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [accessToken, enabled, fetchData, path, readCache, skipLoadingWhenCached])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}
