export function getFirstName(nome?: string | null, fallback = '') {
  const trimmed = nome?.trim() ?? ''
  if (!trimmed) return fallback
  return trimmed.split(/\s+/)[0] ?? fallback
}
