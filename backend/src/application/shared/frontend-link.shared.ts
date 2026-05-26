export function resolveFrontendBaseUrl(input: {
  frontendNgrokBaseUrl?: string | null
  frontendPublicBaseUrl?: string | null
}): string {
  const ngrok = (input.frontendNgrokBaseUrl ?? '').trim()
  if (ngrok) return ngrok.replace(/\/+$/, '')
  const fallback = (input.frontendPublicBaseUrl ?? '').trim()
  return fallback.replace(/\/+$/, '')
}
