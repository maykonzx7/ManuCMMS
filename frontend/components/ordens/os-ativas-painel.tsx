'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { OrderStatus, ServiceOrder } from '@/types'

type OsAtivasPainelProps = {
  orders: ServiceOrder[]
  canManageOrderStatus?: boolean
  onIniciar?: (orderId: string) => void
  onConcluir?: (orderId: string) => void
  className?: string
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OsAtivasPainel({
  orders,
  canManageOrderStatus = false,
  onIniciar,
  onConcluir,
  className,
}: OsAtivasPainelProps) {
  const ativas = orders.filter(
    (order) =>
      order.status === 'ABERTA' ||
      order.status === 'AGUARDANDO' ||
      order.status === 'EM_ANDAMENTO',
  )

  if (ativas.length === 0) return null

  return (
    <Card className={cn('border-primary/20 bg-primary/5', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">OS em aberto</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse rapidamente as ordens que ainda precisam de atenção
            </p>
          </div>
          <Badge variant="secondary">{ativas.length} ativa{ativas.length === 1 ? '' : 's'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ativas.map((order) => (
          <div
            key={order.id}
            className="flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-sm"
          >
            <Link
              href={`/ordens/${order.id}`}
              className="group min-w-0 space-y-2 rounded-md transition-colors hover:text-primary"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{order.numero}</span>
                <Badge
                  variant="outline"
                  className={cn('text-xs', PRIORITY_COLORS[order.prioridade])}
                >
                  {PRIORITY_LABELS[order.prioridade]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', ORDER_STATUS_COLORS[order.status as OrderStatus])}
                >
                  {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                </Badge>
              </div>
              <p className="font-medium leading-snug group-hover:underline">{order.titulo}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="truncate">{order.ativo?.nome}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(order.dataAbertura)}
                </span>
              </div>
            </Link>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8" asChild>
                <Link href={`/ordens/${order.id}`}>
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  Abrir OS
                </Link>
              </Button>
              {canManageOrderStatus && order.status === 'ABERTA' && onIniciar ? (
                <Button size="sm" className="h-8" onClick={() => onIniciar(order.id)}>
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Iniciar
                </Button>
              ) : null}
              {canManageOrderStatus && order.status === 'EM_ANDAMENTO' && onConcluir ? (
                <Button size="sm" className="h-8" onClick={() => void onConcluir(order.id)}>
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  Concluir
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
