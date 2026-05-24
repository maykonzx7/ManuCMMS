'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { InviteForm } from '@/components/auth'

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Dados do convite viriam da URL (token) em produção
  const inviteEmail = searchParams.get('email') || ''
  const empresaNome = searchParams.get('empresa') || 'Empresa Exemplo'

  const handleAcceptInvite = async (data: {
    nome: string
    email: string
    senha: string
  }) => {
    setIsLoading(true)
    try {
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      setIsSuccess(true)
      toast.success('Conta criada com sucesso!')
      
      // Redireciona após 2 segundos
      setTimeout(() => {
        router.push('/acesso')
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
