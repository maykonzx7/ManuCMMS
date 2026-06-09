'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().min(1, 'Informe email ou credencial'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

const forgotSchema = z.object({
  email: z.string().min(1, 'Informe email ou credencial'),
})

type LoginFormData = z.infer<typeof loginSchema>
type ForgotFormData = z.infer<typeof forgotSchema>

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>
  onForgotPassword?: (email: string) => Promise<void>
  empresaSlug?: string
  isLoading?: boolean
  className?: string
}

export function LoginForm({ onSubmit, onForgotPassword, empresaSlug, isLoading, className }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const forgotForm = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const openForgot = () => {
    setForgotMessage(null)
    forgotForm.reset({ email: getValues('email') ?? '' })
    setForgotOpen(true)
  }

  const submitForgot = forgotForm.handleSubmit(async (data) => {
    if (!onForgotPassword) return
    setForgotLoading(true)
    setForgotMessage(null)
    try {
      await onForgotPassword(data.email)
      setForgotMessage('Se o e-mail existir, enviamos um link para redefinir sua senha.')
    } catch (error) {
      setForgotMessage(error instanceof Error ? error.message : 'Falha ao solicitar recuperação.')
    } finally {
      setForgotLoading(false)
    }
  })

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
        {empresaSlug && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-primary">
              Acessando como empresa: <strong>{empresaSlug}</strong>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email ou credencial</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="text"
              placeholder="seu@email.com ou credencial"
              className={cn('pl-10', errors.email && 'border-destructive')}
              {...register('email')}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={cn('pl-10 pr-10', errors.senha && 'border-destructive')}
              {...register('senha')}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.senha && (
            <p className="text-sm text-destructive">{errors.senha.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
            />
            Lembrar de mim
          </label>
          {onForgotPassword ? (
            <button
              type="button"
              onClick={openForgot}
              className="text-sm text-primary hover:underline"
            >
              Esqueci minha senha
            </button>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail ou credencial. Enviaremos um link para redefinir a senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submitForgot(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email ou credencial</Label>
              <Input
                id="forgot-email"
                {...forgotForm.register('email')}
                disabled={forgotLoading}
              />
              {forgotForm.formState.errors.email ? (
                <p className="text-sm text-destructive">{forgotForm.formState.errors.email.message}</p>
              ) : null}
            </div>
            {forgotMessage ? (
              <p className="text-sm text-muted-foreground">{forgotMessage}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={forgotLoading || !onForgotPassword}>
                {forgotLoading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
