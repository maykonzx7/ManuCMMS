type CacheEntry = {
  data: unknown
  expiresAt: number
}

const DEFAULT_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

export function buildApiCacheKey(
  method: string,
  path: string,
  companySlug: string | null,
  accessTokenScope: string | null = null,
): string {
  return `${method}:${accessTokenScope ?? ''}:${companySlug ?? ''}:${path}`
}

export function peekApiCache<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data as T
}

export function setApiCache(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(prefix)) cache.delete(key)
  }
}

/** Invalida entradas relacionadas após mutações (ex.: PATCH em uma OS invalida a lista). */
export function invalidateApiCacheForMutation(path: string): void {
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return

  if (segments[0] === 'unidades' && segments.length >= 2) {
    invalidateApiCache(`/unidades/${segments[1]}/`)
    return
  }
  if (segments[0] === 'empresas' && segments.length >= 2) {
    invalidateApiCache(`/empresas/${segments[1]}/`)
    return
  }
  if (segments[0] === 'me') {
    invalidateApiCache('/me')
  }
}
