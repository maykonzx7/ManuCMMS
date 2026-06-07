'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthLoadingScreen } from '@/components/auth'
import { useAuth } from '@/lib/auth'
import { consumeClientHandoff } from '@/lib/open-client-workspace'
import { ROUTES } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

function ClientWorkspaceHandoffContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { enterCompanyWorkspace } = useAuth()
  const paramSlug = Array.isArray(params.companySlug)
    ? params.companySlug[0]
    : params.companySlug
  const companySlug = (paramSlug ?? '').trim().toLowerCase()
  const handoffId = searchParams.get('h')?.trim() ?? ''
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    if (!companySlug) {
      setError('Slug da empresa não informado na URL.')
      return
    }
    if (!handoffId) {
      setError('Link de abertura inválido. Use "Acessar cliente" no Painel Plataforma.')
      return
    }

    startedRef.current = true

    void (async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase não configurado')
        }

        let handoff: ReturnType<typeof consumeClientHandoff> = null
        for (let attempt = 0; attempt < 20 && !handoff; attempt += 1) {
          handoff = consumeClientHandoff(handoffId, companySlug)
          if (!handoff) {
            await new Promise((resolve) => window.setTimeout(resolve, 100))
          }
        }
        if (!handoff) {
          throw new Error('Não foi possível carregar a sessão para este cliente.')
        }

        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: handoff.accessToken,
          refresh_token: handoff.refreshToken,
        })
        if (sessionError || !data.session?.access_token) {
          throw new Error(sessionError?.message ?? 'Falha ao aplicar sessão')
        }

        await enterCompanyWorkspace(companySlug)
        router.replace(ROUTES.home)
      } catch (handoffError) {
        const message =
          handoffError instanceof Error ? handoffError.message : 'Falha ao abrir cliente'
        setError(message)
        toast.error(message)
      }
    })()
  }, [companySlug, enterCompanyWorkspace, handoffId, router])

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-sm text-destructive">{error}</p>
        {companySlug ? (
          <p className="text-xs text-muted-foreground">Cliente: {companySlug}</p>
        ) : null}
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

  return <AuthLoadingScreen message={`Abrindo workspace ${companySlug || 'do cliente'}...`} />
}

export default function ClientWorkspaceHandoffPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Preparando workspace do cliente..." />}>
      <ClientWorkspaceHandoffContent />
    </Suspense>
  )
}
