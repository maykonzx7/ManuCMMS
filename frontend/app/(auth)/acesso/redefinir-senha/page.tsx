'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmacao: z.string().min(6, 'Confirme a nova senha'),
}).refine((data) => data.senha === data.confirmacao, {
  message: 'As senhas não coincidem',
  path: ['confirmacao'],
})

type FormData = z.infer<typeof schema>

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const { updatePassword } = useAuth()
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session)
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
        setChecking(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const onSubmit = async (data: FormData) => {
    try {
      await updatePassword(data.senha)
      toast.success('Senha atualizada com sucesso!')
      router.replace('/workspace/acesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar senha')
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validando link de recuperação...
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Link inválido ou expirado</h2>
        <p className="text-sm text-muted-foreground">
          Solicite um novo e-mail de recuperação na tela de login.
        </p>
        <Button onClick={() => router.push('/workspace/acesso')}>Voltar ao login</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Nova senha</h2>
        <p className="text-muted-foreground">Defina uma nova senha para sua conta</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senha">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="senha" type="password" className="pl-10" {...register('senha')} />
          </div>
          {errors.senha ? <p className="text-sm text-destructive">{errors.senha.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmacao">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="confirmacao" type="password" className="pl-10" {...register('confirmacao')} />
          </div>
          {errors.confirmacao ? <p className="text-sm text-destructive">{errors.confirmacao.message}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar nova senha'
          )}
        </Button>
      </form>
    </div>
  )
}
