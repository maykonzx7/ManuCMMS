'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { InviteForm } from '@/components/auth'
import { apiRequest, setApiCompanySlug } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ROUTES } from '@/lib/routes'

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { completeInviteAccess } = useAuth()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)

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
    if (submittingRef.current) return
    submittingRef.current = true
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
        alreadyActivated?: boolean
        authSession?: {
          accessToken: string
          refreshToken: string
          expiresIn?: number
        }
      }>('/convites/ativar', {
        method: 'POST',
        body: {
          token: inviteToken,
          nome: data.nome.trim(),
          senha: data.senha,
        },
      })

      const slug = activation.empresaSlug ?? empresaSlug
      const emailLogin = activation.email ?? emailConvite

      if (slug) {
        setApiCompanySlug(slug)
      }

      await completeInviteAccess(
        emailLogin,
        data.senha,
        slug || undefined,
        activation.authSession,
      )

      setIsSuccess(true)
      toast.success(
        activation.alreadyActivated
          ? 'Acesso confirmado! Entrando no portal...'
          : 'Conta ativada com sucesso!',
      )

      setTimeout(() => {
        router.replace(ROUTES.home)
      }, 1200)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite')
    } finally {
      submittingRef.current = false
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
          Redirecionando para o painel...
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
