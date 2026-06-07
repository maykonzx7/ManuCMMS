'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AuthLoadingScreen } from '@/components/auth'
import { useAuth } from '@/lib/auth'
import {
  isClientWorkspaceSessionMessage,
  type ClientWorkspaceOpenedMessage,
  type ClientWorkspaceReadyMessage,
} from '@/lib/open-client-workspace'
import { ROUTES } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

export default function ClientWorkspaceHandoffPage() {
  const params = useParams()
  const router = useRouter()
  const { enterCompanyWorkspace } = useAuth()
  const companySlug = (params.companySlug as string).trim().toLowerCase()
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current || !companySlug) return
    startedRef.current = true

    if (!window.opener) {
      setError('Abra o cliente a partir do Painel Plataforma.')
      return
    }

    const ready: ClientWorkspaceReadyMessage = {
      type: 'CLIENT_WORKSPACE_READY',
      slug: companySlug,
    }
    window.opener.postMessage(ready, window.location.origin)

    const timeout = window.setTimeout(() => {
      setError('Não foi possível receber a sessão da guia do Painel Plataforma.')
    }, 15_000)

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (!isClientWorkspaceSessionMessage(event.data)) return
      if (event.data.slug !== companySlug) return

      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)

      void (async () => {
        try {
          if (!supabase) {
            throw new Error('Supabase não configurado')
          }

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: event.data.accessToken,
            refresh_token: event.data.refreshToken,
          })
          if (sessionError || !data.session?.access_token) {
            throw new Error(sessionError?.message ?? 'Falha ao aplicar sessão')
          }

          await enterCompanyWorkspace(companySlug)

          const opened: ClientWorkspaceOpenedMessage = {
            type: 'CLIENT_WORKSPACE_OPENED',
            slug: companySlug,
          }
          window.opener?.postMessage(opened, window.location.origin)

          router.replace(ROUTES.home)
        } catch (handoffError) {
          const message =
            handoffError instanceof Error ? handoffError.message : 'Falha ao abrir cliente'
          setError(message)
          toast.error(message)
        }
      })()
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
    }
  }, [companySlug, enterCompanyWorkspace, router])

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => router.replace(ROUTES.platform)}
        >
          Voltar ao Painel Plataforma
        </button>
      </div>
    )
  }

  return <AuthLoadingScreen message="Abrindo workspace do cliente..." />
}
