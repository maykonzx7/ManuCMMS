/**
 * Normaliza URLs de upload para o mesmo origin do frontend (via rewrite `/uploads/*`).
 * Suporta URLs absolutas legadas salvas no banco.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('/uploads/')) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname
    }
  } catch {
    // valor não é URL absoluta
  }

  return trimmed
}
