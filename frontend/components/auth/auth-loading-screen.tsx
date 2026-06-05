'use client'

import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type AuthLoadingScreenProps = {
  message?: string
  layout?: 'fullscreen' | 'embedded'
  className?: string
}

function LoginSkeletonPanel({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <img
          src="/logo-nome.png"
          alt="ManuCMMS"
          className="h-12 w-auto max-w-[260px] object-contain"
        />
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Bem-vindo de volta</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>

      <div className="space-y-6" aria-hidden="true">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex h-10 w-full items-center justify-center rounded-md bg-primary/90 text-primary-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
        </div>
      </div>

      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

function BrandingPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary/20 via-background to-background p-12">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold leading-tight text-balance">
          Gestão de Manutenção Industrial Inteligente
        </h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Otimize suas operações de manutenção com controle total sobre ativos,
          ordens de serviço e equipes técnicas em uma única plataforma.
        </p>

        <div className="grid grid-cols-2 gap-4 pt-8">
          <div className="rounded-lg border bg-card/50 p-4">
            <div className="text-2xl font-bold text-primary">+40%</div>
            <div className="text-sm text-muted-foreground">Redução de downtime</div>
          </div>
          <div className="rounded-lg border bg-card/50 p-4">
            <div className="text-2xl font-bold text-primary">97%</div>
            <div className="text-sm text-muted-foreground">Taxa de disponibilidade</div>
          </div>
          <div className="rounded-lg border bg-card/50 p-4">
            <div className="text-2xl font-bold text-primary">-25%</div>
            <div className="text-sm text-muted-foreground">Custos de manutenção</div>
          </div>
          <div className="rounded-lg border bg-card/50 p-4">
            <div className="text-2xl font-bold text-primary">+150</div>
            <div className="text-sm text-muted-foreground">Empresas ativas</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-12 text-sm text-muted-foreground">
        ManuCMMS - Todos os direitos reservados
      </div>
    </div>
  )
}

export function AuthLoadingScreen({
  message = 'Verificando sua sessão...',
  layout = 'fullscreen',
  className,
}: AuthLoadingScreenProps) {
  if (layout === 'embedded') {
    return (
      <div className={cn('w-full', className)} role="status" aria-live="polite">
        <LoginSkeletonPanel message={message} />
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-screen', className)} role="status" aria-live="polite">
      <BrandingPanel />
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoginSkeletonPanel message={message} />
        </div>
      </div>
    </div>
  )
}
