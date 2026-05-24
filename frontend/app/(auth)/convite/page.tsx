'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { InviteForm } from '@/components/auth'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken } = useAuth()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const inviteToken = searchParams.get('token') || ''
  const inviteEmail = searchParams.get('email') || ''
  const empresaNome = searchParams.get('empresa') || 'Empresa Exemplo'

  const handleAcceptInvite = async (data: {
    nome: string
    email: string
    senha: string
  }) => {
    setIsLoading(true)
    try {
      if (!accessToken || !inviteToken) {
        throw new Error('Você precisa estar autenticado e com token de convite válido.')
      }
      await apiRequest('/convites/aceitar', {
        method: 'POST',
        accessToken,
        body: {
          token: inviteToken,
          nome: data.nome,
        },
      })
      
      setIsSuccess(true)
      toast.success('Conta criada com sucesso!')
      
      // Redireciona após 2 segundos
      setTimeout(() => {
        router.push('/workspace/acesso')
      }, 2000)
    } catch (error) {
      toast.error('Erro ao aceitar convite')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Conta criada com sucesso!</h2>
        <p className="text-muted-foreground">
          Você será redirecionado para a página de login em instantes...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Aceitar Convite</h2>
        <p className="text-muted-foreground">
          Complete seu cadastro para acessar o sistema
        </p>
      </div>
      
      <InviteForm
        onSubmit={handleAcceptInvite}
        inviteEmail={inviteEmail}
        empresaNome={empresaNome}
        isLoading={isLoading}
      />
      
      <p className="text-center text-sm text-muted-foreground">
        Ao criar sua conta, você concorda com nossos{' '}
        <a href="#" className="text-primary hover:underline">
          Termos de Uso
        </a>{' '}
        e{' '}
        <a href="#" className="text-primary hover:underline">
          Política de Privacidade
        </a>
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
