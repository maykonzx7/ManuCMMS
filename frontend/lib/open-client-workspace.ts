'use client'

import { ROUTES } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

export const CLIENT_HANDOFF_STORAGE_PREFIX = 'manucmms_client_handoff:'
const HANDOFF_TTL_MS = 60_000

export type ClientHandoffPayload = {
  slug: string
  accessToken: string
  refreshToken: string
  ts: number
}

function storeClientHandoff(
  payload: Omit<ClientHandoffPayload, 'ts'>,
): string {
  const handoffId = crypto.randomUUID()
  const record: ClientHandoffPayload = { ...payload, ts: Date.now() }
  localStorage.setItem(
    `${CLIENT_HANDOFF_STORAGE_PREFIX}${handoffId}`,
    JSON.stringify(record),
  )
  return handoffId
}

export function consumeClientHandoff(
  handoffId: string,
  expectedSlug: string,
): ClientHandoffPayload | null {
  const key = `${CLIENT_HANDOFF_STORAGE_PREFIX}${handoffId}`
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as ClientHandoffPayload
    if (Date.now() - parsed.ts > HANDOFF_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    if (parsed.slug.trim().toLowerCase() !== expectedSlug.trim().toLowerCase()) {
      return null
    }
    if (!parsed.accessToken || !parsed.refreshToken) {
      localStorage.removeItem(key)
      return null
    }
    localStorage.removeItem(key)
    return parsed
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

/** Abre o workspace do cliente em nova guia, mantendo o Painel Plataforma na guia atual. */
export async function openClientWorkspaceInNewTab(slug: string): Promise<void> {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    throw new Error('Slug da empresa inválido')
  }
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  // Abrir a guia no clique (antes de awaits) evita bloqueio de pop-up pelo navegador.
  const child = window.open('about:blank', '_blank')
  if (!child) {
    throw new Error('Permita pop-ups para abrir o cliente em nova guia.')
  }

  let handoffId: string | null = null

  try {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session?.access_token || !session.refresh_token) {
      throw new Error('Sessão não encontrada')
    }

    handoffId = storeClientHandoff({
      slug: normalizedSlug,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    })

    const url = `${window.location.origin}${ROUTES.clienteWorkspace(normalizedSlug)}?h=${encodeURIComponent(handoffId)}`
    child.location.href = url
  } catch (error) {
    child.close()
    if (handoffId) {
      localStorage.removeItem(`${CLIENT_HANDOFF_STORAGE_PREFIX}${handoffId}`)
    }
    throw error
  }
}
