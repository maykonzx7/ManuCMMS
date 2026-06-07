import {
  buildApiCacheKey,
  invalidateApiCacheForMutation,
  peekApiCache,
  setApiCache,
} from './api-cache'

let inMemoryCompanySlug: string | null = null

export function resolveApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? ''
  const normalizedConfigured = configuredBaseUrl.replace(/\/$/, '')

  if (normalizedConfigured.length > 0) {
    // If frontend is opened through a public host (ex.: ngrok), a localhost API
    // URL would point to the visitor machine. In this case, force Next proxy.
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname.toLowerCase()
      const isCurrentHostLocal =
        currentHost === 'localhost' ||
        currentHost === '127.0.0.1' ||
        currentHost === '::1'

      const isConfiguredAbsolute = /^https?:\/\//i.test(normalizedConfigured)
      if (isConfiguredAbsolute && !isCurrentHostLocal) {
        try {
          const configuredHost = new URL(normalizedConfigured).hostname.toLowerCase()
          const isConfiguredLocal =
            configuredHost === 'localhost' ||
            configuredHost === '127.0.0.1' ||
            configuredHost === '::1'
          if (isConfiguredLocal) return '/api'
        } catch {
          return '/api'
        }
      }
    }

    return normalizedConfigured
  }

  return '/api'
}

function resolveCompanySlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/(?:workspace\/)?acesso\/([^/?#]+)/i)
  const slug = match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : ''
  return slug.length > 0 ? slug : null
}

export function setApiCompanySlug(slug: string | null | undefined) {
  const normalized = (slug ?? '').trim().toLowerCase()
  inMemoryCompanySlug = normalized || null
}

export function getApiCompanySlug(): string | null {
  if (inMemoryCompanySlug) return inMemoryCompanySlug
  if (typeof window === 'undefined') return null
  return resolveCompanySlugFromPathname(window.location.pathname)
}

function resolveApiCompanySlug(): string | null {
  return getApiCompanySlug()
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  accessToken?: string
  body?: unknown
  headers?: Record<string, string>
  cache?: RequestCache
  /** Usa cache em memória para GET (padrão: true). */
  useCache?: boolean
}

export { peekApiCache, invalidateApiCache, invalidateApiCacheForMutation } from './api-cache'

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers,
    cache = 'no-store',
    accessToken,
    useCache = method === 'GET',
  } = options
  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData
  const companySlug = resolveApiCompanySlug()
  const cacheKey = buildApiCacheKey(method, path, companySlug)

  if (useCache && method === 'GET') {
    const cached = peekApiCache<T>(cacheKey)
    if (cached !== undefined) return cached
  }

  const mergedHeaders: Record<string, string> = {
    ...(headers ?? {}),
  }

  const token = accessToken?.trim()
  if (token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`
  }
  if (!mergedHeaders['x-company-slug']) {
    if (companySlug) {
      mergedHeaders['x-company-slug'] = companySlug
    }
  }
  if (body !== undefined && !isFormDataBody && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method,
    headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
    credentials: 'include',
    body:
      body === undefined
        ? undefined
        : isFormDataBody
          ? body
          : JSON.stringify(body),
    cache,
  })

  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[]; error?: string }
    | null

  if (!response.ok) {
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : Array.isArray(payload?.message)
          ? payload.message.join(' ')
          : typeof payload?.error === 'string'
            ? payload.error
            : `Falha na requisicao (${response.status})`
    throw new Error(message)
  }

  if (useCache && method === 'GET') {
    setApiCache(cacheKey, payload)
  } else if (method !== 'GET') {
    invalidateApiCacheForMutation(path)
  }

  return payload as T
}

type ApiDownloadOptions = {
  accessToken?: string
  headers?: Record<string, string>
}

export async function downloadApiFile(
  path: string,
  fileName: string,
  options: ApiDownloadOptions = {},
): Promise<void> {
  const mergedHeaders: Record<string, string> = { ...(options.headers ?? {}) }
  const token = options.accessToken?.trim()
  if (token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`
  }
  if (!mergedHeaders['x-company-slug']) {
    const companySlug = resolveApiCompanySlug()
    if (companySlug) mergedHeaders['x-company-slug'] = companySlug
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    credentials: 'include',
    headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Falha no download (${response.status})`)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
