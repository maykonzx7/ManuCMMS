'use client'

import { ArrowRight, CheckCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getProximoPassoMensagem } from '@/lib/os-flow-utils'
import type { MaintenanceType, OrderStatus } from '@/types'

type OsProximoPassoBannerProps = {
  status: OrderStatus
  tipo: MaintenanceType
  fotoProblema?: string | null
  descricaoProblema?: string | null
  onIniciar?: () => void
  onConcluir?: () => void
  className?: string
}

export function OsProximoPassoBanner({
  status,
  tipo,
  fotoProblema,
  descricaoProblema,
  onIniciar,
  onConcluir,
  className,
}: OsProximoPassoBannerProps) {
  const passo = getProximoPassoMensagem({ status, tipo, fotoProblema, descricaoProblema })
  if (!passo.titulo) return null

  const isBloqueado = passo.acao === null && status === 'EM_ANDAMENTO'

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isBloqueado ? 'border-destructive/40 bg-destructive/5' : 'border-primary/30 bg-primary/5',
        className,
      )}
    >
      <p className="font-medium">{passo.titulo}</p>
      <p className="mt-1 text-sm text-muted-foreground">{passo.descricao}</p>
      {passo.acao === 'iniciar' && onIniciar ? (
        <Button className="mt-3 h-11 w-full sm:w-auto" onClick={onIniciar}>
          <Play className="mr-2 h-4 w-4" />
          Iniciar agora
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : null}
      {passo.acao === 'concluir' && onConcluir ? (
        <Button className="mt-3 h-11 w-full sm:w-auto" onClick={onConcluir}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Concluir agora
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}
