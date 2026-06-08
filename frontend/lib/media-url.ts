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

export async function downloadMediaFile(
  url: string,
  fileName: string,
): Promise<void> {
  const resolved = resolveMediaUrl(url)
  if (!resolved) throw new Error('URL inválida')

  const response = await fetch(resolved)
  if (!response.ok) {
    throw new Error(`Falha no download (${response.status})`)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(objectUrl)
}
