type CacheEntry = {
  data: unknown
  expiresAt: number
}

const TTL = {
  DEFAULT: 60_000,
  STABLE: 5 * 60_000,
  VOLATILE: 30_000,
  BOOTSTRAP: 2 * 60_000,
  INTEGRATIONS: 30_000,
  DASHBOARD: 2 * 60_000,
} as const

const cache = new Map<string, CacheEntry>()

/** TTL por tipo de endpoint — dados estáveis ficam mais tempo em cache. */
export function resolveCacheTtlMs(path: string): number {
  if (path.startsWith('/me/bootstrap')) return TTL.BOOTSTRAP
  if (path.includes('/ordens-servico') || path.startsWith('/notificacoes')) {
    return TTL.VOLATILE
  }
  if (path.includes('/integracoes/')) return TTL.INTEGRATIONS
  if (path.includes('/dashboard/')) return TTL.DASHBOARD
  if (
    path.includes('/ativos')
    || path.includes('/usuarios')
    || path.includes('/pecas')
    || path.includes('/gestao/painel')
    || path === '/unidades'
    || /^\/unidades\/[^/]+$/.test(path)
  ) {
    return TTL.STABLE
  }
  return TTL.DEFAULT
}

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

export function hasApiCache(key: string): boolean {
  return peekApiCache(key) !== undefined
}

export function setApiCache(key: string, data: unknown, ttlMs = resolveCacheTtlMs('')): void {
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
  if (segments[0] === 'notificacoes') {
    invalidateApiCache('/notificacoes')
  }
  if (segments[0] === 'auditoria') {
    invalidateApiCache('/auditoria')
  }
}
