'use client'

import { ROUTES } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

export type ClientWorkspaceReadyMessage = {
  type: 'CLIENT_WORKSPACE_READY'
  slug: string
}

export type ClientWorkspaceSessionMessage = {
  type: 'CLIENT_WORKSPACE_SESSION'
  slug: string
  accessToken: string
  refreshToken: string
}

export type ClientWorkspaceOpenedMessage = {
  type: 'CLIENT_WORKSPACE_OPENED'
  slug: string
}

const HANDOFF_TIMEOUT_MS = 15_000

function isSameOrigin(origin: string): boolean {
  return origin === window.location.origin
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

  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session?.access_token || !session.refresh_token) {
    throw new Error('Sessão não encontrada')
  }

  const url = `${window.location.origin}${ROUTES.clienteWorkspace(normalizedSlug)}`
  const child = window.open(url, '_blank')
  if (!child) {
    throw new Error('Permita pop-ups para abrir o cliente em nova guia.')
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Tempo esgotado ao abrir o cliente em nova guia.'))
    }, HANDOFF_TIMEOUT_MS)

    const onMessage = (event: MessageEvent) => {
      if (!isSameOrigin(event.origin)) return
      const payload = event.data as ClientWorkspaceReadyMessage
      if (payload?.type !== 'CLIENT_WORKSPACE_READY') return
      if (payload.slug !== normalizedSlug) return

      const handoff: ClientWorkspaceSessionMessage = {
        type: 'CLIENT_WORKSPACE_SESSION',
        slug: normalizedSlug,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }
      child.postMessage(handoff, window.location.origin)
      cleanup()
      resolve()
    }

    const cleanup = () => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
  })
}

export function isClientWorkspaceSessionMessage(
  value: unknown,
): value is ClientWorkspaceSessionMessage {
  if (!value || typeof value !== 'object') return false
  const payload = value as ClientWorkspaceSessionMessage
  return (
    payload.type === 'CLIENT_WORKSPACE_SESSION' &&
    typeof payload.slug === 'string' &&
    typeof payload.accessToken === 'string' &&
    typeof payload.refreshToken === 'string'
  )
}
