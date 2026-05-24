let inMemoryCompanySlug: string | null = null

export function resolveApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (configuredBaseUrl && configuredBaseUrl.length > 0) {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  // Dev fallback: when Next runs on :3000, backend usually runs on :3001.
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location
    if (port === '3000') return `${protocol}//${hostname}:3001`
    return origin
  }

  const baseUrl = 'http://localhost:3001'
  return baseUrl.replace(/\/$/, '')
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

function resolveApiCompanySlug(): string | null {
  if (inMemoryCompanySlug) return inMemoryCompanySlug
  if (typeof window === 'undefined') return null
  return resolveCompanySlugFromPathname(window.location.pathname)
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  accessToken?: string
  body?: unknown
  headers?: Record<string, string>
  cache?: RequestCache
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, cache = 'no-store' } = options
  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData
  const mergedHeaders: Record<string, string> = {
    ...(headers ?? {}),
  }

  // Sessões autenticadas usam cookie HttpOnly; Bearer deve ser enviado apenas
  // quando explicitamente passado em headers para casos específicos.
  if (!mergedHeaders['x-company-slug']) {
    const companySlug = resolveApiCompanySlug()
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

  return payload as T
}
