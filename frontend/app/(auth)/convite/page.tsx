'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { InviteForm } from '@/components/auth'
import { apiRequest, setApiCompanySlug } from '@/lib/api'
import { supabase } from '@/lib/supabase'

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function syncBackendSession(session: Session, empresaSlug: string | null) {
  const headers = empresaSlug ? { 'x-company-slug': empresaSlug } : undefined
  await apiRequest('/auth/session', {
    method: 'POST',
    body: { accessToken: session.access_token },
    headers,
  })
}

async function signInAfterActivation(email: string, senha: string): Promise<Session> {
  if (!supabase) {
    throw new Error('Autenticação não configurada. Contate o suporte.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: senha,
  })

  if (error || !data.session?.access_token) {
    throw new Error(
      error?.message ??
        'Conta ativada, mas o login automático falhou. Entre em /workspace/acesso com o mesmo e-mail e senha.',
    )
  }

  return data.session
}

function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const inviteToken = searchParams.get('token')?.trim() ?? ''
  const inviteEmail = searchParams.get('email')?.trim() ?? ''
  const empresaSlug = searchParams.get('empresa')?.trim().toLowerCase() ?? ''
  const empresaNome = empresaSlug || 'sua empresa'

  useEffect(() => {
    if (empresaSlug) {
      setApiCompanySlug(empresaSlug)
    }
  }, [empresaSlug])

  const handleAcceptInvite = async (data: {
    nome: string
    email: string
    senha: string
  }) => {
    setIsLoading(true)
    try {
      if (!inviteToken) {
        throw new Error('Link de convite inválido ou incompleto (token ausente).')
      }

      const emailConvite = normalizeEmail(inviteEmail || data.email)
      const emailForm = normalizeEmail(data.email)
      if (inviteEmail && emailForm !== emailConvite) {
        throw new Error('Use o mesmo e-mail que recebeu o convite.')
      }

      const activation = await apiRequest<{
        email: string
        empresaSlug?: string
      }>('/convites/ativar', {
        method: 'POST',
        body: {
          token: inviteToken,
          nome: data.nome.trim(),
          senha: data.senha,
        },
      })

      const slug = activation.empresaSlug ?? empresaSlug
      const authSession = await signInAfterActivation(
        activation.email ?? emailConvite,
        data.senha,
      )
      await syncBackendSession(authSession, slug || null)

      setIsSuccess(true)
      toast.success('Conta ativada com sucesso!')

      setTimeout(() => {
        router.push(
          slug ? `/workspace/acesso/${encodeURIComponent(slug)}` : '/workspace/acesso',
        )
      }, 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite')
    } finally {
      setIsLoading(false)
    }
  }

  if (!inviteToken) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Convite inválido</h2>
        <p className="text-muted-foreground">
          Este link está incompleto. Peça um novo convite ao administrador da empresa.
        </p>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Conta ativada!</h2>
        <p className="text-muted-foreground">
          Redirecionando para o portal da empresa...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Aceitar convite</h2>
        <p className="text-muted-foreground">
          Crie sua senha para concluir o cadastro em <strong>{empresaNome}</strong>
        </p>
      </div>

      <InviteForm
        onSubmit={handleAcceptInvite}
        inviteEmail={inviteEmail}
        empresaNome={empresaNome}
        isLoading={isLoading}
      />

      <p className="text-center text-xs text-muted-foreground">
        Use o e-mail do convite. Se já tinha conta, a senha informada será atualizada para concluir o acesso.
      </p>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando convite...</div>}>
      <InvitePageContent />
    </Suspense>
  )
}
