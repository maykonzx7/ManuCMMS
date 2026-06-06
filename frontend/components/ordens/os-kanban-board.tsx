'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ORDER_STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
} from '@/lib/constants'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

export type KanbanOrder = {
  id: string
  numero: string
  titulo: string
  tipo: string
  prioridade: string
  status: OrderStatus
  ativoNome?: string
  statusSla?: string
  dataAbertura: string
}

const KANBAN_COLUMNS: Array<{
  status: OrderStatus
  label: string
  accent: string
  headerBg: string
}> = [
  {
    status: 'ABERTA',
    label: ORDER_STATUS_LABELS.ABERTA,
    accent: 'border-t-blue-500',
    headerBg: 'bg-blue-500/10',
  },
  {
    status: 'EM_ANDAMENTO',
    label: ORDER_STATUS_LABELS.EM_ANDAMENTO,
    accent: 'border-t-amber-500',
    headerBg: 'bg-amber-500/10',
  },
  {
    status: 'CONCLUIDA',
    label: ORDER_STATUS_LABELS.CONCLUIDA,
    accent: 'border-t-emerald-500',
    headerBg: 'bg-emerald-500/10',
  },
  {
    status: 'CANCELADA',
    label: ORDER_STATUS_LABELS.CANCELADA,
    accent: 'border-t-slate-500',
    headerBg: 'bg-slate-500/10',
  },
]

function KanbanCard({ order }: { order: KanbanOrder }) {
  const prioridade = order.prioridade as keyof typeof PRIORITY_LABELS
  const tipo = order.tipo as keyof typeof MAINTENANCE_TYPE_LABELS

  return (
    <Link
      href={`${ROUTES.ordens}/${order.id}`}
      className="block rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{order.numero}</span>
        {order.statusSla === 'ATRASADA' ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        ) : null}
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{order.titulo}</p>
      {order.ativoNome ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{order.ativoNome}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', MAINTENANCE_TYPE_COLORS[tipo])}>
          {MAINTENANCE_TYPE_LABELS[tipo] ?? order.tipo}
        </Badge>
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLORS[prioridade])}>
          {PRIORITY_LABELS[prioridade] ?? order.prioridade}
        </Badge>
      </div>
    </Link>
  )
}

export function OsKanbanBoard({ orders }: { orders: KanbanOrder[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLUMNS.map((column) => {
        const columnOrders = orders.filter((o) => o.status === column.status)
        return (
          <div
            key={column.status}
            className={cn('flex flex-col rounded-xl border border-t-4', column.accent)}
          >
            <div className={cn('flex items-center justify-between rounded-t-lg px-3 py-2.5', column.headerBg)}>
              <h3 className="text-sm font-semibold">{column.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnOrders.length}
              </Badge>
            </div>
            <ScrollArea className="h-[min(520px,60vh)]">
              <div className="space-y-2 p-3">
                {columnOrders.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Nenhuma OS nesta coluna
                  </p>
                ) : (
                  columnOrders.map((order) => <KanbanCard key={order.id} order={order} />)
                )}
              </div>
            </ScrollArea>
          </div>
        )
      })}
    </div>
  )
}
