'use client'

import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { LoginForm } from '@/components/auth'

export default function CompanyLoginPage() {
  const params = useParams()
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const companySlug = params.companySlug as string

  const handleLogin = async (data: { email: string; senha: string }) => {
    try {
      await login(data.email, data.senha, companySlug)
      toast.success('Login realizado com sucesso!')
      router.push('/')
    } catch (error) {
      toast.error('Credenciais inválidas')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Acesso Empresarial</h2>
        <p className="text-muted-foreground">
          Entre com suas credenciais para acessar a empresa
        </p>
      </div>
      
      <LoginForm 
        onSubmit={handleLogin} 
        empresaSlug={companySlug}
        isLoading={isLoading} 
      />
      
      <p className="text-center text-sm text-muted-foreground">
        Não pertence a esta empresa?{' '}
        <a href="/acesso" className="text-primary hover:underline">
          Acesse o portal geral
        </a>
      </p>
    </div>
  )
}
