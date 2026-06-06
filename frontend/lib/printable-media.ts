import { resolveMediaUrl } from '@/lib/media-url'

/** Converte caminho relativo ou URL legada em URL absoluta no browser. */
export function toAbsoluteMediaUrl(url: string | null | undefined): string | null {
  const resolved = resolveMediaUrl(url) ?? url?.trim()
  if (!resolved) return null
  if (resolved.startsWith('data:')) return resolved
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) return resolved
  if (typeof window === 'undefined') return resolved
  const path = resolved.startsWith('/') ? resolved : `/${resolved}`
  return `${window.location.origin}${path}`
}

/**
 * Busca a imagem e converte para data URL — garante que fotos apareçam na impressão/PDF.
 */
export async function fetchImageAsDataUrl(url: string | null | undefined): Promise<string | null> {
  const absolute = toAbsoluteMediaUrl(url)
  if (!absolute) return null
  if (absolute.startsWith('data:')) return absolute

  try {
    const response = await fetch(absolute, { credentials: 'include', cache: 'force-cache' })
    if (!response.ok) return absolute
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return absolute

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : absolute)
      }
      reader.onerror = () => resolve(absolute)
      reader.readAsDataURL(blob)
    })
  } catch {
    return absolute
  }
}

export async function preloadPrintImages(
  sources: Record<string, string | null | undefined>,
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    Object.entries(sources).map(async ([key, url]) => {
      if (!url) return [key, null] as const
      const dataUrl = await fetchImageAsDataUrl(url)
      return [key, dataUrl] as const
    }),
  )
  return Object.fromEntries(entries)
}
