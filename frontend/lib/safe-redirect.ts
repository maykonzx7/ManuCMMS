const DEFAULT_REDIRECT = '/workspace'

/** Aceita apenas paths relativos internos (evita redirect para localhost/dev). */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return DEFAULT_REDIRECT
  const [pathOnly] = value.split('?')
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) return DEFAULT_REDIRECT
  return value
}

/** Monta o path atual do navegador para retorno pós-login (inclui query interna). */
export function resolveReturnPathFromBrowser(): string {
  if (typeof window === 'undefined') return DEFAULT_REDIRECT

  const { pathname, search } = window.location
  const normalizedPath = pathname.startsWith('/workspace')
    ? pathname
    : pathname === '/'
      ? '/workspace'
      : `/workspace${pathname}`

  return sanitizeRedirectPath(`${normalizedPath}${search}`)
}

export function buildLoginRedirectUrl(returnPath?: string): string {
  const path = sanitizeRedirectPath(returnPath)
  return `/workspace/acesso?redirect=${encodeURIComponent(path)}`
}
