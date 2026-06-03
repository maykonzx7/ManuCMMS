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

async function resolveAuthSession(email: string, senha: string): Promise<Session> {
  if (!supabase) {
    throw new Error('Autenticação não configurada. Contate o suporte.')
  }

  const normalizedEmail = normalizeEmail(email)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: senha,
  })

  if (!signUpError && signUpData.session?.access_token) {
    return signUpData.session
  }

  const alreadyExists =
    signUpError?.message?.toLowerCase().includes('already') ||
    signUpError?.message?.toLowerCase().includes('registered') ||
    signUpError?.message?.toLowerCase().includes('exists')

  if (signUpError && !alreadyExists) {
    throw new Error(signUpError.message)
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: senha,
  })

  if (signInError || !signInData.session?.access_token) {
    throw new Error(
      signInError?.message ??
        'Não foi possível autenticar. Se acabou de se cadastrar, confirme o e-mail no Supabase e tente entrar com a mesma senha.',
    )
  }

  return signInData.session
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

      const authSession = await resolveAuthSession(emailConvite, data.senha)
      await syncBackendSession(authSession, empresaSlug || null)

      await apiRequest('/convites/aceitar', {
        method: 'POST',
        accessToken: authSession.access_token,
        headers: empresaSlug ? { 'x-company-slug': empresaSlug } : undefined,
        body: {
          token: inviteToken,
          nome: data.nome.trim(),
        },
      })

      setIsSuccess(true)
      toast.success('Conta ativada com sucesso!')

      setTimeout(() => {
        router.push(
          empresaSlug ? `/workspace/acesso/${encodeURIComponent(empresaSlug)}` : '/workspace/acesso',
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
        Já possui conta? Use o mesmo e-mail do convite e sua senha atual — o sistema fará login automaticamente.
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
