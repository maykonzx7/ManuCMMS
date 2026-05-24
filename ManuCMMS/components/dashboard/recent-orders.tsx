import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ServiceOrder } from '@/types'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

interface RecentOrdersProps {
  orders: ServiceOrder[]
  className?: string
}

export function RecentOrders({ orders, className }: RecentOrdersProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ordens Recentes</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ordens">
            Ver todas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma ordem de serviço recente
            </p>
          ) : (
            orders.map((order) => (
              <Link
                key={order.id}
                href={`/ordens/${order.id}`}
                className="flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {order.numero}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', PRIORITY_COLORS[order.prioridade])}
                    >
                      {PRIORITY_LABELS[order.prioridade]}
                    </Badge>
                  </div>
                  <p className="font-medium truncate">{order.titulo}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="truncate">{order.ativo?.nome}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(order.dataAbertura)}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn('shrink-0', ORDER_STATUS_COLORS[order.status])}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
