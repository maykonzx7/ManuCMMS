import type { SessionData } from '@/types'

const STORAGE_KEY = 'manucmms.auth.snapshot'

export type PersistedAuthSnapshot = {
  session: SessionData
  isPlatformOperator: boolean
  isWorkspaceImpersonation: boolean
  savedAt: number
}

export function loadPersistedAuthSnapshot(): PersistedAuthSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedAuthSnapshot
    if (!parsed?.session?.user?.id || !parsed.session.empresa?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function persistAuthSnapshot(snapshot: PersistedAuthSnapshot | null): void {
  if (typeof window === 'undefined') return
  try {
    if (!snapshot) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // quota ou modo privado — ignora
  }
}
