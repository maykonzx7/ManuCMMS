'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, Building2, Mail, User, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const platformSchema = z.object({
  empresaNome: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
  empresaSlug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  adminNome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  adminEmail: z.string().email('Email inválido'),
})

type PlatformFormData = z.infer<typeof platformSchema>

export default function PlatformPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlatformFormData>({
    resolver: zodResolver(platformSchema),
  })

  const empresaNome = watch('empresaNome')

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const onSubmit = async (data: PlatformFormData) => {
    setIsLoading(true)
    try {
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      setIsSuccess(true)
      toast.success('Empresa criada com sucesso!')
    } catch (error) {
      toast.error('Erro ao criar empresa')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Empresa criada com sucesso!</h2>
          <p className="text-muted-foreground">
            Um email foi enviado para o administrador com as instruções de acesso.
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Próximos passos:</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">1</span>
              Verifique o email do administrador
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">2</span>
              Acesse o link de ativação
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">3</span>
              Configure as unidades e convide sua equipe
            </li>
          </ul>
        </div>
        
        <Button
          className="w-full"
          onClick={() => window.location.href = '/acesso'}
        >
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Portal do Proprietário</h2>
        <p className="text-muted-foreground">
          Crie uma nova empresa na plataforma ManuCMMS
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Dados da Empresa</h3>
          
          <div className="space-y-2">
            <Label htmlFor="empresaNome">Nome da empresa</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="empresaNome"
                type="text"
                placeholder="Minha Empresa S.A."
                className={cn('pl-10', errors.empresaNome && 'border-destructive')}
                {...register('empresaNome')}
                disabled={isLoading}
              />
            </div>
            {errors.empresaNome && (
              <p className="text-sm text-destructive">{errors.empresaNome.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="empresaSlug">URL da empresa</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="empresaSlug"
                type="text"
                placeholder={empresaNome ? generateSlug(empresaNome) : 'minha-empresa'}
                className={cn('pl-10', errors.empresaSlug && 'border-destructive')}
                {...register('empresaSlug')}
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              app.manucmms.com/<span className="text-primary">{watch('empresaSlug') || 'sua-empresa'}</span>
            </p>
            {errors.empresaSlug && (
              <p className="text-sm text-destructive">{errors.empresaSlug.message}</p>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Administrador</h3>
          
          <div className="space-y-2">
            <Label htmlFor="adminNome">Nome do administrador</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="adminNome"
                type="text"
                placeholder="João Silva"
                className={cn('pl-10', errors.adminNome && 'border-destructive')}
                {...register('adminNome')}
                disabled={isLoading}
              />
            </div>
            {errors.adminNome && (
              <p className="text-sm text-destructive">{errors.adminNome.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email do administrador</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@empresa.com"
                className={cn('pl-10', errors.adminEmail && 'border-destructive')}
                {...register('adminEmail')}
                disabled={isLoading}
              />
            </div>
            {errors.adminEmail && (
              <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
            )}
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando empresa...
            </>
          ) : (
            'Criar empresa'
          )}
        </Button>
      </form>
      
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma empresa?{' '}
        <a href="/acesso" className="text-primary hover:underline">
          Faça login
        </a>
      </p>
    </div>
  )
}
