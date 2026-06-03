const DEFAULT_REDIRECT = '/workspace'

/** Aceita apenas paths relativos internos (evita redirect para localhost/dev). */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return DEFAULT_REDIRECT
  if (!value.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT
  return value
}
